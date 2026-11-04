import React from 'react';
import { ShieldAlert, AlertTriangle, Lock, Phone, Mail, User, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

export interface SuspendedAccountDetails {
  email: string;
  telefono: string;
  nombre: string;
  fechaSuspension: string;
  motivo: string;
  palabraDetectada?: string;
}

interface SuspendedAccountScreenProps {
  details: SuspendedAccountDetails;
  onResetSuspension: () => void;
  onLogout: () => void;
}

export const SuspendedAccountScreen: React.FC<SuspendedAccountScreenProps> = ({
  details,
  onResetSuspension,
  onLogout
}) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-2 border-rose-500/40 text-center space-y-6 relative overflow-hidden"
      >
        {/* Top Warning Banner Stripe */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-linear-to-r from-rose-600 via-amber-500 to-rose-600 animate-pulse" />

        {/* Shield & Lock Badge */}
        <div className="w-20 h-20 rounded-3xl bg-rose-100 border-2 border-rose-300 text-rose-600 flex items-center justify-center mx-auto shadow-inner mt-2">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-800 text-xs font-black uppercase px-3 py-1 rounded-full border border-rose-300">
            <Lock className="w-3.5 h-3.5" /> Sanción Permanente
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Cuenta suspendida por conducta inapropiada
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Tu acceso al sistema ha sido revocado de forma inmediata por infringir los Términos de Convivencia y Respeto Comunitario de <strong>Walkie</strong>.
          </p>
        </div>

        {/* Moderation Details Card */}
        <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 text-left space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 pb-2 border-b border-slate-200">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>DATOS DE LA CUENTA INHABILITADA</span>
          </div>

          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" /> Titular:
              </span>
              <span className="font-bold text-slate-800">{details.nombre || 'Usuario Registrado'}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Email suspendido:
              </span>
              <span className="font-mono font-bold text-rose-700">{details.email || 'No especificado'}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Teléfono bloqueado:
              </span>
              <span className="font-mono font-bold text-rose-700">{details.telefono || 'No especificado'}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-slate-200/80 pt-2">
              <span className="text-slate-500">Fecha de sanción:</span>
              <span className="font-semibold text-slate-700">{details.fechaSuspension}</span>
            </div>

            <div className="py-1">
              <span className="text-slate-500 block mb-1">Motivo de sanción:</span>
              <p className="text-rose-800 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-[11px] leading-snug">
                {details.motivo}
                {details.palabraDetectada && (
                  <span className="block mt-1 font-bold text-rose-900">
                    Término sancionado: &quot;{details.palabraDetectada}&quot;
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Warning Note */}
        <p className="text-[11px] text-slate-500 leading-snug">
          En Walkie protegemos la seguridad, tranquilidad y respeto tanto de los dueños como de nuestros paseadores caninos certificados. El uso de insultos, ofensas o agresiones no es tolerado bajo ninguna circunstancia.
        </p>

        {/* Actions */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            id="btn-desbloquear-demo"
            onClick={onResetSuspension}
            className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            title="Restablecer cuenta para pruebas"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restablecer cuenta (Modo Demo)</span>
          </button>

          <button
            type="button"
            id="btn-logout-suspendido"
            onClick={onLogout}
            className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
          >
            Cerrar Sesión
          </button>
        </div>
      </motion.div>
    </div>
  );
};
