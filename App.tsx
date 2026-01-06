
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ImagePanel } from './components/ImagePanel';
import { 
  SparklesIcon, 
  SwapIcon, 
  HistoryIcon, 
  PaintBrushIcon, 
  XCircleIcon, 
  AssetIcon, 
  BoltIcon,
  SunIcon,
  MoonIcon,
  DiceIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon,
  SettingsIcon,
  QuestionMarkCircleIcon,
  UploadIcon,
  MagicWandIcon,
  ZoomIcon,
  PencilIcon,
  DownloadIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon
} from './components/Icons';
import { editImage, type ImageSize, type AspectRatio } from './services/geminiService';
import type { ImageSource } from './types';
import { useI18n } from './i18n';
import { useTheme } from './theme';
import { useToast } from './contexts/ToastContext';

type CameraAngle = 'front' | 'side' | 'back' | 'sheet' | null;

// Cinematic Control Definitions
const SHOT_SIZES = [
  { 
    val: 'ecu', 
    labelKey: 'shotECU' as const, 
    prompt: "Extreme Close-up (ECU) shot on a Macro lens 100mm, focus purely on iris/lips, extreme skin texture detail, f/2.8, intense intimacy.", 
    emoji: "👁️" 
  },
  { 
    val: 'closeup', 
    labelKey: 'shotCloseUp' as const, 
    prompt: "Cinematic Close-up shot on an 85mm Portrait Prime lens, tight framing chin-to-forehead, compression effect, creamy bokeh background (f/1.4).", 
    emoji: "😊" 
  },
  { 
    val: 'bust', 
    labelKey: 'shotBust' as const, 
    prompt: "Medium Close-up (MCU) shot on a 50mm Standard lens, chest-up shot, natural distortion, subject separated from background, authentic look.", 
    emoji: "👤" 
  },
  { 
    val: 'fullbody', 
    labelKey: 'shotFullBody' as const, 
    prompt: "Wide Shot (Full Shot) on a 24mm Wide-angle lens, slight barrel distortion, capturing full room context, expansive depth, head to toe visible.", 
    emoji: "🏞️" 
  },
];

const CAMERA_HEIGHTS = [
  { val: 'low', labelKey: 'angleLow' as const, prompt: "Low angle shot", emoji: "⬆️" },
  { val: 'eye', labelKey: 'angleEye' as const, prompt: "Eye-level shot", emoji: "👁️" },
  { val: 'high', labelKey: 'angleHigh' as const, prompt: "High angle shot", emoji: "⬇️" },
];

// Rich Scenario Pools for Dynamic Scene Generation
const SCENARIO_POOLS: Record<string, string[]> = {
  sitting: [
    "sitting naturally on the existing furniture, relaxed posture, candid vibe, looking slightly away",
    "sitting on a ledge or surface with legs dangling, shot from below, carefree vibe, raw aesthetic",
    "curled up in a chair, hugging knees, cozy vibe, comfort, slightly out of focus, home snapshot",
    "lounging sideways on a sofa, looking at ceiling, boredom, flash photography style",
    "sitting on the floor with legs crossed, eating a snack, candid moment"
  ],
  lying: [
    "lying flat on the existing surface, staring up at the camera (POV), peaceful, messy hair",
    "lying on side comfortably, resting on the current furniture/floor, relaxed everyday pose, candid snapshot",
    "lying on stomach, reading a magazine or looking at phone, raw energy, teenage room vibe",
    "lounging back, blending into the scene, flash photography, sharp shadows"
  ],
  running: [
    "Running TOWARDS the camera, hair flying, blurry motion, excited expression, teenage vibe",
    "Turning head sharply to look back, hair whipping around, surprised look, candid chase shot",
    "sprinting towards the camera laughing, motion blur, urgent expression, cinematic action",
    "jogging lightly with headphones, relaxed expression, morning exercise vibe"
  ],
  jumping: [
    "Dancing freely, blurred arms, hair in motion, flash photography style, energetic party vibe",
    "mid-air freeze frame of a joyful jump, arms raised, celebration, natural lighting",
    "jumping over a small obstacle in an urban setting, parkour light, street style",
    "levitating slightly off the ground, surreal atmosphere, dreamy, floating hair"
  ],
  crying: [
    "Covering mouth while laughing (eyes crinkled, tears of joy), candid moment, raw emotion",
    "sitting curled up, hiding face, emotional moment within the current setting, raw emotion",
    "standing and wiping tears, emotional expression, blending with the current lighting",
    "head in hands, sobbing, deep emotion, isolated in the current room"
  ],
  static: [
    "POV shot holding a smartphone camera, taking a mirror selfie, looking at the screen, flash on",
    "Fixing hair while looking at a reflection, unaware of the camera, candid snapshot",
    "Covering mouth while laughing, candid moment, eyes crinkled, raw aesthetic",
    "Whispering a secret to someone off-camera, hand cupped around mouth, secretive vibe",
    "leaning against a wall, one foot up, cool attitude, street style",
    "casual standing, hands in pockets, looking sideways, candid shot"
  ],
  reaching: [
    "Leaning extremely close into the camera lens (fisheye effect), playful expression, winking, reaching out",
    "Blocking the camera lens with one hand playfully, candid snapshot, blurred hand foreground",
    "reaching hand towards the camera lens, forced perspective, blurring hand, emotional connection"
  ],
  crouching: [
    "Tying shoelaces while crouching down, street snap vibe, looking down",
    "crouching down low, street level view, candid moment, wide angle",
    "squatting down, resting elbows on knees, casual street pose, low angle, waiting for someone"
  ],
  lookingup: [
    "head tilted back looking at the sky, exposing neck line, rain or sunlight on face, dreamy",
    "looking up in awe, soft lighting on face, contemplative expression"
  ]
};

const MOTIONS = [
  { val: 'static', labelKey: 'motionStatic' as const, emoji: "🧍" },
  { val: 'sitting', labelKey: 'motionSitting' as const, emoji: "🪑" },
  { val: 'lying', labelKey: 'motionLying' as const, emoji: "🛌" },
  { val: 'running', labelKey: 'motionRunning' as const, emoji: "🏃" },
  { val: 'jumping', labelKey: 'motionJumping' as const, emoji: "🤸" },
  { val: 'crying', labelKey: 'motionCrying' as const, emoji: "💧" },
  { val: 'reaching', labelKey: 'motionReaching' as const, emoji: "🫳" },
  { val: 'crouching', labelKey: 'motionCrouching' as const, emoji: "🧘" },
  { val: 'lookingup', labelKey: 'motionLookingUp' as const, emoji: "🙄" }
];

const CAMERA_MOVEMENTS = [
  { val: 'static', labelKey: 'cameraStatic' as const, prompt: "Static camera, tripod shot, stable footage, no shake", emoji: "🔭" },
  { val: 'smooth', labelKey: 'cameraSmooth' as const, prompt: "Smooth gimbal shot, floating camera, cinematic stabilizer, slow pan or tilt", emoji: "🦅" },
  { val: 'dynamic', labelKey: 'cameraDynamic' as const, prompt: "Documentary style, Dynamic camera movement, Raw footage look, slightly unstable angle, Immersive POV. --no motion blur", emoji: "📹" },
  { val: 'tracking', labelKey: 'cameraTracking' as const, prompt: "Tracking shot, dolly shot, camera following the subject, keeping subject in frame", emoji: "🛤️" },
];

