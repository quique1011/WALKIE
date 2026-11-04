import React, { useState } from 'react';
import { SolicitudPaseo, UserPaseador } from '../types';
import { WalkieMap } from './WalkieMap';
import { TemporalWalkChat } from './TemporalWalkChat';
import { WeatherAlertWidget } from './WeatherAlertWidget';
import { 
  Clock, MapPin, CheckCircle, AlertTriangle, 
  Phone, Navigation, Check, Key, FastForward, CheckCircle2, DollarSign, X,
  CheckSquare, Droplets, ShoppingBag, ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatWhatsAppLink, getCleanVeterinariaInfo, formatPesos } from '../utils/geo';
import { getSolicitudPricingDetails } from '../utils/planCalculations';

export interface PaseadorPaseoEnCursoFocoViewProps {
  solicitud: SolicitudPaseo;
  user: UserPaseador | null;
  walkerLat: number;
  walkerLng: number;
  activeTimers: Record<string, number>;
  code1Inputs: Record<string, string>;
  onCode1InputChange: (solId: string, val: string) => void;
  code2Inputs: Record<string, string>;
  onCode2InputChange: (solId: string, val: string) => void;
  codeError: string | null;
  onUpdateSolicitud: (updated: SolicitudPaseo) => void;
  onStartTransit: (sol: SolicitudPaseo) => void;
  onArriveAtDoor: (sol: SolicitudPaseo) => void;
  onValidatePin1: (sol: SolicitudPaseo) => void;
  onArriveAtReturnDoor: (sol: SolicitudPaseo) => void;
  onOpenModalPin1: (sol: SolicitudPaseo) => void;
  onOpenModalPin2: (sol: SolicitudPaseo) => void;
  onValidatePin2: (sol: SolicitudPaseo) => void;
  onFastForwardTimer: (sol: SolicitudPaseo) => void;
  onTriggerEmergency: (sol: SolicitudPaseo, motivo?: string) => void;
  onResolveEmergency: (sol: SolicitudPaseo) => void;
  onRejectSolicitud: (sol: SolicitudPaseo) => void;
  onOpenTutorial?: () => void;
}

