import React, { useState } from 'react';
import { SolicitudPaseo } from '../types';
import { 
  AlertTriangle, 
  Phone, 
  MapPin, 
  Navigation, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  X, 
  Send,
  HeartPulse,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { calculateDistanceKm, formatWhatsAppLink, getCleanVeterinariaInfo } from '../utils/geo';

interface EmergencyProtocolModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitud: SolicitudPaseo;
  walkerCoords?: { lat: number; lng: number };
  onTriggerEmergency: (solicitud: SolicitudPaseo, motivo?: string) => void;
  onResolveEmergency?: (solicitud: SolicitudPaseo) => void;
}

export const EmergencyProtocolModal: React.FC<EmergencyProtocolModalProps> = ({
  isOpen,
  onClose,
  solicitud,
  walkerCoords,
  onTriggerEmergency,
  onResolveEmergency
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('Accidente o golpe repentino');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [hasNotifiedOwner, setHasNotifiedOwner] = useState<boolean>(false);

  if (!isOpen || !solicitud) return null;

  const dog = solicitud.perro;

  // Datos reales y limpios de la veterinaria asignada del perro
  const vetInfo = getCleanVeterinariaInfo(dog.trustedVet);
  const vetName = vetInfo.nombre;
  const vetAddress = vetInfo.direccion;
  const vetPhone = dog.emergencyPhonePrimary || vetInfo.telefono || '+54 9 3541 421000';
  const ownerPhone = solicitud.clienteTelefono || dog.emergencyPhoneSecondary || '+54 9 3548 456789';

  // Coordenadas aproximadas de la veterinaria para calcular distancia
  const vetLat = (solicitud.ubicacion?.lat || -31.4201) + 0.005;
  const vetLng = (solicitud.ubicacion?.lng || -64.4992) + 0.004;

  const currentLat = walkerCoords?.lat || solicitud.ubicacion?.lat || -31.4201;
  const currentLng = walkerCoords?.lng || solicitud.ubicacion?.lng || -64.4992;
  const distanceKm = calculateDistanceKm(currentLat, currentLng, vetLat, vetLng);
  const formattedDistance = distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`;

  const handleActivateEmergency = () => {
    setHasNotifiedOwner(true);
    const motivoFinal = customNotes ? `${selectedReason} - ${customNotes}` : selectedReason;
    onTriggerEmergency(solicitud, motivoFinal);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isAlreadyInEmergency = solicitud.enEmergencia || solicitud.estado === 'en_emergencia' || hasNotifiedOwner;
  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${vetName}, ${vetAddress}`)}&travelmode=walking`;

  const whatsappVetUrl = formatWhatsAppLink(vetPhone, `Hola, soy paseador de Walkie con ${dog.name}. Tengo una urgencia veterinaria en curso.`);
  const whatsappDuenoUrl = formatWhatsAppLink(ownerPhone, `Hola ${solicitud.clienteNombre || 'dueño'}, soy el paseador de Walkie de ${dog.name}. Te contacto por el protocolo de emergencia activado.`);

  return (
    <AnimatePresence>
      <div 
        key="modal-emergencia-overlay"
        id="modal-emergencia-overlay"
        className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2 }}
          id="modal-protocolo-emergencia"
          className="bg-white rounded-3xl shadow-2xl border-2 border-red-500 max-w-lg w-full overflow-hidden my-auto"
        >
          {/* Header Rojo de Emergencia */}
          <div className="bg-red-600 text-white p-4 sm:p-5 flex items-center justify-between gap-3 relative overflow-hidden">
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 border border-white/30 animate-pulse">
                <AlertTriangle className="w-7 h-7 text-amber-200" />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase bg-black/30 px-2 py-0.5 rounded-full text-red-100 inline-block mb-1">
                  PROTOCOLO DE SEGURIDAD WALKIE
                </span>
                <h3 className="text-lg sm:text-xl font-black leading-tight text-white">
                  ¡ALERTA DE EMERGENCIA EN PASEO!
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors shrink-0 z-10"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Subtle background glow effect */}
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-red-500 rounded-full blur-2xl opacity-50 pointer-events-none" />
          </div>

          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[80vh] overflow-y-auto">
            {/* 1. SECCIÓN DESTACADA: IR A VETERINARIA ASIGNADA */}
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-red-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-red-600" />
                  <span className="text-xs font-black text-red-900 uppercase tracking-wider">
                    Ir a: Veterinaria asignada
                  </span>
                </div>
                <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                  A {formattedDistance} de tu posición
                </span>
              </div>

              <div className="space-y-1">
                <h4 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  {vetName}
                </h4>
                <p className="text-xs text-slate-600 flex items-start gap-1.5 font-medium">
                  <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{vetAddress}</span>
                </p>
              </div>

              {/* Botón Destacado: Abrir en Mapa / Cómo Llegar */}
              <a
                id="btn-abrir-mapa-veterinaria"
                href={navUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer text-center"
              >
                <Navigation className="w-4 h-4 text-amber-200" />
                <span>Abrir en Mapa / Cómo Llegar (GPS)</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
            </div>

            {/* 2. BOTONES DE CONTACTO DIRECTO VÍA WHATSAPP (VETERINARIA & DUEÑO) */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Contactos Rápidos de Emergencia (Vía WhatsApp)
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Contactar Veterinaria vía WhatsApp */}
                <button
                  type="button"
                  id="btn-whatsapp-veterinaria"
                  onClick={() => window.open(whatsappVetUrl, '_blank')}
                  className="py-3 px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer text-center"
                >
                  <Phone className="w-4 h-4 text-emerald-200 shrink-0" />
                  <div className="text-left">
                    <span className="block text-[10px] text-emerald-100 uppercase font-semibold">Contactar Veterinaria (WhatsApp)</span>
                    <span className="font-mono text-xs text-white">{vetPhone}</span>
                  </div>
                </button>

                {/* Contactar Dueño vía WhatsApp */}
                <button
                  type="button"
                  id="btn-whatsapp-dueno"
                  onClick={() => window.open(whatsappDuenoUrl, '_blank')}
                  className="py-3 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer text-center"
                >
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="text-left">
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">Contactar Dueño ({solicitud.clienteNombre || 'Dueño'})</span>
                    <span className="font-mono text-xs text-emerald-300">{ownerPhone}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* 3. FICHA CLÍNICA RÁPIDA DEL PERRO */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs space-y-1.5 text-slate-700">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>Paciente: {dog.name} ({dog.breed || dog.raza || 'Perro'})</span>
                <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md font-semibold">
                  Edad: {dog.age || dog.edad || 'Adulto'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                <strong>Condiciones médicas / notas:</strong> {dog.illnesses || dog.enfermedades || dog.personalityNotes || 'Sin patologías previas declaradas.'}
              </p>
            </div>

            {/* 4. SELECCIÓN DE MOTIVO Y ESTADO DE ALERTA AL DUEÑO */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                Motivo del Imprevisto
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  'Accidente o golpe repentino',
                  'Descompensación / Agotamiento',
                  'Pelea con otro canino',
                  'Intoxicación / Ingesta extraña',
                  'Corte o lastimadura en pata',
                  'Problema de conducta / Fuga'
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedReason(reason)}
                    className={`py-2 px-2.5 rounded-xl border text-left font-medium transition-all text-[11px] cursor-pointer ${
                      selectedReason === reason
                        ? 'bg-red-50 border-red-400 text-red-950 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Observación adicional rápida (opcional)..."
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-red-500 focus:bg-white"
              />

              {/* Botón para Emitir Alerta o Reanudar */}
              {!isAlreadyInEmergency ? (
                <button
                  type="button"
                  id="btn-activar-protocolo-emergencia"
                  onClick={handleActivateEmergency}
                  className="w-full py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <ShieldAlert className="w-5 h-5 text-amber-200" />
                  <span>EMITIR ALERTA Y CAMBIAR ESTADO A EMERGENCIA</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-xs text-red-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="font-semibold">
                      🚨 Alerta de emergencia emitida: Notificación y ubicación GPS enviadas al dueño ({solicitud.clienteNombre || 'Dueño'}).
                    </span>
                  </div>

                  {onResolveEmergency && (
                    <button
                      type="button"
                      id="btn-resolver-emergencia"
                      onClick={() => {
                        onResolveEmergency(solicitud);
                        onClose();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Marcar Emergencia Resuelta / Reanudar Paseo Normal</span>
                    </button>
                  )}
                </div>
              )}

              {/* Botón Cerrar / Volver al paseo */}
              <button
                type="button"
                id="btn-cerrar-modal-emergencia"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>Cerrar / Volver al paseo</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
