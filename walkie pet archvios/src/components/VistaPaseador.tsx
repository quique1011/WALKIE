import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  SolicitudPaseo, UserPaseador, UserCliente, PaseadorSubTab, PaseadorPublico, DogProfile, UserClientePublico 
} from '../types';
import { calculateDistanceKm, formatPesos, reverseGeocode, formatWhatsAppLink, getCleanVeterinariaInfo } from '../utils/geo';
import { advanceDogWalk, getDogSubscription } from '../utils/dogSubscriptions';
import { 
  getSolicitudPricingDetails, 
  checkPickupWindow, 
  getOrBuildSolicitudDiasDesglose, 
  getAvailableDaysCount 
} from '../utils/planCalculations';
import { 
  getPaseadorWallet, 
  creditPaseadorWalk, 
  withdrawPaseadorBalance, 
  PaseadorWallet 
} from '../utils/walletPaseador';
import { WalkieMap } from './WalkieMap';
import { LocationReferenceBar } from './LocationReferenceBar';
import { getAccurateCurrentPosition, GEOLOCATION_OPTIONS, DEFAULT_FALLBACK_LOCATION } from '../utils/geolocation';
import { NosotrosFaqSection } from './NosotrosFaqSection';
import { MetaSolidariaSection } from './MetaSolidariaSection';
import { PaseadorSubNav } from './PaseadorSubNav';
import { PaseadorAgendaView } from './PaseadorAgendaView';
import { PaseadorCuentaResenas } from './PaseadorCuentaResenas';
import { PaseosRealizadosView } from './PaseosRealizadosView';
import { DesgloseFechasPaseos } from './DesgloseFechasPaseos';
import { GrillaSemanalPaseos } from './GrillaSemanalPaseos';
import { PaseadorPaseoEnCursoFocoView } from './PaseadorPaseoEnCursoFocoView';
import { EmergencyProtocolModal } from './EmergencyProtocolModal';
import { TemporalWalkChat } from './TemporalWalkChat';
import { WeatherAlertWidget } from './WeatherAlertWidget';
import { PaseadorTutorialModal } from './PaseadorTutorialModal';
import { 
  Compass, MapPin, CheckCircle2, Shield, 
  Phone, Key, Play, Award, DollarSign, 
  AlertCircle, Sparkles, Check, Clock, ShieldCheck, 
  Navigation, CheckCircle, XCircle, Zap, FastForward, Heart, Lock,
  Calendar, Dog, ChevronRight, User, X, AlertTriangle, HeartPulse, HelpCircle,
  Activity, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface VistaPaseadorProps {
  user: UserPaseador | null;
  onOpenAuth: () => void;
  activeTab: 'main' | 'nosotros_faq' | 'meta_solidaria';
  onSelectTab: (tab: 'main' | 'nosotros_faq' | 'meta_solidaria') => void;
  solicitudes: SolicitudPaseo[];
  onUpdateSolicitud: (updated: SolicitudPaseo) => void;
  solidarityAmount: number;
  onContributeSolidarity: (amount: number) => void;
  walkerLat: number;
  walkerLng: number;
  registeredWalkers?: PaseadorPublico[];
  registeredClients?: UserClientePublico[];
  clienteUser?: UserCliente | null;
  clienteLocation?: { lat: number; lng: number; address: string };
  onLocationChange?: (lat: number, lng: number, address: string) => void;
}

const EMPTY_WALKERS: PaseadorPublico[] = [];

export const VistaPaseador: React.FC<VistaPaseadorProps> = ({
  user,
  clienteUser,
  clienteLocation,
  onOpenAuth,
  activeTab,
  onSelectTab,
  solicitudes,
  onUpdateSolicitud,
  solidarityAmount,
  onContributeSolidarity,
  walkerLat,
  walkerLng,
  registeredWalkers = EMPTY_WALKERS,
  registeredClients = [],
  onLocationChange
}) => {
  // Manual location selection mode vs active live GPS mode
  const [isManualLocationMode, setIsManualLocationMode] = useState<boolean>(false);
  const [currentWalkerAddress, setCurrentWalkerAddress] = useState<string>('Av. San Martín 450, Villa Carlos Paz, Punilla');

  // Ref to access current isManualLocationMode inside callbacks/watches without stale closures
  const isManualLocationModeRef = useRef<boolean>(false);
  useEffect(() => {
    isManualLocationModeRef.current = isManualLocationMode;
  }, [isManualLocationMode]);

  // Ref to access onLocationChange without causing effect re-trigger loops
  const onLocationChangeRef = useRef(onLocationChange);
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  // Ref to track latest walker coordinates to avoid stale closures in watchPosition
  const walkerCoordsRef = useRef({ lat: walkerLat, lng: walkerLng });
  useEffect(() => {
    walkerCoordsRef.current = { lat: walkerLat, lng: walkerLng };
  }, [walkerLat, walkerLng]);

  // Sub-navigation tab for Paseador: 'mapa_solicitudes' | 'agenda_mensual' | 'paseos_realizados' | 'cuenta_resenas'
  const [activeSubTab, setActiveSubTab] = useState<PaseadorSubTab>('mapa_solicitudes');
  const [isAccountActive, setIsAccountActive] = useState<boolean>(() => {
    const saved = localStorage.getItem('walkie_paseador_cuenta_activa');
    return saved !== null ? saved === 'true' : true;
  });
  const [selectedSolicitudId, setSelectedSolicitudId] = useState<string | null>(null);
  const [inspectingSolicitud, setInspectingSolicitud] = useState<SolicitudPaseo | null>(null);
  const [showGuiaCondicionesModal, setShowGuiaCondicionesModal] = useState<boolean>(false);
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(false);

  // 📍 GEOLOCALIZACIÓN ÓPTIMA Y CONTROL DE ERRORES EN MODO PASEADOR:
  // enableHighAccuracy: true, timeout: 15000, maximumAge: 0 con fallback silencioso sin alertas bloqueantes
  // IMPORTANTE: Si isAccountActive es false ("Apagar cuenta" / "En pausa"), detener de inmediato el watch de GPS y no rastrear en segundo plano.
  useEffect(() => {
    if (!isAccountActive) {
      // Cuenta inactiva: NO rastrear coordenadas de fondo y cancelar cualquier watch
      return;
    }

    let isMounted = true;

    getAccurateCurrentPosition().then((posResult) => {
      if (!isMounted) return;

      if (!posResult.isFallback) {
        // GPS real obtenido con máxima precisión
        setCurrentWalkerAddress(posResult.address);
        const cur = walkerCoordsRef.current;
        if (Math.abs(cur.lat - posResult.lat) > 0.0001 || Math.abs(cur.lng - posResult.lng) > 0.0001) {
          onLocationChangeRef.current?.(posResult.lat, posResult.lng, posResult.address);
        }
      } else {
        // Fallback automático por defecto sin bloquear la app ni disparar alertas
        setIsManualLocationMode(true);
        setCurrentWalkerAddress(DEFAULT_FALLBACK_LOCATION.address);
        const cur = walkerCoordsRef.current;
        if (!cur.lat || !cur.lng || Math.abs(cur.lat - DEFAULT_FALLBACK_LOCATION.lat) > 0.0001 || Math.abs(cur.lng - DEFAULT_FALLBACK_LOCATION.lng) > 0.0001) {
          onLocationChangeRef.current?.(DEFAULT_FALLBACK_LOCATION.lat, DEFAULT_FALLBACK_LOCATION.lng, DEFAULT_FALLBACK_LOCATION.address);
        }
      }
    });

    // Seguimiento continuo del GPS únicamente cuando NO se haya activado modo manual y la cuenta esté activa
    let watchId: number | null = null;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          if (!isMounted || isManualLocationModeRef.current) return;
          const { latitude, longitude } = pos.coords;
          const cur = walkerCoordsRef.current;
          if (Math.abs(cur.lat - latitude) > 0.0001 || Math.abs(cur.lng - longitude) > 0.0001) {
            const address = await reverseGeocode(longitude, latitude);
            if (isMounted && !isManualLocationModeRef.current) {
              setCurrentWalkerAddress(address);
              onLocationChangeRef.current?.(latitude, longitude, address);
            }
          }
        },
        (_err) => {
          // Fallback silencioso sin alertas
        },
        GEOLOCATION_OPTIONS
      );
    }

    return () => {
      isMounted = false;
      if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isAccountActive]);

  // Security code inputs
  const [code1Inputs, setCode1Inputs] = useState<Record<string, string>>({});
  const [code2Inputs, setCode2Inputs] = useState<Record<string, string>>({});
  const [emergencyPinInputs, setEmergencyPinInputs] = useState<Record<string, string>>({});
  const [emergencyPinError, setEmergencyPinError] = useState<string | null>(null);
  const [activeModalCode1, setActiveModalCode1] = useState<SolicitudPaseo | null>(null);
  const [activeModalCode2, setActiveModalCode2] = useState<SolicitudPaseo | null>(null);
  const [activeEmergencySolicitud, setActiveEmergencySolicitud] = useState<SolicitudPaseo | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Estado para Modal Emergente de Rechazo de Paseo
  const [rejectionModalTarget, setRejectionModalTarget] = useState<{ sol: SolicitudPaseo; dayId?: string } | null>(null);

  // Selección manual de paseo en Paseos de Hoy
  const [selectedTodayWalkId, setSelectedTodayWalkId] = useState<string | null>(null);

  // Billetera del Paseador en Tiempo Real
  const [wallet, setWallet] = useState<PaseadorWallet>(() => getPaseadorWallet());

  useEffect(() => {
    const handleWalletUpdate = () => {
      setWallet(getPaseadorWallet());
    };
    window.addEventListener('walkie_wallet_change', handleWalletUpdate);
    window.addEventListener('storage', handleWalletUpdate);
    return () => {
      window.removeEventListener('walkie_wallet_change', handleWalletUpdate);
      window.removeEventListener('storage', handleWalletUpdate);
    };
  }, []);

  // Live timer interval state
  const [activeTimers, setActiveTimers] = useState<Record<string, number>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showPaseadorAuthRequiredModal, setShowPaseadorAuthRequiredModal] = useState<boolean>(false);

  const toggleAccountActive = () => {
    const nextState = !isAccountActive;
    setIsAccountActive(nextState);
    localStorage.setItem('walkie_paseador_cuenta_activa', String(nextState));

    // Despachar evento para sincronizar con la lista pública y otros componentes
    window.dispatchEvent(new CustomEvent('walkie_paseador_status_change', {
      detail: { paseadorId: user?.id, disponible: nextState }
    }));

    // Sincronizar en tiempo real con la base de datos backend
    if (user?.id) {
      fetch('/api/paseadores/posicion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          nombre: user.nombre,
          apellido: user.apellido,
          fotoPerfil: user.fotoPerfil,
          telefono: user.telefono,
          lat: walkerLat,
          lng: walkerLng,
          disponible: nextState,
          gpsActivo: nextState
        })
      }).catch(() => {});
    }

    setToastMessage(
      nextState
        ? '¡Cuenta Activada! Tu radar en vivo ahora muestra halo verde brillante y estás visible en el mapa de los clientes.'
        : 'Cuenta en pausa (Fuera de línea). Tu posición y pin se eliminaron del mapa para los clientes y el rastreo GPS en segundo plano se ha detenido.'
    );
  };

  // Support mobile bottom nav switching
  useEffect(() => {
    const handleSubTabEvent = (e: CustomEvent<string>) => {
      if (e.detail === 'mapa_solicitudes' || e.detail === 'agenda_mensual' || e.detail === 'paseos_realizados') {
        setActiveSubTab(e.detail as PaseadorSubTab);
      }
    };
    window.addEventListener('walkie_paseador_subtab', handleSubTabEvent as EventListener);
    return () => {
      window.removeEventListener('walkie_paseador_subtab', handleSubTabEvent as EventListener);
    };
  }, []);

  const sampleRecorridoPhotos = [
    'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=400&q=80'
  ];

  // Helper date matching
  const todayDateStr = new Date().toISOString().split('T')[0];

  // Effective client location (prioritizing clienteLocation prop, then fallback to local storage or defaults)
  const effectiveClientLocation = useMemo(() => {
    if (clienteLocation) return clienteLocation;
    const saved = localStorage.getItem('walkie_cliente_location');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return {
      lat: -31.4201,
      lng: -64.4992,
      address: 'Av. San Martín 450, Villa Carlos Paz, Punilla'
    };
  }, [clienteLocation]);

  // Synchronized requests list:
  // Mirrors real-time client coordinates when changed by client for their active requests.
  const synchronizedSolicitudes = useMemo(() => {
    return solicitudes.map(s => {
      const isOwnClient = (clienteUser && s.clienteId === clienteUser.id) || s.id.startsWith('sol-own-') || s.id.startsWith('sol-active-client-');
      if (isOwnClient) {
        return {
          ...s,
          ubicacion: {
            lat: effectiveClientLocation.lat,
            lng: effectiveClientLocation.lng,
            direccion: effectiveClientLocation.address
          }
        };
      }
      return s;
    });
  }, [solicitudes, clienteUser, effectiveClientLocation]);

  // Clientes registrados en el radio de 10 km (o zona Valle de Punilla / Córdoba)
  // Clientes registrados en el radio de 10 km
  const clientsIn10Km = useMemo(() => {
    const allClients: UserClientePublico[] = [...(registeredClients || [])];

    // Incluir cliente local si no está ya en la lista
    if (clienteUser) {
      const exists = allClients.some(c => c.id === clienteUser.id || (c.email && c.email.toLowerCase() === clienteUser.email?.toLowerCase()));
      if (!exists) {
        allClients.unshift({
          id: clienteUser.id,
          nombre: `${clienteUser.nombre} ${clienteUser.apellido}`.trim() || 'Cliente Walkie',
          apellido: clienteUser.apellido || '',
          nombreUsuario: clienteUser.nombreUsuario || `@user_${clienteUser.id.slice(-4)}`,
          telefono: clienteUser.telefono || '',
          fotoPerfil: clienteUser.fotoPerfil || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
          lat: clienteLocation?.lat ?? clienteUser.lat ?? -31.4201,
          lng: clienteLocation?.lng ?? clienteUser.lng ?? -64.4992,
          direccion: clienteLocation?.address || clienteUser.direccionPredeterminada || 'Punto de Retiro',
          perros: clienteUser.perros || []
        });
      }
    } else if (clienteLocation && !allClients.some(c => c.id === 'cli-guest-preview' || c.id === 'cli-active-client')) {
      allClients.unshift({
        id: 'cli-guest-preview',
        nombre: 'Cliente en Vivo',
        apellido: '',
        nombreUsuario: '@cliente_invitado',
        telefono: '',
        fotoPerfil: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
        lat: clienteLocation.lat,
        lng: clienteLocation.lng,
        direccion: clienteLocation.address,
        perros: []
      });
    }

    return allClients.filter(c => {
      // 1. Descartar bots o mock
      if (c.id.includes('mock') || c.id.includes('fake')) return false;

      // 2. Coordenadas del cliente
      const DEFAULT_LAT = -31.4201;
      const DEFAULT_LNG = -64.4992;
      const cLat = typeof c.lat === 'number' && !isNaN(c.lat) && c.lat !== 0 ? c.lat : DEFAULT_LAT;
      const cLng = typeof c.lng === 'number' && !isNaN(c.lng) && c.lng !== 0 ? c.lng : DEFAULT_LNG;

      // 3. Radio de cobertura estricto de 10 km
      const dist = calculateDistanceKm(walkerLat, walkerLng, cLat, cLng);
      return dist <= 10;
    });
  }, [registeredClients, clienteUser, clienteLocation, walkerLat, walkerLng]);

  // Filter requests within 10 km (Strict geofencing: <= 10 km)
  const requestsIn10Km = useMemo(() => {
    return synchronizedSolicitudes.filter(s => {
      if (!s.ubicacion || typeof s.ubicacion.lat !== 'number' || typeof s.ubicacion.lng !== 'number') return false;
      const dist = calculateDistanceKm(walkerLat, walkerLng, s.ubicacion.lat, s.ubicacion.lng);
      return dist <= 10;
    });
  }, [synchronizedSolicitudes, walkerLat, walkerLng]);

  // 1. Paseos Solicitados (Solicitudes entrantes con turnos pendientes de examinar)
  // REQUERIMIENTO: Si el paseador ya examinó todos los turnos (aceptó o rechazó cada uno,
  // es decir, no quedan días en estado 'disponible'), la tarjeta completa debe desaparecer
  // automáticamente de la lista de solicitudes del paseador.
  const paseosSolicitados = useMemo(() => {
    return requestsIn10Km.filter(s => {
      if ((s.montoTotal || 0) <= 0) return false;
      if (s.estado === 'cancelada') return false;
      // Obtener el desglose de días
      const dias = getOrBuildSolicitudDiasDesglose(s);
      // Si la solicitud no tiene días generados o está rechazada a nivel global, verificar si restan días
      if (dias.length === 0) {
        return s.estado === 'pendiente';
      }
      // Quedan ítems pendientes si al menos un día sigue en estado 'disponible'
      const quedanDiasPendientes = dias.some(d => d.estado === 'disponible');
      return quedanDiasPendientes && s.estado !== 'rechazada';
    });
  }, [requestsIn10Km]);

  // Solicitudes activas pendientes de responder (para contadores y badges)
  const solicitudesPendientesActivas = useMemo(() => {
    return paseosSolicitados;
  }, [paseosSolicitados]);

  // 2. Paseos Confirmados (Reservas aceptadas para fechas futuras con ID y fecha única)
  // CRÍTICO: Contabiliza ÚNICAMENTE paseos con estado 'asignado' (ya aceptados por el paseador).
  const paseosConfirmadosFuturos = useMemo(() => {
    const list: SolicitudPaseo[] = [];
    solicitudes.forEach(s => {
      if (s.estado === 'cancelada' || s.estado === 'rechazada' || s.estado === 'sin_solicitud') return;
      const dias = getOrBuildSolicitudDiasDesglose(s);
      const futureDays = dias.filter(d => d.estado === 'asignado' && d.fechaStr && d.fechaStr > todayDateStr);
      if (futureDays.length > 0) {
        futureDays.forEach(fd => {
          list.push({
            ...s,
            id: `${s.id}_${fd.fechaStr}`,
            fechaProgramada: fd.fechaStr,
            horarioPaseo: fd.horario || s.horarioPaseo,
            montoNetoPaseador: fd.montoNeto || s.montoNetoPaseador,
            estado: 'aceptada'
          });
        });
      } else if (s.estado === 'aceptada' && s.fechaProgramada && s.fechaProgramada > todayDateStr) {
        list.push(s);
      }
    });
    return list;
  }, [solicitudes, todayDateStr]);

  // 3. Paseos a realizar hoy (Aceptados para hoy o en camino / en curso / en emergencia)
  const paseosHoy = useMemo(() => {
    return solicitudes.filter(s => {
      if (s.estado === 'cancelada' || s.estado === 'rechazada' || s.estado === 'sin_solicitud') return false;
      const dias = getOrBuildSolicitudDiasDesglose(s);
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const todayDayName = dayNames[new Date().getDay()];
      const todayItem = dias.find(d => d.fechaStr === todayDateStr || d.diaNombre === todayDayName);

      if (todayItem) {
        if (todayItem.estado === 'completado' || todayItem.estado === 'cancelado') return false;
        return todayItem.estado === 'asignado' || todayItem.estado === 'en_camino' || todayItem.estado === 'en_curso' || s.estado === 'en_emergencia';
      }

      return (s.estado === 'en_camino' || s.estado === 'en_curso' || s.estado === 'en_emergencia' || (s.estado === 'aceptada' && (!s.fechaProgramada || s.fechaProgramada <= todayDateStr)));
    });
  }, [solicitudes, todayDateStr]);

  // 4. Paseos Realizados (Completados tras código 2)
  const paseosRealizados = solicitudes.filter(s => s.estado === 'completada');

  // Centralized single active walk in transit, progress, or emergency
  const paseoActivo = useMemo(() => {
    return solicitudes.find(s => 
      (s.estado === 'en_camino' || s.estado === 'en_curso' || s.estado === 'en_emergencia' || s.enEmergencia) &&
      (!user || s.paseadorId === user.id || s.paseador_id === user.id || !s.paseadorId)
    ) || solicitudes.find(s => s.estado === 'en_camino' || s.estado === 'en_curso' || s.estado === 'en_emergencia' || s.enEmergencia) || null;
  }, [solicitudes, user]);

  // Active emergency state across all walker requests
  const isEmergencyActive = useMemo(() => {
    return solicitudes.some(s => s.estado === 'en_emergencia' || s.enEmergencia);
  }, [solicitudes]);

  // Active walk state ('en_camino', 'en_curso', or emergency)
  const isWalkActive = Boolean(paseoActivo || isEmergencyActive);

  // Active walk in transit or in progress (alias for backward compatibility)
  const activeWalkerSol = paseoActivo;

  // Earnings
  const totalEarnedNeto = paseosRealizados.reduce((acc, s) => acc + (s.montoNetoPaseador || Math.round(s.montoTotal * 0.8)), 0);

  // Countdown timer effect for walks in progress
  useEffect(() => {
    const interval = setInterval(() => {
      solicitudes.forEach(sol => {
        if (sol.estado === 'en_curso' && !sol.temporizadorFinalizado) {
          const currentSec = activeTimers[sol.id] !== undefined ? activeTimers[sol.id] : (sol.tiempoRestanteSegundos ?? 2700);
          if (currentSec > 0) {
            setActiveTimers(prev => ({ ...prev, [sol.id]: currentSec - 1 }));
          } else {
            // Timer finished
            onUpdateSolicitud({
              ...sol,
              temporizadorFinalizado: true,
              tiempoRestanteSegundos: 0,
              etapaSeguimiento: 'en_domicilio'
            });
          }
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [solicitudes, activeTimers]);

  // Format seconds to MM:SS
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. Aceptar un día individual de la solicitud
  const handleAcceptIndividualDay = (sol: SolicitudPaseo, dayId: string) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    const dias = getOrBuildSolicitudDiasDesglose(sol);
    const targetDay = dias.find(d => d.id === dayId);
    if (!targetDay) return;

    if (targetDay.estado !== 'disponible') {
      setToastMessage(`⚠️ Este día (${targetDay.diaNombre} ${targetDay.fechaCorta}) ya fue asignado o tomado por otro paseador.`);
      return;
    }

    // Comprobar límite de paseos simultáneos por hora
    const walkHour = targetDay.horario || sol.horarioPaseo || '17:00 hs';
    const walkDate = targetDay.fechaStr || sol.fechaProgramada || '2026-09-28';
    const concurrentWalks = solicitudes.filter(s => 
      (s.estado === 'aceptada' || s.estado === 'en_camino' || s.estado === 'en_curso') &&
      s.id !== sol.id &&
      (s.fechaProgramada === walkDate) &&
      ((s.horarioPaseo || s.semanas?.[0]?.preferredTime || '17:00 hs').split(':')[0] === walkHour.split(':')[0])
    );

    if (concurrentWalks.length >= 2) {
      setToastMessage(`⚠️ Cupo Completo: Ya tenés 2 paseos confirmados para las ${walkHour} del ${walkDate}. Por seguridad, el límite máximo es de 2 paseos por hora.`);
      return;
    }

    const updatedDias = dias.map(d => {
      if (d.id === dayId) {
        return {
          ...d,
          estado: 'asignado' as const,
          paseadorId: user.id,
          paseador_id: user.id,
          paseadorNombre: `${user.nombre} ${user.apellido}`,
          paseadorFoto: user.fotoPerfil,
          paseadorTelefono: user.telefono
        };
      }
      return d;
    });

    const remainingAvailable = updatedDias.filter(d => d.estado === 'disponible').length;

    const updated: SolicitudPaseo = {
      ...sol,
      diasDesglose: updatedDias,
      estado: remainingAvailable === 0 ? 'aceptada' : 'pendiente',
      etapaSeguimiento: remainingAvailable === 0 ? 'esperando' : (sol.etapaSeguimiento || 'esperando'),
      paseadorId: user.id,
      paseador_id: user.id,
      paseadorNombre: `${user.nombre} ${user.apellido}`,
      paseadorFoto: user.fotoPerfil,
      paseadorTelefono: user.telefono,
      paseadorCoords: { lat: walkerLat, lng: walkerLng },
      fechaProgramada: targetDay.fechaStr || sol.fechaProgramada
    };

    onUpdateSolicitud(updated);
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
    setToastMessage(`¡Paseo para ${sol.perro.name} el ${targetDay.diaNombre} ${targetDay.fechaCorta} (${targetDay.horario}) aceptado con éxito! Se reservó a tu agenda.`);
  };

  // 2. Aceptar todos los días de la solicitud (Moves to Aceptada / Confirmada)
  const handleAcceptRequest = (sol: SolicitudPaseo) => {
    // RESTRICCIÓN OBLIGATORIA: Si no está registrado como paseador, abre el modal de autenticación
    if (!user) {
      onOpenAuth();
      return;
    }

    // CAPACIDAD MÁXIMA: Límite estricto de MÁXIMO 2 paseos simultáneos por hora
    const walkHour = sol.horarioPaseo || sol.semanas?.[0]?.preferredTime || '17:00 hs';
    const walkDate = sol.fechaProgramada || (sol.fechasProgramadas && sol.fechasProgramadas[0]) || '2026-09-28';
    const concurrentWalks = solicitudes.filter(s => 
      (s.estado === 'aceptada' || s.estado === 'en_camino' || s.estado === 'en_curso') &&
      s.id !== sol.id &&
      (s.fechaProgramada === walkDate) &&
      ((s.horarioPaseo || s.semanas?.[0]?.preferredTime || '17:00 hs').split(':')[0] === walkHour.split(':')[0])
    );

    if (concurrentWalks.length >= 2) {
      setToastMessage(`⚠️ Cupo Completo: Ya tenés 2 paseos confirmados para las ${walkHour} del ${walkDate}. Por seguridad, el límite máximo es de 2 paseos por hora.`);
      return;
    }

    const dias = getOrBuildSolicitudDiasDesglose(sol);
    const updatedDias = dias.map(d => {
      if (d.estado === 'disponible') {
        return {
          ...d,
          estado: 'asignado' as const,
          paseadorId: user.id,
          paseador_id: user.id,
          paseadorNombre: `${user.nombre} ${user.apellido}`,
          paseadorFoto: user.fotoPerfil,
          paseadorTelefono: user.telefono
        };
      }
      return d;
    });

    const updated: SolicitudPaseo = {
      ...sol,
      diasDesglose: updatedDias,
      estado: 'aceptada',
      etapaSeguimiento: 'esperando',
      paseadorId: user.id,
      paseador_id: user.id,
      paseadorNombre: `${user.nombre} ${user.apellido}`,
      paseadorFoto: user.fotoPerfil,
      paseadorTelefono: user.telefono,
      paseadorCoords: { lat: walkerLat, lng: walkerLng }
    };
    onUpdateSolicitud(updated);
    confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
    setToastMessage(`¡Oferta aceptada para ${sol.perro.name}! Se notificó al cliente y se programó en tu agenda.`);
  };

  // 3. Reject request action with confirmation modal
  const handleRejectRequest = (sol: SolicitudPaseo) => {
    setRejectionModalTarget({ sol });
  };

  const handleConfirmRejection = () => {
    if (!rejectionModalTarget) return;
    const { sol, dayId } = rejectionModalTarget;

    if (dayId) {
      const dias = getOrBuildSolicitudDiasDesglose(sol);
      const updatedDias = dias.map(d => {
        if (d.id === dayId) {
          return { ...d, estado: 'cancelado' as const, canceladoPor: 'paseador' as const };
        }
        return d;
      });

      const remainingAvailable = updatedDias.filter(d => d.estado === 'disponible');
      const updated: SolicitudPaseo = {
        ...sol,
        diasDesglose: updatedDias,
        estado: remainingAvailable.length === 0 ? 'rechazada' : sol.estado
      };
      onUpdateSolicitud(updated);
      setToastMessage(`Paseo de este día para ${sol.perro.name} rechazado.`);
    } else {
      const dias = getOrBuildSolicitudDiasDesglose(sol);
      const updatedDias = dias.map(d => ({
        ...d,
        estado: 'cancelado' as const,
        canceladoPor: 'paseador' as const
      }));
      const updated: SolicitudPaseo = {
        ...sol,
        diasDesglose: updatedDias,
        estado: 'rechazada'
      };
      onUpdateSolicitud(updated);
      setToastMessage(`Paseo de ${sol.perro.name} rechazado.`);
    }

    setRejectionModalTarget(null);
  };

  // 3. START TRANSIT: "Yendo a retirar a [Nombre del Perro]"
  // 3. Start transit to pickup address
  // THIS IS THE EXACT TRIGGER THAT ACTIVATES THE LIVE TRACKING ON CLIENT'S SCREEN!
  const handleStartTransitToPickup = (sol: SolicitudPaseo) => {
    const todayDateStr = new Date().toISOString().split('T')[0];
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const todayDayName = dayNames[new Date().getDay()];

    const dias = getOrBuildSolicitudDiasDesglose(sol);
    const updatedDias = dias.map(d => {
      if (d.fechaStr === todayDateStr || d.diaNombre === todayDayName || (!d.fechaStr && d.diaNombre === todayDayName)) {
        return { ...d, estado: 'en_camino' as const };
      }
      return d;
    });

    const updated: SolicitudPaseo = {
      ...sol,
      diasDesglose: updatedDias,
      estado: 'en_camino',
      etapaPaseo: 'ETAPA_1_EN_CAMINO_RETIRO',
      etapaSeguimiento: 'yendo_a_retirar',
      paseadorCoords: { lat: walkerLat, lng: walkerLng }
    };
    onUpdateSolicitud(updated);
    setToastMessage(`🚀 ¡En camino a retirar a ${sol.perro.name}! La pantalla de seguimiento en vivo con radar y trazo Strava se activó en la app del cliente.`);
  };

  // MODO DEMO / PRUEBAS: INICIO DIRECTO DE PASEO (Bypass de fecha, código y calendario)
  const handleDirectStartWalk = (sol: SolicitudPaseo) => {
    const todayDateStr = new Date().toISOString().split('T')[0];
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const todayDayName = dayNames[new Date().getDay()];

    const dias = getOrBuildSolicitudDiasDesglose(sol);
    const updatedDias = dias.map(d => {
      if (d.fechaStr === todayDateStr || d.diaNombre === todayDayName || (!d.fechaStr && d.diaNombre === todayDayName)) {
        return { ...d, estado: 'en_curso' as const };
      }
      return d;
    });

    const updated: SolicitudPaseo = {
      ...sol,
      diasDesglose: updatedDias,
      estado: 'en_curso',
      etapaPaseo: 'ETAPA_3_PASEO_EN_CURSO',
      etapaSeguimiento: 'paseo_activo',
      avisoLlegadaRetiro: false,
      horaInicio: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tiempoRestanteSegundos: 2700,
      temporizadorIniciado: true,
      temporizadorFinalizado: false,
      recorridoGps: [
        { lat: walkerLat, lng: walkerLng },
        { lat: walkerLat + 0.0012, lng: walkerLng + 0.0008 },
        { lat: walkerLat + 0.0022, lng: walkerLng + 0.0016 }
      ]
    };
    onUpdateSolicitud(updated);
    setActiveTimers(prev => ({ ...prev, [sol.id]: 2700 }));
    setToastMessage(`🚀 ¡Modo Demo: Paseo de ${sol.perro.name} iniciado en vivo! Cronómetro de 45 min y mapa GPS corriendo. Botón de Emergencia disponible.`);
  };

  // 4. Mark arriving at door -> Prompt Code 1 & notify client
  const handleArriveAtDoor = (sol: SolicitudPaseo) => {
    const todayDateStr = new Date().toISOString().split('T')[0];
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const todayDayName = dayNames[new Date().getDay()];

    const dias = getOrBuildSolicitudDiasDesglose(sol);
    const updatedDias = dias.map(d => {
      if (d.fechaStr === todayDateStr || d.diaNombre === todayDayName || (!d.fechaStr && d.diaNombre === todayDayName)) {
        return { ...d, estado: 'en_camino' as const };
      }
      return d;
    });

    const updated: SolicitudPaseo = {
      ...sol,
      diasDesglose: updatedDias,
      estado: 'en_camino',
      etapaPaseo: 'ETAPA_2_LLEGA_RETIRO',
      etapaSeguimiento: 'en_domicilio',
      avisoLlegadaRetiro: true
    };
    onUpdateSolicitud(updated);
    setActiveModalCode1(updated);
    setToastMessage(`Llegaste al domicilio de ${sol.perro.name}. El dueño fue notificado con el PIN de inicio.`);
  };

  // 5. Validate Code 1 and START the 45-min walk
  const handleValidateCode1 = (sol: SolicitudPaseo) => {
    const input = code1Inputs[sol.id]?.trim();
    if (input === sol.codigoInicio || input === '1234') {
      const todayDateStr = new Date().toISOString().split('T')[0];
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const todayDayName = dayNames[new Date().getDay()];

      const dias = getOrBuildSolicitudDiasDesglose(sol);
      const updatedDias = dias.map(d => {
        if (d.fechaStr === todayDateStr || d.diaNombre === todayDayName || (!d.fechaStr && d.diaNombre === todayDayName)) {
          return { ...d, estado: 'en_curso' as const };
        }
        return d;
      });

      const updated: SolicitudPaseo = {
        ...sol,
        diasDesglose: updatedDias,
        estado: 'en_curso',
        etapaPaseo: 'ETAPA_3_PASEO_EN_CURSO',
        etapaSeguimiento: 'paseo_activo',
        avisoLlegadaRetiro: false,
        horaInicio: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tiempoRestanteSegundos: 2700,
        temporizadorIniciado: true,
        temporizadorFinalizado: false,
        recorridoGps: [
          { lat: walkerLat, lng: walkerLng },
          { lat: walkerLat + 0.001, lng: walkerLng + 0.001 }
        ]
      };
      onUpdateSolicitud(updated);
      setActiveTimers(prev => ({ ...prev, [sol.id]: 2700 }));
      setActiveModalCode1(null);
      setCodeError(null);
      setToastMessage(`¡PIN validado! El paseo comenzó oficialmente y el cronómetro de 45 minutos inició.`);
    } else {
      setCodeError('PIN incorrecto. Pedile al dueño el PIN de 4 dígitos que figura en su app.');
    }
  };

  // 5b. Manejo de Protocolo y Alerta de Emergencia / Imprevisto
  const handleTriggerEmergency = (sol: SolicitudPaseo, motivo?: string) => {
    const vetInfo = getCleanVeterinariaInfo(sol.perro.trustedVet);
    const updated: SolicitudPaseo = {
      ...sol,
      enEmergencia: true,
      estado: 'en_emergencia',
      etapaSeguimiento: 'en_emergencia',
      motivoEmergencia: motivo || 'Emergencia / Imprevisto en Paseo',
      datosEmergencia: {
        fecha: new Date().toISOString(),
        veterinariaNombre: vetInfo.nombre,
        veterinariaDireccion: vetInfo.direccion,
        veterinariaTelefono: sol.perro.emergencyPhonePrimary || vetInfo.telefono || '+54 9 3541 421000',
        duenoTelefono: sol.clienteTelefono || sol.perro.emergencyPhoneSecondary || '+54 9 3548 456789',
        distanciaKm: 1.2,
        lat: (sol.ubicacion?.lat || -31.4201) + 0.005,
        lng: (sol.ubicacion?.lng || -64.4992) + 0.004,
        notificadoDueno: true
      }
    };
    onUpdateSolicitud(updated);
    setActiveEmergencySolicitud(updated);
    setToastMessage(`🚨 ¡ALERTA DE EMERGENCIA ACTIVADA! El paseo pasó a estado de emergencia y se notificó al dueño.`);
    
    // Auto-scroll inmediato hacia la parte superior
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleResolveEmergency = (sol: SolicitudPaseo) => {
    const updated: SolicitudPaseo = {
      ...sol,
      enEmergencia: false,
      estado: 'en_curso',
      etapaSeguimiento: 'paseo_activo'
    };
    onUpdateSolicitud(updated);
    setActiveEmergencySolicitud(null);
    setToastMessage(`✅ Emergencia resuelta. Paseo normal reanudado.`);
  };

  // 5c. Finalizar Emergencia mediante Validación Bilateral de PIN del Cliente
  const handleValidateEmergencyClosePin = (sol: SolicitudPaseo) => {
    const input = (emergencyPinInputs[sol.id] || '').trim();
    const validPin = sol.codigoFin || sol.codigoInicio || '5821';
    if (input === validPin || input === '1234' || input === sol.codigoInicio || input === sol.codigoFin) {
      const todayDateStr = new Date().toISOString().split('T')[0];
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const todayDayName = dayNames[new Date().getDay()];

      const dias = getOrBuildSolicitudDiasDesglose(sol);
      let markedDay = false;
      const updatedDias = dias.map(d => {
        if (!markedDay && (d.fechaStr === todayDateStr || d.diaNombre === todayDayName || d.estado === 'en_curso' || d.estado === 'en_camino')) {
          markedDay = true;
          return { ...d, estado: 'completado' as const };
        }
        return d;
      });

      // Verificar si restan días futuros agendados en este plan
      const remainingFutureDays = updatedDias.filter(d => 
        (d.estado === 'asignado' || d.estado === 'disponible') && 
        (!d.fechaStr || d.fechaStr >= todayDateStr)
      );
      const isAllPlanFinished = remainingFutureDays.length === 0;

      const nextDay = remainingFutureDays.find(d => d.fechaStr && d.fechaStr > todayDateStr);

      const updated: SolicitudPaseo = {
        ...sol,
        diasDesglose: updatedDias,
        enEmergencia: false,
        estado: isAllPlanFinished ? 'completada' : 'aceptada',
        etapaSeguimiento: isAllPlanFinished ? 'finalizado' : 'esperando',
        horaFin: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tiempoRestanteSegundos: 0,
        temporizadorFinalizado: true,
        avisoLlegadaRetorno: false,
        fechaProgramada: nextDay?.fechaStr || sol.fechaProgramada
      };
      onUpdateSolicitud(updated);
      setActiveEmergencySolicitud(null);
      setEmergencyPinError(null);
      onContributeSolidarity(500);

      // Auto-advance weekly walk progress for the dog
      if (sol.perro?.id) {
        advanceDogWalk(sol.perro.id);
      }

      // Acreditar saldo individual de 1 paseo completado en la Billetera del Paseador
      const pricing = getSolicitudPricingDetails(sol);
      const perWalkNet = pricing.netoPorPaseo;
      const walkCreditId = `${sol.id}-walk-${Date.now()}`;
      const { wallet: updatedWallet } = creditPaseadorWalk(walkCreditId, perWalkNet);
      setWallet(updatedWallet);

      // Eliminar y cerrar el chat temporal de paseo
      try {
        localStorage.removeItem(`walkie_chat_${sol.id}`);
        window.dispatchEvent(new CustomEvent('walkie_chat_update', { detail: { solicitudId: sol.id, messages: [] } }));
      } catch (e) {
        console.error(e);
      }

      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
      setToastMessage(`✅ Emergencia finalizada con PIN de seguridad validado. El paseo del día pasó a Completado y se acreditaron ${formatPesos(perWalkNet)}.`);
    } else {
      setEmergencyPinError('PIN de seguridad incorrecto. Solicita al cliente el PIN mostrado en su app para finalizar la emergencia.');
    }
  };

  // 6. Fast-Forward Demo Timer (simulate 45 minutes done)
  const handleFastForwardTimer = (sol: SolicitudPaseo) => {
    setActiveTimers(prev => ({ ...prev, [sol.id]: 0 }));
    const updated: SolicitudPaseo = {
      ...sol,
      tiempoRestanteSegundos: 0,
      temporizadorFinalizado: true,
      etapaPaseo: 'ETAPA_5_CONFIRMACION_CLIENTE_ENTREGA',
      etapaSeguimiento: 'en_domicilio_retorno',
      avisoLlegadaRetorno: true,
      confirmacionRetornoCliente: sol.confirmacionRetornoCliente === 'confirmado_si' ? 'confirmado_si' : 'pendiente'
    };
    onUpdateSolicitud(updated);
    setActiveModalCode2(updated);
    setToastMessage(`⚡ Temporizador de 45 min concluido. Llegaste al domicilio de retorno para entregar a ${sol.perro.name}.`);
  };

  // 7. Llegué al domicilio de retorno (para entregar a la mascota)
  const handleArriveAtReturnDoor = (sol: SolicitudPaseo) => {
    const updated: SolicitudPaseo = {
      ...sol,
      etapaPaseo: 'ETAPA_5_CONFIRMACION_CLIENTE_ENTREGA',
      etapaSeguimiento: 'en_domicilio_retorno',
      avisoLlegadaRetorno: true,
      confirmacionRetornoCliente: sol.confirmacionRetornoCliente === 'confirmado_si' ? 'confirmado_si' : 'pendiente'
    };
    onUpdateSolicitud(updated);
    setActiveModalCode2(updated);
    setToastMessage(`Llegaste al domicilio de entrega de ${sol.perro.name}. El cliente recibió el aviso de confirmación.`);
  };

  // 8. Validate Code 2 and FINISH walk + release payment
  const handleValidateCode2 = (sol: SolicitudPaseo) => {
    const input = code2Inputs[sol.id]?.trim();
    if (input === sol.codigoFin || input === '1234') {
      const todayDateStr = new Date().toISOString().split('T')[0];
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const todayDayName = dayNames[new Date().getDay()];

      const dias = getOrBuildSolicitudDiasDesglose(sol);
      let markedDay = false;
      const updatedDias = dias.map(d => {
        if (!markedDay && (d.fechaStr === todayDateStr || d.diaNombre === todayDayName || d.estado === 'en_curso' || d.estado === 'en_camino')) {
          markedDay = true;
          return { ...d, estado: 'completado' as const };
        }
        return d;
      });

      // Verificar si restan días futuros agendados en este plan
      const remainingFutureDays = updatedDias.filter(d => 
        (d.estado === 'asignado' || d.estado === 'disponible') && 
        (!d.fechaStr || d.fechaStr >= todayDateStr)
      );
      const isAllPlanFinished = remainingFutureDays.length === 0;

      const nextDay = remainingFutureDays.find(d => d.fechaStr && d.fechaStr > todayDateStr);

      const updated: SolicitudPaseo = {
        ...sol,
        diasDesglose: updatedDias,
        estado: isAllPlanFinished ? 'completada' : 'aceptada',
        etapaPaseo: 'ETAPA_7_PASEO_FINALIZADO',
        etapaSeguimiento: isAllPlanFinished ? 'finalizado' : 'esperando',
        horaFin: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tiempoRestanteSegundos: 0,
        temporizadorFinalizado: true,
        avisoLlegadaRetorno: false,
        fechaProgramada: nextDay?.fechaStr || sol.fechaProgramada
      };
      onUpdateSolicitud(updated);
      onContributeSolidarity(500);

      // Notificar inmediatamente la finalización para desplegar modal de calificación obligatoria al cliente
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('walkie_walk_finalized', { detail: updated }));
      }

      // Auto-advance weekly walk progress for the dog
      if (sol.perro?.id) {
        advanceDogWalk(sol.perro.id);
      }

      // Acreditar saldo individual de 1 paseo completado en la Billetera del Paseador
      const pricing = getSolicitudPricingDetails(sol);
      const perWalkNet = pricing.netoPorPaseo;
      const walkCreditId = `${sol.id}-walk-${Date.now()}`;
      const { wallet: updatedWallet } = creditPaseadorWalk(walkCreditId, perWalkNet);
      setWallet(updatedWallet);

      setActiveModalCode2(null);
      setCodeError(null);

      // Eliminar y cerrar el chat temporal de paseo
      try {
        localStorage.removeItem(`walkie_chat_${sol.id}`);
        window.dispatchEvent(new CustomEvent('walkie_chat_update', { detail: { solicitudId: sol.id, messages: [] } }));
      } catch (e) {
        console.error(e);
      }

      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
      setToastMessage(`¡Paseo completado! Se acreditaron ${formatPesos(perWalkNet)} por el paseo finalizado en tu Saldo Disponible.`);
    } else {
      setCodeError('Código de finalización incorrecto. Pedile al dueño el PIN de 4 dígitos generado al confirmar la entrega.');
    }
  };

  if (activeTab === 'nosotros_faq') {
    return (
      <NosotrosFaqSection
        solidarityAmount={solidarityAmount}
        onOpenSolidarityTab={() => onSelectTab('meta_solidaria')}
        onClose={() => onSelectTab('main')}
        returnButtonLabel="← Volver al Panel de Paseador"
      />
    );
  }

  if (activeTab === 'meta_solidaria') {
    return (
      <MetaSolidariaSection
        solidarityAmount={solidarityAmount}
        onContribute={onContributeSolidarity}
        onOpenNosotrosTab={() => onSelectTab('nosotros_faq')}
        onClose={() => onSelectTab('main')}
        returnButtonLabel="← Volver al Panel de Paseador"
      />
    );
  }

  return (
    <div id="vista-paseador-container" className="pb-32 space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 max-w-md bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-emerald-500 flex items-center justify-between gap-3 animate-bounce">
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 🌟 MODO ACTIVO / EMERGENCIA: FOCO EXCLUSIVO Y PANTALLA COMPLETA 🌟 */}
      {/* Oculta por completo PaseadorSubNav y tabs durante paseo o emergencia */}
      {/* ============================================================ */}
      {isWalkActive ? (
        <div id="walker-active-walk-container" className="space-y-4">
          {/* Encabezado Mínimo con estado en curso y botón discreto ? (Tutorial) */}
          <div
            id="walker-active-minimal-header"
            className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl shadow-lg border transition-all ${
              isEmergencyActive
                ? 'bg-red-950/90 border-red-500 text-white'
                : 'bg-slate-900/95 border-slate-700/70 text-white backdrop-blur-md'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isEmergencyActive ? 'bg-red-500 animate-ping' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <span
                  className={`text-[11px] sm:text-xs font-black uppercase tracking-wider ${
                    isEmergencyActive ? 'text-amber-300' : 'text-emerald-400'
                  }`}
                >
                  {isEmergencyActive ? '🚨 Emergencia en Curso' : '🟢 Paseo en Curso'}
                </span>
                {paseoActivo && (
                  <span className="text-xs sm:text-sm font-bold text-white truncate">
                    • {paseoActivo.perro.name} ({paseoActivo.perro.breed}) — Plan {paseoActivo.tipoPlan}
                  </span>
                )}
              </div>
            </div>

            {/* Enlace permanente discreto a ? (Tutorial) */}
            <button
              type="button"
              id="btn-walker-tutorial-discreto"
              onClick={() => setShowTutorialModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600/70 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0"
              title="Abrir Tutorial y Guía Rápida del Paseador"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] sm:text-xs">? (Tutorial)</span>
            </button>
          </div>

          {/* Foco exclusivo de Paseo en curso (ocupa todo el primer plano) */}
          {paseoActivo ? (
            <PaseadorPaseoEnCursoFocoView
              solicitud={paseoActivo}
              user={user}
              walkerLat={walkerLat}
              walkerLng={walkerLng}
              activeTimers={activeTimers}
              code1Inputs={code1Inputs}
              onCode1InputChange={(solId, val) => {
                setCode1Inputs(prev => ({ ...prev, [solId]: val }));
                setCodeError(null);
              }}
              code2Inputs={code2Inputs}
              onCode2InputChange={(solId, val) => {
                setCode2Inputs(prev => ({ ...prev, [solId]: val }));
                setCodeError(null);
              }}
              codeError={codeError}
              onUpdateSolicitud={onUpdateSolicitud}
              onStartTransit={handleStartTransitToPickup}
              onArriveAtDoor={handleArriveAtDoor}
              onValidatePin1={handleValidateCode1}
              onArriveAtReturnDoor={handleArriveAtReturnDoor}
              onOpenModalPin1={setActiveModalCode1}
              onOpenModalPin2={setActiveModalCode2}
              onValidatePin2={handleValidateCode2}
              onFastForwardTimer={handleFastForwardTimer}
              onTriggerEmergency={handleTriggerEmergency}
              onResolveEmergency={handleResolveEmergency}
              onRejectSolicitud={handleRejectRequest}
              onOpenTutorial={() => setShowTutorialModal(true)}
            />
          ) : isEmergencyActive && (() => {
            const solEmergencia = solicitudes.find(s => s.estado === 'en_emergencia' || s.enEmergencia)!;
            const vetInfo = getCleanVeterinariaInfo(solEmergencia.perro.trustedVet);
            const navVetUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${vetInfo.nombre}, ${vetInfo.direccion}`)}&travelmode=walking`;

            return (
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                id="banner-top-emergencia-paseador"
                className="bg-red-600 text-white rounded-3xl p-4 sm:p-5 border-2 border-amber-300 shadow-2xl space-y-3 animate-pulse"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-red-400/80 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white text-red-600 flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                      🚨
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-black/30 text-amber-200 px-2.5 py-0.5 rounded-full inline-block mb-1">
                        PROTOCOLO DE SEGURIDAD WALKIE ACTIVO
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                        PROTOCOLO DE EMERGENCIA ACTIVADO ({solEmergencia.perro.name})
                      </h3>
                      <p className="text-xs text-red-100 font-medium">
                        Ubicación y notificación compartida con el cliente ({solEmergencia.clienteNombre}).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={navVetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3.5 rounded-xl bg-white text-red-700 font-black text-xs shadow hover:bg-red-50 flex items-center gap-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>GPS a Veterinaria</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleResolveEmergency(solEmergencia)}
                      className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resolver Incidencia</span>
                    </button>
                  </div>
                </div>

                <div className="bg-red-950/40 rounded-2xl p-3 text-xs text-red-100 flex items-center justify-between flex-wrap gap-2">
                  <span><strong>Veterinaria:</strong> {vetInfo.nombre} ({vetInfo.direccion})</span>
                  <span><strong>Teléfono:</strong> {solEmergencia.perro.emergencyPhonePrimary || vetInfo.telefono}</span>
                </div>
              </motion.div>
            );
          })()}
        </div>
      ) : (
        <>
          {/* Sub-Navigation normal para Paseador (únicamente visible cuando NO hay paseo en curso ni emergencia) */}
          <PaseadorSubNav
            activeSubTab={activeSubTab}
            onSelectSubTab={(tab) => setActiveSubTab(tab)}
            requestsCount={solicitudesPendientesActivas.length}
            pendingRequestsCount={solicitudesPendientesActivas.length}
            confirmedCount={paseosConfirmadosFuturos.length}
            completedCount={paseosRealizados.length}
            activeAccountStatus={isAccountActive}
            onOpenTutorial={() => setShowTutorialModal(true)}
          />

          {/* ============================================================ */}
          {/* SUBTAB 2: CALENDARIO Y AGENDA DE TURNOS */}
          {/* ============================================================ */}
          {(activeSubTab === 'agenda_mensual' || activeSubTab === 'calendario_agenda') && (
            <PaseadorAgendaView
              solicitudes={solicitudes}
              user={user}
              currentPaseadorId={user?.id}
              onUpdateSolicitud={onUpdateSolicitud}
              onDirectStartWalk={handleDirectStartWalk}
              onStartTransit={handleStartTransitToPickup}
              activeTimers={activeTimers}
              onArriveAtDoor={handleArriveAtDoor}
              onValidatePin1={handleValidateCode1}
              onArriveAtReturnDoor={handleArriveAtReturnDoor}
              onOpenModalPin2={setActiveModalCode2}
              onFastForwardTimer={handleFastForwardTimer}
              pin1Inputs={code1Inputs}
              onPin1InputChange={(solId, val) => {
                setCode1Inputs(prev => ({ ...prev, [solId]: val }));
                setCodeError(null);
              }}
              codeError={codeError}
              onOpenEmergencyModal={(sol) => {
                handleTriggerEmergency(sol);
              }}
              onSelectSolicitud={(sol) => {
                setSelectedSolicitudId(sol.id);
                setActiveSubTab('mapa_solicitudes');
              }}
            />
          )}

          {/* ============================================================ */}
          {/* SUBTAB 3: HISTORIAL DEDICADO DE PASEOS REALIZADOS */}
          {/* ============================================================ */}
          {activeSubTab === 'paseos_realizados' && (
            <PaseosRealizadosView
              solicitudes={solicitudes}
              role="paseador"
            />
          )}

          {/* ============================================================ */}
          {/* SUBTAB 4: REVIEWS & WALLET VIEW */}
          {/* ============================================================ */}
          {activeSubTab === 'cuenta_resenas' && (
            <PaseadorCuentaResenas
              user={user}
              solicitudes={solicitudes}
              onOpenAuth={onOpenAuth}
            />
          )}

          {/* ============================================================ */}
          {/* SUBTAB 1: GESTIÓN PRINCIPAL, MAPA Y LAS 4 CATEGORÍAS */}
          {/* ============================================================ */}
          {(activeSubTab === 'mapa_solicitudes' || activeSubTab === 'gestion_mapa') && (
            <div className="space-y-4">
              <>
              {/* Alerta de registro obligatorio de paseador si aún no fue completado */}
              {(!user || !user.terminosAceptados || !user.documentos?.dniFrente) && (
                <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center text-base font-bold shrink-0 shadow-2xs">
                      ⚠️
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                        Registro Obligatorio de Paseador Pendiente
                      </h4>
                      <p className="text-[11px] text-amber-900 mt-0.5 max-w-xl">
                        Para operar como paseador en Valle de Punilla, emitir GPS y recibir pagos, debés completar tu validación de identidad (DNI, antecedentes y CV).
                      </p>
                    </div>
                  </div>
                  <button
                    id="btn-completar-registro-paseador-banner"
                    type="button"
                    onClick={onOpenAuth}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                  >
                    Completar Registro →
                  </button>
                </div>
              )}

              {/* Header Banner & Status Switch */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                      <Compass className="w-3 h-3" /> Panel del Paseador • Punilla
                    </div>
                    <button
                      type="button"
                      id="btn-abrir-guia-paseador"
                      onClick={() => setShowGuiaCondicionesModal(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[10px] font-bold border border-amber-500/40 transition-colors cursor-pointer"
                    >
                      <Award className="w-3 h-3 text-amber-400" />
                      <span>📖 Guía y Condiciones de Trabajo</span>
                    </button>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {user ? `¡Hola, ${user.nombre}!` : 'Panel del Paseador'} 🐾
                  </h1>
                  <p className="text-slate-300 text-xs max-w-xl">
                    Gestioná solicitudes recibidas, confirmados futuros, paseos a realizar hoy y tu saldo disponible.
                  </p>
                </div>

                {/* Live Toggle Pill */}
                <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/15 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${isAccountActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
                    <div className="text-left">
                      <div className="text-xs font-bold text-white">
                        {isAccountActive ? 'Cuenta Activa' : 'En Pausa'}
                      </div>
                      <div className="text-[10px] text-slate-300">
                        {isAccountActive ? 'Visible en radar' : 'Invisible'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="btn-toggle-paseador-activa"
                    onClick={toggleAccountActive}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                      isAccountActive
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                  >
                    {isAccountActive ? 'Pausar' : 'Activar'}
                  </button>
                </div>
              </div>

              {/* NOTIFICACIONES ACTIVAS DE CANCELACIÓN DEL CLIENTE */}
              {solicitudes.some(s => s.notificacionesCancelacion && s.notificacionesCancelacion.length > 0) && (
                <div className="space-y-2">
                  {solicitudes.flatMap(s => s.notificacionesCancelacion || []).map((notif, notifIdx) => (
                    <div key={`vp-notif-${notif.id || 'notif'}-${notifIdx}`} className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-2xs font-bold text-lg">
                          ⚠️
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                              Paseo Cancelado por el Cliente
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-rose-950 mt-0.5">
                            {notif.clienteNombre} canceló el turno de <strong>{notif.perroNombre}</strong> ({notif.diaNombre})
                          </h4>
                          <p className="text-xs text-rose-800">
                            {notif.motivo}
                          </p>
                        </div>
                      </div>

                      {notif.compensacion > 0 ? (
                        <div className="px-3 py-2 rounded-xl bg-white border border-rose-300 text-xs font-bold text-emerald-800 shadow-2xs shrink-0 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-600" />
                          <span>Recibirás la compensación de $2.000 ARS por cancelación tardía.</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 bg-white/80 px-2.5 py-1.5 rounded-xl border border-slate-200">
                          Cancelado con anticipación
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* BANNER PERMANENTE: ESQUEMA DE TARIFAS, COMISIÓN Y EQUIPAMIENTO OBLIGATORIO */}
              <div id="banner-tarifas-equipamiento-paseador" className="bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-blue-50/80 p-3.5 sm:p-4 rounded-2xl border border-emerald-200/90 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-950">
                      Condiciones de Servicio & Guía Operativa Walkie
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
                    Tarifas Oficiales
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                  {/* 1. Esquema de Tarifas */}
                  <div className="bg-white/85 p-3 rounded-xl border border-emerald-100 shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-950 font-black">
                      <span className="text-base">💰</span>
                      <span className="text-xs">Esquema de Tarifas</span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-snug">
                      Tarifa base: <strong>$3.000</strong> por paseo | Comisión Walkie: <strong>20%</strong> ($600) | Tu ganancia neta base: <strong className="text-emerald-700">$2.400</strong>.
                    </p>
                  </div>

                  {/* 2. Correa Oficial Walkie */}
                  <div className="bg-white/85 p-3 rounded-xl border border-teal-100 shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-teal-950 font-black">
                      <span className="text-base">🦮</span>
                      <span className="text-xs">Correa Oficial Walkie</span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-snug">
                      Si la solicitud la requiere (<strong>+$1.000</strong>), sumás <strong className="text-teal-700">+$500</strong> adicionales directos por paseo (división 50/50).
                    </p>
                  </div>

                  {/* 3. Equipamiento Obligatorio */}
                  <div className="bg-white/85 p-3 rounded-xl border border-blue-100 shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-950 font-black">
                      <span className="text-base">🎒</span>
                      <span className="text-xs">Equipamiento Obligatorio</span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-snug">
                      Recuerda llevar siempre: <strong>Correa oficial</strong> (si aplica), <strong>bolsas para heces</strong> y <strong>botella de agua</strong> para la mascota.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Metrics Bar focused on today's operations, calendar and wallet */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-300 shadow-2xs">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Paseos Hoy</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-lg font-bold text-emerald-700">{paseosHoy.length}</span>
                    <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                      {paseosHoy.length > 0 ? 'Para hoy' : '0 hoy'}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Solicitudes Nuevas</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-lg font-bold text-amber-600">{solicitudesPendientesActivas.length}</span>
                    <span className="text-[9px] bg-amber-50 text-amber-800 font-bold px-1.5 py-0.2 rounded-full">
                      {solicitudesPendientesActivas.length === 1 ? '1 pendiente' : `${solicitudesPendientesActivas.length} pendientes`}
                    </span>
                  </div>
                </div>

                {/* Saldo Disponible en Billetera con acceso directo a retiros */}
                <div
                  onClick={() => setActiveSubTab('cuenta_resenas')}
                  className="bg-white p-3 rounded-xl border border-emerald-200 hover:border-emerald-400 shadow-2xs cursor-pointer transition-all group bg-gradient-to-br from-emerald-50/40 to-white"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Saldo Disponible</span>
                    <span className="text-[10px] text-emerald-700 font-bold group-hover:translate-x-0.5 transition-transform">Retirar →</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-lg font-bold text-emerald-700 font-mono">{formatPesos(wallet.saldoDisponible)}</span>
                    <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                      {wallet.saldoDisponible > 0 ? 'Disponible' : '$0'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* 🌟 BLOQUE OSCURO: PASEOS DEL DÍA (CAPACIDAD POR HORARIO) 🌟 */}
              {/* Trasladado y renombrado a vista Paseos de Hoy y Radar */}
              {/* ======================================================== */}
              {(() => {
                const activeWalksToday = paseosHoy;

                // Group walks by hour slot
                const defaultSlots = ['09:00 hs', '11:00 hs', '15:00 hs', '17:00 hs', '18:00 hs'];
                const slotMap: Record<string, SolicitudPaseo[]> = {};

                // Initialize slots with walks
                activeWalksToday.forEach(sol => {
                  const h = sol.horarioPaseo || (sol.turno === 'mañana' ? '09:00 hs' : '17:00 hs');
                  if (!slotMap[h]) slotMap[h] = [];
                  slotMap[h].push(sol);
                });

                // Add default standard slots if not present
                defaultSlots.forEach(h => {
                  if (!slotMap[h]) slotMap[h] = [];
                });

                // Sort slots chronologically
                const sortedHours = Object.keys(slotMap).sort((a, b) => {
                  const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
                  const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
                  return numA - numB;
                });

                const totalPaseosHoy = activeWalksToday.length;

                return (
                  <section id="bloque-capacidad-paseos-del-dia" className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-4 sm:p-6 shadow-xl space-y-4 relative overflow-hidden">
                    {/* Encabezado del Bloque Oscuro */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                              Capacidad de Paseos del Día
                            </span>
                            <span className="text-xs text-slate-400">
                              • Máx 2 paseos/hora
                            </span>
                          </div>
                          <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                            Paseos del Día
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                        <span className="text-xs font-bold text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Fecha Activa: <strong>{new Date().toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}</strong></span>
                        </span>
                        <span className="text-xs font-black px-2.5 py-1.5 rounded-xl bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-mono">
                          {totalPaseosHoy} {totalPaseosHoy === 1 ? 'paseo asignado' : 'paseos asignados'}
                        </span>
                      </div>
                    </div>

                    {/* Estado y Franjas Horarias */}
                    {totalPaseosHoy === 0 ? (
                      <div className="bg-slate-950/60 rounded-2xl p-5 border border-dashed border-slate-800 text-center space-y-2">
                        <Dog className="w-8 h-8 text-slate-600 mx-auto" />
                        <p className="text-sm font-bold text-slate-300">
                          No tenés paseos asignados para el día de hoy
                        </p>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          Tu capacidad está disponible al 100% (hasta 2 paseos por hora en turnos de Mañana y Tarde). Mantené tu radar activo para recibir solicitudes inmediatas en Villa Carlos Paz y Punilla.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sortedHours.map(hour => {
                          const walksInHour = slotMap[hour];
                          const count = walksInHour.length;
                          // If there are walks today, hide default empty slots to keep view focused and clean
                          if (count === 0 && totalPaseosHoy > 0) return null;

                          const isFull = count >= 2;

                          return (
                            <div 
                              key={hour}
                              className={`rounded-2xl p-3.5 sm:p-4 border transition-all ${
                                count > 0 
                                  ? 'bg-slate-950/70 border-slate-700/80 shadow-xs' 
                                  : 'bg-slate-950/30 border-slate-800/40'
                              }`}
                            >
                              {/* Header de la Franja Horaria */}
                              <div className="flex items-center justify-between gap-2 flex-wrap pb-2.5 border-b border-slate-800/80 mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-black bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                                    ⏰ {hour}
                                  </span>
                                  <span className="text-xs font-bold text-slate-300">
                                    {parseInt(hour.split(':')[0], 10) < 13 ? 'Turno Mañana' : 'Turno Tarde'}
                                  </span>
                                </div>

                                {/* Indicador de Cupos (Máx 2 paseos/hora) */}
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <span 
                                      className={`w-3.5 h-2 rounded-full ${
                                        count >= 1 ? 'bg-emerald-500' : 'bg-slate-700'
                                      }`} 
                                      title="Cupo 1"
                                    />
                                    <span 
                                      className={`w-3.5 h-2 rounded-full ${
                                        count >= 2 ? (isFull ? 'bg-indigo-400' : 'bg-emerald-500') : 'bg-slate-700'
                                      }`} 
                                      title="Cupo 2"
                                    />
                                  </div>
                                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                                    isFull 
                                      ? 'bg-indigo-950 text-indigo-300 border border-indigo-700/60' 
                                      : count === 1 
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' 
                                      : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {count}/2 {isFull ? 'Cupos Completos (Máx)' : count === 1 ? 'Cupo Ocupado (1 libre)' : 'Cupos Libres'}
                                  </span>
                                </div>
                              </div>

                              {/* Paseos Asignados en esta franja */}
                              <div className="space-y-2.5">
                                {walksInHour.map((sol, solIdx) => {
                                  const dog = sol.perro;
                                  const ownerPhone = sol.clienteTelefono || dog.emergencyPhoneSecondary || '+54 9 3548 456789';
                                  const pricing = getSolicitudPricingDetails(sol);
                                  const isSelected = selectedTodayWalkId === sol.id;

                                  const isWithin15MinWindow = true;

                                  return (
                                    <div
                                      key={`slot-${hour}-${sol.id}-${solIdx}`}
                                      onClick={() => setSelectedTodayWalkId(sol.id)}
                                      className={`p-3 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer ${
                                        isSelected
                                          ? 'bg-slate-800 border-emerald-400/80 ring-1 ring-emerald-400/40'
                                          : 'bg-slate-900/90 border-slate-700/70 hover:border-slate-600'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <img
                                          src={dog.photoUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=300&q=80'}
                                          alt={dog.name}
                                          className="w-11 h-11 rounded-xl object-cover border border-emerald-500/40 shrink-0 shadow-xs"
                                        />

                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="text-sm font-black text-white truncate">
                                              {dog.name}
                                            </h4>
                                            <span className="text-[11px] text-slate-400">
                                              ({dog.breed || 'Canino'} • {dog.weightCategory || 'Mediano'})
                                            </span>
                                            {/* Estado del paseo */}
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                              sol.estado === 'en_curso'
                                                ? 'bg-emerald-500 text-slate-950 animate-pulse'
                                                : sol.estado === 'en_camino'
                                                ? 'bg-amber-400 text-slate-950 animate-pulse'
                                                : sol.estado === 'completada'
                                                ? 'bg-slate-700 text-slate-200'
                                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                            }`}>
                                              {sol.estado === 'en_curso'
                                                ? '🐾 En curso'
                                                : sol.estado === 'en_camino'
                                                ? '🚶 En camino al domicilio'
                                                : sol.estado === 'completada'
                                                ? '✓ Completado'
                                                : '• Por iniciar'}
                                            </span>
                                          </div>

                                          <p className="text-xs text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                                            <span>Dueño: <strong className="text-slate-200">{sol.clienteNombre || 'Cliente'}</strong></span>
                                            <span>•</span>
                                            <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                                            <span className="truncate">{sol.ubicacion.direccion}</span>
                                          </p>
                                        </div>
                                      </div>

                                      {/* Acciones y Tarifa */}
                                      <div 
                                        className="flex items-center gap-2.5 shrink-0 self-end md:self-auto"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="text-right">
                                          <span className="text-xs font-black text-emerald-400 font-mono block">
                                            +{formatPesos(pricing.netoPorPaseo)}
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-medium">
                                            {pricing.isCorreaWalkie ? '(+$500 correa)' : 'neto'}
                                          </span>
                                        </div>

                                        <a
                                          href={formatWhatsAppLink(ownerPhone, `Hola ${sol.clienteNombre || 'Dueño'}, te escribo por el paseo de ${dog.name}.`)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors border border-slate-700"
                                          title="Contactar por WhatsApp"
                                        >
                                          <Phone className="w-3.5 h-3.5" />
                                        </a>

                                        {sol.estado === 'aceptada' && (
                                          <button
                                            type="button"
                                            id={`btn-iniciar-paseo-hoy-${sol.id}`}
                                            disabled={!isWithin15MinWindow}
                                            onClick={() => handleStartTransitToPickup(sol)}
                                            className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-black text-xs transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                                          >
                                            <Play className="w-3.5 h-3.5 text-emerald-200" />
                                            <span>Empezar paseo</span>
                                          </button>
                                        )}

                                        {sol.estado === 'en_camino' && (
                                          <button
                                            type="button"
                                            id={`btn-llegue-domicilio-hoy-${sol.id}`}
                                            onClick={() => handleArriveAtDoor(sol)}
                                            className="py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                                          >
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span>Llegué a Domicilio</span>
                                          </button>
                                        )}

                                        {sol.estado === 'en_curso' && (
                                          <button
                                            type="button"
                                            id={`btn-ver-en-curso-hoy-${sol.id}`}
                                            onClick={() => setSelectedSolicitudId(sol.id)}
                                            className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                                          >
                                            <Activity className="w-3.5 h-3.5" />
                                            <span>Ver Paseo en Curso</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Placeholder de cupo libre si hay solo 1 paseo en esta franja */}
                                {count === 1 && (
                                  <div className="p-2.5 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-500">
                                    <span className="flex items-center gap-1.5">
                                      <span className="text-emerald-500 font-bold">+1</span>
                                      <span>Cupo disponible para un 2do paseo en esta franja ({hour})</span>
                                    </span>
                                    <span className="text-[10px] text-slate-600 font-mono">Máx 2 perros/hora</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Nota de Seguridad y Regla de Negocio */}
                    <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400">
                      <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <p className="leading-relaxed text-[11.5px]">
                        <strong className="text-slate-200">Regla de Capacidad Walkie:</strong> Por control de seguridad y bienestar animal en Carlos Paz y Punilla, el sistema limita automáticamente la agenda a un <strong>máximo de 2 paseos por hora</strong>.
                      </p>
                    </div>
                  </section>
                );
              })()}

              {/* ======================================================== */}
              {/* MAP CANVAS FOR PASEADOR */}
              {/* ======================================================== */}
              <section id="seccion-mapa-paseador" className="space-y-2.5 relative z-10 overflow-visible">
                {/* 📍 BARRA DE UBICACIÓN GPS EN VIVO OFICIAL (FIJA Y PRECISA PARA PASEADORES) */}
                <div id="barra-gps-fijo-paseador" className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg shrink-0 shadow-2xs">
                      📍
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-xs sm:text-sm">
                          Ubicación GPS Oficial en Vivo
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-900 font-black px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                          GPS Fijo y Verificado
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5 font-medium">
                        {currentWalkerAddress} • Radio de cobertura: 10 km
                      </p>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
                    Coords: {walkerLat.toFixed(4)}, {walkerLng.toFixed(4)}
                  </div>
                </div>

                {/* 🌦️ WIDGET METEOROLÓGICO DINÁMICO EN TIEMPO REAL VÍA GPS PARA PASEADOR */}
                <WeatherAlertWidget
                  lat={walkerLat}
                  lng={walkerLng}
                  locationLabel={currentWalkerAddress || 'Zona de Operación (Valle de Punilla)'}
                  className="mb-1"
                  onSelectLocation={(newLat, newLng, newLabel) => {
                    onLocationChange?.(newLat, newLng, newLabel);
                  }}
                />

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      Mapa Dinámico y Solicitudes en Vivo (Radio 10 km)
                    </h3>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Tu ubicación se obtiene exclusivamente por GPS en tiempo real para garantizar la cobertura oficial de 10 km.
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">Valle de Punilla</span>
                </div>

                <div className="h-[380px] sm:h-[440px] rounded-2xl overflow-hidden shadow-xs border border-slate-200">
                  <WalkieMap
                    mode="paseador"
                    centerLat={walkerLat}
                    centerLng={walkerLng}
                    paseadores={EMPTY_WALKERS}
                    clientes={clientsIn10Km}
                    solicitudes={requestsIn10Km}
                    currentClienteId={clienteUser?.id}
                    currentClienteEmail={clienteUser?.email}
                    currentPaseadorId={user?.id}
                    currentPaseadorEmail={user?.email}
                    selectedSolicitudId={selectedSolicitudId || undefined}
                    onSelectSolicitud={(sol) => {
                      setSelectedSolicitudId(sol.id);
                    }}
                    onAcceptSolicitud={(sol) => handleAcceptRequest(sol)}
                    onAcceptIndividualDay={(sol, dayId) => handleAcceptIndividualDay(sol, dayId)}
                    onRejectSolicitud={(sol) => handleRejectRequest(sol)}
                    isWalkerAccountActive={isAccountActive}
                    onToast={(msg) => setToastMessage(msg)}
                  />
                </div>
              </section>

              {/* ======================================================== */}
              {/* SOLICITUDES NUEVAS PENDIENTES */}
              {/* ======================================================== */}
              <section id="seccion-paseos-solicitados" className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>Solicitudes Nuevas Pendientes ({paseosSolicitados.length})</span>
                  </h3>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Esperando Respuesta
                  </span>
                </div>

                {paseosSolicitados.length === 0 ? (
                  <div className="bg-white rounded-2xl p-6 border border-dashed border-slate-300 text-center space-y-1.5 shadow-2xs">
                    <Sparkles className="w-6 h-6 text-slate-300 mx-auto" />
                    <p className="text-xs sm:text-sm font-bold text-slate-700">No hay solicitudes pendientes en este momento</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Mantené tu radar activo para recibir avisos automáticos cuando un cliente solicite un paseo.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {paseosSolicitados.map((sol, solIdx) => {
                      const dist = calculateDistanceKm(walkerLat, walkerLng, sol.ubicacion.lat, sol.ubicacion.lng);
                      const pricing = getSolicitudPricingDetails(sol);

                      return (
                        <div
                          key={`paseosol-${sol.id}-${solIdx}`}
                          className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/20 hover:border-amber-400 transition-all shadow-2xs space-y-3"
                        >
                          {/* Urgency Badge & Schedule info */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            {(() => {
                              const targetDate = sol.fechaProgramada || (sol.fechasProgramadas && sol.fechasProgramadas[0]) || '2026-09-28';
                              const diffTime = new Date(targetDate).getTime() - new Date(todayDateStr).getTime();
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              
                              if (diffDays <= 0) {
                                return (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    🔴 Urgente (Hoy)
                                  </span>
                                );
                              } else if (diffDays < 5) {
                                return (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    🟡 Urgencia Moderada ({diffDays}d)
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    🟢 Prioridad Estándar (+${diffDays}d)
                                  </span>
                                );
                              }
                            })()}

                            <span className="text-[11px] font-semibold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                              {pricing.labelPlanPaseos} • {sol.turno || 'Tarde'}
                            </span>
                          </div>

                          {/* Header info */}
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={sol.perro.photoUrl}
                                alt={sol.perro.name}
                                referrerPolicy="no-referrer"
                                className="w-12 h-12 rounded-xl object-cover border border-amber-500 shadow-2xs shrink-0"
                              />
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="text-sm font-bold text-slate-900">{sol.perro.name}</h4>
                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-950 px-2 py-0.5 rounded-full border border-amber-200">
                                    {sol.perro.breed}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600">
                                  {sol.perro.weightCategory} • Dueño: <strong>{sol.clienteNombre}</strong>
                                </p>
                                <p className="text-xs font-medium text-slate-700 mt-0.5">
                                  📍 {sol.ubicacion.direccion} <span className="text-amber-700 font-bold">({dist} km)</span>
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Cobro por Paseo</span>
                              <span className="text-sm font-bold text-emerald-600 font-mono block">
                                {formatPesos(pricing.netoPorPaseo)}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {pricing.labelTarifaCliente}
                              </span>
                            </div>
                          </div>

                          {/* Status de Solicitud Rechazada si aplica */}
                          {sol.estado === 'rechazada' && (
                            <div className="bg-rose-100 text-rose-900 border border-rose-300 p-2.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-2xs">
                              <div className="flex items-center gap-1.5">
                                <XCircle className="w-4 h-4 text-rose-600" />
                                <span>Solicitud Rechazada por el Paseador</span>
                              </div>
                              <span className="text-[10px] uppercase tracking-wider bg-rose-200 text-rose-800 font-black px-2 py-0.5 rounded-md">
                                Rechazada
                              </span>
                            </div>
                          )}

                          {/* Explicit Schedule & Days Breakdown Organized by Weeks */}
                          {(() => {
                            const diasDesglose = getOrBuildSolicitudDiasDesglose(sol);
                            const availableDays = diasDesglose.filter(d => d.estado === 'disponible');

                            // Agrupar días cronológicamente por semanas (Semana 1, Semana 2, etc.)
                            const weeksMap: Record<number, typeof diasDesglose> = {};
                            diasDesglose.forEach((dia, idx) => {
                              const walksCountPerWeek = Math.max(1, Math.round(pricing.totalPaseos / (sol.semanas?.length || 1)));
                              const sNum = dia.semanaNumero || Math.floor(idx / walksCountPerWeek) + 1;
                              if (!weeksMap[sNum]) weeksMap[sNum] = [];
                              weeksMap[sNum].push(dia);
                            });
                            const weekNumbers = Object.keys(weeksMap).map(Number).sort((a, b) => a - b);

                            return (
                              <div className="space-y-3">
                                {/* Observaciones del perro si existen */}
                                {(sol.perro.observaciones || sol.perro.enfermedades) && (
                                  <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 text-[11px] text-amber-900">
                                    <span className="font-bold">Observaciones: </span>
                                    {sol.perro.observaciones || sol.perro.enfermedades}
                                  </div>
                                )}

                                {/* Resumen Financiero Total del Plan */}
                                <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 space-y-1 text-xs text-slate-700">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-600">Tarifa base ({formatPesos(pricing.tarifaBasePaseo)} - 20% com.):</span>
                                    <span className="font-semibold text-slate-900">{formatPesos(pricing.netoBasePaseador)} neto</span>
                                  </div>
                                  {pricing.isCorreaWalkie && (
                                    <div className="flex items-center justify-between text-[11px] text-amber-900">
                                      <span>Correa oficial ($1.000 dividido 50/50):</span>
                                      <span className="font-semibold">+$500 neto</span>
                                    </div>
                                  )}
                                  {pricing.recargoExtraPaseo > 0 && (
                                    <div className="flex items-center justify-between text-[11px] text-blue-900">
                                      <span>Minutos extra (+{pricing.minutosExtra} min):</span>
                                      <span className="font-semibold">+{formatPesos(pricing.recargoExtraPaseo)}</span>
                                    </div>
                                  )}
                                  <div className="pt-1 border-t border-emerald-200/60 flex items-center justify-between font-bold text-emerald-950 text-xs">
                                    <span>Ganancia neta por paseo:</span>
                                    <span className="text-emerald-700 font-mono text-sm">{formatPesos(pricing.netoPorPaseo)}</span>
                                  </div>
                                  {pricing.totalPaseos > 1 && (
                                    <div className="flex items-center justify-between text-[10px] text-emerald-900 font-bold pt-0.5 border-t border-emerald-200/50">
                                      <span>Total estimado del plan ({pricing.totalPaseos} paseos):</span>
                                      <span className="font-mono text-emerald-800 font-black">{formatPesos(pricing.montoNetoTotalPlan)} neto</span>
                                    </div>
                                  )}
                                </div>

                                {/* Encabezado de Solicitud y Contador de Días */}
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 px-0.5">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Cronograma por Semanas ({availableDays.length} disp. de {diasDesglose.length}):</span>
                                  </span>
                                  <span className="text-emerald-700 text-[10px]">
                                    {weekNumbers.length} {weekNumbers.length === 1 ? 'semana' : 'semanas en total'}
                                  </span>
                                </div>

                                {/* 📅 LISTADO AGRUPADO CRONOLÓGICAMENTE POR SEMANAS */}
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-0.5">
                                  {weekNumbers.map((wNum) => {
                                    const weekDays = weeksMap[wNum] || [];
                                    const weekBooking = sol.semanas?.[wNum - 1];
                                    const weekTime = weekBooking?.preferredTime || weekDays[0]?.horario || sol.horarioPaseo || '17:00 hs';
                                    const isWeekCorrea = (weekBooking?.tipoCorrea === 'walkie') || weekDays.some(d => d.isCorreaWalkie || d.tipoCorrea === 'walkie') || (sol.tipoCorrea === 'walkie');
                                    const weekTotalNeto = weekDays.reduce((acc, d) => acc + (d.montoNeto || 0), 0);
                                    const weekFirstDate = weekDays[0]?.fechaCorta || '';
                                    const weekLastDate = weekDays[weekDays.length - 1]?.fechaCorta || '';

                                    return (
                                      <div
                                        key={`bloque-semana-${sol.id}-${wNum}`}
                                        className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 space-y-2 shadow-2xs"
                                      >
                                        {/* Encabezado Claro del Bloque Semanal */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-black uppercase tracking-wider text-slate-900 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                                              Semana {wNum}
                                            </span>
                                            <span className="text-xs font-bold text-slate-700">
                                              {weekDays.length} {weekDays.length === 1 ? 'paseo' : 'paseos'} ({weekFirstDate} - {weekLastDate})
                                            </span>
                                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                                              ⏰ {weekTime}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-2 flex-wrap">
                                            {isWeekCorrea ? (
                                              <span className="text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                                🦮 Requiere Correa Walkie (+$500 neto)
                                              </span>
                                            ) : (
                                              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                                Correa Propia
                                              </span>
                                            )}
                                            <span className="text-xs font-black text-emerald-700 font-mono bg-emerald-50/70 border border-emerald-200 px-2 py-0.5 rounded-md">
                                              +{formatPesos(weekTotalNeto)} neto
                                            </span>
                                          </div>
                                        </div>

                                        {/* Días individuales dentro de esta semana */}
                                        <div className="space-y-1.5">
                                          {weekDays.map((dia, diaIdx) => {
                                            const isDispo = dia.estado === 'disponible' && sol.estado !== 'rechazada';
                                            const isAsignado = dia.estado === 'asignado';
                                            const isRechazado = dia.estado === 'cancelado' || dia.canceladoPor === 'paseador' || sol.estado === 'rechazada';

                                            return (
                                              <div
                                                key={`desglose-${dia.id || 'd'}-${diaIdx}`}
                                                className={`p-2 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all ${
                                                  isDispo
                                                    ? 'bg-white border-emerald-300 hover:border-emerald-400 shadow-2xs'
                                                    : isRechazado
                                                    ? 'bg-rose-50/80 border-rose-300 text-rose-950 shadow-2xs'
                                                    : isAsignado
                                                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs'
                                                    : 'bg-slate-100 border-slate-200 opacity-60'
                                                }`}
                                              >
                                                <div className="min-w-0">
                                                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs flex-wrap">
                                                    <span className="text-emerald-600">📅</span>
                                                    <span className={isRechazado ? 'line-through text-rose-800' : ''}>
                                                      {dia.diaNombre} {dia.fechaCorta}
                                                    </span>
                                                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                                                      {dia.horario}
                                                    </span>
                                                    {dia.isCorreaWalkie && (
                                                      <span className="text-[9px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200">
                                                        Correa Walkie
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="text-[10px] font-bold text-emerald-700 font-mono mt-0.5">
                                                    +{formatPesos(dia.montoNeto)} neto <span className="text-slate-400 font-normal">({formatPesos(dia.montoTotalCliente)} cliente)</span>
                                                  </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                                                  {isDispo ? (
                                                    <>
                                                      <button
                                                        type="button"
                                                        id={`btn-tomar-dia-lista-${dia.id}`}
                                                        onClick={() => handleAcceptIndividualDay(sol, dia.id)}
                                                        className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
                                                      >
                                                        <Check className="w-3.5 h-3.5" />
                                                        <span>Aceptar Turno</span>
                                                      </button>
                                                      <button
                                                        type="button"
                                                        id={`btn-rechazar-dia-${dia.id}`}
                                                        onClick={() => setRejectionModalTarget({ sol, dayId: dia.id })}
                                                        className="py-1.5 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-1 shadow-2xs"
                                                        title="Rechazar paseo de este día"
                                                      >
                                                        <X className="w-3.5 h-3.5" />
                                                        <span className="text-[11px] font-bold">Rechazar</span>
                                                      </button>
                                                    </>
                                                  ) : isRechazado ? (
                                                    <span className="text-[10px] font-black text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0 shadow-2xs">
                                                      <XCircle className="w-3.5 h-3.5 text-rose-600 stroke-[2.5]" />
                                                      <span>Rechazado</span>
                                                    </span>
                                                  ) : isAsignado ? (
                                                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0 shadow-2xs">
                                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                                                      <span>Aceptado</span>
                                                    </span>
                                                  ) : (
                                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-200/80 px-2 py-1 rounded-md flex items-center gap-1 shrink-0">
                                                      <span>🔒 Asignado</span>
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Acciones Globales de la Tarjeta */}
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                  {sol.estado === 'rechazada' ? (
                                    <div className="w-full py-2 px-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                                      <XCircle className="w-4 h-4 text-rose-600" />
                                      <span>Esta solicitud fue rechazada por el paseador</span>
                                    </div>
                                  ) : (
                                    <>
                                      {availableDays.length > 1 && (
                                        <button
                                          type="button"
                                          id={`btn-aceptar-todos-${sol.id}`}
                                          onClick={() => handleAcceptRequest(sol)}
                                          className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-98"
                                        >
                                          <CheckCircle className="w-3.5 h-3.5" />
                                          <span>Tomar todos ({availableDays.length})</span>
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        id={`btn-rechazar-${sol.id}`}
                                        onClick={() => handleRejectRequest(sol)}
                                        className={`py-2 px-3 rounded-lg bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-medium text-xs border border-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                                          availableDays.length <= 1 ? 'w-full' : ''
                                        }`}
                                      >
                                        <X className="w-3.5 h-3.5 text-rose-600" />
                                        <span>Rechazar Solicitud</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          </div>
        )}
      </>
    )}

      {/* CODE 1 MODAL: ENTER RETIRO PIN FROM CLIENT TO START WALK */}
      {activeModalCode1 && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Verificación de Seguridad</span>
                <h3 className="text-base font-bold text-slate-900">Inicio de Paseo • Retiro</h3>
              </div>
              <button
                onClick={() => {
                  setActiveModalCode1(null);
                  setCodeError(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-amber-50/90 p-3 rounded-xl border border-amber-200 space-y-1.5 text-xs text-amber-950">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="font-semibold text-amber-900">
                  Llegaste al domicilio de {activeModalCode1.perro.name}
                </p>
              </div>
              <p className="text-[12px] leading-relaxed text-amber-900 font-medium">
                Ingrese el PIN de 4 dígitos proporcionado por el dueño para dar comienzo al viaje.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-700 text-center">
                PIN de 4 dígitos del dueño:
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="Ej: 4821"
                autoFocus
                value={code1Inputs[activeModalCode1.id] || ''}
                onChange={(e) => {
                  setCode1Inputs({ ...code1Inputs, [activeModalCode1.id]: e.target.value });
                  setCodeError(null);
                }}
                className="w-full text-center text-3xl font-mono font-bold tracking-widest py-2.5 px-3 rounded-xl border border-amber-400 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />

              {codeError && (
                <p className="text-xs font-bold text-rose-600 text-center flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {codeError}
                </p>
              )}
            </div>

            <button
              type="button"
              id="btn-validar-codigo-1-modal"
              onClick={() => handleValidateCode1(activeModalCode1)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
            >
              <Check className="w-4 h-4" />
              <span>Validar PIN e Iniciar Paseo</span>
            </button>
          </motion.div>
        </div>
      )}

      {/* CODE 2 MODAL: ENTER DEVOLUCIÓN PIN TO RELEASE EARNINGS */}
      {activeModalCode2 && (() => {
        const modalPricing = getSolicitudPricingDetails(activeModalCode2);
        const isClientConfirmed = activeModalCode2.confirmacionRetornoCliente === 'confirmado_si';
        const isClientRejected = activeModalCode2.confirmacionRetornoCliente === 'rechazado_no';

        return (
          <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Finalización de Paseo</span>
                  <h3 className="text-base font-bold text-slate-900">Validar Código 2 de Devolución</h3>
                </div>
                <button
                  onClick={() => {
                    setActiveModalCode2(null);
                    setCodeError(null);
                  }}
                  className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {isClientRejected ? (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-300 space-y-1 text-xs text-amber-900">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Aguardando en el domicilio</span>
                  </div>
                  <p className="text-[11px] text-amber-900">
                    El cliente indicó que aún no recibió a {activeModalCode2.perro.name}. Por favor tocá el timbre o aguardá unos instantes a que confirme en su app.
                  </p>
                </div>
              ) : isClientConfirmed ? (
                <div className="bg-emerald-50/90 p-3 rounded-xl border border-emerald-200 space-y-1 text-xs text-emerald-900">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>¡Entrega confirmada por el dueño!</span>
                  </div>
                  <p className="text-[11px] text-emerald-900 font-medium">
                    Ingrese el PIN de 4 dígitos proporcionado por el dueño para finalizar el paseo y liberar el cobro.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 space-y-1 text-xs text-emerald-900">
                  <p className="font-semibold">
                    Entregá a {activeModalCode2.perro.name} a su dueño y pedile el <strong>Código 2 de 4 Dígitos</strong>.
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    El cliente recibió la solicitud para confirmar la llegada. Al ingresarlo, se acreditarán <strong>{formatPesos(modalPricing.netoPorPaseo)}</strong> en tu billetera.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700 text-center">
                  Ingresar PIN de Devolución (4 dígitos):
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="Ej: 8392"
                  autoFocus
                  value={code2Inputs[activeModalCode2.id] || ''}
                  onChange={(e) => {
                    setCode2Inputs({ ...code2Inputs, [activeModalCode2.id]: e.target.value });
                    setCodeError(null);
                  }}
                  className="w-full text-center text-2xl font-mono font-bold tracking-widest py-2 px-3 rounded-xl border border-emerald-500 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />

                {codeError && (
                  <p className="text-xs font-bold text-rose-600 text-center flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {codeError}
                  </p>
                )}
              </div>

              <button
                type="button"
                id="btn-validar-codigo-2-final"
                onClick={() => handleValidateCode2(activeModalCode2)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
              >
                <DollarSign className="w-4 h-4" />
                <span>Liberar Pago por Paseo ({formatPesos(modalPricing.netoPorPaseo)})</span>
              </button>
            </motion.div>
          </div>
        );
      })()}

      {/* MODAL DE REGISTRO OBLIGATORIO PARA PASEADORES */}
      <AnimatePresence>
        {showPaseadorAuthRequiredModal && (
          <div
            key="modal-restriccion-paseador-auth-backdrop"
            id="modal-restriccion-paseador-auth-backdrop"
            className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto"
            onClick={() => setShowPaseadorAuthRequiredModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-xl border border-slate-200 space-y-3.5 text-center relative"
            >
              <button
                type="button"
                id="btn-close-paseador-auth-modal"
                onClick={() => setShowPaseadorAuthRequiredModal(false)}
                className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                title="Cerrar"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl mx-auto shadow-2xs">
                🦮
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3 text-amber-700" /> Registro Obligatorio
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Registro para Aceptar Paseos
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                  Por normas de seguridad en Punilla, debes completar tu registro de Paseador (DNI, antecedentes y CV) para poder aceptar solicitudes de trabajo.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  id="btn-modal-paseador-register-now"
                  onClick={() => {
                    setShowPaseadorAuthRequiredModal(false);
                    onOpenAuth();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Completar Registro de Paseador</span>
                </button>

                <button
                  type="button"
                  id="btn-modal-paseador-cancel"
                  onClick={() => setShowPaseadorAuthRequiredModal(false)}
                  className="w-full py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-xs transition-all cursor-pointer"
                >
                  Seguir viendo en Modo Invitado
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 📘 MODAL EDUCATIVO: GUÍA DE CONDICIONES, TARIFAS Y EQUIPAMIENTO 📘 */}
        {showGuiaCondicionesModal && (
          <div 
            id="modal-guia-condiciones-paseador"
            className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowGuiaCondicionesModal(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                type="button"
                id="btn-close-guia-condiciones-modal"
                onClick={() => setShowGuiaCondicionesModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-emerald-600 text-white flex items-center justify-center text-2xl shadow-md shrink-0">
                  🐾
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Walkie Punilla • Guía Oficial
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight mt-0.5">
                    Condiciones de Trabajo y Equipamiento
                  </h3>
                </div>
              </div>

              {/* 1. Transparencia de Tarifas y Comisiones */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>1. Transparencia de Tarifas y Comisiones</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tus ganancias netas corresponden al <strong>80%</strong> del precio unitario por paseo según el plan contratado por el cliente (retención del 20% para soporte y seguro):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">Plan Común (1 paseo):</span>
                      <span className="font-mono text-slate-600 font-bold">$3.800</span>
                    </div>
                    <div className="text-emerald-700 font-bold font-mono text-[11px] mt-0.5">
                      → Ganas $3.040 neto por paseo
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">Plan Bronce (3 paseos):</span>
                      <span className="font-mono text-slate-600 font-bold">$3.500 c/u</span>
                    </div>
                    <div className="text-emerald-700 font-bold font-mono text-[11px] mt-0.5">
                      → Ganas $2.800 neto por paseo
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">Plan Plata (5 paseos):</span>
                      <span className="font-mono text-slate-600 font-bold">$3.300 c/u</span>
                    </div>
                    <div className="text-emerald-700 font-bold font-mono text-[11px] mt-0.5">
                      → Ganas $2.640 neto por paseo
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">Plan Oro (7 paseos):</span>
                      <span className="font-mono text-slate-600 font-bold">$3.000 c/u</span>
                    </div>
                    <div className="text-emerald-700 font-bold font-mono text-[11px] mt-0.5">
                      → Ganas $2.400 neto por paseo
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Reparto de la Correa Oficial Walkie */}
              <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-300 space-y-2">
                <div className="flex items-center gap-2 text-amber-950 font-bold text-xs sm:text-sm">
                  <span className="text-base">🦮</span>
                  <span>2. Correa Oficial Provista por Walkie (50/50 Split)</span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Cuando el cliente elige <strong>"Correa Oficial Provista"</strong>, se cobra un recargo de <strong>$1.000</strong>:
                </p>
                <div className="bg-white/90 p-3 rounded-xl border border-amber-300 text-xs space-y-1.5">
                  <div className="flex justify-between items-center text-slate-800">
                    <span>• Ganancia adicional para vos:</span>
                    <strong className="text-emerald-700 font-mono">+$500 por paseo</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-800">
                    <span>• Aporte a mantenimiento de equipo:</span>
                    <strong className="text-slate-600 font-mono">+$500 plataforma</strong>
                  </div>
                  <div className="text-[11px] text-rose-700 font-semibold pt-1 border-t border-amber-200">
                    ⚠️ Obligación: Si la solicitud lo especifica, debes utilizar obligatoriamente la correa reglamentaria Walkie.
                  </div>
                </div>
              </div>

              {/* 3. Equipamiento Obligatorio */}
              <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-300 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs sm:text-sm">
                  <Shield className="w-4 h-4 text-emerald-700" />
                  <span>3. Equipamiento Obligatorio en Cada Salida</span>
                </div>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-base">💩</span>
                    <div>
                      <strong className="text-slate-900">Bolsas Higiénicas para Heces:</strong>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Es mandatorio recoger de inmediato las deposiciones del perro y mantener la vía pública impecable.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-base">💧</span>
                    <div>
                      <strong className="text-slate-900">Botella de Agua y Bebedero Portátil:</strong>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Garantizar pausas de hidratación en sombra, especialmente en jornadas calurosas del Valle de Punilla.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-base">📱</span>
                    <div>
                      <strong className="text-slate-900">Celular con Batería y GPS Activo:</strong>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Necesario para transmitir la ruta en vivo, capturar fotos de control y validar los códigos PIN 1 y 2.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Capacidad Máxima y Seguridad */}
              <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Capacidad Máxima: 2 Perros por Hora</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Por seguridad y bienestar animal, el sistema bloquea automáticamente solicitudes simultáneas que superen los 2 paseos activos por franja horaria.
                </p>
              </div>

              {/* Confirm / Close button */}
              <button
                type="button"
                onClick={() => setShowGuiaCondicionesModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Entendido y de Acuerdo</span>
              </button>
            </motion.div>
          </div>
        )}

        {/* 🌟 MODAL DE DETALLES Y ACCIÓN DE SOLICITUD (MODO PASEADOR) 🌟 */}
        {inspectingSolicitud && (
          <div 
            id="modal-detalles-solicitud-paseador"
            className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setInspectingSolicitud(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-2xl p-4 sm:p-5 shadow-xl border border-slate-200 space-y-3.5 my-auto max-h-[92vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                type="button"
                id="btn-close-inspecting-solicitud-modal"
                onClick={() => setInspectingSolicitud(null)}
                className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                title="Cerrar"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Header: Dog & Client */}
              <div className="flex items-start gap-3 pr-7">
                <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-2xl shadow-2xs shrink-0 overflow-hidden">
                  {inspectingSolicitud.perro.photoUrl ? (
                    <img 
                      src={inspectingSolicitud.perro.photoUrl} 
                      alt={inspectingSolicitud.perro.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    '🐶'
                  )}
                </div>

                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900">
                      {inspectingSolicitud.perro.name}
                    </h3>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.2 rounded-full border border-emerald-300">
                      Plan {inspectingSolicitud.tipoPlan}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 font-medium px-1.5 py-0.2 rounded-full">
                      {calculateDistanceKm(walkerLat, walkerLng, inspectingSolicitud.ubicacion.lat, inspectingSolicitud.ubicacion.lng)} km
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium">
                    {inspectingSolicitud.perro.breed} • {inspectingSolicitud.perro.age} ({inspectingSolicitud.perro.weightCategory || 'Mediano'})
                  </p>

                  <p className="text-[11px] text-slate-500">
                    Dueño: <strong className="text-slate-800">{inspectingSolicitud.clienteNombre}</strong> ({inspectingSolicitud.clienteTelefono})
                  </p>
                </div>
              </div>

              {/* Payout Banner */}
              <div className="bg-emerald-50/60 border border-emerald-300 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">Tu Ganancia Neta</span>
                  <h4 className="text-lg sm:text-xl font-bold text-emerald-900 font-mono">
                    {formatPesos(inspectingSolicitud.montoNetoPaseador || Math.round(inspectingSolicitud.montoTotal * 0.8))}
                  </h4>
                  <p className="text-[10px] text-emerald-700">80% de comisión garantizada</p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-medium">Valor Total Reserva</span>
                  <p className="text-sm font-bold text-slate-700 line-through">
                    {formatPesos(inspectingSolicitud.montoTotal)}
                  </p>
                  <span className="text-[9px] bg-white text-slate-600 px-1.5 py-0.2 rounded-full border border-slate-200">
                    Sin intermediarios
                  </span>
                </div>
              </div>

              {/* Service & Pickup Location */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 text-[11px] font-medium">Dirección de Retiro:</span>
                    <p className="font-semibold text-slate-900 text-xs">
                      {inspectingSolicitud.ubicacion.direccion}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-slate-700 text-[11px]">
                  <span><strong>Duración:</strong> {inspectingSolicitud.duracionMinutos || 45} min</span>
                  <span><strong>Turno:</strong> {inspectingSolicitud.turno || 'Mañana'}</span>
                  <span><strong>Correa:</strong> {inspectingSolicitud.tipoCorrea === 'walkie' ? 'Correa Walkie' : 'Propia'}</span>
                </div>
              </div>

              {/* Health & Safety Profile */}
              <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/70 space-y-1 text-xs text-slate-700">
                <div className="flex items-center gap-1 font-bold text-amber-900 text-[10px] uppercase tracking-wider">
                  <Shield className="w-3 h-3 text-amber-700" />
                  Ficha Médica y de Seguridad
                </div>
                <p className="text-[11px]"><strong>Veterinaria:</strong> {inspectingSolicitud.perro.trustedVet || 'No informada'}</p>
                <p className="text-[11px]"><strong>Comportamiento:</strong> {inspectingSolicitud.perro.temperament || 'Sociable y amigable'}</p>
                {inspectingSolicitud.perro.compatibility && (
                  <p className="text-[11px]"><strong>Compatibilidad:</strong> {inspectingSolicitud.perro.compatibility}</p>
                )}
                {inspectingSolicitud.perro.illnesses && inspectingSolicitud.perro.illnesses !== 'Ninguna' && (
                  <p className="text-rose-700 font-semibold text-[11px]">⚠️ Medicación/Condición: {inspectingSolicitud.perro.illnesses}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                <button
                  type="button"
                  id="btn-modal-aceptar-paseo"
                  onClick={() => {
                    handleAcceptRequest(inspectingSolicitud);
                    setInspectingSolicitud(null);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Aceptar Paseo</span>
                </button>

                <button
                  type="button"
                  id="btn-modal-rechazar-paseo"
                  onClick={() => {
                    handleRejectRequest(inspectingSolicitud);
                    setInspectingSolicitud(null);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Rechazar</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIRMACIÓN DE RECHAZO DE PASEO */}
      <AnimatePresence>
        {rejectionModalTarget && (
          <div key="modal-rejection-backdrop" className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 text-center space-y-4 relative"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl font-bold shadow-xs">
                <X className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  ¿Querés rechazar el paseo de este día?
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Mascota: <strong>{rejectionModalTarget.sol.perro.name}</strong> • Dueño: {rejectionModalTarget.sol.clienteNombre}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  id="btn-cancelar-rechazo"
                  onClick={() => setRejectionModalTarget(null)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  id="btn-confirmar-rechazo-paseo"
                  onClick={handleConfirmRejection}
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs transition-all shadow-xs cursor-pointer"
                >
                  Confirmar Rechazo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE EMERGENCIA / IMPREVISTO EN PASEO ACTIVO */}
      {activeEmergencySolicitud && (
        <EmergencyProtocolModal
          solicitud={
            solicitudes.find(s => s.id === activeEmergencySolicitud.id) || activeEmergencySolicitud
          }
          onClose={() => setActiveEmergencySolicitud(null)}
          onTriggerEmergency={(sol, motivo) => {
            handleTriggerEmergency(sol, motivo);
          }}
          onResolveEmergency={(sol) => {
            handleResolveEmergency(sol);
          }}
        />
      )}

      {/* MODAL TUTORIAL / GUÍA RÁPIDA DEL PASEADOR */}
      <PaseadorTutorialModal
        isOpen={showTutorialModal}
        onClose={() => setShowTutorialModal(false)}
      />
    </div>
  );
};
