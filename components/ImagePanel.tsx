
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DownloadIcon, SwapIcon, CopyIcon, BrushIcon, EraserIcon, ScissorsIcon, ZoomIcon, TrashIcon, UploadIcon, SparklesIcon } from './Icons';
import { useI18n } from '../i18n';
import { useToast } from '../contexts/ToastContext';
import { ImageSource } from '../types';

interface ImagePanelProps {
  title: string;
  imageUrl: string | null;
  isLoading?: boolean;
  onRevert?: () => void;
  onRemoveBackground?: () => void;
  isRevertDisabled?: boolean;
  isActionDisabled?: boolean;
  isOriginal?: boolean;
  onReset?: () => void;
  originalThumbnail?: string;
  onZoom?: (url: string) => void;
  onDelete?: () => void;
  onChangeImage?: () => void;
  panelType?: 'source' | 'result';
  onMaskChange?: (maskBase64: string | null) => void;
  isSheet?: boolean;
  currentImageSource?: ImageSource;
}

type Point = { x: number; y: number };
type Path = { points: Point[]; strokeWidth: number };

export const ImagePanel: React.FC<ImagePanelProps> = ({ 
  title, imageUrl, isLoading = false, onRevert, isRevertDisabled = true, isActionDisabled = false, isOriginal, onReset, originalThumbnail, onZoom, onDelete, onChangeImage, panelType = 'source', onMaskChange, isSheet, currentImageSource
}) => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  const [isMasking, setIsMasking] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<Path[]>([]);
  const currentPath = useRef<Point[]>([]);

  useEffect(() => {
    setIsMasking(false);
    setPaths([]);
    onMaskChange?.(null);
  }, [imageUrl, onMaskChange]);

  const adjustCanvas = useCallback(() => {
    if (!canvasRef.current || !imgRef.current) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    
    const { naturalWidth, naturalHeight, width, height } = img;
    const imageRatio = naturalWidth / naturalHeight;
    const containerRatio = width / height;
    
    let renderWidth, renderHeight, top, left;
    
    if (containerRatio > imageRatio) {
      renderHeight = height;
      renderWidth = height * imageRatio;
      top = 0;
      left = (width - renderWidth) / 2;
    } else {
      renderWidth = width;
      renderHeight = width / imageRatio;
      left = 0;
      top = (height - renderHeight) / 2;
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    if (paths.length > 0) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#84cc16'; 
        ctx.lineWidth = renderWidth * 0.05; 
        ctx.globalAlpha = 0.6;

        paths.forEach(path => {
            if (path.points.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(left + path.points[0].x * renderWidth, top + path.points[0].y * renderHeight);
            for (let i = 1; i < path.points.length; i++) {
                ctx.lineTo(left + path.points[i].x * renderWidth, top + path.points[i].y * renderHeight);
            }
            ctx.stroke();
        });
    }
  }, [paths]);

  useEffect(() => {
    window.addEventListener('resize', adjustCanvas);
    if (isMasking) setTimeout(adjustCanvas, 50); 
    return () => window.removeEventListener('resize', adjustCanvas);
  }, [adjustCanvas, isMasking]);

  useEffect(() => {
      if (isMasking) adjustCanvas();
  }, [paths, isMasking, adjustCanvas]);

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(t.saved, 'success');
  };

  const handleSplitAndSave = () => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const segmentWidth = w / 3;
        const parts = ['front', 'side', 'back'];

        parts.forEach((part, index) => {
            const canvas = document.createElement('canvas');
            canvas.width = segmentWidth;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, index * segmentWidth, 0, segmentWidth, h, 0, 0, segmentWidth, h);
                const link = document.createElement('a');
                link.download = `character_${part}_${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        });
        showToast(t.splitSaved, 'success');
    };
  };

  const handleCopy = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      setIsCopied(true);
      showToast(t.copied, 'success');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
      showToast("Failed to copy image", 'error');
    }
  };

  const getNormalizedPoint = (clientX: number, clientY: number): Point | null => {
      if (!imgRef.current) return null;
      const img = imgRef.current;
      const rect = img.getBoundingClientRect();
      
      const { naturalWidth, naturalHeight, width, height } = img;
      const imageRatio = naturalWidth / naturalHeight;
      const containerRatio = width / height;
      
      let renderWidth, renderHeight, top, left;
      
      if (containerRatio > imageRatio) {
        renderHeight = height;
        renderWidth = height * imageRatio;
        top = 0;
        left = (width - renderWidth) / 2;
      } else {
        renderWidth = width;
        renderHeight = width / imageRatio;
        left = 0;
        top = (height - renderHeight) / 2;
      }
      
      const offsetX = clientX - rect.left - left;
      const offsetY = clientY - rect.top - top;

      if (offsetX < 0 || offsetX > renderWidth || offsetY < 0 || offsetY > renderHeight) return null;

      return {
          x: offsetX / renderWidth,
          y: offsetY / renderHeight
      };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const point = getNormalizedPoint(e.clientX, e.clientY);
      if (point) {
          setIsDrawing(true);
          currentPath.current = [point];
      }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const point = getNormalizedPoint(e.clientX, e.clientY);
      if (point) {
          currentPath.current.push(point);
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          const img = imgRef.current;
          if (canvas && ctx && img) {
            const { naturalWidth, naturalHeight, width, height } = img;
            const imageRatio = naturalWidth / naturalHeight;
            const containerRatio = width / height;
            
            let renderWidth, renderHeight, top, left;
            if (containerRatio > imageRatio) {
                renderHeight = height;
                renderWidth = height * imageRatio;
                top = 0;
                left = (width - renderWidth) / 2;
            } else {
                renderWidth = width;
                renderHeight = width / imageRatio;
                left = 0;
                top = (height - renderHeight) / 2;
            }

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = '#84cc16';
            ctx.lineWidth = renderWidth * 0.05;
            ctx.globalAlpha = 0.6;
            
            const p1 = currentPath.current[currentPath.current.length - 2];
            const p2 = currentPath.current[currentPath.current.length - 1];
            
            ctx.beginPath();
            ctx.moveTo(left + p1.x * renderWidth, top + p1.y * renderHeight);
            ctx.lineTo(left + p2.x * renderWidth, top + p2.y * renderHeight);
            ctx.stroke();
          }
      }
  };

  const stopDrawing = () => {
      if (!isDrawing) return;
      setIsDrawing(false);
      if (currentPath.current.length > 0) {
          const newPaths = [...paths, { points: currentPath.current, strokeWidth: 0.05 }];
          setPaths(newPaths);
          exportMask(newPaths);
      }
      currentPath.current = [];
  };

  const exportMask = useCallback((currentPaths: Path[]) => {
    if (!imgRef.current || currentPaths.length === 0) {
      onMaskChange?.(null);
      return;
    }
    const img = imgRef.current;
    
    const offscreen = document.createElement('canvas');
    offscreen.width = img.naturalWidth;
    offscreen.height = img.naturalHeight;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = offscreen.width * 0.05; 

    currentPaths.forEach(path => {
        if (path.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(path.points[0].x * offscreen.width, path.points[0].y * offscreen.height);
        for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x * offscreen.width, path.points[i].y * offscreen.height);
        }
        ctx.stroke();
    });

    const base64 = offscreen.toDataURL('image/png').split(',')[1];
    onMaskChange?.(base64);
  }, [onMaskChange]);

  const clearMask = () => {
      setPaths([]);
      onMaskChange?.(null);
      if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (panelType === 'source' && !imageUrl && !isLoading) setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const isSource = panelType === 'source';

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-white dark:bg-gray-800 border-2 rounded-[3rem] p-[15px] flex flex-col items-center w-full h-full shadow-[0_35px_80px_-15px_rgba(0,0,0,0.09)] dark:shadow-[0_35px_80px_-15px_rgba(0,0,0,0.5)] transition-all duration-300 relative group/container overflow-hidden ${
        isSource && isDragging 
          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10' 
          : 'border-transparent'
      }`}
    >
      <div className="w-full flex justify-between items-start mb-4 z-20 relative px-2 pt-1">
        <div className="flex flex-col gap-1 w-full">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">{title}</h2>
            
            {imageUrl && !isLoading && isOriginal && (
              <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-500/10">
                {t.originalBadge}
              </span>
            )}

            {imageUrl && !isLoading && !isOriginal && (
              <span className="text-[10px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full uppercase tracking-widest border border-indigo-500/10">
                {t.resultBadge}
              </span>
            )}
          </div>
          
          {imageUrl && !isLoading && !isOriginal && originalThumbnail && (
            <div className="flex items-center gap-3 mt-1.5">
              <button 
                onClick={onReset}
                className="group/orig relative"
                title="View Original"
              >
                <div className="w-8 h-8 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-sm transition-transform hover:scale-110 active:scale-90">
                  <img src={originalThumbnail} className="w-full h-full object-cover opacity-60 group-hover/orig:opacity-100 transition-opacity" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full border-[3px] border-white dark:border-[#1E1E1E]" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div 
        onClick={isSource && !isLoading && !imageUrl && !isMasking ? onChangeImage : undefined}
        className={`relative w-full flex-grow flex items-center justify-center rounded-[2rem] transition-all duration-500 bg-[#F9FAFB] dark:bg-[#0D0F14] border-2 border-transparent isolation-isolate overflow-hidden
          ${isSource && !isLoading && !imageUrl ? 'cursor-pointer group-hover/container:border-indigo-500/50 group-hover/container:border-dashed group-hover/container:bg-indigo-50/30 dark:group-hover/container:bg-indigo-500/5' : ''}
          ${isSource && isDragging ? 'border-dashed border-indigo-500 scale-[0.98]' : ''}
        `}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-xl flex flex-col items-center justify-center z-20 animate-in fade-in duration-500">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-32 h-32 bg-indigo-500/30 rounded-full blur-3xl animate-pulse" />
              <svg className="animate-spin h-14 w-14 text-indigo-600 relative z-10" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-10" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <p className="text-indigo-600 dark:text-indigo-400 mt-8 font-black tracking-[0.2em] text-[11px] text-center px-10 uppercase leading-relaxed">{t.generatingMasterpiece}</p>
          </div>
        )}
        
        {!isLoading && !imageUrl && (
          <div className="w-full h-full flex flex-col items-center justify-center transition-all relative">
            {isSource ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 md:p-12 text-center">
                <UploadIcon className={`absolute w-48 h-48 transition-all duration-500 pointer-events-none ${
                  isDragging ? 'text-indigo-400 opacity-20 scale-110' : 'text-gray-200 dark:text-gray-800/30 opacity-20'
                }`} />
                <div className="relative z-10 space-y-4 max-w-full">
                  <p className={`text-[16px] font-extrabold transition-colors tracking-tight whitespace-normal break-words ${
                    isDragging ? 'text-indigo-600' : 'text-gray-700 dark:text-gray-200 group-hover/container:text-indigo-600'
                  }`}>
                    {t.uploadInstruction}
                  </p>
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] whitespace-normal break-words">
                    {t.supportedFormats}
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#4f46e5 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }} />
                <div className="relative z-10 flex flex-col items-center">
                   <SparklesIcon className="w-16 h-16 text-gray-200 dark:text-gray-800/50 mb-6" />
                   <p className="text-[13px] px-12 font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.2em] text-center leading-relaxed whitespace-normal break-words">
                     {t.readyToTransform}
                   </p>
                </div>
              </div>
            )}
          </div>
        )}

        {imageUrl && !isLoading && (
          <div className="group/img w-full h-full flex items-center justify-center relative rounded-[2rem] overflow-hidden">
            <img 
              ref={imgRef}
              src={imageUrl} 
              alt={title} 
              className="object-contain w-full h-full p-2 transition-transform duration-1000 rounded-[1.5rem]" 
              style={{ pointerEvents: 'none' }} 
            />
            
            <canvas 
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full z-10 cursor-crosshair transition-opacity duration-300 ${isMasking ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />

            <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-all duration-300 flex items-center justify-center rounded-[2rem] z-30
              ${isMasking ? 'pointer-events-none bg-transparent backdrop-blur-none' : 'opacity-0 group-hover/img:opacity-100'}
            `} style={{ WebkitMaskImage: isMasking ? 'none' : '-webkit-radial-gradient(white, black)' }}>
              
              <div className="flex flex-wrap items-center justify-center gap-4 pointer-events-auto w-full px-4">
                {isSource ? (
                  !isMasking ? (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                        className="p-5 bg-white hover:bg-gray-50 text-indigo-600 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.2)] transition-all transform translate-y-6 group-hover/img:translate-y-0 active:scale-90 border border-gray-100"
                        title={t.copyToClipboard}
                      >
                        <CopyIcon className="w-8 h-8" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                        className="p-5 bg-white hover:bg-gray-50 text-gray-900 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.2)] transition-all transform translate-y-6 group-hover/img:translate-y-0 delay-[50ms] active:scale-90 border border-gray-100"
                        title={t.download}
                      >
                        <DownloadIcon className="w-8 h-8" />
                      </button>
                      
                      <div className="w-[1px] h-12 bg-white/20 mx-1 hidden sm:block" />

                      <button 
                        onClick={(e) => { e.stopPropagation(); setIsMasking(true); }}
                        className="p-5 bg-white hover:bg-gray-50 text-indigo-600 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.3)] transition-all transform translate-y-6 group-hover/img:translate-y-0 delay-[75ms] active:scale-90 border border-gray-100"
                        title={t.brushTool}
                      >
                        <BrushIcon className="w-8 h-8" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onChangeImage?.(); }}
                        className="p-5 bg-white hover:bg-gray-50 text-blue-600 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.3)] transition-all transform translate-y-6 group-hover/img:translate-y-0 delay-[100ms] active:scale-90 border border-gray-100"
                        title={t.changeImage}
                      >
                        <SwapIcon className="w-8 h-8" />
                      </button>

                      <button 
                        onClick={(e) => { e.stopPropagation(); onZoom?.(imageUrl); }}
                        className="p-5 bg-white hover:bg-gray-50 text-gray-900 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.2)] transition-all transform translate-y-6 group-hover/img:translate-y-0 delay-[125ms] active:scale-90 border border-gray-100"
                        title={t.zoom}
                      >
                        <ZoomIcon className="w-8 h-8" />
                      </button>

                      <button 
                        onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                        className="p-5 bg-rose-500 hover:bg-rose-600 text-white rounded-3xl shadow-[0_20px_40px_rgba(244,63,94,0.3)] transition-all transform translate-y-6 group-hover/img:translate-y-0 delay-[150ms] active:scale-90"
                        title={t.delete}
                      >
                        <TrashIcon className="w-8 h-8" />
                      </button>
                    </>
                  ) : null 
                ) : (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                      className="group/btn relative p-5 bg-white hover:bg-gray-50 text-indigo-600 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.2)] transition-all transform translate-y-6 group-hover/img:translate-y-0 active:scale-90 border border-gray-100"
                      title={t.copyToClipboard}
                    >
                      <CopyIcon className="w-8 h-8" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                      className="p-5 bg-white hover:bg-gray-50 text-gray-900 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.2)] transition-all transform translate-y-6 group-hover/img:translate-y-0 delay-[50ms] active:scale-90 border border-gray-100"
                      title={t.download}
                    >
                      <DownloadIcon className="w-8 h-8" />
                    </button>
                    {isSheet && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleSplitAndSave(); }}
                            className="p-5 bg-white hover:bg-gray-50 text-emerald-600 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.2)] transition-all transform translate-y-6 group-hover/img:translate-y-0 delay-[75ms] active:scale-90 border border-gray-100"
                            title={t.splitSave}
                        >
                            <ScissorsIcon className="w-8 h-8" />
                        </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); onZoom?.(imageUrl); }}
                      className="p-5 bg-white hover:bg-gray-50 text-gray-900 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.2)] transition-all transform translate-y-6 group-hover/img:translate-y-0 delay-[100ms] active:scale-90 border border-gray-100"
                      title={t.zoom}
                    >
                      <ZoomIcon className="w-8 h-8" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                      className="p-5 bg-rose-500 hover:bg-rose-600 text-white rounded-3xl shadow-[0_20px_40px_rgba(244,63,94,0.3)] transition-all transform translate-y-6 group-hover/img:translate-y-0 delay-[150ms] active:scale-90"
                      title={t.delete}
                    >
                      <TrashIcon className="w-8 h-8" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {isSource && isMasking && (
                <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto">
                    {paths.length > 0 && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); clearMask(); }}
                            className="px-5 py-2.5 bg-gray-900/90 text-white backdrop-blur-md rounded-full text-[12px] font-bold flex items-center gap-2 shadow-xl hover:bg-gray-800 transition-colors"
                        >
                            <EraserIcon className="w-4 h-4" />
                            {t.clearMask}
                        </button>
                    )}
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsMasking(false); }}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-full text-[12px] font-black tracking-wide shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 transition-colors"
                    >
                        DONE
                    </button>
                </div>
            )}
            
            {isSource && !isMasking && paths.length > 0 && (
                 <div className="absolute top-4 left-4 z-20 pointer-events-none">
                     <span className="bg-lime-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg uppercase tracking-wide">Mask Active</span>
                 </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
