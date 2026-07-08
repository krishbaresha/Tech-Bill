import React, { ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[TechBill POS Error Boundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-[#0e1322] via-[#11172a] to-[#1e1a38] p-4 text-stitch-on-surface">
          <div className="absolute top-10 left-10 w-72 h-72 bg-stitch-primary/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-stitch-error/5 rounded-full blur-[120px] pointer-events-none" />

          <div className="glass-card max-w-lg w-full rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl relative z-10 text-center space-y-6 stagger-entry">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-stitch-error/15 flex items-center justify-center ring-1 ring-stitch-error/20 animate-pulse">
              <ShieldAlert className="text-stitch-error w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold font-space text-white">Application Error</h1>
              <p className="text-sm text-stitch-on-surface-variant leading-relaxed">
                Something went wrong while rendering this page. We have logged the incident and you can attempt to reload the terminal.
              </p>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-5 py-2.5 bg-stitch-primary hover:bg-stitch-primary/90 text-stitch-on-primary font-bold rounded-lg text-sm transition-all active:scale-95 shadow-lg shadow-stitch-primary/10"
              >
                <RefreshCw size={15} />
                Reload Terminal
              </button>
            </div>

            {this.state.error && (
              <div className="border-t border-white/5 pt-4 text-left">
                <button
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="flex items-center justify-between w-full text-xs font-semibold text-stitch-on-surface-variant hover:text-white transition-colors"
                >
                  <span>Technical Diagnostics</span>
                  {this.state.showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {this.state.showDetails && (
                  <div className="mt-2.5 p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px] text-stitch-error overflow-auto max-h-48 leading-normal select-text">
                    <p className="font-bold">{this.state.error.toString()}</p>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="mt-1 opacity-70 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
