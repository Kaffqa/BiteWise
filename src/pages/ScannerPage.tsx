import React, { useRef, useEffect, useState } from 'react';
import { Camera, Image as ImageIcon, X, RefreshCw, AlertCircle, Loader2, ChevronLeft, ExternalLink } from 'lucide-react';
import { Scan as PhosphorScan, ShieldCheck, Warning, ShieldWarning } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCamera } from '@/hooks/useCamera';
import { useScanner } from '@/hooks/useScanner';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ScannerPage() {
  const navigate = useNavigate();
  const { t, formatText } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { stream, isActive, error: cameraError, startCamera, stopCamera, capturePhoto, toggleFacingMode } = useCamera();
  const { scanState, result, error, processScan, reset, confirmMealLog } = useScanner();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          if (e.name !== 'AbortError') {
            console.error("Video play failed:", e);
          }
        });
      }
    }
  }, [stream, isActive, previewUrl]);

  const handleCapture = async () => {
    try {
      if (selectedFile) {
        await processScan(selectedFile);
      } else {
        const blob = await capturePhoto(videoRef as React.RefObject<HTMLVideoElement>);
        setPreviewUrl(URL.createObjectURL(blob));
        await processScan(blob);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setDropError(t.scanner.unsupportedFileChoose);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setDropError(t.scanner.fileTooLarge);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setDropError(null);
      setPreviewUrl(URL.createObjectURL(file));
      setSelectedFile(file);
    }
  };

  const handleReset = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setDropError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    reset();
  };

  const isLoading = scanState === 'uploading' || scanState === 'analyzing';

  return (
    <div className="h-full flex flex-col font-sans max-w-7xl mx-auto w-full">
      

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 h-full p-4 lg:p-0 lg:py-6">
        
        {/* Left Column: AI Vision Scanner Card */}
        <div className={`bg-white rounded-[4px] border border-[#e8efe9] p-8 flex-col shadow-sm h-full ${result ? 'hidden lg:flex' : 'flex'}`}>
          <div>
            <h3 className="font-serif text-[28px] text-[#1e4832] mb-3">{t.scanner.title}</h3>
            <p className="font-mono text-[13px] text-[#8ba797] leading-relaxed mb-8 max-w-md">
              {t.scanner.subtitleLine1}<br />
              {t.scanner.subtitleLine2}
            </p>
          </div>

          <div className="relative flex-1 min-h-[320px] bg-white rounded-[4px] border-2 border-dashed border-[#d1dfd6] flex flex-col shadow-sm overflow-hidden group mb-6">
            <div className="absolute inset-0 bg-[#f7f9f8] overflow-hidden" 
                 onDragOver={(e) => e.preventDefault()}
                 onDrop={(e) => {
                   e.preventDefault();
                   const file = e.dataTransfer.files[0];
                   if (file) {
                     if (!file.type.startsWith('image/')) {
                       setDropError(t.scanner.unsupportedFileDrop);
                       return;
                     }
                     if (file.size > 5 * 1024 * 1024) {
                       setDropError(t.scanner.fileTooLarge);
                       return;
                     }
                     setDropError(null);
                     setPreviewUrl(URL.createObjectURL(file));
                     setSelectedFile(file);
                     processScan(file);
                   }
                 }}
            >
              
              {previewUrl && (
                <>
                  <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover rounded-[4px] z-10" />
                  {!isLoading && (
                    <button
                      type="button"
                      onClick={handleReset}
                      aria-label={t.scanner.clearPhotoAria}
                      className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/55 hover:bg-black/75 text-white flex items-center justify-center transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </>
              )}
              
              {/* If camera active, show video feed filling the space */}
              {isActive && !previewUrl ? (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="absolute inset-0 w-full h-full object-cover rounded-[4px]"
                  />
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    title={t.scanner.switchCameraTitle}
                    aria-label={t.scanner.switchCameraAria}
                    className="absolute top-3 right-3 z-20 px-3 py-1.5 rounded-[4px] bg-black/55 hover:bg-black/75 text-white font-mono text-[11px] flex items-center gap-1.5 backdrop-blur-xs transition-colors"
                  >
                    <RefreshCw size={13} />
                    <span>{t.scanner.flip}</span>
                  </button>
                </>
              ) : !previewUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10">
                  <span className="font-mono text-[11px] font-bold text-[#4a6353] mb-3 uppercase tracking-wide">
                    {t.scanner.dragDropPrompt}
                  </span>
                  {cameraError && (
                    <span className="font-mono text-[11px] text-[#92400e] bg-[#fef3c7]/70 border border-[#fcd34d]/50 px-3 py-1.5 rounded-[4px] mb-4 max-w-xs">
                      {formatText(t.scanner.cameraUnavailable, { error: cameraError })}
                    </span>
                  )}

                  <span className="font-mono text-[9px] font-bold text-[#8ba797] uppercase tracking-wider mt-auto">
                    {t.scanner.supportedFormats}
                  </span>
                </div>
              )}
            </div>

            {/* Scanning Animation Overlay */}
            {isLoading && (
              <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full border-[3px] border-[#e8efe9] border-t-[#5a8069] animate-spin mb-4" />
                <span className="font-serif text-lg text-[#1e4832]">
                  {scanState === 'uploading' ? t.scanner.uploading : t.scanner.analyzing}
                </span>
              </div>
            )}

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button 
              onClick={handleCapture}
              disabled={isLoading || (!isActive && !selectedFile)}
              className="flex-1 bg-gradient-to-b from-[#88ba9d] to-[#173d26] border border-[#c0d4c8] hover:brightness-110 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 hover:shadow-[0_8px_16px_rgba(0,0,0,0.2)] transition-all duration-200 text-white py-4 rounded-[4px] font-mono text-[13px] flex items-center justify-center gap-3 shadow-md disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md"
            >
              <PhosphorScan size={18} weight="fill" />
              <span>{selectedFile ? t.scanner.analysePhoto : t.scanner.captureAnalyse}</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="w-[54px] h-[54px] shrink-0 rounded-[4px] border border-[#d1dfd6] flex items-center justify-center text-[#8ba797] hover:border-[#5a8069] hover:text-[#5a8069] transition-all bg-white shadow-sm"
            >
              <ImageIcon size={20} strokeWidth={1.5} />
            </button>
          </div>
          
          {/* Error Message */}
          {(scanState === 'error' || dropError) && (
            <div className="mt-4 p-4 rounded-[4px] bg-[#fecaca]/30 border border-[#fecaca] flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-[#991b1b] shrink-0" />
              <span className="text-[#991b1b] text-sm font-mono flex-1">{dropError || error}</span>
              <button onClick={handleReset} className="text-[#991b1b] underline text-xs font-mono">{t.common.retry}</button>
            </div>
          )}
        </div>

        {/* Right Column: Result Card */}
        {result ? (
          <>
            {/* Desktop View */}
            <div className="hidden md:flex bg-white rounded-[4px] border border-[#e8efe9] p-8 flex-col shadow-sm overflow-y-auto h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-[26px] text-[#1e4832] leading-tight pr-4">{result.mealTitle}</h3>
                <span className={`shrink-0 w-[110px] justify-center py-2 rounded-[4px] text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  result.safetyStatus === 'safe' ? 'bg-[#bbf7d0] text-[#166534]' :
                  result.safetyStatus === 'caution' ? 'bg-[#fef3c7] text-[#92400e]' :
                  'bg-[#fecaca] text-[#991b1b]'
                }`}>
                  {result.safetyStatus === 'safe' && <ShieldCheck size={14} weight="fill" />}
                  {result.safetyStatus === 'caution' && <Warning size={14} weight="fill" />}
                  {result.safetyStatus === 'danger' && <ShieldWarning size={14} weight="fill" />}
                  {result.safetyStatus === 'safe' ? t.common.safe : result.safetyStatus === 'caution' ? t.common.flagged : t.common.danger}
                </span>
              </div>

              {Array.isArray(result.healthWarnings) && result.healthWarnings.length > 0 && (
                <p className="font-mono text-[12px] text-[#6b8274] mb-6 leading-relaxed">
                  {result.healthWarnings.map((w: any) => typeof w === 'string' ? w : (w.message || w.title || w.detail)).filter(Boolean).join('. ')}
                </p>
              )}

              {/* Macros */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                 <div className="bg-[#132c1e] p-4 rounded-[4px] flex flex-col items-center justify-center text-center">
                   <span className="font-serif text-[32px] text-white">{Math.round(Number(result.totalNutrition?.calories) || 0)}</span>
                   <span className="font-mono text-[10px] text-[#8ba797] uppercase tracking-wider mt-1">{t.common.kcal}</span>
                 </div>
                 <div className="bg-[#132c1e] p-4 rounded-[4px] flex flex-col items-center justify-center text-center">
                   <span className="font-serif text-[32px] text-white">{Math.round(Number(result.totalNutrition?.proteinG) || 0)}g</span>
                   <span className="font-mono text-[10px] text-[#8ba797] uppercase tracking-wider mt-1">{t.common.protein}</span>
                 </div>
                 <div className="bg-[#132c1e] p-4 rounded-[4px] flex flex-col items-center justify-center text-center">
                   <span className="font-serif text-[32px] text-white">{Math.round(Number(result.totalNutrition?.carbsG) || 0)}g</span>
                   <span className="font-mono text-[10px] text-[#8ba797] uppercase tracking-wider mt-1">{t.common.carbs}</span>
                 </div>
                 <div className="bg-[#132c1e] p-4 rounded-[4px] flex flex-col items-center justify-center text-center">
                   <span className="font-serif text-[32px] text-white">{Math.round(Number(result.totalNutrition?.fatG) || 0)}g</span>
                   <span className="font-mono text-[10px] text-[#8ba797] uppercase tracking-wider mt-1">{t.common.fat}</span>
                 </div>
              </div>

              {/* Detected Items */}
              <div className="space-y-0 mb-6 border-t border-[#e8efe9]">
                {Array.isArray(result.items) && result.items.map((item: any, i: number) => {
                  const isAllergen =
                    Array.isArray(item.detectedAllergens) &&
                    item.detectedAllergens.length > 0 &&
                    item.safetyStatus !== 'safe';
                  
                  let badgeClass = '';
                  let label = '';
                  let Icon = null;

                  if (isAllergen) {
                    badgeClass = 'bg-[#fecaca] text-[#991b1b]';
                    label = t.common.allergenAlert;
                    Icon = ShieldWarning;
                  } else if (item.safetyStatus === 'danger') {
                    badgeClass = 'bg-[#fecaca] text-[#991b1b]';
                    label = t.common.danger;
                    Icon = ShieldWarning;
                  } else if (item.safetyStatus === 'caution') {
                    badgeClass = 'bg-[#fef3c7] text-[#92400e]';
                    label = t.common.flagged;
                    Icon = Warning;
                  } else {
                    badgeClass = 'bg-[#bbf7d0] text-[#166534]';
                    label = t.common.safe;
                    Icon = ShieldCheck;
                  }
                  
                  return (
                    <div key={i} className="py-4 border-b border-[#e8efe9] flex justify-between items-center gap-4">
                      <div className="flex flex-col flex-1">
                        <div className="font-serif text-[#1e4832] text-[16px] leading-snug">{item.name}</div>
                        {isAllergen && (
                          <div className="font-mono text-[11px] text-[#991b1b] mt-1.5 leading-tight">
                            {t.scanner.allergenPrefix} {item.detectedAllergens.join(', ')}
                          </div>
                        )}
                      </div>
                      <div className={`shrink-0 w-[120px] justify-center text-[10px] font-mono ${badgeClass} py-2 rounded-[4px] uppercase tracking-wider font-bold flex items-center gap-1.5`}>
                        <Icon size={12} weight="fill" />
                        {label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions Area */}
              <div className="mt-auto flex flex-col gap-3 pt-2">
                 {(result as any).id && (
                   <button 
                     onClick={() => navigate(`/app/scan/${(result as any).id}`)} 
                     className="w-full py-3.5 rounded-[4px] bg-[#f0f5f2] border border-[#c5d1c9] font-mono text-[13px] text-[#1e4832] font-semibold hover:bg-[#e4ede7] hover:border-[#1e4832] transition-all flex items-center justify-center gap-2 shadow-xs group"
                   >
                     <span>{t.scanner.viewFullDetails}</span>
                     <ExternalLink size={15} className="group-hover:translate-x-0.5 transition-transform" />
                   </button>
                 )}
                 <div className="flex gap-3">
                   <button 
                     onClick={async () => {
                       if (result.safetyStatus !== 'safe') {
                         await confirmMealLog();
                       }
                       navigate('/app/history');
                     }} 
                     className="flex-2 w-full py-4 rounded-[4px] bg-gradient-to-b from-[#88ba9d] to-[#173d26] border border-[#c0d4c8] font-mono text-[13px] text-white hover:brightness-110 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 hover:shadow-[0_8px_16px_rgba(0,0,0,0.2)] transition-all duration-200 shadow-md flex justify-center items-center gap-2"
                   >
                     {t.scanner.addToDailyLog}
                   </button>
                   <button 
                     onClick={handleReset} 
                     className="flex-1 py-4 rounded-[4px] border border-[#d1dfd6] font-mono text-[13px] text-[#8ba797] hover:border-[#5a8069] hover:text-[#5a8069] bg-white transition-all shadow-sm flex justify-center items-center gap-2 whitespace-nowrap px-4"
                   >
                     <RefreshCw size={16} /> {t.scanner.rescan}
                   </button>
                 </div>
              </div>
            </div>

            {/* Mobile View */}
            <div className="flex md:hidden bg-white rounded-[4px] border border-[#e8efe9] p-6 flex-col shadow-sm overflow-y-auto">
              {/* Header / Overview */}
              <div className="flex flex-col items-center text-center mb-6">
                <span className={`px-4 py-1.5 rounded-[4px] text-[11px] font-mono font-bold tracking-wider flex items-center gap-2 mb-4 ${
                  result.safetyStatus === 'safe' ? 'bg-[#bbf7d0] text-[#166534]' :
                  result.safetyStatus === 'caution' ? 'bg-[#fef3c7] text-[#92400e]' :
                  'bg-[#fecaca] text-[#991b1b]'
                }`}>
                  {result.safetyStatus === 'safe' && <ShieldCheck size={14} weight="fill" />}
                  {result.safetyStatus === 'caution' && <Warning size={14} weight="fill" />}
                  {result.safetyStatus === 'danger' && <ShieldWarning size={14} weight="fill" />}
                  {result.safetyStatus === 'safe' 
                    ? t.common.safe 
                    : formatText(t.scanner.flaggedCount, { count: result.items?.filter((i: any) => i.safetyStatus === 'caution' || i.safetyStatus === 'danger').length || 1 })}
                </span>
                
                <h3 className="font-serif text-[32px] md:text-[26px] text-[#1e4832] leading-tight mb-4">{result.mealTitle}</h3>

                {Array.isArray(result.healthWarnings) && result.healthWarnings.length > 0 && (
                  <p className="font-mono text-[12px] text-[#6b8274] leading-relaxed max-w-sm">
                    {result.healthWarnings.map((w: any) => typeof w === 'string' ? w : (w.message || w.title || w.detail)).filter(Boolean).join('. ')}
                  </p>
                )}
              </div>

              {/* Macros */}
              <div className="grid grid-cols-2 gap-3 mb-8 px-1 md:px-0">
                 <div className="bg-[#132c1e] py-6 px-2 rounded-[4px] flex flex-col items-center justify-center text-center">
                   <span className="font-serif text-[42px] leading-none text-white mb-2">{Math.round(Number(result.totalNutrition?.calories) || 0)}</span>
                   <span className="font-mono text-[11px] text-[#8ba797]">{t.common.kcal}</span>
                 </div>
                 <div className="bg-[#132c1e] py-6 px-2 rounded-[4px] flex flex-col items-center justify-center text-center">
                   <span className="font-serif text-[42px] leading-none text-white mb-2">{Math.round(Number(result.totalNutrition?.proteinG) || 0)}g</span>
                   <span className="font-mono text-[11px] text-[#8ba797]">{t.common.protein}</span>
                 </div>
                 <div className="bg-[#132c1e] py-6 px-2 rounded-[4px] flex flex-col items-center justify-center text-center">
                   <span className="font-serif text-[42px] leading-none text-white mb-2">{Math.round(Number(result.totalNutrition?.carbsG) || 0)}g</span>
                   <span className="font-mono text-[11px] text-[#8ba797]">{t.common.carbs}</span>
                 </div>
                 <div className="bg-[#132c1e] py-6 px-2 rounded-[4px] flex flex-col items-center justify-center text-center">
                   <span className="font-serif text-[42px] leading-none text-white mb-2">{Math.round(Number(result.totalNutrition?.fatG) || 0)}g</span>
                   <span className="font-mono text-[11px] text-[#8ba797]">{t.common.fat}</span>
                 </div>
              </div>

              {/* Ingredients List */}
              <div className="space-y-0 mb-8 border-t border-[#e8efe9]">
                {Array.isArray(result.items) && result.items.map((item: any, i: number) => {
                  const isAllergen =
                    Array.isArray(item.detectedAllergens) &&
                    item.detectedAllergens.length > 0 &&
                    item.safetyStatus !== 'safe';
                  
                  let badgeClass = '';
                  let Icon = null;

                  if (isAllergen || item.safetyStatus === 'danger') {
                    badgeClass = 'bg-[#fecaca] text-[#991b1b]';
                    Icon = ShieldWarning;
                  } else if (item.safetyStatus === 'caution') {
                    badgeClass = 'bg-[#fef3c7] text-[#92400e]';
                    Icon = Warning;
                  } else {
                    badgeClass = 'bg-[#bbf7d0] text-[#166534]';
                    Icon = ShieldCheck;
                  }
                  
                  return (
                    <div key={i} className="py-4 border-b border-[#e8efe9] flex justify-between items-center gap-4 px-1 md:px-0">
                      <div className="flex flex-col flex-1">
                        <div className="font-serif text-[#1e4832] text-[18px] md:text-[16px] leading-snug">{item.name}</div>
                        {isAllergen && (
                          <div className="font-mono text-[11px] text-[#991b1b] mt-1.5 leading-tight">
                            {t.scanner.allergenPrefix} {item.detectedAllergens.join(', ')}
                          </div>
                        )}
                      </div>
                      <div className={`shrink-0 w-8 h-8 flex justify-center items-center ${badgeClass} rounded-[4px]`}>
                        <Icon size={16} weight="fill" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Actions */}
              <div className="mt-auto flex flex-col gap-2.5 pt-2">
                 {(result as any).id && (
                   <button 
                     onClick={() => navigate(`/app/scan/${(result as any).id}`)} 
                     className="w-full py-3.5 rounded-[4px] bg-[#f0f5f2] border border-[#c5d1c9] font-mono text-[13px] text-[#1e4832] font-semibold hover:bg-[#e4ede7] hover:border-[#1e4832] transition-all flex items-center justify-center gap-2 shadow-xs group"
                   >
                     <span>{t.scanner.viewFullDetails}</span>
                     <ExternalLink size={15} className="group-hover:translate-x-0.5 transition-transform" />
                   </button>
                 )}
                 <div className="flex gap-3">
                   <button 
                     onClick={async () => {
                       if (result.safetyStatus !== 'safe') {
                         await confirmMealLog();
                       }
                       navigate('/app/history');
                     }} 
                     className="flex-1 py-[15px] rounded-[4px] bg-gradient-to-b from-[#88ba9d] to-[#173d26] border border-[#c0d4c8] font-mono text-[14px] text-white hover:brightness-110 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 hover:shadow-[0_8px_16px_rgba(0,0,0,0.2)] transition-all duration-200 shadow-md flex justify-center items-center gap-2 font-medium"
                   >
                     {t.scanner.addToDailyLog}
                   </button>
                   <button 
                     onClick={handleReset} 
                     className="w-[56px] h-[56px] shrink-0 rounded-[4px] border border-[#d1dfd6] flex items-center justify-center text-[#8ba797] hover:border-[#5a8069] hover:text-[#5a8069] bg-white transition-all shadow-sm"
                   >
                     <RefreshCw size={18} />
                   </button>
                 </div>
              </div>
            </div>
          </>
        ) : (
          <div className="hidden lg:flex bg-white rounded-[4px] border border-[#e8efe9] p-8 flex-col items-center justify-center text-center shadow-sm h-full">
            <h3 className="font-serif text-[32px] text-[#1e4832] mb-4">{t.scanner.noResultYet}</h3>
            <p className="font-mono text-[12px] text-[#8ba797] max-w-xs leading-relaxed">
              {t.scanner.noResultLine1}<br />
              {t.scanner.noResultLine2}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}