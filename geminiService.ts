
import { GoogleGenAI } from "@google/genai";

type ImageReference = {
  base64: string;
  mimeType: string;
}

export type ImageSize = "1K" | "2K" | "4K";
export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

// High-end aesthetic tokens to mimic Flux.1 / Midjourney v6 quality
const FLUX_AESTHETIC_TOKENS = "hyper-realistic photography, 8k resolution, incredible details, highly detailed texture, 35mm film grain, masterpiece, sharp focus, professional lighting, cinematic color grading, depth of field, ray tracing, authentic look, unreal engine 5 render";

export const editImage = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  styleReferences?: ImageReference[],
  assets?: ImageReference[],
  imageSize: ImageSize = "1K",
  aspectRatio: AspectRatio = "1:1",
  maskImage?: string, // Optional base64 mask image (black/white)
  structureWeight: number = 50, // 0 to 100
  seed?: number // Optional seed for consistency
): Promise<{ imageUrl: string | null; base64: string | null; mimeType: string | null; text: string | null }> => {
  /* 
   * Create a new GoogleGenAI instance right before making an API call 
   * to ensure it always uses the most up-to-date API key from process.env.API_KEY.
   */
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const parts: any[] = [
    {
      inlineData: {
        data: base64ImageData,
        mimeType: mimeType,
      },
    },
  ];

  if (maskImage) {
    parts.push({
      inlineData: {
        data: maskImage,
        mimeType: 'image/png',
      }
    });
  }

  if (assets) {
    for (const asset of assets) {
      parts.push({
        inlineData: {
          data: asset.base64,
          mimeType: asset.mimeType,
        }
      });
    }
  }

  if (styleReferences) {
    for (const styleRef of styleReferences) {
      parts.push({
        inlineData: {
          data: styleRef.base64,
          mimeType: styleRef.mimeType,
        }
      });
    }
  }

  // --- Prompt Engineering for Flux-like Quality ---
  let finalPrompt = prompt.trim();

  // 1. Inject Aesthetic Tokens for High Quality modes (2K/4K)
  // This forces the model to use a "Pro" rendering style similar to Flux/MJ.
  if (imageSize === "2K" || imageSize === "4K") {
      if (!finalPrompt.toLowerCase().includes('hyper-realistic')) {
          finalPrompt += `, ${FLUX_AESTHETIC_TOKENS}`;
      }
  }

  // 2. Append Mask Instructions
  if (maskImage) {
    finalPrompt += " (Note: The second image provided is a binary mask. Only edit the white areas of the mask and keep the black areas unchanged.)";
  } else {
    // [CRITICAL] Background Freeze Logic (Virtual Inpainting)
    // If no mask is explicitly provided, we assume the user wants to keep the background 
    // unless they explicitly asked to change it in the prompt.
    // We inject strict constraints to force "Inpainting-like" behavior for the background.
    const bgChangeKeywords = ["background", "world", "environment", "location", "place"];
    const hasBgChangeRequest = bgChangeKeywords.some(kw => finalPrompt.toLowerCase().includes(kw));

    if (!hasBgChangeRequest) {
        finalPrompt += " [CRITICAL: PIXEL-PERFECT BACKGROUND PRESERVATION] You are editing the character ONLY. The background environment, furniture, lighting, and room structure must remain EXACTLY identical to the source image. Do not hallucinate new background details. Treat the background as a locked layer.";
        finalPrompt += " [NEGATIVE PROMPT: (changing background:1.5), new location, different room, remodeling, changing furniture, changing lighting, morphing background, distorted architecture, (bench:1.5), park bench, outdoor furniture, grass, street elements]";
    }
  }

  // 3. Append ControlNet-like Structure Instructions based on Weight
  if (structureWeight < 30) {
      // Low structure weight: Allow character pose change, but reinforce background lock
      finalPrompt += " [Instruction: You may freely alter the character's pose, action, and composition to fit the prompt. However, you MUST strictly preserve the background structure and perspective of the original image.]";
  } else if (structureWeight > 70) {
      finalPrompt += " [Instruction: Strictly preserve the exact structure, pose, and layout of the original source image. Do not change the camera angle or subject placement unless explicitly asked.]";
  } else {
      // Balanced approach (default)
      finalPrompt += " [Instruction: Maintain the general structure of the source image while applying the requested changes.]";
  }

  parts.push({ text: finalPrompt });

  /*
   * Select model based on quality requirements as per guidelines.
   * Default to gemini-2.5-flash-image for standard tasks.
   * Upgrade to gemini-3-pro-image-preview for high-quality (2K or 4K resolution).
   */
  const model = (imageSize === "2K" || imageSize === "4K") 
    ? 'gemini-3-pro-image-preview' 
    : 'gemini-2.5-flash-image';

  const config: any = {
    imageConfig: {
        aspectRatio: aspectRatio,
    },
    // Increase timeout to 5 minutes (300,000ms) for high-res generation
    httpOptions: {
        timeout: 300000 
    }
  };

  // imageSize option is only available for gemini-3-pro-image-preview
  if (model === 'gemini-3-pro-image-preview') {
    config.imageConfig.imageSize = imageSize;
  }

  // Set seed if provided (available in model generation config)
  if (seed !== undefined) {
      config.seed = seed;
  }

  // Retry Logic for 503/Timeout Errors
  let attempt = 0;
  const maxRetries = 1;

  while (attempt <= maxRetries) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: parts,
        },
        config: config
      });

      let imageUrl: string | null = null;
      let text: string | null = null;
      let base64: string | null = null;
      let genMimeType: string | null = null;

      if (response.candidates && response.candidates.length > 0) {
        // Find the image part from all candidates and parts, do not assume it's the first one.
        for (const part of response.candidates[0].content.parts) {
          if (part.text) {
            text = part.text;
          } else if (part.inlineData) {
            base64 = part.inlineData.data;
            genMimeType = part.inlineData.mimeType;
            imageUrl = `data:${genMimeType};base64,${base64}`;
          }
        }
      }

      return { imageUrl, base64, mimeType: genMimeType, text };

    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isTransientError = errorMessage.includes("503") || errorMessage.includes("Deadline expired") || errorMessage.includes("timeout") || errorMessage.includes("Overloaded");

      if (isTransientError && attempt < maxRetries) {
        attempt++;
        console.warn(`Gemini API Error (Attempt ${attempt}): ${errorMessage}. Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        continue; // Retry
      }

      console.error("Error editing image with Gemini API:", error);

      if (error instanceof Error) {
          // Check for API Key issues
          if (errorMessage.includes("403") || errorMessage.includes("API key not valid") || errorMessage.includes("Requested entity was not found")) {
              throw new Error("Invalid API Key or project configuration. Please check your AI Studio settings.");
          }
          // Handle persistent 503 as SERVER_BUSY
          if (isTransientError) {
              throw new Error("SERVER_BUSY");
          }
          throw new Error(error.message);
      }
      throw new Error("An unexpected error occurred while communicating with the Gemini API.");
    }
  }
  
  throw new Error("Failed to generate image after retries.");
};
