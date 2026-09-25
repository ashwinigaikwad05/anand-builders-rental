import React from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title: string;
  subtitle?: string;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  subtitle,
}) => {
  const [zoomLevel, setZoomLevel] = React.useState<number>(1);

  React.useEffect(() => {
    if (isOpen) {
      setZoomLevel(1);
    }
  }, [isOpen]);

  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-fadeIn"
      onClick={onClose}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between bg-slate-900/90 border border-slate-700/70 rounded-2xl px-5 py-3.5 max-w-4xl w-full mx-auto shadow-2xl backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 font-light mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-400 w-12 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
            title="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition shadow-sm"
            title="Download Document"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition ml-1"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="flex-1 flex items-center justify-center overflow-auto p-4 max-h-[calc(100vh-140px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="transition-transform duration-150 ease-out max-w-full max-h-full flex items-center justify-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[75vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl border border-slate-700/50 bg-black/40"
          />
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="text-center text-[11px] text-slate-500 font-light">
        Press ESC or click anywhere outside to close
      </div>
    </div>
  );
};
