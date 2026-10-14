import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Antigravity Caught React Render Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      const keysToPreserve = ['anand_admin_authenticated'];
      const preserved: Record<string, string | null> = {};
      keysToPreserve.forEach((k) => {
        preserved[k] = localStorage.getItem(k);
      });
      localStorage.clear();
      Object.entries(preserved).forEach(([k, v]) => {
        if (v !== null) localStorage.setItem(k, v);
      });
    } catch (e) {
      console.warn('Could not reset cache:', e);
    }
    window.location.href = '/admin/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      const isMarathi = true;
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur space-y-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {isMarathi ? 'काहीतरी तांत्रिक त्रुटी आली' : 'Something Went Wrong'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {isMarathi
                  ? 'अ‍ॅप सुरू करताना किंवा डेटा लोड करताना अनपेक्षित अडचण आली. खालील बटण वापरून पृष्ठ पुन्हा लोड करा.'
                  : 'An unexpected error occurred while rendering the page. Try refreshing or recovering the cache.'}
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-left">
                <div className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Error Details</span>
                </div>
                <p className="text-xs font-mono text-slate-300 break-words line-clamp-3">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-orange-500/20 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{isMarathi ? 'पृष्ठ पुन्हा लोड करा' : 'Reload Page'}</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                className="flex-1 py-3 px-4 bg-slate-700/80 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-600 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isMarathi ? 'कॅश स्वच्छ करून डॅशबोर्ड जा' : 'Reset & Go to Dashboard'}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
