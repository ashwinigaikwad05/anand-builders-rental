import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  RotateCw,
  FlipHorizontal,
  Sparkles,
  Sliders,
  Check,
  RefreshCw,
  Upload,
  SwitchCamera,
  AlertCircle,
  Loader2,
  Sun,
  ShieldCheck,
} from 'lucide-react';
import { processImage } from '../../../utils/imageUtils';
import { getStoredAppLanguage } from '../../../utils/appTranslations';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  title?: string;
  documentType?: 'aadhaar_front' | 'aadhaar_back' | 'face' | 'cheque' | 'general';
  initialImage?: string | null;
  appLanguage?: 'marathi' | 'english';
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  documentType = 'aadhaar_front',
  initialImage = null,
  appLanguage,
}) => {
  const isMarathi = (appLanguage || getStoredAppLanguage()) === 'marathi';

  // Mode: 'camera' or 'edit'
  const [mode, setMode] = useState<'camera' | 'edit'>('camera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);

  // Edit states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [flipHorizontal, setFlipHorizontal] = useState<boolean>(false);
  const [brightness, setBrightness] = useState<number>(1.0);
  const [contrast, setContrast] = useState<number>(1.0);
  const [isEnhanced, setIsEnhanced] = useState<boolean>(false);
  const [cropAspect, setCropAspect] = useState<'id_card' | 'square' | 'full'>(
    documentType === 'face' ? 'square' : 'id_card'
  );
  const [showSliders, setShowSliders] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setIsCameraStarting(true);

    // Verify mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        isMarathi
          ? 'तुमच्या ब्राउझरमध्ये थेट कॅमेरा उपलब्ध नाही. कृपया खालील बटनाने फोटो निवडा.'
          : 'Camera API is not supported in this browser. Please select a photo from files.'
      );
      setIsCameraStarting(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera access failed:', err);
      let msg = isMarathi
        ? 'कॅमेरा सुरू करता आला नाही. कृपया कॅमेरा परवानगी तपासा किंवा फाईल अपलोड करा.'
        : 'Could not access camera. Please check camera permissions or upload a file.';
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        msg = isMarathi
          ? 'कॅमेरा परवानगी नाकारली आहे. ब्राउझर सेटिंग्जमध्ये कॅमेरा चालू करा.'
          : 'Camera permission denied. Please allow camera access in browser settings.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        msg = isMarathi
          ? 'डिव्हाइसवर कॅमेरा सापडला नाही. कृपया फाईल निवडा.'
          : 'No camera hardware found on this device. Please choose a photo from files.';
      }
      setCameraError(msg);
    } finally {
      setIsCameraStarting(false);
    }
  }, [facingMode, isMarathi, stopCamera]);

  // Manage camera on modal open/close or mode switch
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    if (initialImage) {
      setImageSrc(initialImage);
      setMode('edit');
      setRotation(0);
      setFlipHorizontal(false);
      setBrightness(1.0);
      setContrast(1.0);
      setIsEnhanced(false);
    } else {
      setMode('camera');
      setImageSrc(null);
      setRotation(0);
      setFlipHorizontal(false);
      setBrightness(1.0);
      setContrast(1.0);
      setIsEnhanced(false);
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, initialImage, startCamera, stopCamera]);

  // Restart camera when switching facingMode
  useEffect(() => {
    if (isOpen && mode === 'camera' && !initialImage) {
      startCamera();
    }
  }, [facingMode]);

  if (!isOpen) return null;

  // Toggle between front and back camera
  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture current frame from live video
  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If using user/front camera, flip preview horizontally so it feels natural
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const capturedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    stopCamera();
    setImageSrc(capturedDataUrl);
    setRotation(0);
    setFlipHorizontal(false);
    setBrightness(1.0);
    setContrast(1.0);
    setIsEnhanced(false);
    setMode('edit');
  };

  // Handle file select from disk or native camera
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      stopCamera();
      setImageSrc(dataUrl);
      setRotation(0);
      setFlipHorizontal(false);
      setBrightness(1.0);
      setContrast(1.0);
      setIsEnhanced(false);
      setMode('edit');
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Retake photo: return to camera
  const handleRetake = () => {
    setImageSrc(null);
    setMode('camera');
    startCamera();
  };

  // Rotate 90 degrees clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Flip horizontal
  const handleFlip = () => {
    setFlipHorizontal((prev) => !prev);
  };

  // Toggle Auto Document Enhancement (+10% brightness, +25% contrast for crisp text)
  const handleToggleEnhance = () => {
    if (isEnhanced) {
      setIsEnhanced(false);
      setBrightness(1.0);
      setContrast(1.0);
    } else {
      setIsEnhanced(true);
      setBrightness(1.1);
      setContrast(1.25);
    }
  };

  // Save and upload processed image
  const handleSaveAndUpload = async () => {
    if (!imageSrc) return;
    setIsSaving(true);

    try {
      let cropRect = undefined;

      // Crop normalized center coordinates based on aspect ratio
      if (cropAspect === 'id_card') {
        // Standard ID card is ~1.58 ratio (width : height)
        // If image is landscape or portrait, compute centered ID card box
        cropRect = {
          x: 0.05,
          y: 0.12,
          width: 0.9,
          height: 0.76,
        };
      } else if (cropAspect === 'square') {
        cropRect = {
          x: 0.1,
          y: 0.1,
          width: 0.8,
          height: 0.8,
        };
      }

      const processedDataUrl = await processImage(imageSrc, {
        rotation,
        flipHorizontal,
        brightness,
        contrast,
        crop: cropRect,
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.8,
      });

      onSave(processedDataUrl);
      stopCamera();
      onClose();
    } catch (err: any) {
      console.error('Error processing image:', err);
      // Fallback: save raw image if processing fails
      onSave(imageSrc);
      stopCamera();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // Dynamic titles and subtitles
  const modalHeading =
    title ||
    (documentType === 'aadhaar_front'
      ? isMarathi
        ? 'आधार कार्ड - पुढील बाजू'
        : 'Aadhaar Card - Front Side'
      : documentType === 'aadhaar_back'
      ? isMarathi
        ? 'आधार कार्ड - मागील बाजू'
        : 'Aadhaar Card - Back Side'
      : documentType === 'face'
      ? isMarathi
        ? 'ग्राहकाचा फोटो'
        : 'Customer Face Photo'
      : documentType === 'cheque'
      ? isMarathi
        ? 'सिक्युरिटी चेक'
        : 'Security Cheque'
      : isMarathi
      ? 'दस्तऐवज कॅमेरा व संपादन'
      : 'Document Camera & Editor');

  return (
    <div
      className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-md flex flex-col justify-between items-center p-3 sm:p-5 select-none animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCamera();
          onClose();
        }
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Top Header Bar */}
      <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-700/80 rounded-2xl px-4 py-3 flex items-center justify-between text-white shadow-xl backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
            {mode === 'camera' ? <Camera className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">{modalHeading}</h3>
            <p className="text-[11px] text-slate-400">
              {mode === 'camera'
                ? isMarathi
                  ? 'कॅमेरा समोर ठेवा व फोटो काढा'
                  : 'Align card & click shutter'
                : isMarathi
                ? 'फिरवा, क्रॉप करा व सेव्ह करा'
                : 'Rotate, enhance & save photo'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mode === 'camera' && !cameraError && (
            <button
              type="button"
              onClick={handleToggleFacingMode}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition flex items-center gap-1 text-xs font-semibold"
              title={isMarathi ? 'कॅमेरा बदला' : 'Switch Camera'}
            >
              <SwitchCamera className="w-4 h-4" />
              <span className="hidden sm:inline">
                {facingMode === 'environment'
                  ? isMarathi
                    ? 'बॅक'
                    : 'Rear'
                  : isMarathi
                  ? 'फ्रंट'
                  : 'Front'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Viewport Content */}
      <div className="w-full max-w-2xl flex-1 flex flex-col items-center justify-center my-3 relative overflow-hidden rounded-3xl bg-black border border-slate-800 shadow-2xl">
        {mode === 'camera' ? (
          /* Live Camera Mode */
          <div className="relative w-full h-full min-h-[380px] sm:min-h-[460px] flex items-center justify-center overflow-hidden">
            {cameraError ? (
              /* Camera Error / Permission Fallback View */
              <div className="p-6 text-center max-w-md space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">
                    {isMarathi ? 'कॅमेरा चालू होऊ शकला नाही' : 'Camera Unavailable'}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{cameraError}</p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isMarathi ? 'गॅलरीतून फोटो निवडा' : 'Choose Photo from Files'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{isMarathi ? 'पुन्हा प्रयत्न करा' : 'Retry'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Live Video Stream View */
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* ID Card Framing Overlay Guide */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                  {/* Framing rectangle */}
                  <div
                    className={`relative border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] transition-all ${
                      cropAspect === 'square'
                        ? 'w-64 h-64 rounded-full sm:rounded-3xl'
                        : 'w-11/12 max-w-[440px] aspect-[1.58/1] rounded-2xl'
                    }`}
                  >
                    {/* Corner accents */}
                    <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-primary rounded-br-lg" />

                    {/* Subtle center line */}
                    <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 border-t border-white/20 border-dashed" />
                  </div>

                  <span className="mt-4 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full text-white text-[11px] font-medium border border-white/20">
                    {documentType === 'aadhaar_front'
                      ? isMarathi
                        ? 'आधार कार्ड पुढील बाजू फ्रेममध्ये ठेवा'
                        : 'Align Aadhaar front within frame'
                      : documentType === 'aadhaar_back'
                      ? isMarathi
                        ? 'आधार कार्ड मागील बाजू (पत्ता) फ्रेममध्ये ठेवा'
                        : 'Align Aadhaar back within frame'
                      : documentType === 'face'
                      ? isMarathi
                        ? 'ग्राहकाचा चेहरा फ्रेममध्ये ठेवा'
                        : 'Position face within frame'
                      : isMarathi
                      ? 'दस्तऐवज फ्रेममध्ये ठेवा'
                      : 'Position document within frame'}
                  </span>
                </div>

                {isCameraStarting && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-xs font-semibold">
                      {isMarathi ? 'कॅमेरा सुरू होत आहे...' : 'Starting camera...'}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Image Edit Mode */
          <div className="relative w-full h-full min-h-[380px] sm:min-h-[460px] flex items-center justify-center overflow-hidden bg-slate-950 p-4">
            {imageSrc && (
              <div
                className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-300"
                style={{
                  transform: `rotate(${rotation}deg) scaleX(${flipHorizontal ? -1 : 1})`,
                  filter: `brightness(${brightness}) contrast(${contrast})`,
                }}
              >
                <img
                  src={imageSrc}
                  alt="Captured Preview"
                  className="max-h-[340px] sm:max-h-[400px] w-auto object-contain rounded-xl shadow-2xl border border-white/10"
                />
              </div>
            )}

            {/* Visual Guide Border for Current Crop */}
            {cropAspect !== 'full' && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
                <div
                  className={`border-2 border-primary/80 border-dashed transition-all pointer-events-none ${
                    cropAspect === 'square'
                      ? 'w-64 h-64 rounded-2xl'
                      : 'w-11/12 max-w-[440px] aspect-[1.58/1] rounded-xl'
                  }`}
                />
              </div>
            )}

            {/* Floating Sliders Drawer if opened */}
            {showSliders && (
              <div className="absolute bottom-3 inset-x-4 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-3.5 backdrop-blur-md shadow-2xl space-y-2.5 z-20">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    {isMarathi ? 'उजेड' : 'Brightness'}
                  </span>
                  <span className="font-mono text-primary">{Math.round(brightness * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.4"
                  step="0.05"
                  value={brightness}
                  onChange={(e) => setBrightness(parseFloat(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />

                <div className="flex items-center justify-between text-xs font-bold text-slate-300 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-400" />
                    {isMarathi ? 'कॉन्ट्रास्ट' : 'Contrast'}
                  </span>
                  <span className="font-mono text-primary">{Math.round(contrast * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.5"
                  step="0.05"
                  value={contrast}
                  onChange={(e) => setContrast(parseFloat(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Controls */}
      <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3 sm:p-4 text-white shadow-xl backdrop-blur">
        {mode === 'camera' ? (
          /* Camera Controls Bar */
          <div className="flex items-center justify-between gap-4">
            {/* Gallery Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition px-3 py-1.5 rounded-xl hover:bg-slate-800"
            >
              <Upload className="w-5 h-5 text-slate-300" />
              <span className="text-[10px] font-medium">{isMarathi ? 'गॅलरी' : 'Files'}</span>
            </button>

            {/* Shutter Capture Button */}
            <button
              type="button"
              disabled={isCameraStarting || !!cameraError}
              onClick={handleCapturePhoto}
              className="relative group disabled:opacity-40 disabled:pointer-events-none"
              title={isMarathi ? 'फोटो काढा' : 'Capture photo'}
            >
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-4 border-white flex items-center justify-center p-1 group-hover:scale-105 transition shadow-lg">
                <div className="w-full h-full rounded-full bg-primary group-hover:bg-primary-dark transition active:scale-95 flex items-center justify-center text-white shadow-inner">
                  <Camera className="w-6 h-6" />
                </div>
              </div>
            </button>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="flex flex-col items-center gap-1 text-slate-400 hover:text-rose-400 transition px-3 py-1.5 rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5 text-slate-400" />
              <span className="text-[10px] font-medium">{isMarathi ? 'रद्द' : 'Cancel'}</span>
            </button>
          </div>
        ) : (
          /* Edit Controls Bar */
          <div className="space-y-3">
            {/* Quick Edit Tools: Rotate, Flip, Enhance, Aspect */}
            <div className="flex items-center justify-between sm:justify-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {/* Rotate 90° */}
              <button
                type="button"
                onClick={handleRotate}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0"
                title={isMarathi ? '९० अंश फिरवा' : 'Rotate 90 degrees'}
              >
                <RotateCw className="w-3.5 h-3.5 text-primary" />
                <span>{isMarathi ? 'फिरवा' : 'Rotate'}</span>
                {rotation !== 0 && (
                  <span className="text-[10px] text-primary font-mono">{rotation}°</span>
                )}
              </button>

              {/* Flip Horizontal */}
              <button
                type="button"
                onClick={handleFlip}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 ${
                  flipHorizontal
                    ? 'bg-primary text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title={isMarathi ? 'उलट करा' : 'Flip horizontal'}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>{isMarathi ? 'उलट' : 'Flip'}</span>
              </button>

              {/* Auto Text & Clarity Enhance */}
              <button
                type="button"
                onClick={handleToggleEnhance}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 ${
                  isEnhanced
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title={isMarathi ? 'दस्तऐवज स्पष्ट व ठळक करा' : 'Auto Enhance Document Text'}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{isMarathi ? 'स्पष्ट करा' : 'Enhance'}</span>
              </button>

              {/* Sliders toggle */}
              <button
                type="button"
                onClick={() => setShowSliders((prev) => !prev)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 ${
                  showSliders
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title={isMarathi ? 'उजेड व कॉन्ट्रास्ट नियंत्रक' : 'Brightness & Contrast'}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isMarathi ? 'ट्यून' : 'Tune'}</span>
              </button>

              {/* Aspect Ratio selector */}
              <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700/80 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setCropAspect('id_card')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    cropAspect === 'id_card'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={isMarathi ? 'कार्ड आकार' : 'ID Card Aspect (3:2)'}
                >
                  <span className="hidden sm:inline">🪪 </span>{isMarathi ? 'कार्ड' : 'ID Card'}
                </button>
                <button
                  type="button"
                  onClick={() => setCropAspect('square')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    cropAspect === 'square'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={isMarathi ? 'चौरस १:१' : 'Square 1:1'}
                >
                  1:1
                </button>
                <button
                  type="button"
                  onClick={() => setCropAspect('full')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    cropAspect === 'full'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={isMarathi ? 'मूळ आकार' : 'Full / Original'}
                >
                  {isMarathi ? 'मूळ' : 'Full'}
                </button>
              </div>
            </div>

            {/* Bottom Actions: Retake vs Save & Upload */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isMarathi ? 'पुन्हा काढा' : 'Retake'}</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveAndUpload}
                className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 transition disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isMarathi ? 'अपलोड करत आहे...' : 'Uploading...'}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{isMarathi ? 'जतन व अपलोड करा' : 'Save & Upload'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
