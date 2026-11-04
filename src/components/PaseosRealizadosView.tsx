import React from 'react';
import { SolicitudPaseo } from '../types';
import { formatPesos } from '../utils/geo';
import { CheckCircle2, MapPin, Calendar, Clock, DollarSign, User, Phone, Sparkles, Dog, ShieldCheck, Camera } from 'lucide-react';

interface PaseosRealizadosViewProps {
  solicitudes: SolicitudPaseo[];
  role: 'paseador' | 'cliente';
  onSelectSolicitud?: (solicitud: SolicitudPaseo) => void;
}

export const PaseosRealizadosView: React.FC<PaseosRealizadosViewProps> = ({
  solicitudes,
  role,
  onSelectSolicitud
}) => {
  const completedWalks = solicitudes.filter(s => s.estado === 'completada');

  const totalAmount = completedWalks.reduce((acc, s) => {
    if (role === 'paseador') {
      return acc + (s.montoNetoPaseador || Math.round(s.montoTotal * 0.8));
    }
    return acc + s.montoTotal;
  }, 0);

  return (
    <div id="seccion-paseos-realizados" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" /> Historial Oficial de Servicios
          </div>
          <h2 className="text-2xl sm:text-3xl font-black">
            Paseos Realizados y Finalizados 🐾
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
            {role === 'paseador'
              ? 'Registro completo de paseos concluidos con doble código de seguridad (PIN de retiro y PIN de entrega liberado).'
              : 'Historial de paseos completados por tus mascotas en el Valle de Punilla con trazabilidad GPS.'}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-left md:text-right shrink-0">
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
            {role === 'paseador' ? 'TOTAL COBRADO NETO' : 'TOTAL INVERTIDO EN PASEOS'}
          </span>
          <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            {formatPesos(totalAmount)}
          </span>
          <span className="text-[11px] text-slate-300 block mt-0.5">
            {completedWalks.length} {completedWalks.length === 1 ? 'paseo finalizado' : 'paseos finalizados'}
          </span>
        </div>
      </div>

      {/* Completed Walks List */}
      {completedWalks.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-dashed border-slate-300 text-center space-y-3 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center text-2xl mx-auto">
            🐾
          </div>
          <h3 className="text-base font-black text-slate-800">
            Aún no hay paseos completados en el historial
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {role === 'paseador'
              ? 'Cuando finalices un paseo de 45 minutos y valides el segundo Código de seguridad, el registro aparecerá automáticamente aquí con el detalle de cobro.'
              : 'Cuando tu paseador finalice el paseo y le dictes el Código 2 de entrega, verás el reporte completo del paseo de tu mascota aquí.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {completedWalks.map((sol, idx) => (
            <div
              key={`completed-walk-${sol.id}-${idx}`}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 hover:border-emerald-400 shadow-sm hover:shadow-md transition-all space-y-4 relative overflow-hidden flex flex-col justify-between"
            >
              {/* Card Top */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={sol.perro.photoUrl}
                      alt={sol.perro.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-black text-slate-900">
                          {sol.perro.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          Plan {sol.tipoPlan}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {sol.perro.breed} • {sol.perro.temperament}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Paseo Oficial de 45 min Completado</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {role === 'paseador' ? 'Cobro Neto' : 'Abonado'}
                    </span>
                    <span className="text-lg font-black text-emerald-600 font-mono">
                      {formatPesos(role === 'paseador' ? (sol.montoNetoPaseador || Math.round(sol.montoTotal * 0.8)) : sol.montoTotal)}
                    </span>
                  </div>
                </div>

                {/* Details box */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs space-y-1.5 text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {role === 'paseador' ? 'Cliente:' : 'Paseador Asignado:'}
                    </span>
                    <span className="font-bold text-slate-800">
                      {role === 'paseador' ? sol.clienteNombre : (sol.paseadorNombre || 'Paseador Oficial')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      Punto de Retiro:
                    </span>
                    <span className="font-semibold text-slate-800 truncate max-w-[200px]" title={sol.ubicacion.direccion}>
                      {sol.ubicacion.direccion}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Fecha y Hora:
                    </span>
                    <span className="font-semibold text-slate-800">
                      {sol.fechaProgramada || new Date(sol.fechaCreacion).toLocaleDateString()} {sol.horaFin ? `• ${sol.horaFin} hs` : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Códigos de Seguridad:
                    </span>
                    <span className="font-mono text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      PIN 1: {sol.codigoInicio} • PIN 2: {sol.codigoFin}
                    </span>
                  </div>
                </div>

                {/* Photos if any */}
                {sol.fotosRecorrido && sol.fotosRecorrido.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Camera className="w-3 h-3 text-emerald-600" /> Fotos enviadas durante el paseo:
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {sol.fotosRecorrido.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt="Reporte paseo"
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-2xs"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom tag */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  ID: #{sol.id ? sol.id.slice(-6) : 'N/A'}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-black text-[11px] flex items-center gap-1">
                  ✓ Transacción Finalizada
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
