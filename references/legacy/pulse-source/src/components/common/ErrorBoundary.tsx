import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-depth-space flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full space-y-8 p-12 rounded-[3rem] bg-white/5 border border-white/10 backdrop-blur-xl">
            <div className="inline-flex p-4 rounded-2xl bg-red-500/20 text-red-500 border border-red-500/20">
              <ShieldAlert className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Neural Link Severed</h1>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-red-400">Critical Memory Exception</p>
            </div>

            <p className="text-sm text-zinc-500 leading-relaxed">
              The matrix has encountered an unhandled distortion. Your current session state has been preserved, but the view cannot be rendered.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-4 rounded-2xl bg-white text-zinc-950 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Re-Synchronize OS
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
              >
                <Home className="w-3.5 h-3.5" />
                Return to Command
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