const TRENDY_STYLES = [
    { val: 'kpop', labelKey: 'trendyKpop' as const, prompt: "High-budget music video still frame, powerful synchronized dance choreography captured mid-motion, energetic performance, dynamic camera angle, dramatic stage lighting with lens flare, sharp focus on movement, vibrant cinematic color grading.", emoji: "🎤" },
    { val: 'tiktok', labelKey: 'trendyTiktok' as const, prompt: "Viral social media dance clip screenshot, trendy aesthetic, dynamic body movement, slight motion blur emphasizing action, handheld camera feel, raw energy, candid yet stylish composition, distinct street fashion.", emoji: "🎵" },
    { val: 'street', labelKey: 'trendyStreet' as const, prompt: "High-fashion streetwear editorial advertisement, professional model with a powerful and confident pose, gritty urban background, professional commercial photography lighting, sharp focus, shallow depth of field, premium brand look.", emoji: "🧢" },
    { val: 'dance', labelKey: 'trendyDance' as const, prompt: "Spectacular professional dance photography, frozen mid-air action pose, explosive movement, high tension, dramatic lighting highlighting muscle definition, impactful composition, raw power and grace.", emoji: "🕺" }
];

const EXTREME_ACTIONS = [
  "Jumping in mid-air with dynamic motion blur, action pose", 
  "Sitting on the ground, looking up, relaxed pose", 
  "Running towards the camera aggressively, dynamic movement", 
  "Lying down, top-down view, relaxing", 
  "Back view, turning head around, mystery",
  "Dynamic combat pose, fighting stance",
  "Floating in zero gravity, weightless pose"
];

const EXTREME_ANGLES = [
  "Extreme Low Angle (Worm's eye view), imposing", 
  "High Angle (Drone shot), birds eye view", 
  "Dutch Angle (Tilted 30 degrees), dynamic framing", 
  "Wide-angle Fisheye Lens distortion, 10mm lens", 
  "Over-the-shoulder shot, cinematic perspective"
];

const fileToImageSource = (file: File): Promise<ImageSource> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({
        url: result,
        base64,
        mimeType: file.type,
      });
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
};

