import React, { StrictMode, Component, ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Walkie Error Boundary Caught:', error, errorInfo);
  }

  private handleFullReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  private handleSoftReload = () => {
    try {
      localStorage.removeItem('walkie_cliente_user');
      localStorage.removeItem('walkie_paseador_user');
      localStorage.removeItem('walkie_google_last_account');
      sessionStorage.removeItem('walkie_auth_prompt_dismissed');
      sessionStorage.removeItem('walkie_onetap_dismissed');
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mx-auto shadow-inner">
              🐾
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-white">Walkie se recuperó</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ocurrió un ajuste temporal en la memoria de la sesión. Podés restablecer el estado para continuar con tus paseos y reservas.
              </p>
              {this.state.error?.message && (
                <div className="mt-2 p-2 bg-slate-950/70 border border-slate-700/60 rounded-xl text-left font-mono text-[11px] text-rose-300 max-h-20 overflow-y-auto">
                  {this.state.error.message}
                </div>
              )}
            </div>
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={this.handleFullReset}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer"
              >
                Limpiar datos y Reiniciar por completo 🔄
              </button>
              <button
                type="button"
                onClick={this.handleSoftReload}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs transition-all cursor-pointer"
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
