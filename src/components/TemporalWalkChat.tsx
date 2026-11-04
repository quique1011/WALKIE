import React, { useState, useEffect, useRef } from 'react';
import { SolicitudPaseo } from '../types';
import { evaluateMessageModeration } from '../utils/moderation';
import { 
  MessageSquare, Send, Image as ImageIcon, Camera, Download, 
  X, AlertTriangle, CheckCircle2, ShieldCheck, ChevronDown, 
  ChevronUp, Sparkles, Clock, Lock, MapPin, Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getStreetNameFromGps, 
  normalizeStreetName, 
  getLastAnnouncedStreet, 
  publishStreetUpdateToChat 
} from '../utils/streetTracking';
import { GEOLOCATION_OPTIONS } from '../utils/geolocation';
import { calculateDistanceKm } from '../utils/geo';

export interface ChatMessage {
  id: string;
  solicitudId: string;
  senderRole: 'cliente' | 'paseador';
  senderName: string;
  senderPhoto?: string;
  text?: string;
  photoUrl?: string;
  timestamp: string;
  isStreetUpdate?: boolean;
  streetName?: string;
}

interface TemporalWalkChatProps {
  solicitud: SolicitudPaseo;
  currentUserRole: 'cliente' | 'paseador';
  currentUserName: string;
  currentUserPhoto?: string;
  onPhotoSent?: (photoUrl: string) => void;
  isCollapsible?: boolean;
  walkerLat?: number;
  walkerLng?: number;
}

