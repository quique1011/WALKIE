import React, { useState } from 'react';
import { PawPrint, ArrowRight, ArrowLeft, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole, UserCliente, UserPaseador } from '../types';
import { WalkieLogo } from './WalkieLogo';

interface LandingViewProps {
  onSelectRole: (role: 'cliente' | 'paseador') => void;
  clienteUser: UserCliente | null;
  paseadorUser: UserPaseador | null;
  currentRoleState?: UserRole;
  onContinueCurrentRole?: () => void;
  onContinueToProfile?: () => void;
  userLocation?: { lat: number; lng: number; address: string };
  onLocationChange?: (lat: number, lng: number, address: string) => void;
  onOpenNosotros?: () => void;
  onOpenMetas?: () => void;
  onOpenAuth?: (role: 'cliente' | 'paseador', tab?: 'login' | 'register') => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onSelectRole,
  clienteUser,
  paseadorUser,
  onContinueCurrentRole,
  onContinueToProfile,
  onOpenAuth
}) => {
  // 'presentacion' | 'elegir_rol'
  const [viewState, setViewState] = useState<'presentacion' | 'elegir_rol'>('presentacion');

  const activeUser = clienteUser || paseadorUser;
  const hasActiveSession = Boolean(activeUser);

  // Formatear nombre de usuario para el botón condicional
  const rawUsername = activeUser?.nombreUsuario || '';
  const displayUsername = rawUsername
    ? (rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`)
    : '@usuario';

  const handleContinue = () => {
    if (onContinueToProfile) {
      onContinueToProfile();
    } else if (onContinueCurrentRole) {
      onContinueCurrentRole();
    }
  };

  return (
    <div
      id="landing-container"
      className="flex-1 flex flex-col justify-center items-center relative overflow-hidden w-full min-h-[calc(100vh-100px)] px-4 py-8"
    >
      {/* Background Decor sutil y limpio */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-emerald-100/40 via-teal-50/30 to-slate-100/50 rounded-full blur-3xl pointer-events-none -z-10" />

      <AnimatePresence mode="wait">
        {viewState === 'presentacion' ? (
          /* ================================================================ */
          /* 1. PANTALLA DE PRESENTACIÓN (TOTALMENTE CENTRADA Y LIMPIA)       */
          /* ================================================================ */
          <motion.div
            key="presentacion"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-xl mx-auto flex flex-col items-center justify-center text-center my-auto"
          >
            {/* Logo Oficial de WALKIE */}
            <div className="mb-5 sm:mb-6 flex justify-center w-full">
              <WalkieLogo size="hero" className="max-w-[85vw] sm:max-w-md md:max-w-lg drop-shadow-xs" />
            </div>
            <h1 className="sr-only">WALKIE - Paseo de Mascotas</h1>

            {/* Subtítulo / Bajada Descriptiva */}
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-600 mb-8 sm:mb-10 tracking-tight">
              Paseo de Mascotas Bajo Demanda
            </p>

            {/* Botón de Acción Principal Único y Prominente */}
            {hasActiveSession ? (
              /* CASO B: Usuario ya tiene cuenta activa / sesión iniciada */
              <div className="flex flex-col items-center gap-3 w-full sm:w-auto">
                <button
                  id="btn-continuar-perfil"
                  type="button"
                  onClick={handleContinue}
                  className="w-full sm:w-auto min-w-[280px] sm:min-w-[340px] px-8 py-4 sm:py-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-base sm:text-lg shadow-xl shadow-emerald-600/25 hover:shadow-emerald-600/35 transition-all flex items-center justify-center gap-3 cursor-pointer group"
                >
                  <PawPrint className="w-5 h-5 text-emerald-100 shrink-0" />
                  <span className="truncate">Ir a Mis Paseos y Reservas ({displayUsername})</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform shrink-0" />
                </button>

                <button
                  type="button"
                  id="btn-elegir-otro-rol"
                  onClick={() => setViewState('elegir_rol')}
                  className="text-xs text-slate-500 hover:text-slate-800 transition-colors underline cursor-pointer mt-1"
                >
                  ¿Deseas elegir otro rol o registrar otra cuenta?
                </button>
              </div>
            ) : (
              /* CASO A: Usuario nuevo / sin cuenta ni sesión iniciada */
              <div className="flex flex-col items-center gap-3.5 w-full sm:w-auto">
                <button
                  id="btn-comenzar-experiencia"
                  type="button"
                  onClick={() => setViewState('elegir_rol')}
                  className="w-full sm:w-auto min-w-[280px] sm:min-w-[320px] px-8 py-4 sm:py-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-base sm:text-lg shadow-xl shadow-emerald-600/25 hover:shadow-emerald-600/35 transition-all flex items-center justify-center gap-3 cursor-pointer group"
                >
                  <span>Comenzar experiencia</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform shrink-0" />
                </button>

                {/* Botón Oficial Continuar con Google */}
                <button
                  id="btn-landing-google"
                  type="button"
                  onClick={() => onOpenAuth?.('cliente', 'login')}
                  className="w-full sm:w-auto min-w-[280px] sm:min-w-[320px] py-3.5 px-6 rounded-2xl border-2 border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/20 text-slate-800 font-bold text-sm flex items-center justify-center gap-3 shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Continuar con Google</span>
                </button>

                <div className="flex items-center gap-2 text-xs text-slate-500 pt-0.5">
                  <span>¿Ya tenés cuenta?</span>
                  <button
                    type="button"
                    onClick={() => onOpenAuth?.('cliente', 'login')}
                    className="font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                  >
                    Iniciar Sesión
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* ================================================================ */
          /* 4. FLUJO DE NUEVO USUARIO (PANTALLA DE ELECCIÓN DE ROL)          */
          /* ================================================================ */
          <motion.div
            key="elegir_rol"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center text-center my-auto"
          >
            {/* Botón de retroceso */}
            <div className="w-full flex justify-start mb-6">
              <button
                id="btn-volver-presentacion"
                type="button"
                onClick={() => setViewState('presentacion')}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Volver a la presentación</span>
              </button>
            </div>

            {/* Encabezado de la pantalla de roles */}
            <div className="space-y-2 mb-7 sm:mb-8 text-center max-w-xl mx-auto">
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-xl sm:text-2xl md:text-[1.75rem] font-extrabold text-slate-800 tracking-tight leading-snug">
                <span>El mejor paseo para tu perro está en</span>
                <WalkieLogo className="h-6 sm:h-7 md:h-8 w-auto inline-block align-middle" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Elegí tu rol
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm max-w-md mx-auto pt-0.5">
                Seleccioná cómo querés usar el servicio para comenzar tu registro
              </p>
            </div>

            {/* Tarjetas de Selección de Rol */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full text-left">
              {/* Opción 1: Cliente */}
              <button
                id="btn-role-cliente"
                type="button"
                onClick={() => onSelectRole('cliente')}
                className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-emerald-500/80 hover:border-emerald-600 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group active:scale-[0.98] cursor-pointer relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-0 pointer-events-none group-hover:bg-emerald-100/80 transition-colors" />
                <div className="relative z-10 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-bold shadow-inner">
                    🐾
                  </div>
                  <div>
                    <span className="text-[11px] font-black tracking-wider uppercase text-emerald-700 block mb-1">
                      Para Dueños de Mascotas
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                      Cliente: Quiero que paseen a mi perro
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-2 leading-relaxed">
                      Elegí un plan a medida, fijá tu punto en el mapa y recibí reportes con GPS y fotos en vivo.
                    </p>
                  </div>
                </div>
                <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-emerald-700">
                  <span>Iniciar registro como Cliente</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Opción 2: Paseador */}
              <button
                id="btn-role-paseador"
                type="button"
                onClick={() => onSelectRole('paseador')}
                className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-slate-200 hover:border-slate-800 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group active:scale-[0.98] cursor-pointer relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100 rounded-bl-full -z-0 pointer-events-none group-hover:bg-slate-200/80 transition-colors" />
                <div className="relative z-10 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center text-2xl font-bold shadow-inner">
                    🦮
                  </div>
                  <div>
                    <span className="text-[11px] font-black tracking-wider uppercase text-slate-500 block mb-1">
                      Para Paseadores
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                      Paseador: Quiero ser paseador
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-2 leading-relaxed">
                      Recibí solicitudes en tu radio de 10 km, cobrá por cada paseo realizado y manejá tus horarios.
                    </p>
                  </div>
                </div>
                <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-900">
                  <span>Iniciar registro como Paseador</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer minimalista y sutil */}
      <footer className="py-4 text-center text-xs text-slate-400 mt-auto w-full">
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span>© 2026</span>
            <WalkieLogo className="h-4 w-auto inline-block opacity-85" />
          </div>
          <span aria-hidden="true">·</span>
          <span>Paseo de Mascotas Bajo Demanda</span>
          <span aria-hidden="true">·</span>
          <span>Valle de Punilla</span>
        </div>
      </footer>
    </div>
  );
};