const Accordion: React.FC<{ title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; icon?: React.ReactNode }> = ({ title, children, defaultOpen = false, icon }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 dark:border-white/5 last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between py-5 text-left group outline-none"
      >
        <div className="flex items-center gap-3">
            {icon && <div className="text-gray-400 group-hover:text-indigo-500 transition-colors">{icon}</div>}
            <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-2">{title}</div>
        </div>
        <ChevronRightIcon className={`w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-500 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      <div 
        className={`transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen ? 'max-h-[2000px] opacity-100 pb-8 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'}`}
      >
        {children}
      </div>
    </div>
  );
};

const InfoTooltip: React.FC<{ content: string }> = ({ content }) => {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = () => {
      if (triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          setCoords({
              x: rect.right + 12, 
              y: rect.top
          });
          setShow(true);
      }
  };

  return (
    <>
      <button
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => { e.stopPropagation(); handleMouseEnter(); }}
        className="text-gray-300 hover:text-indigo-500 transition-colors ml-1.5 align-middle"
      >
        <QuestionMarkCircleIcon className="w-3.5 h-3.5" />
      </button>
      
      {show && createPortal(
        <div 
            className="fixed z-[9999] w-64 p-3 bg-gray-900/95 text-white text-[11px] font-medium rounded-xl shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-left-2 duration-200 pointer-events-none border border-white/10 leading-relaxed whitespace-pre-wrap"
            style={{ 
                left: coords.x, 
                top: coords.y,
            }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}

const Lightbox: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    setScale(prev => Math.max(1, Math.min(5, prev - e.deltaY * 0.005)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    return () => {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-300 overflow-hidden" 
      onClick={onClose}
    >
      <button 
        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-50 backdrop-blur-md border border-white/10"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        <XCircleIcon className="w-8 h-8" />
      </button>

      <div 
        className="w-full h-full flex items-center justify-center cursor-move"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={imageUrl} 
          alt="Fullscreen Preview"
          className="max-w-full max-h-full object-contain transition-transform duration-100 ease-out"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: scale > 1 ? 'grab' : 'zoom-in' 
          }}
          onClick={() => scale === 1 && setScale(1.5)} 
          draggable={false}
        />
      </div>
      
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 text-white/70 text-xs rounded-full backdrop-blur-sm pointer-events-none">
        Scroll to Zoom • Drag to Pan
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const { t, language, toggleLanguage } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  
  const [prompt, setPrompt] = useState<string>('');
  const [originalImage, setOriginalImage] = useState<ImageSource | null>(null);
  const [sourceImage, setSourceImage] = useState<ImageSource | null>(null);
  const [maskImage, setMaskImage] = useState<string | null>(null);
  
  const [styleReferenceImages, setStyleReferenceImages] = useState<ImageSource[]>([]);
  const [assetImages, setAssetImages] = useState<ImageSource[]>([]);
  
  const [currentGeneratedImage, setCurrentGeneratedImage] = useState<ImageSource | null>(null);
  const [generatedImageHistory, setGeneratedImageHistory] = useState<ImageSource[]>([]);
  const [isSourceLoading, setIsSourceLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isUpscaling, setIsUpscaling] = useState<boolean>(false); 
  const [error, setError] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  
  // Refactored API Key State: Use localStorage instead of platform SDK
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [manualApiKey, setManualApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  const hasApiKey = !!apiKey;

  useEffect(() => {
    if (apiKey) {
        process.env.API_KEY = apiKey;
    }
  }, [apiKey]);

  const handleSaveKey = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!manualApiKey.trim()) {
        showToast("Please enter a valid API Key", 'error');
        return;
    }
    localStorage.setItem('gemini_api_key', manualApiKey.trim());
    setApiKey(manualApiKey.trim());
    process.env.API_KEY = manualApiKey.trim();
    setIsKeyModalOpen(false);
    showToast(t.keySaved, 'success');
  };

  const handleRemoveKey = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setManualApiKey('');
    process.env.API_KEY = '';
    showToast(t.removeKey, 'info');
  };

  const [selectedSize, setSelectedSize] = useState<ImageSize>("1K");
  
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>(() => {
      if (typeof window !== 'undefined') {
          return (localStorage.getItem('savedAspectRatio') as AspectRatio) || "16:9";
      }
      return "16:9";
  });

  const [selectedAngle, setSelectedAngle] = useState<CameraAngle>(null);
  const [structureWeight, setStructureWeight] = useState<number>(50); 
  const [randomCinematicPrompt, setRandomCinematicPrompt] = useState<string>("");

  const [isGeneratingScenes, setIsGeneratingScenes] = useState<boolean>(false);
  const [sceneProgress, setSceneProgress] = useState<number>(0);

  const [selectedShotSize, setSelectedShotSize] = useState<string | null>(null);
  const [selectedCameraHeight, setSelectedCameraHeight] = useState<string | null>(null);
  const [selectedMotion, setSelectedMotion] = useState<string | null>(null);
  const [selectedCameraMovement, setSelectedCameraMovement] = useState<string | null>(null);
  const [selectedTrendyStyle, setSelectedTrendyStyle] = useState<string | null>(null);

  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState<boolean>(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(true);

  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleFileInputRef = useRef<HTMLInputElement>(null);
  const assetFileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
      localStorage.setItem('savedAspectRatio', selectedAspectRatio);
  }, [selectedAspectRatio]);

  const resetGeneratedState = useCallback(() => {
    setCurrentGeneratedImage(null);
    setGeneratedImageHistory([]);
    setMaskImage(null);
  }, []);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i] as DataTransferItem;
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            try {
              const source = await fileToImageSource(blob);
              setOriginalImage(source);
              setSourceImage(source);
              resetGeneratedState();
              setError(null);
            } catch (err: any) {
              const msg = "Failed to paste image: " + err.message;
              setError(msg);
              showToast(msg, 'error');
            }
          }
          break; 
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [resetGeneratedState, showToast]);

  const openKeyModal = (e?: React.MouseEvent) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    setIsKeyModalOpen(true);
  };

  const handleRandomPrompt = () => {
    const prompts = t.randomPrompts;
    if (prompts && prompts.length > 0) {
      const randomIndex = Math.floor(Math.random() * prompts.length);
      setPrompt(prompts[randomIndex]);
    }
  };

  const handleAngleSelection = (angle: CameraAngle) => {
    if (selectedAngle === angle) {
      setSelectedAngle(null);
      return;
    }
    setSelectedAngle(angle);
    if (angle === 'sheet') {
      setSelectedAspectRatio("16:9");
    }
  };

  const randomizeCinematic = () => {
    const randomShot = SHOT_SIZES[Math.floor(Math.random() * SHOT_SIZES.length)];
    const randomHeight = CAMERA_HEIGHTS[Math.floor(Math.random() * CAMERA_HEIGHTS.length)];
    const randomMotion = MOTIONS[Math.floor(Math.random() * MOTIONS.length)];
    const randomCamMove = CAMERA_MOVEMENTS[Math.floor(Math.random() * CAMERA_MOVEMENTS.length)];
    
    setSelectedShotSize(randomShot.val);
    setSelectedCameraHeight(randomHeight.val);
    setSelectedMotion(randomMotion.val);
    setSelectedCameraMovement(randomCamMove.val);

    const randomAction = EXTREME_ACTIONS[Math.floor(Math.random() * EXTREME_ACTIONS.length)];
    const randomAngle = EXTREME_ANGLES[Math.floor(Math.random() * EXTREME_ANGLES.length)];

    const extraPrompt = `${randomAction}, ${randomAngle}`;
    setRandomCinematicPrompt(extraPrompt);
    setStructureWeight(35);

    showToast(`Director's Cut: ${randomAction.split(',')[0]} + ${randomAngle.split(',')[0]}`, 'info');
  };

  const executeGeneration = async (targetPrompt: string, size: ImageSize = selectedSize, aspectRatio: AspectRatio = selectedAspectRatio, overrideStyleRefs?: any[], overrideStructureWeight?: number, seed?: number) => {
    if (!sourceImage) { 
      setError("Upload a source image."); 
      showToast("Please upload a source image first.", 'error');
      return; 
    }
    
    if (!hasApiKey) {
      setError("API Key Required");
      showToast("Please set your Gemini API Key in settings first.", 'error');
      openKeyModal();
      return;
    }

    setIsGenerating(true);
    setIsUpscaling(false);
    setError(null);

    let promptParts: string[] = [];
    if (targetPrompt && targetPrompt.trim().length > 0) {
        promptParts.push(targetPrompt.trim());
    }
    
    let effectiveStructureWeight = overrideStructureWeight !== undefined ? overrideStructureWeight : structureWeight;

    if (selectedAngle === 'side') {
        promptParts.push("Profile view of subject. Background perspective shifts to reveal the SIDE WALL and depth of the room. Vanishing point moves to the side. NOT a flat background.");
    }
    if (selectedAngle === 'back') {
        promptParts.push("Reverse angle shot. Showing the OPPOSITE side of the room (e.g., the door or wall BEHIND the character). The window is now behind the camera.");
    }
    if (selectedCameraHeight === 'low') {
        promptParts.push("Worm's eye view. Visible CEILING structure, upper parts of furniture/windows, and tall vertical lines. Floor is not visible.");
    }
    if (selectedCameraHeight === 'high') {
        promptParts.push("Bird's eye view. Visible FLOOR texture and patterns, tops of furniture. Ceiling is not visible.");
    }

    if (selectedAngle && selectedAngle !== 'sheet') {
        const commonRules = "Wide-angle shot, cinematic lighting, 8k resolution, ample space above head and below feet, head to toe visible";
        let angleSpecific = "";
        
        switch (selectedAngle) {
            case 'front': angleSpecific = "Symmetrical front view, facing the camera directly"; break;
            case 'side': angleSpecific = "Side profile view, walking sideways"; break;
            case 'back': angleSpecific = "View from behind, back of the character, facing away from camera"; break;
        }

        promptParts.push(commonRules);
        promptParts.push(angleSpecific);
    } else if (selectedAngle === 'sheet') {
        promptParts.push("Character reference sheet, showing front view, side view, and back view of the same character standing side by side, consistent character details, white background");
    }

    const cinematicPrompts = [];
    if (selectedShotSize) {
        const opt = SHOT_SIZES.find(s => s.val === selectedShotSize);
        if (opt) cinematicPrompts.push(opt.prompt);
    }
    if (selectedCameraHeight) {
        const opt = CAMERA_HEIGHTS.find(s => s.val === selectedCameraHeight);
        if (opt) cinematicPrompts.push(opt.prompt);
    }
    
    if (selectedMotion) {
        if (SCENARIO_POOLS[selectedMotion]) {
            const pool = SCENARIO_POOLS[selectedMotion];
            const randomScenario = pool[Math.floor(Math.random() * pool.length)];
            cinematicPrompts.push(randomScenario);
            
            if (selectedMotion !== 'static' && overrideStructureWeight === undefined) {
                effectiveStructureWeight = 20; 
            }
        } else {
            const opt = MOTIONS.find(s => s.val === selectedMotion);
            if (opt) {
                 if (opt.val === 'static') cinematicPrompts.push("Standing still, calm pose, steady, no movement");
            }
        }
    }

    if (selectedCameraMovement) {
        const opt = CAMERA_MOVEMENTS.find(s => s.val === selectedCameraMovement);
        if (opt) cinematicPrompts.push(opt.prompt);
    }
    if (selectedTrendyStyle) {
        const opt = TRENDY_STYLES.find(s => s.val === selectedTrendyStyle);
        if (opt) cinematicPrompts.push(opt.prompt);
    }
    
    if (cinematicPrompts.length > 0) {
        promptParts.push(cinematicPrompts.join(", "));
    }

    if (randomCinematicPrompt) {
        promptParts.push(`(Director's Cut: ${randomCinematicPrompt})`);
    }

    const isCinematicActive = selectedShotSize || selectedCameraHeight || selectedMotion || selectedCameraMovement || randomCinematicPrompt;
    
    if (isCinematicActive && selectedAngle !== 'sheet') {
        promptParts.push("volumetric atmosphere, depth of field, spatial depth, 3D render style environment");

        if (selectedCameraHeight === 'low' || (randomCinematicPrompt && /low angle|worm/i.test(randomCinematicPrompt))) {
            promptParts.push("imposing perspective, towering background elements");
        }

        if (selectedCameraHeight === 'high' || (randomCinematicPrompt && /high angle|drone/i.test(randomCinematicPrompt))) {
            promptParts.push("ground-level details emphasized");
        }

        if (selectedCameraMovement === 'dynamic' || selectedShotSize === 'extremewide' || (randomCinematicPrompt && /fisheye|wide-angle/i.test(randomCinematicPrompt))) {
            promptParts.push("wide-angle lens distortion, expansive view of the entire room corner, exaggerated perspective vanishing point, seeing multiple walls and floor simultaneously");
        }

        if (randomCinematicPrompt && /dutch angle|tilted/i.test(randomCinematicPrompt)) {
            promptParts.push("disoriented tilted horizon line, slanted walls and floor, dynamic diagonal composition of the space");
        }
    }

    const strictNegativePrompts = ["(changing background:1.5)", "new location", "different room", "remodeling", "changing furniture", "changing lighting", "morphing background", "distorted architecture"];
    
    if (selectedMotion === 'sitting' || selectedMotion === 'lying') {
         strictNegativePrompts.push("(bench:1.5)", "park bench", "outdoor furniture", "grass", "street elements", "public park", "new chair");
    }

    if (['running', 'jumping', 'reaching', 'crouching'].includes(selectedMotion || '')) {
         strictNegativePrompts.push("(martial arts, kung fu, fighting stance, superhero landing, combat, punching, kicking, karate:1.5)");
    }

    if (selectedMotion === 'running' || selectedMotion === 'jumping') {
         strictNegativePrompts.push("distance running", "track", "road", "spacious outdoors", "changing location", "forest", "street");
    }

    strictNegativePrompts.push("outdoor", "exterior", "sky", "sunlight", "nature");

    promptParts.push(`[NEGATIVE PROMPT: ${strictNegativePrompts.join(", ")}]`);

    if (selectedMotion) {
        promptParts.push("candid photography, motion blur, direct flash, slightly out of focus, raw aesthetic, teenage vibe, high school concept, iPhone camera quality");
        promptParts.push("[NEGATIVE PROMPT: studio lighting, perfect pose, his model, professional headshot, staged photo]");
    }

    let finalPrompt = promptParts.join(", ");
    
    if (!finalPrompt || finalPrompt.trim().length === 0) {
        finalPrompt = "High quality image transformation, cinematic lighting, 8k resolution";
    }
    
    try {
      const initialSize = size === "4K" ? "1K" : size;

      const result = await editImage(
        sourceImage.base64, sourceImage.mimeType, finalPrompt,
        overrideStyleRefs || (styleReferenceImages.length > 0 ? styleReferenceImages : undefined),
        assetImages.length > 0 ? assetImages : undefined,
        initialSize, aspectRatio,
        maskImage || undefined,
        effectiveStructureWeight, 
        seed
      );

      if (result.imageUrl && result.base64 && result.mimeType) {
        const newImg = { 
          url: result.imageUrl, 
          base64: result.base64, 
          mimeType: result.mimeType,
          prompt: targetPrompt || "[Click Generation] " + finalPrompt.substring(0, 30) + "...", 
          timestamp: Date.now(),
          isSheet: selectedAngle === 'sheet'
        };
        setCurrentGeneratedImage(newImg);
        setGeneratedImageHistory(prev => [...prev, newImg]);
        
        setIsGenerating(false); 

        if (size === "4K") {
            setIsUpscaling(true);
            try {
                const upscaleResult = await editImage(
                    result.base64, 
                    result.mimeType, 
                    finalPrompt,
                    overrideStyleRefs || (styleReferenceImages.length > 0 ? styleReferenceImages : undefined),
                    assetImages.length > 0 ? assetImages : undefined,
                    "4K", 
                    aspectRatio,
                    undefined,
                    100,
                    seed
                );

                if (upscaleResult.imageUrl && upscaleResult.base64 && upscaleResult.mimeType) {
                    const upscaledImg = {
                        url: upscaleResult.imageUrl,
                        base64: upscaleResult.base64,
                        mimeType: upscaleResult.mimeType,
                        prompt: (targetPrompt || "[Click Generation]") + " (Upscaled)",
                        timestamp: Date.now(),
                        isSheet: selectedAngle === 'sheet'
                    };
                    setCurrentGeneratedImage(upscaledImg);
                    setGeneratedImageHistory(prev => {
                        const newHistory = [...prev];
                        if (newHistory.length > 0) {
                            newHistory[newHistory.length - 1] = upscaledImg;
                        }
                        return newHistory;
                    });
                }
            } catch (upscaleErr) {
                console.error("Upscale failed, keeping 1K image", upscaleErr);
                showToast("4K Upscale failed due to timeout, but 1K image is saved.", 'info');
            } finally {
                setIsUpscaling(false);
            }
        }
        return newImg;
      } else {
          setIsGenerating(false);
      }
    } catch (err: any) {
      setIsGenerating(false);
      setIsUpscaling(false);
      let errorMsg = err.message || "Unknown error";
      
      if (errorMsg === "SERVER_BUSY" || errorMsg.includes("503") || errorMsg.includes("Deadline")) {
          errorMsg = t.serverBusy;
      }

      setError(errorMsg);
      showToast(errorMsg === t.serverBusy ? errorMsg : t.genError, 'error');
    }
  };

  const handleGeneratePersonaScenes = async () => {
      if (!sourceImage) {
        showToast("Please upload a source image first.", 'error');
        return;
      }
      setIsGeneratingScenes(true);
      setSceneProgress(0);

      const scenes = [
          { name: "Establishing Shot", promptPrefix: "Cinematic Establishing Shot, Wide Angle Master Shot. Show the character in their full environment. Action: Sitting on the bed or interacting with the space. Mood: Atmospheric. Persona: " },
          { name: "Emotional Close-up", promptPrefix: "Extreme Close-up (ECU) on face, High Angle POV. Focus on eyes reflecting light, subtle emotional expression. Intimate mood. Persona: " },
          { name: "Activity/Hobby", promptPrefix: "Mid-Shot or Over-the-Shoulder. Character is busy with a hobby, writing in a diary, or using a phone. Focused action. Persona: " },
          { name: "Vibe Snapshot", promptPrefix: "Candid Snapshot, 'NewJeans' style aesthetic. Dutch Angle, Direct Flash, Motion Blur. Breaking the 4th wall, playful or lazy. Raw teenage vibe. Persona: " },
          { name: "Detail Macro", promptPrefix: "Artistic Macro Shot (B-roll). Focus on hands holding an object, textures of clothing, or environmental details. No face necessary. Persona: " }
      ];

      const batchStructureWeight = 20;

      try {
          for (let i = 0; i < scenes.length; i++) {
              const scene = scenes[i];
              const fullPrompt = `${scene.promptPrefix} ${prompt}`;
              
              showToast(`Generating Scene: ${scene.name}... (${i+1}/5)`, 'info');
              
              const result = await editImage(
                sourceImage.base64, 
                sourceImage.mimeType, 
                fullPrompt,
                styleReferenceImages.length > 0 ? styleReferenceImages : undefined,
                assetImages.length > 0 ? assetImages : undefined,
                "1K",
                "16:9", 
                undefined,
                batchStructureWeight 
              );

              if (result.imageUrl && result.base64 && result.mimeType) {
                  const newImg = { 
                      url: result.imageUrl, 
                      base64: result.base64, 
                      mimeType: result.mimeType,
                      prompt: `[Scene: ${scene.name}] ${prompt}`, 
                      timestamp: Date.now(),
                      isSheet: false
                  };
                  setCurrentGeneratedImage(newImg);
                  setGeneratedImageHistory(prev => [...prev, newImg]);
              }
              setSceneProgress(i + 1);
          }
          showToast("Persona Scenario Generation Complete!", 'success');
      } catch (e: any) {
          console.error(e);
          showToast("Scenario Generation interrupted.", 'error');
      } finally {
          setIsGeneratingScenes(false);
          setSceneProgress(0);
      }
  };

  const handleSwapImages = () => {
    if (!sourceImage && !currentGeneratedImage) return;
    setIsSwapping(true);
    setTimeout(() => setIsSwapping(false), 500);
    const tempSource = sourceImage;
    setSourceImage(currentGeneratedImage);
    setCurrentGeneratedImage(tempSource);
    setMaskImage(null); 
    setError(null);
  };

  const handleRemoveStyleImage = (index: number) => setStyleReferenceImages(prev => prev.filter((_, i) => i !== index));
  const handleRemoveAssetImage = (index: number) => setAssetImages(prev => prev.filter((_, i) => i !== index));
  const handleBranchFromHistory = (img: ImageSource) => { setSourceImage(img); setMaskImage(null); setError(null); };
  const handleResetToOriginal = () => { if (originalImage) { setSourceImage(originalImage); setMaskImage(null); setError(null); } };
  const handleDeleteResult = () => { setCurrentGeneratedImage(null); setGeneratedImageHistory(prev => prev.slice(0, -1)); };
  const handleDeleteSource = () => { setSourceImage(null); setOriginalImage(null); resetGeneratedState(); };

  const isUsingOriginal = sourceImage?.url === originalImage?.url;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [prompt]);

  return (
    <div className={`h-screen flex flex-row ${theme === 'dark' ? 'dark bg-[#111827]' : 'bg-[#FAFAFB]'} text-gray-900 dark:text-gray-100 font-sans transition-all duration-300 relative overflow-hidden`}>
      
      {previewImageUrl && (
        <Lightbox imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
      )}

      <aside 
        className={`flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-white/5 flex flex-col z-20 transition-all duration-300 ease-in-out
          ${!hasApiKey ? 'opacity-100' : ''}
          ${isLeftSidebarOpen ? 'w-[340px] opacity-100 translate-x-0' : 'w-0 opacity-0 overflow-hidden -translate-x-full border-r-0'}
        `}
      >
        <div className="p-8 pb-4 min-w-[340px]">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                <SparklesIcon className="w-5 h-5" />
             </div>
             <div>
               <h1 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white leading-none mb-1">{t.title}</h1>
               <span className="text-[10px] font-bold text-gray-400 tracking-wider">TRANSFORMER</span>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-20 space-y-8 min-w-[340px] overflow-x-visible">
            {/* AI Special Feature Section */}
            <div className="pt-2">
                <div className="flex items-center gap-1 mb-4 px-2">
                    <SparklesIcon className="w-4 h-4 text-purple-500" />
                    <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">{t.sectionSpecial}</div>
                    <InfoTooltip content={t.tooltipAIDirector} />
                </div>
                <button 
                    onClick={handleGeneratePersonaScenes}
                    disabled={isGenerating || isGeneratingScenes || !hasApiKey}
                    className={`w-full flex flex-col items-center justify-center gap-1 p-5 rounded-2xl border transition-all relative overflow-hidden shadow-lg active:scale-95 ${
                        isGeneratingScenes
                        ? 'bg-purple-600 text-white border-purple-600'
                        : !hasApiKey 
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-transparent cursor-not-allowed'
                          : 'bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-transparent shadow-purple-500/20 hover:shadow-purple-500/40'
                    }`}
                >
                    {isGeneratingScenes ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white mb-1" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                            <span className="text-[11px] font-black uppercase tracking-widest">{`${t.generatingScenes} (${sceneProgress}/5)`}</span>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-[14px] font-black uppercase tracking-tight">{t.btnAIDirector}</span>
                            </div>
                            <span className="text-[10px] font-medium opacity-60 text-center">{t.subAIDirector}</span>
                        </>
                    )}
                </button>
            </div>

            {/* Section 1: Character Viewpoint */}
            <Accordion title={t.sectionCharacterView} icon={<AssetIcon className="w-4 h-4" />} defaultOpen={true}>
                <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { val: 'front', label: t.angleFront, icon: '😐' },
                            { val: 'side', label: t.angleSide, icon: '🚶' },
                            { val: 'back', label: t.angleBack, icon: '🔙' }
                        ].map((opt) => (
                            <button
                                key={opt.val}
                                onClick={() => handleAngleSelection(opt.val as CameraAngle)}
                                disabled={!hasApiKey}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all h-20 ${
                                    selectedAngle === opt.val
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30'
                                }`}
                            >
                                <span className="text-lg leading-none mb-1.5">{opt.icon}</span>
                                <span className="text-[9px] font-bold leading-tight">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => handleAngleSelection('sheet')}
                        disabled={!hasApiKey}
                        className={`w-full flex items-center justify-center gap-3 p-3 rounded-xl border transition-all h-14 ${
                            selectedAngle === 'sheet'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                            : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-indigo-500 hover:text-indigo-600 disabled:opacity-30'
                        }`}
                    >
                        <span className="text-lg leading-none">📋</span>
                        <span className="text-[10px] font-bold leading-tight uppercase tracking-wider">{t.angleSheet}</span>
                    </button>
                </div>
            </Accordion>

            {/* Section 2: Cinematic Director */}
            <Accordion title={t.sectionCamera} icon={<BoltIcon className="w-4 h-4" />} defaultOpen={true}>
                <div className="space-y-8 pt-4">
                     <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                            {t.labelCinematic}
                        </label>
                        <button 
                            onClick={randomizeCinematic}
                            disabled={!hasApiKey}
                            className="text-[10px] font-bold text-indigo-500 flex items-center gap-1 hover:text-indigo-600 transition-colors bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-md disabled:opacity-30"
                        >
                            <span>🎲</span>
                            <span>{t.randomCinematic}</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center">
                            <label className="text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-wider pl-1">{t.labelShotSize}</label>
                            <InfoTooltip content={t.tooltipShotSize} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {SHOT_SIZES.map((opt) => (
                                <button
                                    key={opt.val}
                                    onClick={() => setSelectedShotSize(selectedShotSize === opt.val ? null : opt.val)}
                                    disabled={!hasApiKey}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all h-14 ${
                                        selectedShotSize === opt.val
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-indigo-300 disabled:opacity-30'
                                    }`}
                                >
                                    <span className="text-xl leading-none">{opt.emoji}</span>
                                    <span className="text-[10px] font-bold leading-tight">{t[opt.labelKey]}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <label className="text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-wider pl-1">{t.labelCameraHeight}</label>
                            <InfoTooltip content={t.tooltipShotSize} />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {CAMERA_HEIGHTS.map((opt) => (
                                <button
                                    key={opt.val}
                                    onClick={() => setSelectedCameraHeight(selectedCameraHeight === opt.val ? null : opt.val)}
                                    disabled={!hasApiKey}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all h-20 ${
                                        selectedCameraHeight === opt.val
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30'
                                    }`}
                                >
                                    <span className="text-lg leading-none mb-1.5">{opt.emoji}</span>
                                    <span className="text-[9px] font-bold leading-tight">{t[opt.labelKey]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center">
                            <label className="text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-wider pl-1">{t.labelMotion}</label>
                            <InfoTooltip content={t.tooltipMotion} />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {MOTIONS.map((opt) => (
                                <button
                                    key={opt.val}
                                    onClick={() => setSelectedMotion(selectedMotion === opt.val ? null : opt.val)}
                                    disabled={!hasApiKey}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all h-20 ${
                                        selectedMotion === opt.val
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30'
                                    }`}
                                    title={t[opt.labelKey]}
                                >
                                    <span className="text-lg leading-none mb-1.5">{opt.emoji}</span>
                                    <span className="text-[9px] font-bold leading-tight truncate w-full text-center">{t[opt.labelKey]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-white/5 mt-2">
                        <div className="flex items-center">
                            <label className="text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-wider pl-1">{t.labelTrendy}</label>
                            <InfoTooltip content={t.tooltipTrendy} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {TRENDY_STYLES.map((opt) => (
                                <button
                                    key={opt.val}
                                    onClick={() => setSelectedTrendyStyle(selectedTrendyStyle === opt.val ? null : opt.val)}
                                    disabled={!hasApiKey}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all h-16 ${
                                        selectedTrendyStyle === opt.val
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-indigo-300 disabled:opacity-30'
                                    }`}
                                >
                                    <span className="text-xl">{opt.emoji}</span>
                                    <span className="text-[10px] font-bold leading-tight text-left">{t[opt.labelKey]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center">
                            <label className="text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-wider pl-1">{t.labelCameraMovement}</label>
                            <InfoTooltip content={t.tooltipCameraMovement} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {CAMERA_MOVEMENTS.map((opt) => (
                                <button
                                    key={opt.val}
                                    onClick={() => setSelectedCameraMovement(selectedCameraMovement === opt.val ? null : opt.val)}
                                    disabled={!hasApiKey}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all h-16 ${
                                        selectedCameraMovement === opt.val
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-indigo-300 disabled:opacity-30'
                                    }`}
                                    title={t[opt.labelKey]}
                                >
                                    <span className="text-xl leading-none">{opt.emoji}</span>
                                    <span className="text-[10px] font-bold leading-tight text-left">{t[opt.labelKey]}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </Accordion>

            {/* Section 3: Output Settings */}
            <Accordion title={t.sectionSettings} icon={<SettingsIcon className="w-4 h-4" />}>
                <div className="space-y-6 pt-4">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t.labelQuality}</label>
                        <button 
                            onClick={() => setSelectedSize(prev => prev === "4K" ? "1K" : "4K")}
                            disabled={!hasApiKey}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                                selectedSize === "4K" 
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' 
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'
                            } disabled:opacity-30`}
                        >
                            <span className="text-xs font-bold">{t.btn4K}</span>
                            <SparklesIcon className={`w-4 h-4 ${selectedSize === "4K" ? 'text-white' : 'text-gray-300'}`} />
                        </button>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t.labelRatio}</label>
                        <div className="flex flex-col gap-2">
                            {[
                                { val: "16:9", label: t.btn16_9, iconClass: "w-5 h-3 border-2" },
                                { val: "9:16", label: t.btn9_16, iconClass: "w-3 h-5 border-2" },
                                { val: "1:1", label: t.btn1_1, iconClass: "w-4 h-4 border-2" }
                            ].map((opt) => (
                                <button
                                    key={opt.val}
                                    onClick={() => setSelectedAspectRatio(opt.val as AspectRatio)}
                                    disabled={!hasApiKey}
                                    className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                                        selectedAspectRatio === opt.val
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300'
                                        : 'bg-white dark:bg-gray-800 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-500'
                                    } disabled:opacity-30`}
                                >
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${selectedAspectRatio === opt.val ? 'bg-indigo-100 dark:bg-indigo-500/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                        <div className={`${opt.iconClass} rounded-[1px] border-current`} />
                                    </div>
                                    <span className="text-xs font-bold">{opt.label}</span>
                                    {selectedAspectRatio === opt.val && <div className="ml-auto w-2 h-2 rounded-full bg-indigo-500" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </Accordion>
        </div>
      </aside>

      <div className="flex-1 flex flex-col relative overflow-hidden bg-gray-50/50 dark:bg-[#0B0F17]">
        <button
            onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-40 w-5 h-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-r-xl flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-400 hover:text-indigo-600 transition-all shadow-md group"
            title={isLeftSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
            {isLeftSidebarOpen ? (
                <ChevronLeftIcon className="w-4 h-4" />
            ) : (
                <ChevronRightIcon className="w-4 h-4" />
            )}
        </button>

        <button
            onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-40 w-5 h-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-l-xl flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-400 hover:text-indigo-600 transition-all shadow-md group"
            title={isRightSidebarOpen ? "Collapse History" : "Expand History"}
        >
             {isRightSidebarOpen ? (
                <ChevronRightIcon className="w-4 h-4" />
            ) : (
                <ChevronLeftIcon className="w-4 h-4" />
            )}
        </button>
        
        <header className="absolute top-6 right-8 flex justify-end items-center gap-4 z-50">
          {/* Restored Status Badge Trigger */}
          <button 
            onClick={(e) => openKeyModal(e)}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border backdrop-blur-md shadow-sm ${
              hasApiKey 
                ? 'bg-white/80 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-500/20' 
                : 'bg-white/80 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100/50 dark:border-rose-500/20'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            {hasApiKey ? t.apiKeyConnected : t.apiKeyDisconnected}
          </button>

          {/* New Header Settings Gear Trigger */}
          <button 
            onClick={(e) => openKeyModal(e)}
            className="w-9 h-9 rounded-full bg-white/0 dark:bg-gray-800/0 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-indigo-500 transition-all group"
            title="API 설정 (API Settings)"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          <button 
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-indigo-500 transition-colors shadow-sm"
          >
            {theme === 'dark' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
          </button>

          <div className="bg-white dark:bg-gray-800 p-1 rounded-full flex border border-gray-100 dark:border-gray-700 shadow-sm">
            <button 
              onClick={() => language !== 'ko' && toggleLanguage()}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${
                language === 'ko' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              KO
            </button>
            <button 
              onClick={() => language !== 'en' && toggleLanguage()}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${
                language === 'en' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              EN
            </button>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center justify-start pt-24 md:pt-28 pb-48 p-4 md:px-8 transition-all duration-700 ${!hasApiKey ? 'blur-sm opacity-50 pointer-events-none' : ''}`}>
          <div className="w-full max-w-[1600px] flex flex-col xl:flex-row gap-4 xl:gap-8 items-center justify-center">
            <div className={`flex-1 min-w-0 w-full aspect-square relative transition-all duration-500 ease-in-out ${!isLeftSidebarOpen && !isRightSidebarOpen ? 'max-w-[800px]' : 'max-w-[650px]'}`}>
              <ImagePanel 
                panelType="source" 
                title={t.sourceImage} 
                imageUrl={sourceImage?.url ?? null} 
                isLoading={isSourceLoading} 
                isActionDisabled={isGenerating} 
                isOriginal={isUsingOriginal} 
                onReset={!isUsingOriginal && originalImage ? handleResetToOriginal : undefined} 
                originalThumbnail={!isUsingOriginal ? originalImage?.url : undefined} 
                onZoom={setPreviewImageUrl} 
                onChangeImage={() => fileInputRef.current?.click()} 
                onDelete={handleDeleteSource}
                onMaskChange={setMaskImage}
              />
            </div>
            
            <div className="flex-shrink-0 z-30">
              <button 
                onClick={handleSwapImages} 
                disabled={(!sourceImage && !currentGeneratedImage) || isGenerating} 
                className="w-14 h-14 flex items-center justify-center bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-full transition-all shadow-xl hover:scale-110 active:scale-95 border border-gray-100 dark:border-gray-700" 
              >
                <SwapIcon className={`w-6 h-6 transition-transform duration-500 ${isSwapping ? 'rotate-[360deg]' : ''}`} />
              </button>
            </div>

            <div className={`flex-1 min-w-0 w-full aspect-square relative transition-all duration-500 ease-in-out ${!isLeftSidebarOpen && !isRightSidebarOpen ? 'max-w-[800px]' : 'max-w-[650px]'}`}>
              <ImagePanel 
                panelType="result" 
                title={t.generatedImage} 
                imageUrl={currentGeneratedImage?.url ?? null} 
                isLoading={(isGenerating && !isUpscaling) || isGeneratingScenes} 
                onRevert={() => { const h = [...generatedImageHistory]; h.pop(); setGeneratedImageHistory(h); setCurrentGeneratedImage(h[h.length-1] || null); }} 
                isRevertDisabled={generatedImageHistory.length < 2} 
                isActionDisabled={isGenerating} 
                onZoom={setPreviewImageUrl} 
                onDelete={handleDeleteResult} 
                isSheet={currentGeneratedImage?.isSheet}
                currentImageSource={currentGeneratedImage || undefined}
              />
              {isUpscaling && (
                  <div className="absolute inset-0 bg-white/30 dark:bg-black/40 backdrop-blur-sm rounded-[2rem] z-10 flex flex-col items-center justify-center animate-in fade-in duration-500">
                      <div className="bg-white dark:bg-gray-900 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-gray-100 dark:border-gray-700">
                          <svg className="animate-spin h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-100">{t.upscaling}</span>
                      </div>
                  </div>
              )}
            </div>
          </div>
          {error && <div className="mt-4 px-6 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-full text-xs font-bold border border-rose-100 dark:border-rose-900/30 animate-shake">{error}</div>}
        </main>

        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-3xl z-[100] px-4 flex flex-col items-center">
            {(styleReferenceImages.length > 0 || assetImages.length > 0) && (
                <div className="w-full pl-6 pb-2 flex gap-2 overflow-x-auto hide-scrollbar animate-in slide-in-from-bottom-2 fade-in duration-300">
                    {styleReferenceImages.map((img, idx) => (
                        <div key={`style-${idx}`} className="relative group shrink-0 w-16 h-16">
                            <img src={img.url} className="w-full h-full object-cover rounded-xl border-2 border-purple-500 shadow-md" alt="Style Ref" />
                            <div className="absolute -top-1.5 -left-1.5 bg-purple-500 text-white rounded-full p-1 border border-white dark:border-gray-900 shadow-sm z-10">
                                <PaintBrushIcon className="w-2.5 h-2.5" />
                            </div>
                            <button onClick={() => handleRemoveStyleImage(idx)} className="absolute -top-1.5 -right-1.5 bg-gray-900/90 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-10 hover:bg-rose-500">
                                <XCircleIcon className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    {assetImages.map((img, idx) => (
                        <div key={`asset-${idx}`} className="relative group shrink-0 w-16 h-16">
                            <img src={img.url} className="w-full h-full object-cover rounded-xl border-2 border-blue-500 shadow-md" alt="Asset Ref" />
                            <div className="absolute -top-1.5 -left-1.5 bg-blue-500 text-white rounded-full p-1 border border-white dark:border-gray-900 shadow-sm z-10">
                                <AssetIcon className="w-2.5 h-2.5" />
                            </div>
                            <button onClick={() => handleRemoveAssetImage(idx)} className="absolute -top-1.5 -right-1.5 bg-gray-900/90 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-10 hover:bg-rose-500">
                                <XCircleIcon className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className={`w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-full transition-all duration-300 flex items-center p-2 pr-2 h-14 ${isGenerating ? 'ring-2 ring-indigo-500/50' : 'hover:ring-1 hover:ring-indigo-500/30'}`}>
                
                <div className="relative shrink-0 ml-1 w-10 h-10">
                    <button 
                        onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)} 
                        className="w-full h-full flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:text-indigo-600 transition-colors"
                    >
                        <PlusIcon className="w-5 h-5" />
                    </button>

                    {isPlusMenuOpen && (
                        <div className="absolute bottom-full left-0 mb-3 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl flex flex-col gap-1 min-w-[140px] animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                                <button onClick={() => { styleFileInputRef.current?.click(); setIsPlusMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">
                                <div className="p-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg"><PaintBrushIcon className="w-4 h-4" /></div>
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{t.addStyle}</span>
                                </button>
                                <button onClick={() => { assetFileInputRef.current?.click(); setIsPlusMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">
                                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg"><AssetIcon className="w-4 h-4" /></div>
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{t.addAsset}</span>
                                </button>
                        </div>
                    )}
                </div>

                <textarea 
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => { 
                        if (e.key === 'Enter' && !e.shiftKey) { 
                            e.preventDefault(); 
                            executeGeneration(prompt); 
                        } 
                    }}
                    placeholder={t.promptPlaceholder}
                    rows={1}
                    className="flex-1 w-full min-w-0 bg-transparent border-0 focus:ring-0 text-sm font-medium py-2 pl-[15px] pr-[20px] max-h-[120px] resize-none text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none leading-relaxed self-center h-full flex items-center"
                    style={{ minHeight: '24px', textOverflow: 'ellipsis' }}
                />

                <div className="flex items-center shrink-0 gap-2">
                    <button 
                        onClick={handleRandomPrompt}
                        className="shrink-0 w-9 h-9 flex items-center justify-center text-indigo-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                        title={t.randomPrompt}
                    >
                        <MagicWandIcon className="w-5 h-5" />
                    </button>

                    <button 
                        onClick={() => executeGeneration(prompt)}
                        disabled={(isGenerating && !isUpscaling) || !sourceImage}
                        className={`shrink-0 h-10 px-6 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all transform active:scale-95 ${
                            (isGenerating && !isUpscaling) || !sourceImage
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30'
                        }`}
                    >
                            {isGenerating || isUpscaling ? (
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                            ) : (
                                <>
                                <span>Generate</span>
                                <BoltIcon className="w-4 h-4" />
                                </>
                            )}
                    </button>
                </div>
            </div>
        </div>
      </div>

      <aside 
        className={`shrink border-l border-gray-100 dark:border-white/5 bg-white/50 dark:bg-gray-900/40 backdrop-blur-3xl overflow-y-auto overflow-x-hidden custom-scrollbar p-6 flex flex-col gap-6 transition-all duration-300 ease-in-out
          ${!hasApiKey ? 'opacity-0 translate-x-10' : ''}
          ${isRightSidebarOpen ? 'w-72 min-w-[250px] max-w-[350px] opacity-100 translate-x-0' : 'w-0 min-w-0 opacity-0 overflow-hidden translate-x-full border-l-0 p-0'}
        `}
      >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <HistoryIcon className="w-4 h-4 text-gray-400" />
              <span className="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">{t.history}</span>
            </div>
            <div className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
              {generatedImageHistory.length}
            </div>
          </div>

          <div className="flex flex-col gap-6 w-full">
            {generatedImageHistory.length > 0 ? (
              generatedImageHistory.slice().reverse().map((img, i) => {
                const isActive = currentGeneratedImage?.url === img.url;
                return (
                  <div key={i} className="flex flex-col gap-2 group/history animate-in fade-in slide-in-from-right-4 duration-500 w-full">
                    <div className="relative w-full group/thumb">
                      <button 
                        onClick={() => setCurrentGeneratedImage(img)} 
                        className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 transform group-hover/history:scale-[1.02] shadow-sm
                          ${isActive 
                            ? 'border-indigo-600 ring-4 ring-indigo-500/10' 
                            : 'border-white dark:border-gray-700 opacity-80 hover:opacity-100'}`}
                      >
                        <img src={img.url} className="w-full h-full object-cover max-w-full" alt="History thumbnail" />
                      </button>
                      
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-all duration-200 flex items-center justify-center gap-[10px] rounded-xl backdrop-blur-[2px]">
                          <button 
                              onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(img.url); }}
                              className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md border border-white/20 transition-all hover:scale-110 active:scale-95 shadow-lg"
                              title={t.zoom}
                          >
                              <ZoomIcon className="w-4 h-4" />
                          </button>
                          <button 
                              onClick={(e) => { e.stopPropagation(); handleBranchFromHistory(img); }}
                              className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 border border-transparent"
                              title={t.reuse}
                          >
                              <PencilIcon className="w-4 h-4" />
                          </button>
                          <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                const link = document.createElement('a');
                                link.href = img.url;
                                link.download = `generated_${Date.now()}.png`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                showToast(t.saved, 'success');
                              }}
                              className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md border border-white/20 transition-all hover:scale-110 active:scale-95 shadow-lg"
                              title={t.download}
                          >
                              <DownloadIcon className="w-4 h-4" />
                          </button>
                      </div>
                    </div>
                    <div className="px-1 w-full">
                      <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 line-clamp-2 leading-tight mb-1 break-words w-full">{img.prompt}</p>
                      <span className="text-[9px] font-bold text-gray-400">{formatTime(img.timestamp || 0)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-30 text-center gap-3">
                 <HistoryIcon className="w-8 h-8" />
                 <p className="text-[10px] font-black uppercase tracking-widest">{language === 'ko' ? '기록 없음' : 'No History'}</p>
              </div>
            )}
          </div>
      </aside>

      {/* High-Fidelity Settings Modal */}
      {isKeyModalOpen && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsKeyModalOpen(false)}>
          <div 
            className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] w-full max-w-[480px] overflow-hidden transform transition-all scale-100 border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#eef2ff] to-white dark:from-indigo-950/40 dark:to-gray-900 px-8 py-6 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-.999.43-1.563a6 6 0 1111.742-2.53z" />
                    </svg>
                 </div>
                 <h3 className="text-[20px] font-black tracking-tight text-gray-900 dark:text-white">{t.settingsHeader}</h3>
              </div>
              <button 
                onClick={() => setIsKeyModalOpen(false)}
                className="p-2.5 text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <XCircleIcon className="w-8 h-8" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-8 space-y-8">
               <div className="space-y-3">
                  <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t.labelApiKeyName}</label>
                  <div className="relative group">
                     <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                     </div>
                     
                     <input 
                        type={showApiKey ? "text" : "password"} 
                        value={manualApiKey}
                        onChange={(e) => setManualApiKey(e.target.value)}
                        placeholder="AIza..."
                        className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-white/5 rounded-2xl py-4 pl-12 pr-12 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all text-gray-900 dark:text-white"
                     />
                     
                     {/* Visibility Toggle Button */}
                     <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowApiKey(!showApiKey); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                     >
                        {showApiKey ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                     </button>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-medium text-gray-400 pl-1">
                     <QuestionMarkCircleIcon className="w-3.5 h-3.5" />
                     <span>{t.keyStoredLocally}</span>
                  </div>
               </div>

               <div className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-white/5 rounded-2xl">
                  <span className="text-[13px] font-bold text-gray-500 dark:text-gray-400">{t.labelSystemState}</span>
                  <span className={`text-[13px] font-black uppercase tracking-wider ${hasApiKey ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500'}`}>
                    {hasApiKey ? t.apiKeyConnected : t.apiKeyDisconnected}
                  </span>
               </div>

               {/* Footer Buttons */}
               <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSaveKey}
                    className="flex-1 py-5 px-6 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl font-black text-[14px] shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-wider"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    {t.saveKey}
                  </button>
                  <button
                    onClick={handleRemoveKey}
                    className="w-[72px] flex items-center justify-center rounded-2xl border border-rose-100 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all active:scale-[0.98]"
                  >
                    <TrashIcon className="w-6 h-6" />
                  </button>
               </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if(f) fileToImageSource(f).then(s => { setOriginalImage(s); setSourceImage(s); resetGeneratedState(); }).catch(e => setError(e.message)); }} accept="image/*" className="hidden" />
      <input type="file" ref={styleFileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if(f) fileToImageSource(f).then(s => setStyleReferenceImages(p => [...p, s])); }} accept="image/*" className="hidden" />
      <input type="file" ref={assetFileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if(f) fileToImageSource(f).then(s => setAssetImages(p => [...p, s])); }} accept="image/*" className="hidden" />
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.3); }
        
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};