export const TemporalWalkChat: React.FC<TemporalWalkChatProps> = ({
  solicitud,
  currentUserRole,
  currentUserName,
  currentUserPhoto,
  onPhotoSent,
  isCollapsible = true,
  walkerLat,
  walkerLng
}) => {
  const storageKey = `walkie_chat_${solicitud.id}`;
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: `sys-init-${solicitud.id}`,
        solicitudId: solicitud.id,
        senderRole: 'paseador',
        senderName: 'Sistema Walkie',
        text: `🐾 Chat temporal iniciado para el paseo de ${solicitud.perro.name}. Canal seguro y moderado en vivo.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const [inputMessage, setInputMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sync to and from localStorage across components and tabs
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (e) {
      console.error(e);
    }
  }, [messages, storageKey]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          setMessages(JSON.parse(e.newValue));
        } catch (err) {
          console.error(err);
        }
      }
    };

    const handleCustomMsg = (e: Event) => {
      const customEvent = e as CustomEvent<{ solicitudId: string; messages: ChatMessage[] }>;
      if (customEvent.detail && customEvent.detail.solicitudId === solicitud.id) {
        setMessages(customEvent.detail.messages);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('walkie_chat_update', handleCustomMsg);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('walkie_chat_update', handleCustomMsg);
    };
  }, [solicitud.id, storageKey]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized]);

  // Count photos sent in this walk session
  const photoCount = messages.filter(m => !!m.photoUrl).length;

  // 📍 RASTREO AUTOMÁTICO DE CALLES EN VIVO DURANTE EL PASEO ('EN_CURSO')
  const lastDetectedStreetRef = useRef<string | null>(null);
  const lastCoordsCheckedRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const isCheckingStreetRef = useRef<boolean>(false);
  const demoStreetIndexRef = useRef<number>(0);

  const isWalkActive = solicitud.estado === 'en_curso' || 
                       solicitud.etapaPaseo === 'ETAPA_3_PASEO_EN_CURSO' || 
                       solicitud.etapaSeguimiento === 'paseo_activo';

  // Inicializar última calle anunciada desde el almacenamiento para evitar duplicados en recargas
  useEffect(() => {
    const prev = getLastAnnouncedStreet(solicitud.id);
    if (prev) {
      lastDetectedStreetRef.current = prev;
    }
  }, [solicitud.id]);

  // Función de detección y publicación automática de calle con Nominatim
  const checkAndPublishStreet = async (lat: number, lng: number, force: boolean = false) => {
    if (!isWalkActive || isCheckingStreetRef.current) return;

    const now = Date.now();
    if (!force && lastCoordsCheckedRef.current) {
      const distKm = calculateDistanceKm(
        lastCoordsCheckedRef.current.lat,
        lastCoordsCheckedRef.current.lng,
        lat,
        lng
      );
      const elapsedMs = now - lastCoordsCheckedRef.current.time;
      if (distKm < 0.015 && elapsedMs < 20000) {
        return;
      }
    }

    try {
      isCheckingStreetRef.current = true;
      lastCoordsCheckedRef.current = { lat, lng, time: now };

      const streetResult = await getStreetNameFromGps(lat, lng);
      const formatted = streetResult.formattedDisplay;
      const normalizedNew = normalizeStreetName(formatted);
      const normalizedLast = normalizeStreetName(lastDetectedStreetRef.current);

      if (normalizedNew && normalizedNew !== normalizedLast) {
        lastDetectedStreetRef.current = formatted;
        publishStreetUpdateToChat(solicitud.id, solicitud.perro.name, formatted);
      }
    } catch (err) {
      console.warn('Error en detección de calle GPS:', err);
    } finally {
      isCheckingStreetRef.current = false;
    }
  };

  // Monitoreo GPS en segundo plano cuando el paseo está en curso
  useEffect(() => {
    if (!isWalkActive) return;

    const targetLat = walkerLat ?? solicitud.paseadorCoords?.lat ?? solicitud.ubicacion.lat;
    const targetLng = walkerLng ?? solicitud.paseadorCoords?.lng ?? solicitud.ubicacion.lng;

    if (targetLat && targetLng) {
      const initialTimer = setTimeout(() => {
        checkAndPublishStreet(targetLat, targetLng);
      }, 1000);

      let watchId: number | null = null;
      if (typeof navigator !== 'undefined' && navigator.geolocation && currentUserRole === 'paseador') {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            checkAndPublishStreet(pos.coords.latitude, pos.coords.longitude);
          },
          (_err) => {},
          GEOLOCATION_OPTIONS
        );
      }

      const periodicInterval = setInterval(() => {
        const curLat = walkerLat ?? solicitud.paseadorCoords?.lat ?? targetLat;
        const curLng = walkerLng ?? solicitud.paseadorCoords?.lng ?? targetLng;
        checkAndPublishStreet(curLat, curLng);
      }, 25000);

      return () => {
        clearTimeout(initialTimer);
        clearInterval(periodicInterval);
        if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.clearWatch(watchId);
        }
      };
    }
  }, [isWalkActive, solicitud.id, walkerLat, walkerLng, solicitud.paseadorCoords?.lat, solicitud.paseadorCoords?.lng, currentUserRole]);

  // Simulación de prueba para avanzar a una nueva calle durante el recorrido
  const handleSimulateStreetChange = () => {
    const demoStreets = [
      { road: 'Avenida San Martín', locality: 'Los Cocos' },
      { road: 'Calle Los Cipreses', locality: 'Los Cocos' },
      { road: 'Avenida Cecilia Grierson', locality: 'Los Cocos' },
      { road: 'Calle Los Pinos', locality: 'Los Cocos' },
      { road: 'Avenida Costanera', locality: 'Los Cocos' },
      { road: 'Calle Las Acacias', locality: 'Los Cocos' }
    ];

    const currentNorm = normalizeStreetName(lastDetectedStreetRef.current);
    let nextIdx = (demoStreetIndexRef.current + 1) % demoStreets.length;
    if (normalizeStreetName(`${demoStreets[nextIdx].road}, ${demoStreets[nextIdx].locality}`) === currentNorm) {
      nextIdx = (nextIdx + 1) % demoStreets.length;
    }
    demoStreetIndexRef.current = nextIdx;
    const target = `${demoStreets[nextIdx].road}, ${demoStreets[nextIdx].locality}`;
    lastDetectedStreetRef.current = target;
    publishStreetUpdateToChat(solicitud.id, solicitud.perro.name, target);
  };

  // Handle text message submission with moderation filter
  const handleSendMessage = () => {
    const text = inputMessage.trim();
    if (!text) return;

    // 🛡️ Content moderation check: block insults and profanities
    const modResult = evaluateMessageModeration(text);
    if (modResult.isViolation) {
      setErrorMessage(
        `⚠️ Mensaje bloqueado: El filtro de seguridad detectó lenguaje no permitido ("${modResult.detectedWord || 'inapropiado'}"). Mantené un trato respetuoso.`
      );
      return;
    }

    setErrorMessage(null);
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      solicitudId: solicitud.id,
      senderRole: currentUserRole,
      senderName: currentUserName,
      senderPhoto: currentUserPhoto,
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    setInputMessage('');

    window.dispatchEvent(
      new CustomEvent('walkie_chat_update', {
        detail: { solicitudId: solicitud.id, messages: updated }
      })
    );
  };

  // Handle photo upload (from gallery or camera)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        const newMsg: ChatMessage = {
          id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          solicitudId: solicitud.id,
          senderRole: currentUserRole,
          senderName: currentUserName,
          senderPhoto: currentUserPhoto,
          photoUrl: base64Url,
          text: `📸 Foto enviada durante el recorrido`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const updated = [...messages, newMsg];
        setMessages(updated);
        setIsUploadingPhoto(false);

        if (onPhotoSent) {
          onPhotoSent(base64Url);
        }

        window.dispatchEvent(
          new CustomEvent('walkie_chat_update', {
            detail: { solicitudId: solicitud.id, messages: updated }
          })
        );
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value so same photo can be re-selected if needed
    e.target.value = '';
  };

  // 💾 Guardar foto en galería / descargar localmente
  const handleDownloadPhoto = async (photoUrl: string, dogName: string) => {
    try {
      const link = document.createElement('a');
      link.href = photoUrl;
      link.download = `walkie-paseo-${dogName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Error al descargar foto:', e);
      window.open(photoUrl, '_blank');
    }
  };

  return (
    <div 
      id={`chat-temporal-paseo-${solicitud.id}`}
      className="bg-white rounded-2xl border-2 border-emerald-500/80 shadow-lg overflow-hidden flex flex-col transition-all"
    >
      {/* Cabecera del Chat Temporal */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-3 sm:p-3.5 flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold text-sm shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-xs sm:text-sm font-black truncate">
                Chat Temporal de Paseo ({solicitud.perro.name})
              </h4>
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping shrink-0" />
            </div>
            <p className="text-[10px] text-emerald-100 truncate">
              {currentUserRole === 'cliente' 
                ? `Con paseador: ${solicitud.paseadorNombre || 'Paseador Asignado'}` 
                : `Con dueño: ${solicitud.clienteNombre || 'Cliente'}`} • Activo en vivo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full hidden sm:inline">
            🔒 Auto-cierre al finalizar
          </span>
          {isCollapsible && (
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              title={isMinimized ? 'Expandir chat' : 'Minimizar chat'}
            >
              {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* 📸 REQUISITO DE FOTOS (BARRA DE PROGRESO X/2) */}
          <div className="bg-emerald-50/90 border-b border-emerald-100 p-2.5 px-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                photoCount >= 2 ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {photoCount >= 2 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black text-emerald-950 block leading-tight">
                  Fotos del paseo: {photoCount}/2 enviado(s)
                </span>
                <span className="text-[10px] text-emerald-700 font-medium truncate block">
                  {photoCount >= 2 
                    ? '✓ Requisito cumplido: fotos de control registradas.' 
                    : 'Requerido: enviar al menos 2 fotos del recorrido.'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap">
              <div className="w-16 sm:w-20 bg-emerald-200/80 h-2 rounded-full overflow-hidden shadow-inner hidden xs:block">
                <div 
                  className={`h-full transition-all duration-300 ${
                    photoCount >= 2 ? 'bg-emerald-600' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (photoCount / 2) * 100)}%` }}
                />
              </div>

              {/* 📍 BOTÓN DE SIMULACIÓN / TEST DE CRUCE DE CALLE EN MODO ACTIVO */}
              {isWalkActive && (
                <button
                  type="button"
                  id="btn-simular-cambio-calle"
                  onClick={handleSimulateStreetChange}
                  className="py-1 px-2.5 rounded-lg bg-teal-700 hover:bg-teal-600 active:scale-95 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                  title="Simular cruce a una nueva calle para verificar el mensaje del bot de Walkie"
                >
                  <MapPin className="w-3 h-3 text-teal-200 animate-pulse" />
                  <span className="hidden sm:inline">Simular Calle</span>
                  <span className="sm:hidden">Calle 📍</span>
                </button>
              )}

              <label
                htmlFor={`file-chat-photo-${solicitud.id}`}
                className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Subir foto del paseo"
              >
                <Camera className="w-3 h-3" />
                <span>Enviar Foto</span>
              </label>
              <input
                type="file"
                id={`file-chat-photo-${solicitud.id}`}
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Historial de Mensajes */}
          <div className="p-3 sm:p-4 space-y-3 max-h-64 sm:max-h-72 overflow-y-auto bg-slate-50/50">
            {messages.map((msg, msgIdx) => {
              const isMe = msg.senderRole === currentUserRole;
              const isStreetUpdate = msg.isStreetUpdate || (msg.text && msg.text.startsWith('📍') && msg.text.includes('está paseando por:'));
              const isSystem = msg.senderName === 'Sistema Walkie' || isStreetUpdate;

              // 📍 FORMATO VISUAL DESTACADO (TIPO MENSAJE DEL SISTEMA / BOT DE WALKIE)
              if (isStreetUpdate) {
                return (
                  <div key={`chat-msg-${msg.id || 'm'}-${msgIdx}`} className="my-2 flex justify-center w-full px-1">
                    <div className="w-full bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/90 border-2 border-emerald-500/80 rounded-2xl p-2.5 sm:p-3 shadow-md flex items-start gap-2.5 transition-all text-slate-900 animate-fade-in">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-sm sm:text-base ring-2 ring-emerald-300">
                        📍
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                            <span>Bot Walkie</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                            <span className="text-emerald-700 font-bold">• Tránsito en Vivo</span>
                          </span>
                          <span className="text-[10px] text-emerald-800 font-bold bg-white/90 px-1.5 py-0.5 rounded-md border border-emerald-200">
                            {msg.timestamp}
                          </span>
                        </div>
                        <p className="text-xs sm:text-[13px] font-black text-slate-950 leading-snug break-words">
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              if (isSystem) {
                return (
                  <div key={`chat-msg-${msg.id || 'm'}-${msgIdx}`} className="text-center py-1">
                    <span className="inline-block bg-slate-200/80 text-slate-700 text-[10px] font-bold px-3 py-1 rounded-full shadow-2xs">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={`chat-msg-${msg.id || 'm'}-${msgIdx}`}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium px-1">
                    <span className="font-bold text-slate-700">{msg.senderName}</span>
                    <span>• {msg.timestamp}</span>
                  </div>

                  <div
                    className={`max-w-[85%] sm:max-w-xs rounded-2xl p-3 shadow-2xs ${
                      isMe
                        ? 'bg-emerald-600 text-white rounded-br-xs'
                        : 'bg-white text-slate-900 border border-slate-200 rounded-bl-xs'
                    }`}
                  >
                    {/* Si tiene imagen adjunta */}
                    {msg.photoUrl && (
                      <div className="space-y-1.5 mb-1.5">
                        <img
                          src={msg.photoUrl}
                          alt="Foto del recorrido"
                          className="w-full max-h-48 object-cover rounded-xl border border-black/10 shadow-inner cursor-pointer"
                          onClick={() => window.open(msg.photoUrl, '_blank')}
                        />
                        {/* 💾 BOTÓN GUARDAR EN GALERÍA */}
                        <button
                          type="button"
                          onClick={() => handleDownloadPhoto(msg.photoUrl!, solicitud.perro.name)}
                          className={`w-full py-1.5 px-2.5 rounded-lg text-[11px] font-black flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer ${
                            isMe 
                              ? 'bg-white/20 hover:bg-white/30 text-white' 
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                          title="Guardar foto localmente en tu galería"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Guardar en Galería</span>
                        </button>
                      </div>
                    )}

                    {msg.text && (
                      <p className="text-xs sm:text-sm font-medium leading-relaxed break-words">
                        {msg.text}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Alerta de Error de Moderación */}
          {errorMessage && (
            <div className="p-2.5 mx-3 mb-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center justify-between gap-2 animate-shake">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="truncate">{errorMessage}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setErrorMessage(null)} 
                className="text-red-500 hover:text-red-800 font-bold text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Input para Escribir Mensaje */}
          <div className="p-2.5 sm:p-3 border-t border-slate-200 bg-white flex items-center gap-2">
            <input
              type="text"
              placeholder={`Escribí un mensaje sobre el paseo de ${solicitud.perro.name}...`}
              value={inputMessage}
              onChange={(e) => {
                setInputMessage(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              maxLength={280}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className={`p-2 sm:px-3.5 sm:py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                inputMessage.trim()
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                  : 'bg-slate-300 cursor-not-allowed opacity-70'
              }`}
              title="Enviar mensaje"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
