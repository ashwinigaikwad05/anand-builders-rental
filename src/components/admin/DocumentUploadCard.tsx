import React, { useRef, useState } from 'react';
import { UploadCloud, Eye, Trash2, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import { compressAndReadFile } from '../../utils/imageUtils';

interface DocumentUploadCardProps {
  label: string;
  sublabel?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  icon: React.ReactNode;
  onPreview?: (url: string, title: string) => void;
  required?: boolean;
}

export const DocumentUploadCard: React.FC<DocumentUploadCardProps> = ({
  label,
  sublabel,
  value,
  onChange,
  icon,
  onPreview,
  required = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file (JPG, PNG, etc.)');
      return;
    }
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const compressedDataUrl = await compressAndReadFile(file, {
        maxWidth: 1200,
        maxHeight: 1200,
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
    // Reset file input value so re-selecting same file triggers change
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

  return (
    <div className="space-y-1.5 text-left">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
          {icon}
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
        {value && (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Uploaded
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
        <div className="relative group rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden transition-all shadow-sm">
          <div className="h-32 sm:h-36 w-full flex items-center justify-center bg-slate-900/5 relative overflow-hidden">
            <img
              src={value}
              alt={label}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
            />

            {/* Quick Action Overlay */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {onPreview && (
                <button
                  type="button"
                  onClick={() => onPreview(value, label)}
                  className="p-2 bg-white/90 hover:bg-white text-slate-800 rounded-xl shadow-lg transition hover:scale-110"
                  title="View full size"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-white/90 hover:bg-white text-primary rounded-xl shadow-lg transition hover:scale-110"
                title="Change photo"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="p-2 bg-white/90 hover:bg-white text-rose-600 rounded-xl shadow-lg transition hover:scale-110"
                title="Remove document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium truncate max-w-[150px]">
              {label}
            </span>
            <div className="flex items-center gap-1.5">
              {onPreview && (
                <button
                  type="button"
                  onClick={() => onPreview(value, label)}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  Enlarge
                </button>
              )}
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-[11px] font-bold text-rose-500 hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Upload Area */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={`h-32 sm:h-36 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-primary bg-primary/5 scale-[0.99]'
              : 'border-slate-200 hover:border-primary/60 hover:bg-slate-50/70 bg-white'
          } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2 text-primary">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs font-semibold">Compressing photo...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-slate-500">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-primary flex items-center justify-center mb-1 group-hover:scale-110 transition">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-700">
                Click or drag photo here
              </p>
              <p className="text-[10px] text-slate-400 font-light">
                JPG, PNG, WebP (Camera supported)
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
    </div>
  );
};
