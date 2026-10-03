import React, { useRef, useState } from 'react';
import {
  Camera,
  Eye,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Edit3,
} from 'lucide-react';
import { compressAndReadFile } from '../../utils/imageUtils';
import { CameraCaptureModal } from './modals/CameraCaptureModal';
import { getStoredAppLanguage } from '../../utils/appTranslations';

interface DocumentUploadCardProps {
  label: string;
  sublabel?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  icon: React.ReactNode;
  onPreview?: (url: string, title: string) => void;
  required?: boolean;
  documentType?: 'aadhaar_front' | 'aadhaar_back' | 'face' | 'cheque' | 'general';
  appLanguage?: 'marathi' | 'english';
  compact?: boolean;
}

export const DocumentUploadCard: React.FC<DocumentUploadCardProps> = ({
  label,
  sublabel,
  value,
  onChange,
  icon,
  onPreview,
  required = false,
  documentType = 'general',
  appLanguage,
  compact = false,
}) => {
  const isMarathi = (appLanguage || getStoredAppLanguage()) === 'marathi';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Camera Capture & Edit Modal state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraInitialImage, setCameraInitialImage] = useState<string | null>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage(
        isMarathi ? 'कृपया इमेज फाईल (JPG, PNG) निवडा.' : 'Please select an image file (JPG, PNG, etc.)'
      );
      return;
    }
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const compressedDataUrl = await compressAndReadFile(file, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.78,
      });
      onChange(compressedDataUrl);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to process image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleOpenCamera = () => {
    setCameraInitialImage(null);
    setIsCameraOpen(true);
  };

  const handleOpenEdit = () => {
    if (value) {
      setCameraInitialImage(value);
      setIsCameraOpen(true);
    }
  };

  return (
    <div className="space-y-1.5 text-left">
      {/* Header Label */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
          {icon}
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
        {value && (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {isMarathi ? 'अपलोड झाले' : 'Uploaded'}
          </span>
        )}
      </div>

      {sublabel && <p className="text-[11px] text-slate-400 font-light">{sublabel}</p>}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {value ? (
        /* Image Preview Card */
        <div className="relative group rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden transition-all shadow-xs hover:border-slate-300">
          <div
            className={`w-full flex items-center justify-center bg-slate-900/5 relative overflow-hidden ${
              compact ? 'h-28 sm:h-32' : 'h-32 sm:h-36'
            }`}
          >
            <img
              src={value}
              alt={label}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
            />

            {/* Quick Action Overlay on Hover */}
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
              {onPreview && (
                <button
                  type="button"
                  onClick={() => onPreview(value, label)}
                  className="p-2 bg-white/95 hover:bg-white text-slate-800 rounded-xl shadow-lg transition hover:scale-110"
                  title={isMarathi ? 'मोठा करून पहा' : 'View full size'}
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Edit / Rotate / Crop */}
              <button
                type="button"
                onClick={handleOpenEdit}
                className="p-2 bg-white/95 hover:bg-white text-blue-600 rounded-xl shadow-lg transition hover:scale-110"
                title={isMarathi ? 'फोटो क्रॉप / फिरवा' : 'Edit / Rotate / Crop'}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              {/* Retake with Camera */}
              <button
                type="button"
                onClick={handleOpenCamera}
                className="p-2 bg-white/95 hover:bg-white text-primary rounded-xl shadow-lg transition hover:scale-110"
                title={isMarathi ? 'कॅमेऱ्याने पुन्हा काढा' : 'Retake with Camera'}
              >
                <Camera className="w-3.5 h-3.5" />
              </button>

              {/* Change from files */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-white/95 hover:bg-white text-slate-700 rounded-xl shadow-lg transition hover:scale-110"
                title={isMarathi ? 'गॅलरीतून बदला' : 'Choose different file'}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              {/* Remove */}
              <button
                type="button"
                onClick={() => onChange(null)}
                className="p-2 bg-white/95 hover:bg-white text-rose-600 rounded-xl shadow-lg transition hover:scale-110"
                title={isMarathi ? 'काढून टाका' : 'Remove document'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bottom Card Bar */}
          <div className="p-2 bg-white border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleOpenEdit}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5"
              >
                <Edit3 className="w-2.5 h-2.5" /> {isMarathi ? 'संपादित करा' : 'Edit'}
              </button>
              <span className="text-slate-200">•</span>
              <button
                type="button"
                onClick={handleOpenCamera}
                className="text-[11px] font-bold text-primary hover:text-primary-dark hover:underline flex items-center gap-0.5"
              >
                <Camera className="w-2.5 h-2.5" /> {isMarathi ? 'पुन्हा काढा' : 'Retake'}
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {onPreview && (
                <button
                  type="button"
                  onClick={() => onPreview(value, label)}
                  className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:underline"
                >
                  {isMarathi ? 'पहा' : 'Enlarge'}
                </button>
              )}
              <span className="text-slate-200">•</span>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 hover:underline"
              >
                {isMarathi ? 'हटवा' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Upload & Camera Action Box */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-3 text-center transition-all ${
            compact ? 'min-h-[110px] sm:min-h-[120px]' : 'min-h-[130px] sm:min-h-[145px]'
          } ${
            isDragging
              ? 'border-primary bg-primary/5 scale-[0.99]'
              : 'border-slate-200 hover:border-primary/50 bg-white hover:bg-slate-50/60'
          } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2 text-primary py-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs font-semibold">
                {isMarathi ? 'फोटो कॉम्प्रेस होत आहे...' : 'Processing photo...'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 w-full">
              {/* Primary Action: Direct Camera Shutter */}
              <button
                type="button"
                onClick={handleOpenCamera}
                className="w-full max-w-[200px] py-1.5 px-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:shadow transition active:scale-95 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{isMarathi ? 'कॅमेरा उघडा' : 'Open Camera'}</span>
              </button>

              {/* Secondary Action: Select File or Drag */}
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <span>{isMarathi ? 'किंवा' : 'or'}</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-bold text-slate-600 hover:text-primary transition underline cursor-pointer"
                >
                  {isMarathi ? 'फाईल निवडा' : 'browse file'}
                </button>
              </div>

              <p className="text-[10px] text-slate-400 font-light">
                {isMarathi ? 'JPG, PNG, WebP (थेट कॅमेरा व संपादन)' : 'JPG, PNG, WebP (Live Camera & Edit)'}
              </p>
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <p className="text-[11px] font-medium text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
          {errorMessage}
        </p>
      )}

      {/* Integrated Camera Capture & Edit Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onSave={(dataUrl) => {
          onChange(dataUrl);
          setIsCameraOpen(false);
        }}
        title={`${label}`}
        documentType={documentType}
        initialImage={cameraInitialImage}
        appLanguage={appLanguage}
      />
    </div>
  );
};