export const PaseadorPaseoEnCursoFocoView: React.FC<PaseadorPaseoEnCursoFocoViewProps> = ({
  solicitud,
  user,
  walkerLat,
  walkerLng,
  activeTimers,
  code1Inputs,
  onCode1InputChange,
  code2Inputs,
  onCode2InputChange,
  codeError,
  onUpdateSolicitud,
  onArriveAtDoor,
  onValidatePin1,
  onArriveAtReturnDoor,
  onOpenModalPin1,
  onOpenModalPin2,
  onValidatePin2,
  onFastForwardTimer,
  onTriggerEmergency,
  onResolveEmergency,
  onRejectSolicitud,
  onOpenTutorial
}) => {
  const dog = solicitud.perro;
  const pricing = getSolicitudPricingDetails(solicitud);
  const ownerPhone = solicitud.clienteTelefono || dog.emergencyPhoneSecondary || '+54 9 3548 456789';
  const navUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(solicitud.ubicacion.direccion)}`;

  // Format seconds to MM:SS
  const formatTimer = (seconds?: number) => {
    const safeSec = Math.max(0, seconds !== undefined ? seconds : 2700);
    const mins = Math.floor(safeSec / 60);
    const secs = safeSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentSeconds = activeTimers[solicitud.id] !== undefined
    ? activeTimers[solicitud.id]
    : (solicitud.tiempoRestanteSegundos ?? 2700);

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    bolsas: true,
    agua: true,
    correa: true
  });

  const toggleItem = (key: string) => {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      id="modulo-seguimiento-en-vivo-paseador"
      className="bg-white rounded-3xl p-3.5 sm:p-5 border-2 border-emerald-500 shadow-xl relative overflow-hidden"
    >
      {/* 🚨 BANNER DE PROTOCOLO DE EMERGENCIA (SI ESTÁ ACTIVADO) */}
      {(solicitud.estado === 'en_emergencia' || solicitud.enEmergencia) && (() => {
        const vetInfo = getCleanVeterinariaInfo(solicitud.datosEmergencia?.veterinariaNombre || dog.trustedVet);
        const vetName = vetInfo.nombre;
        const vetAddress = vetInfo.direccion;
        const vetPhone = solicitud.datosEmergencia?.veterinariaTelefono || dog.emergencyPhonePrimary || vetInfo.telefono || '+54 9 3541 421000';
        const navVetUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${vetName}, ${vetAddress}`)}&travelmode=walking`;
        const whatsappVetUrl = formatWhatsAppLink(vetPhone, `Hola, soy el paseador de Walkie de ${dog.name}. Tengo una urgencia médica en curso.`);
        const whatsappDuenoUrl = formatWhatsAppLink(ownerPhone, `Hola ${solicitud.clienteNombre || 'dueño'}, soy el paseador de Walkie de ${dog.name}. Te contacto por la urgencia médica en curso.`);

        return (
          <div className="mb-4 bg-red-600 text-white rounded-2xl p-3.5 sm:p-4 border-2 border-red-400 shadow-xl space-y-3 animate-pulse">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 border-b border-red-500/80 pb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white text-red-600 flex items-center justify-center font-bold text-lg shadow shrink-0">
                  🚨
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest bg-black/30 text-amber-200 px-2 py-0.5 rounded-full inline-block">
                    AUXILIO INMEDIATO EN CURSO
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-white leading-tight">
                    PROTOCOLO DE EMERGENCIA ACTIVADO ({dog.name})
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onOpenTutorial && (
                  <button
                    type="button"
                    onClick={onOpenTutorial}
                    className="py-1 px-2.5 rounded-xl bg-red-700/80 hover:bg-red-800 text-white font-bold text-xs shadow transition-colors cursor-pointer flex items-center gap-1 border border-red-400/50"
                    title="Tutorial y Guía de Protocolos"
                  >
                    <span className="text-amber-300 font-bold">?</span>
                    <span>(Tutorial)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onResolveEmergency(solicitud)}
                  className="py-1.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs shadow transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Resolver / Reanudar</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
              <div className="bg-red-950/40 border border-red-400/60 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-300">
                    Veterinaria Asignada
                  </span>
                  <span className="text-[9px] bg-red-500/60 text-white font-mono px-1.5 py-0.5 rounded-full">
                    {vetPhone}
                  </span>
                </div>
                <h4 className="text-xs font-black text-white">{vetName}</h4>
                <p className="text-[11px] text-red-100 flex items-start gap-1">
                  <MapPin className="w-3 h-3 text-amber-300 shrink-0 mt-0.5" />
                  <span>{vetAddress}</span>
                </p>
                <a
                  href={navVetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-1.5 px-2.5 rounded-lg bg-white text-red-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow hover:bg-red-50"
                >
                  <Navigation className="w-3 h-3 text-red-600" />
                  <span>Cómo llegar (GPS)</span>
                </a>
              </div>

              <div className="bg-red-950/40 border border-red-400/60 rounded-xl p-3 flex flex-col justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-300">
                  Contactos de Auxilio
                </span>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => window.open(whatsappVetUrl, '_blank')}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"
                  >
                    <Phone className="w-3 h-3" />
                    <span>WhatsApp Vet ({vetPhone})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(whatsappDuenoUrl, '_blank')}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"
                  >
                    <Phone className="w-3 h-3 text-emerald-400" />
                    <span>WhatsApp Dueño ({ownerPhone})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================ */}
      {/* LAYOUT PRINCIPAL DE 2 COLUMNAS (ESCRITORIO / TABLET)         */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch">
        
        {/* ------------------------------------------------------------ */}
        {/* COLUMNA IZQUIERDA (5 columnas en desktop)                    */}
        {/* ------------------------------------------------------------ */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          
          <div className="space-y-3">
            {/* 1. ENCABEZADO DE INFORMACIÓN COMPACTO */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/90 space-y-2">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[9px] font-black tracking-wider uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300/80">
                  Seguimiento en Vivo • Paseador
                </span>
                <div className="flex items-center gap-2">
                  {onOpenTutorial && (
                    <button
                      type="button"
                      id="btn-tutorial-paseador-foco"
                      onClick={onOpenTutorial}
                      className="px-2 py-0.5 rounded-full bg-white text-slate-700 hover:text-slate-900 border border-slate-300/80 text-[10px] font-bold shadow-2xs hover:bg-slate-50 cursor-pointer flex items-center gap-1 transition-colors"
                      title="Tutorial del Paseador"
                    >
                      <span className="text-emerald-600 font-black">?</span>
                      <span>Tutorial</span>
                    </button>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-bold text-emerald-600">GPS Activo</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5 flex-wrap">
                    <span className="truncate">Paseo de {dog.name}</span>
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-900 text-emerald-400">
                      Plan {solicitud.tipoPlan}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500 truncate">
                    {dog.breed || 'Canino'} • {solicitud.clienteNombre ? `Dueño: ${solicitud.clienteNombre}` : 'Cliente'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onRejectSolicitud(solicitud)}
                  className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold cursor-pointer transition-colors shrink-0"
                  title="Cancelar turno"
                >
                  <X className="w-3 h-3 inline mr-0.5" />
                  Cancelar
                </button>
              </div>

              <p className="text-[11px] text-slate-700 font-medium flex items-start gap-1.5 bg-white p-2 rounded-xl border border-slate-200/80">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span className="truncate">Punto de retiro: <strong className="text-slate-900">{solicitud.ubicacion.direccion}</strong></span>
              </p>
            </div>

            {/* 2. BLOQUE OPERATIVO PRINCIPAL Y TEMPORIZADOR DESTACADO */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow shrink-0">
                    <Clock className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">
                      {solicitud.estado === 'en_curso' ? 'Temporizador de 45 Minutos' : 'Estado Operativo del Paseo'}
                    </span>
                    <h3 className="text-sm font-black text-white leading-tight">
                      {solicitud.estado === 'en_curso'
                        ? `Paseo Recreativo (${dog.name})`
                        : `Yendo al retiro de ${dog.name}`}
                    </h3>
                  </div>
                </div>

                {solicitud.estado === 'en_curso' && (
                  <button
                    type="button"
                    id="btn-foco-simular-llegada-retorno"
                    onClick={() => onFastForwardTimer(solicitud)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold border border-slate-700 flex items-center gap-1 cursor-pointer shadow-xs transition-all active:scale-95 shrink-0"
                    title="Simular fin de los 45 minutos y llegada de retorno"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                    <span>Simular Fin 45m</span>
                  </button>
                )}
              </div>

              {/* Display de Temporizador Regresivo Destacado */}
              <div className="bg-black/70 p-3 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                    TIEMPO RESTANTE
                  </span>
                  <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400 tracking-wider">
                    {formatTimer(currentSeconds)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Estado</span>
                  <span className="text-xs font-black text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/60 inline-block">
                    {solicitud.estado === 'en_camino' ? '🚶 En Camino' : (solicitud.estado === 'en_emergencia' ? '🚨 Emergencia' : '🐾 Paseo Activo')}
                  </span>
                </div>
              </div>
            </div>

            {/* 🌦️ WIDGET METEOROLÓGICO DINÁMICO EN TIEMPO REAL VÍA GPS */}
            <WeatherAlertWidget
              lat={solicitud.ubicacion?.lat || walkerLat}
              lng={solicitud.ubicacion?.lng || walkerLng}
              locationLabel={solicitud.ubicacion?.direccion || 'Ruta del Paseo'}
              onOpenChat={() => {
                const chatContainer = document.getElementById('chat-temporal-paseador-foco');
                if (chatContainer) {
                  chatContainer.scrollIntoView({ behavior: 'smooth' });
                  const input = chatContainer.querySelector('input');
                  if (input) {
                    input.focus();
                  }
                }
              }}
            />

            {/* 🌟 RECORDATORIO DE ELEMENTOS ESENCIALES (CHECKLIST SIMÉTRICO) 🌟 */}
            <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                    Recordatorio de Elementos Esenciales
                  </span>
                </div>
                <span className="text-[9px] font-black text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                  Checklist del Paseo
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* 1. Bolsas de Residuos */}
                <button
                  type="button"
                  onClick={() => toggleItem('bolsas')}
                  className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xs ${
                    checkedItems.bolsas
                      ? 'bg-white border-emerald-300 ring-1 ring-emerald-400/30'
                      : 'bg-slate-100 border-slate-200 opacity-60'
                  }`}
                  title="Hacé clic para marcar o desmarcar"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-bold mb-1 shadow-2xs relative">
                    <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
                    {checkedItems.bolsas && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-600 text-white text-[8px] flex items-center justify-center font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <span className="text-[10.5px] font-black text-slate-900 leading-tight">
                    Bolsas de
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 leading-tight">
                    Residuos
                  </span>
                </button>

                {/* 2. Agua Fresca */}
                <button
                  type="button"
                  onClick={() => toggleItem('agua')}
                  className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xs ${
                    checkedItems.agua
                      ? 'bg-white border-sky-300 ring-1 ring-sky-400/30'
                      : 'bg-slate-100 border-slate-200 opacity-60'
                  }`}
                  title="Hacé clic para marcar o desmarcar"
                >
                  <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center text-sm font-bold mb-1 shadow-2xs relative">
                    <Droplets className="w-3.5 h-3.5 text-sky-700" />
                    {checkedItems.agua && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-sky-600 text-white text-[8px] flex items-center justify-center font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <span className="text-[10.5px] font-black text-slate-900 leading-tight">
                    Agua
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 leading-tight">
                    Fresca
                  </span>
                </button>

                {/* 3. Correa y Collar */}
                <button
                  type="button"
                  onClick={() => toggleItem('correa')}
                  className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xs ${
                    checkedItems.correa
                      ? 'bg-white border-amber-300 ring-1 ring-amber-400/30'
                      : 'bg-slate-100 border-slate-200 opacity-60'
                  }`}
                  title="Hacé clic para marcar o desmarcar"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-sm font-bold mb-1 shadow-2xs relative">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                    {checkedItems.correa && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-600 text-white text-[8px] flex items-center justify-center font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <span className="text-[10.5px] font-black text-slate-900 leading-tight">
                    Correa y
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 leading-tight">
                    Collar
                  </span>
                </button>
              </div>
            </div>

            {/* 3. CAMPO E INFORMACIÓN DE PIN (RETIRO O DEVOLUCIÓN) */}
            {solicitud.estado === 'en_camino' && solicitud.etapaSeguimiento === 'en_domicilio' && (
              <div className="bg-amber-50 p-3.5 rounded-2xl border-2 border-amber-400 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-xs font-black text-amber-950">
                    Llegaste al Domicilio de Retiro ({dog.name})
                  </p>
                </div>
                <p className="text-[11px] text-amber-900 leading-tight">
                  Solicitá al cliente el PIN 1 de 4 dígitos para validar el retiro e iniciar oficialmente el recorrido.
                </p>
                {codeError && <p className="text-xs font-bold text-rose-600">{codeError}</p>}
              </div>
            )}

            {/* Ficha de PIN 2 / Ganancia para Paseo en Curso */}
            {(solicitud.estado === 'en_curso' || solicitud.estado === 'en_emergencia') && (
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-800">
                  <span className="font-bold flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-600" />
                    PIN de Devolución (PIN 2):
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                    Exigido al retornar
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">
                  Al retornar al domicilio, solicitá al cliente su PIN de 4 dígitos para concluir el servicio y acreditar tu pago.
                </p>

                {/* Ficha de ganancia neta acreditada */}
                <div className="bg-emerald-50/90 p-2 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-950">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Ganancia neta: <strong>{formatPesos(pricing.netoPorPaseo)}</strong></span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-300">
                    80% neto directo
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 4. BOTONES OPERATIVOS Y DE ACCIÓN PRINCIPAL (DESTACADOS) */}
          <div className="space-y-2 pt-1">
            {/* Acciones principales prioritarias */}
            {solicitud.estado === 'en_camino' && solicitud.etapaSeguimiento === 'yendo_a_retirar' && (
              <button
                type="button"
                id="btn-foco-llegue-domicilio-pin1"
                onClick={() => onArriveAtDoor(solicitud)}
                className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer text-center"
              >
                <Check className="w-5 h-5 shrink-0" />
                <span>Llegué al Domicilio (Pedir PIN 1)</span>
              </button>
            )}

            {/* UNIFICADO: ÚNICO botón visible para ingresar el PIN 1 de retiro */}
            {solicitud.estado === 'en_camino' && solicitud.etapaSeguimiento === 'en_domicilio' && (
              <button
                type="button"
                id="btn-foco-abrir-pin1-modal"
                onClick={() => onOpenModalPin1(solicitud)}
                className="w-full py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer text-center"
              >
                <Key className="w-5 h-5 shrink-0" />
                <span>Ingresar PIN 1 Retiro</span>
              </button>
            )}

            {/* FLUJO SECUENCIAL Y CLARO DE RETORNO Y FINALIZACIÓN */}
            {(solicitud.estado === 'en_curso' || solicitud.estado === 'en_emergencia') && (() => {
              const yaEnRetorno = Boolean(solicitud.avisoLlegadaRetorno || solicitud.etapaSeguimiento === 'en_domicilio_retorno');

              return (
                <div className="space-y-2">
                  {!yaEnRetorno ? (
                    /* Paso 1: Botón de estado para avisar arribo a domicilio de retorno */
                    <button
                      type="button"
                      id="btn-foco-llegue-retorno"
                      onClick={() => onArriveAtReturnDoor(solicitud)}
                      className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer text-center"
                    >
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span>Llegué a Domicilio de Retorno</span>
                    </button>
                  ) : (
                    /* Paso 2: Una vez en la puerta del dueño, habilitar el botón Finalizar (PIN 2) */
                    <div className="space-y-2">
                      <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 flex items-center gap-2 text-xs text-emerald-950">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold">¡En domicilio de retorno! Solicitá el PIN 2 al cliente.</span>
                      </div>
                      <button
                        type="button"
                        id="btn-foco-finalizar-pin2"
                        onClick={() => onOpenModalPin2(solicitud)}
                        className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all text-center ring-2 ring-emerald-400/50"
                      >
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span>Finalizar (PIN 2)</span>
                      </button>
                    </div>
                  )}

                  {/* 🚨 BOTÓN DE PROTOCOLO DE EMERGENCIA */}
                  <button
                    type="button"
                    id="btn-foco-emergencia-imprevisto"
                    onClick={() => onTriggerEmergency(solicitud)}
                    className="w-full py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer border border-red-500 active:scale-95 transition-all text-center"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-200 animate-pulse shrink-0" />
                    <span>EMERGENCIA / PROTOCOLO MÉDICO</span>
                  </button>
                </div>
              );
            })()}

            {/* Botones secundarios (WhatsApp y GPS) */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <a
                href={formatWhatsAppLink(ownerPhone, `Hola ${solicitud.clienteNombre || 'Dueño'}, soy el paseador de Walkie de ${dog.name}.`)}
                target="_blank"
                rel="noopener noreferrer"
                id="btn-foco-whatsapp-dueno"
                className="py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">WhatsApp Dueño</span>
              </a>

              <a
                href={navUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="btn-foco-mapa-gps"
                className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center"
              >
                <Navigation className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate">Ver en GPS</span>
              </a>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* COLUMNA DERECHA (7 columnas en desktop)                      */}
        {/* MAPA EXPANDIDO QUE OCUPA EL ESPACIO VERTICAL Y CONECTA AL CHAT */}
        {/* ------------------------------------------------------------ */}
        <div className="lg:col-span-7 flex flex-col h-full gap-3">
          
          {/* ARRIBA: MAPA INTERACTIVO MAPBOX EN VIVO EXPANDIDO */}
          <div className="flex-1 min-h-[340px] sm:min-h-[380px] lg:min-h-[420px] flex flex-col space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-0.5">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                Mapa Interactivo Mapbox en Vivo
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Valle de Punilla • GPS y Strava</span>
            </div>

            <div className="w-full flex-1 min-h-[300px] sm:min-h-[340px] rounded-2xl overflow-hidden shadow-xs border border-slate-200">
              <WalkieMap
                mode="paseador"
                centerLat={walkerLat}
                centerLng={walkerLng}
                activeTrackingSolicitud={solicitud}
                currentPaseadorId={user?.id}
              />
            </div>
          </div>

          {/* ABAJO: MÓDULO DE CHAT TEMPORAL CONECTADO DIRECTAMENTE SIN ESPACIO VACÍO */}
          <div id="chat-temporal-paseador-foco" className="h-[290px] sm:h-[310px] shrink-0 overflow-hidden flex flex-col">
            <TemporalWalkChat
              solicitud={solicitud}
              currentUserRole="paseador"
              currentUserName={user ? `${user.nombre} ${user.apellido}` : 'Paseador Walkie'}
              currentUserPhoto={user?.fotoPerfil}
              walkerLat={walkerLat}
              walkerLng={walkerLng}
              onPhotoSent={(photoUrl) => {
                const updatedPhotos = [...(solicitud.fotosRecorrido || []), photoUrl];
                onUpdateSolicitud({ ...solicitud, fotosRecorrido: updatedPhotos });
              }}
            />
          </div>
        </div>

      </div>
    </motion.section>
  );
};
