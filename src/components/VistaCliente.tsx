import React, { useState, useEffect } from 'react';
import { 
  PlanType, DogProfile, WeekBooking, PaseadorPublico, 
  SolicitudPaseo, UserCliente, UserPaseador, TipoCorrea,
  getEtapaPaseo, EtapaPaseo
} from '../types';
import { 
  PLANES_PASEO, DESCUENTOS_SEMANAS, 
  DOG_SAMPLE_PHOTOS 
} from '../data/initialData';
import { calculateDistanceKm, formatPesos, formatWhatsAppLink, getCleanVeterinariaInfo } from '../utils/geo';
import { 
  getDogSubscription, 
  recordDogPayment, 
  advanceDogWalk, 
  DogSubscriptionState 
} from '../utils/dogSubscriptions';
import { getOrBuildSolicitudDiasDesglose } from '../utils/planCalculations';
import { 
  createMercadoPagoPreference, 
  getMercadoPagoAccessToken, 
  isDummyAccessToken 
} from '../utils/mercadoPago';
import { getAccurateCurrentPosition, DEFAULT_FALLBACK_LOCATION } from '../utils/geolocation';
import { WalkieMap } from './WalkieMap';
import { LocationReferenceBar } from './LocationReferenceBar';
import { DogProfilesManager } from './DogProfilesManager';
import { DogProfileForm } from './DogProfileForm';
import { PlanSelectionCards } from './PlanSelectionCards';
import { ScheduleConfigurator } from './ScheduleConfigurator';
import { FloatingPaymentBar } from './FloatingPaymentBar';
import { CotizadorAssistantModal } from './CotizadorAssistantModal';
import { GarantiaCuidadoCard } from './GarantiaCuidadoCard';
import { NosotrosFaqSection } from './NosotrosFaqSection';
import { MetaSolidariaSection } from './MetaSolidariaSection';
import { WalkerDetailsModal } from './WalkerDetailsModal';
import { RatingPaseoModal } from './RatingPaseoModal';
import { SearchModeSelectionModal } from './SearchModeSelectionModal';
import { CancelacionIndividualModal } from './CancelacionIndividualModal';
import { TemporalWalkChat } from './TemporalWalkChat';
import { ClientePerfilHistorialSection } from './ClientePerfilHistorialSection';
import { WeatherAlertWidget } from './WeatherAlertWidget';
import { GuiaReservaModal } from './GuiaReservaModal';
import { 
  PawPrint, MapPin, Sparkles, CheckCircle2, 
  Clock, Phone, Key, Heart, 
  CreditCard, Check, ShieldCheck, 
  Activity, RefreshCw, FastForward, Play,
  Compass, CheckCircle, XCircle, Dog, Calendar,
  ChevronRight, ArrowRight, ArrowLeft, ShieldAlert, AlertCircle, AlertTriangle,
  Calculator, Award, X, Lock, Home, Copy, Radio, Users, User,
  Camera, MessageCircle, MessageSquare, Navigation, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface VistaClienteProps {
  user: UserCliente | null;
  onOpenAuth: () => void;
  activeTab: 'main' | 'perfil' | 'nosotros_faq' | 'meta_solidaria';
  onSelectTab: (tab: 'main' | 'perfil' | 'nosotros_faq' | 'meta_solidaria') => void;
  solicitudes: SolicitudPaseo[];
  onAddSolicitud: (sol: SolicitudPaseo) => void;
  onUpdateSolicitud?: (sol: SolicitudPaseo) => void;
  solidarityAmount: number;
  onContributeSolidarity: (amount: number) => void;
  userLat: number;
  userLng: number;
  userAddress: string;
  onLocationChange: (lat: number, lng: number, address: string) => void;
  registeredWalkers?: PaseadorPublico[];
  paseadorUser?: UserPaseador | null;
  onSwitchToPaseador?: () => void;
  selectedPlan?: PlanType | null;
  onSelectPlan?: (plan: PlanType) => void;
}

export const VistaCliente: React.FC<VistaClienteProps> = ({
  user,
  paseadorUser,
  onOpenAuth,
  activeTab,
  onSelectTab,
  solicitudes,
  onAddSolicitud,
  onUpdateSolicitud,
  solidarityAmount,
  onContributeSolidarity,
  userLat,
  userLng,
  userAddress,
  onLocationChange,
  registeredWalkers = [],
  onSwitchToPaseador,
  selectedPlan: propSelectedPlan,
  onSelectPlan: propOnSelectPlan
}) => {
  // Client step / mode configurations (Plan starts strictly as null by default)
  const [internalSelectedPlan, setInternalSelectedPlan] = useState<PlanType | null>(null);
  const selectedPlan = propSelectedPlan !== undefined ? propSelectedPlan : internalSelectedPlan;
  const [isWeekConfirmed, setIsWeekConfirmed] = useState<boolean>(false);

  const setSelectedPlan = (plan: PlanType) => {
    setInternalSelectedPlan(plan);
    setIsWeekConfirmed(false);
    if (propOnSelectPlan) propOnSelectPlan(plan);
  };
  const [weeksCount, setWeeksCount] = useState<number>(1);
  const [selectionMode, setSelectionMode] = useState<'automatico' | 'manual'>('automatico');
  const [selectedPaseador, setSelectedPaseador] = useState<PaseadorPublico | null>(null);
  const [inspectingWalker, setInspectingWalker] = useState<PaseadorPublico | null>(null);
  const [activeLocationType, setActiveLocationType] = useState<'actual' | 'fija' | string>('actual');

  // Sincronización inicial de alta precisión por GPS al montar la vista de Cliente
  useEffect(() => {
    let isMounted = true;
    getAccurateCurrentPosition().then((posResult) => {
      if (!isMounted) return;
      if (!posResult.isFallback) {
        const isAtDefault = Math.abs(userLat - DEFAULT_FALLBACK_LOCATION.lat) < 0.001 && Math.abs(userLng - DEFAULT_FALLBACK_LOCATION.lng) < 0.001;
        if (isAtDefault) {
          onLocationChange(posResult.lat, posResult.lng, posResult.address);
          setActiveLocationType('actual');
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Multi-dog profiles management strictly isolated by user.id
  const [dogsList, setDogsList] = useState<DogProfile[]>(() => {
    if (user?.id) {
      const storageKey = `walkie_cliente_perros_lista_${user.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
      if (user.perros && user.perros.length > 0) return user.perros;
    }
    return [];
  });

  const [selectedDogId, setSelectedDogId] = useState<string | null>(() => {
    if (dogsList.length > 0) return dogsList[0].id;
    return null;
  });

  // Modal / Form state for creating or editing a dog profile
  const [editingDogProfile, setEditingDogProfile] = useState<DogProfile | null>(null);
  const [isDogFormOpen, setIsDogFormOpen] = useState<boolean>(false);
  const [showGuestDogModal, setShowGuestDogModal] = useState<boolean>(false);

  // Sync and isolate dogs whenever authenticated user changes (Account Isolation)
  useEffect(() => {
    if (user?.id) {
      const storageKey = `walkie_cliente_perros_lista_${user.id}`;
      let loadedDogs: DogProfile[] = [];
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedDogs = parsed;
          }
        } catch {}
      }

      if (loadedDogs.length === 0 && user.perros && user.perros.length > 0) {
        loadedDogs = user.perros;
        try {
          localStorage.setItem(storageKey, JSON.stringify(loadedDogs));
        } catch {}
      }

      // Legacy fallback migration for primary user
      if (loadedDogs.length === 0 && user.email?.toLowerCase().includes('enrique')) {
        const legacy = localStorage.getItem('walkie_cliente_perros_lista');
        if (legacy) {
          try {
            const parsed = JSON.parse(legacy);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedDogs = parsed;
              localStorage.setItem(storageKey, JSON.stringify(loadedDogs));
            }
          } catch {}
        }
      }

      setDogsList(loadedDogs);
      setSelectedDogId(loadedDogs.length > 0 ? loadedDogs[0].id : null);
    } else {
      // Usuario no autenticado / Modo Invitado: limpiar datos privados
      setDogsList([]);
      setSelectedDogId(null);
    }
  }, [user?.id, user?.email]);

  // Currently selected active dog object
  const activeDog = dogsList.find(d => d.id === selectedDogId) || dogsList[0] || null;

  // Guía de Reserva: Cómo pedir tu paseo modal overlay
  const [isGuiaReservaOpen, setIsGuiaReservaOpen] = useState<boolean>(false);

  // Helper to format countdown timer (MM:SS)
  const formatTimer = (seconds?: number) => {
    const safeSec = Math.max(0, seconds !== undefined ? seconds : 2700);
    const mins = Math.floor(safeSec / 60);
    const secs = safeSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Open Form to add a new dog
  const handleAddNewDog = () => {
    // RESTRICCIÓN MODO INVITADO: Si intenta crear un perro sin estar registrado, abre autenticación
    if (!user) {
      onOpenAuth();
      return;
    }
    // Forzar posicionamiento superior inmediato sin saltos
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
    const photoIndex = dogsList.length % DOG_SAMPLE_PHOTOS.length;
    const newBlankDog: DogProfile = {
      id: `dog-${Date.now()}`,
      name: '',
      age: '',
      breed: '',
      trustedVet: '',
      pickupLocation: userAddress || '',
      illnesses: '',
      temperament: 'Sociable',
      compatibility: '',
      emergencyPhonePrimary: user?.telefono || '',
      emergencyPhoneSecondary: '',
      weightCategory: 'Mediano',
      photoUrl: DOG_SAMPLE_PHOTOS[photoIndex],
      planActivo: undefined
    };
    setEditingDogProfile(newBlankDog);
    setIsDogFormOpen(true);
  };

  // Open Form to edit an existing dog
  const handleEditDog = (dog: DogProfile) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
    setEditingDogProfile(dog);
    setIsDogFormOpen(true);
  };

  // Save dog profile (insert or update) with Account Isolation
  const handleSaveDogProfile = (savedDog: DogProfile) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    const existingSub = getDogSubscription(savedDog.id, savedDog, solicitudes);
    const sanitizedDog: DogProfile = {
      ...savedDog,
      planActivo: existingSub.hasActivePlan && existingSub.planType ? existingSub.planType : undefined
    };

    setDogsList(prev => {
      const existsIndex = prev.findIndex(d => d.id === sanitizedDog.id);
      let next: DogProfile[];
      if (existsIndex >= 0) {
        next = [...prev];
        next[existsIndex] = sanitizedDog;
      } else {
        next = [...prev, sanitizedDog];
      }

      // Persistencia estrictamente aislada por user_id
      if (user?.id) {
        const storageKey = `walkie_cliente_perros_lista_${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(next));
        
        // Sincronizar en objeto usuario local y base de datos
        const updatedUser = { ...user, perros: next };
        localStorage.setItem('walkie_cliente_user', JSON.stringify(updatedUser));
        
        fetch('/api/users/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: user.id,
            role: 'cliente',
            perros: next
          })
        }).catch(() => {});
      }

      return next;
    });
    setSelectedDogId(sanitizedDog.id);
    setIsDogFormOpen(false);
    setEditingDogProfile(null);
    setToastMessage(`Perfil de ${sanitizedDog.name} guardado con éxito.`);

    // 1. SCROLL AUTOMÁTICO SUAVE AL INICIO DE LA SECCIÓN DE PLANES (no hacia la parte superior de la página)
    setTimeout(() => {
      const sec = document.getElementById('seccion-planes-paseo') || document.getElementById('seccion-planes');
      if (sec) {
        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  };

  // Delete dog profile with Account Isolation
  const handleDeleteDog = (dogId: string) => {
    setDogsList(prev => {
      const filtered = prev.filter(d => d.id !== dogId);
      if (user?.id) {
        const storageKey = `walkie_cliente_perros_lista_${user.id}`;
        try {
          localStorage.setItem(storageKey, JSON.stringify(filtered));
          const updatedUser = { ...user, perros: filtered };
          localStorage.setItem('walkie_cliente_user', JSON.stringify(updatedUser));
          fetch('/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: user.id,
              role: 'cliente',
              perros: filtered
            })
          }).catch(() => {});
        } catch (err) {
          console.warn('Error saving dogs list to localStorage:', err);
        }
      }
      if (selectedDogId === dogId) {
        setSelectedDogId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
    setToastMessage('Perfil de mascota eliminado.');
  };

  // Listen for pet add/edit requests triggered from ProfileModal
  useEffect(() => {
    const handleOpenAdd = () => {
      handleAddNewDog();
    };
    const handleOpenEdit = (e: CustomEvent<DogProfile>) => {
      if (e.detail) {
        handleEditDog(e.detail);
      }
    };
    window.addEventListener('walkie_open_add_dog', handleOpenAdd);
    window.addEventListener('walkie_open_edit_dog', handleOpenEdit as EventListener);
    return () => {
      window.removeEventListener('walkie_open_add_dog', handleOpenAdd);
      window.removeEventListener('walkie_open_edit_dog', handleOpenEdit as EventListener);
    };
  }, [dogsList]);

  // Schedule data for weeks
  const planInfo = selectedPlan ? (PLANES_PASEO.find(p => p.tipo === selectedPlan) || null) : null;
  const walksPerWeek = planInfo ? planInfo.paseosPorSemana : 3;

  const [weeksData, setWeeksData] = useState<WeekBooking[]>([
    { weekIndex: 0, weekLabel: 'Semana 1', selectedDays: [], preferredTime: '18:00 hs', extraTimeMinutes: 0, tipoCorrea: 'propia' },
    { weekIndex: 1, weekLabel: 'Semana 2', selectedDays: [], preferredTime: '18:00 hs', extraTimeMinutes: 0, tipoCorrea: 'propia' },
    { weekIndex: 2, weekLabel: 'Semana 3', selectedDays: [], preferredTime: '18:00 hs', extraTimeMinutes: 0, tipoCorrea: 'propia' },
    { weekIndex: 3, weekLabel: 'Semana 4', selectedDays: [], preferredTime: '18:00 hs', extraTimeMinutes: 0, tipoCorrea: 'propia' }
  ]);

  // Adjust days when plan changes: always reset to empty array so user selects manually
  useEffect(() => {
    if (selectedPlan) {
      setWeeksData(prev =>
        prev.map(w => ({
          ...w,
          selectedDays: []
        }))
      );
      setIsWeekConfirmed(false);
    }
  }, [selectedPlan]);

  // Payment modal state (2-step payment gateway demo)
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentStep, setPaymentStep] = useState<1 | 2>(1);
  const [cardNumberInput, setCardNumberInput] = useState<string>('4532 8900 1234 5678');
  const [cardHolderInput, setCardHolderInput] = useState<string>(user ? `${user.nombre} ${user.apellido}`.trim() : 'María González');
  const [cardExpiryInput, setCardExpiryInput] = useState<string>('09/28');
  const [cardCvvInput, setCardCvvInput] = useState<string>('482');
  const [paymentMethod, setPaymentMethod] = useState<'mercadopago' | 'efectivo'>('mercadopago');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mpCheckoutModal, setMpCheckoutModal] = useState<{
    url: string;
    preferenceId?: string;
    total: number;
    plan: string;
    dogName: string;
  } | null>(null);

  // Security & Arrival alert states
  const [dismissPickupAlert, setDismissPickupAlert] = useState<boolean>(false);

  // Equipment & Leash state
  const [tipoCorrea, setTipoCorrea] = useState<TipoCorrea>('propia');
  const [isCotizadorModalOpen, setIsCotizadorModalOpen] = useState<boolean>(false);
  const [showSearchModeModal, setShowSearchModeModal] = useState<boolean>(false);

  // Active dog subscription & payment tracking
  const activeDogSubscription = activeDog ? getDogSubscription(activeDog.id, activeDog, solicitudes) : null;
  const isDogPaidForWeek = !!(activeDogSubscription?.isPaid && !activeDogSubscription?.isCycleCompleted);

  // Calificación del paseo al finalizar
  const [solicitudToRate, setSolicitudToRate] = useState<SolicitudPaseo | null>(null);

  // Modal de Cancelación Individual por Día
  const [solicitudToCancel, setSolicitudToCancel] = useState<SolicitudPaseo | null>(null);

  // Redirigir a selección de planes
  const handleGoToPlans = (dog?: DogProfile) => {
    if (dog) {
      setSelectedDogId(dog.id);
    }
    const sec = document.getElementById('seccion-planes-paseo');
    if (sec) {
      sec.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Detectar automáticamente cuando un paseo pasa a "completada" o "finalizado" para desplegar modal de calificación obligatoria
  useEffect(() => {
    try {
      const reviewedIds: string[] = JSON.parse(localStorage.getItem('walkie_reviewed_solicitudes') || '[]');
      
      const finishedSol = solicitudes.find(s => 
        (s.estado === 'completada' || s.etapaSeguimiento === 'finalizado' || s.etapaPaseo === 'ETAPA_7_PASEO_FINALIZADO') &&
        !reviewedIds.includes(s.id) &&
        (!user || s.clienteId === user.id || s.id.startsWith('sol-own-') || s.id.startsWith('sol-active-client-') || !s.clienteId)
      );

      if (finishedSol && !solicitudToRate) {
        setSolicitudToRate(finishedSol);
      }
    } catch {
      // safe fallback
    }
  }, [solicitudes, user, solicitudToRate]);

  // Listener para evento inmediato de paseo finalizado tras ingresar PIN 2
  useEffect(() => {
    const handleWalkFinalized = (e: any) => {
      const sol = e?.detail;
      if (sol && sol.id) {
        try {
          const reviewedIds: string[] = JSON.parse(localStorage.getItem('walkie_reviewed_solicitudes') || '[]');
          if (!reviewedIds.includes(sol.id)) {
            setSolicitudToRate(sol);
          }
        } catch {
          setSolicitudToRate(sol);
        }
      }
    };
    window.addEventListener('walkie_walk_finalized', handleWalkFinalized);
    return () => window.removeEventListener('walkie_walk_finalized', handleWalkFinalized);
  }, []);

  // Active walk tracking for client
  const activeWalkSolicitud = solicitudes.find(
    s => s.estado === 'pendiente' || s.estado === 'aceptada' || s.estado === 'en_camino' || s.estado === 'en_curso' || s.estado === 'en_emergencia'
  ) || null;

  // STRICT REQUIREMENT:
  // 1. Permanent Notification Banner is shown when estado === 'pendiente' OR 'aceptada' (waiting for walker to start transit)
  const isBannerNotificationActive = activeWalkSolicitud && (activeWalkSolicitud.estado === 'pendiente' || activeWalkSolicitud.estado === 'aceptada');

  // 2. Full Live Tracking Map (with 2 pins & Strava route) is ONLY activated when walker clicked "Yendo a retirar" (estado === 'en_camino' OR 'en_curso' OR 'en_emergencia')
  const isLiveTrackingActive = activeWalkSolicitud && (activeWalkSolicitud.estado === 'en_camino' || activeWalkSolicitud.estado === 'en_curso' || activeWalkSolicitud.estado === 'en_emergencia');

  // 🚨 CICLO DE VIDA DEL BANNER DE EMERGENCIA:
  // 'EMERGENCIA_ACTIVA' | 'EMERGENCIA_SOLUCIONADA' | 'EMERGENCIA_CERRADA'
  const [emergencyBannerStatus, setEmergencyBannerStatus] = useState<'EMERGENCIA_ACTIVA' | 'EMERGENCIA_SOLUCIONADA' | 'EMERGENCIA_CERRADA'>('EMERGENCIA_CERRADA');
  const prevWasEmergencyRef = React.useRef<boolean>(false);

  useEffect(() => {
    const isNowEmergency = Boolean(activeWalkSolicitud && (activeWalkSolicitud.estado === 'en_emergencia' || activeWalkSolicitud.enEmergencia));
    
    if (isNowEmergency) {
      setEmergencyBannerStatus('EMERGENCIA_ACTIVA');
      prevWasEmergencyRef.current = true;
    } else if (prevWasEmergencyRef.current) {
      // Transición automática a EMERGENCIA_SOLUCIONADA
      prevWasEmergencyRef.current = false;
      setEmergencyBannerStatus('EMERGENCIA_SOLUCIONADA');

      const timer = setTimeout(() => {
        setEmergencyBannerStatus('EMERGENCIA_CERRADA');
      }, 4500); // 4.5 segundos para fade-out suave

      return () => clearTimeout(timer);
    }
  }, [activeWalkSolicitud?.estado, activeWalkSolicitud?.enEmergencia]);

  // Manejar resolución de emergencia desde la vista del cliente
  const handleResolveEmergencyFromClient = (sol: SolicitudPaseo) => {
    const updated: SolicitudPaseo = {
      ...sol,
      enEmergencia: false,
      estado: 'en_curso',
      etapaSeguimiento: 'paseo_activo'
    };
    onUpdateSolicitud?.(updated);
    setEmergencyBannerStatus('EMERGENCIA_SOLUCIONADA');
    setToastMessage(`✅ Emergencia / Incidencia solucionada. El paseo de ${sol.perro.name} continúa con normalidad.`);
  };

  // Filter walkers in 10 km: Paseadores registrados en radio de 10 km
  const walkersIn10Km = React.useMemo(() => {
    const allWalkers: PaseadorPublico[] = [...(registeredWalkers || [])];

    if (paseadorUser) {
      const exists = allWalkers.some(w => w.id === paseadorUser.id || (w.email && w.email.toLowerCase() === paseadorUser.email?.toLowerCase()));
      if (!exists) {
        const isAccountActiveSaved = localStorage.getItem('walkie_paseador_cuenta_activa');
        const isAvailable = isAccountActiveSaved !== null ? isAccountActiveSaved === 'true' : (paseadorUser.disponible ?? true);
        allWalkers.unshift({
          id: paseadorUser.id,
          nombre: paseadorUser.nombre,
          apellido: paseadorUser.apellido || '',
          nombreUsuario: paseadorUser.nombreUsuario || `@paseador_${paseadorUser.id.slice(-4)}`,
          fotoPerfil: paseadorUser.fotoPerfil || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
          calificacion: paseadorUser.calificacion || 5.0,
          lat: paseadorUser.lat || -31.4201,
          lng: paseadorUser.lng || -64.4992,
          disponible: isAvailable,
          gpsActivo: isAvailable,
          telefono: paseadorUser.telefono || '',
          totalPaseos: paseadorUser.totalPaseos || 0,
          biografia: paseadorUser.biografia || 'Paseador certificado Walkie'
        });
      }
    }

    return allWalkers.filter(w => {
      // 1. Descartar bots o cuentas mock
      if (w.id.includes('mock') || w.id.includes('fake')) {
        return false;
      }

      // 2. Coordenadas del paseador
      const DEFAULT_LAT = -31.4201;
      const DEFAULT_LNG = -64.4992;
      const wLat = typeof w.lat === 'number' && !isNaN(w.lat) && w.lat !== 0 ? w.lat : DEFAULT_LAT;
      const wLng = typeof w.lng === 'number' && !isNaN(w.lng) && w.lng !== 0 ? w.lng : DEFAULT_LNG;

      // 3. Radio de cobertura estricto de 10 km
      const dist = calculateDistanceKm(userLat, userLng, wLat, wLng);
      return dist <= 10;
    });
  }, [registeredWalkers, paseadorUser, userLat, userLng]);

  // Calculate pricing with strict surcharge rules:
  // 1. Base price
  const totalWalks = weeksCount * walksPerWeek;
  const precioBaseServicio = planInfo ? totalWalks * planInfo.precioUnitario : 0;

  // 2. Extra time surcharge: $1.300 per 15 min fraction per walk
  const safeWeeks = Array.isArray(weeksData) ? weeksData : [];
  const recargoTiempoExtra = safeWeeks.slice(0, weeksCount).reduce((acc, w) => {
    const daysInWeek = w.selectedDays?.length || walksPerWeek;
    const fraction = (w.extraTimeMinutes || 0) / 15;
    return acc + (fraction * 1300 * daysInWeek);
  }, 0);

  // 3. Leash surcharge: $1.000 per day if Walkie, $0 if client's own leash (100% individual per week)
  const recargoCorrea = safeWeeks.slice(0, weeksCount).reduce((acc, w) => {
    const daysInWeek = w.selectedDays?.length || walksPerWeek;
    const isWalkieLeash = (w.tipoCorrea || tipoCorrea) === 'walkie';
    return acc + (isWalkieLeash ? daysInWeek * 1000 : 0);
  }, 0);

  // 4. Discount for continuous weeks
  const discountRate = DESCUENTOS_SEMANAS[weeksCount as keyof typeof DESCUENTOS_SEMANAS] || 0;
  const subtotalSinDescuento = precioBaseServicio + recargoTiempoExtra + recargoCorrea;
  const descuentoMonto = Math.round(subtotalSinDescuento * (discountRate / 100));
  
  // 5. Final total
  const totalCalculated = subtotalSinDescuento - descuentoMonto;

  // Generate 4-digit numeric code
  const generate4DigitCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  // Open Payment & Checkout (2-step gateway)
  const handleOpenPayment = () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!activeDog) {
      handleAddNewDog();
      setToastMessage('Primero agregá los datos de tu perro para poder reservar el paseo.');
      return;
    }

    const safeWeeks = Array.isArray(weeksData) ? weeksData : [];
    const areWeeksComplete = safeWeeks.slice(0, weeksCount).every(w => (w?.selectedDays?.length ?? 0) === walksPerWeek);

    if (!selectedPlan || !areWeeksComplete || !isWeekConfirmed) {
      setToastMessage("Debes configurar y guardar todas las semanas antes de continuar al pago.");
      return;
    }

    setPaymentStep(1);
    setShowPaymentModal(true);
  };

  // Confirm Reservation and Process Payment
  const handleConfirmReservation = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!activeDog) return;
    setIsProcessingPayment(true);

    try {
      const chosenPlan = (selectedPlan || 'Bronce') as PlanType;
      let isSimulatedPayment = true;
      let checkoutInitPoint: string | undefined = undefined;
      let preferenceId: string | undefined = undefined;

      if (paymentMethod === 'mercadopago') {
        const mpResult = await createMercadoPagoPreference({
          planType: chosenPlan,
          totalAmount: totalCalculated,
          weeksCount,
          totalWalks,
          dogId: activeDog.id,
          dogName: activeDog.name,
          userEmail: user?.email,
          userName: user ? `${user.nombre} ${user.apellido}` : undefined,
          userId: user?.id,
          tipoCorrea: tipoCorrea
        });

        if (!mpResult.success && !mpResult.isSimulation) {
          setIsProcessingPayment(false);
          setToastMessage(`⚠️ Mercado Pago: ${mpResult.error || 'No se pudo generar el checkout'}. Podés reintentar.`);
          return;
        }

        isSimulatedPayment = mpResult.isSimulation;
        checkoutInitPoint = mpResult.initPoint;
        preferenceId = mpResult.preferenceId;
      } else {
        // Efectivo contraentrega
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      const code1 = generate4DigitCode();
      const code2 = generate4DigitCode();

      // 1. Registrar el pago del ciclo semanal para activar el plan y actualizar el progreso
      recordDogPayment(activeDog.id, activeDog.name, chosenPlan, walksPerWeek);

      // 2. Sincronizar el planActivo en el perfil del perro
      const dogWithPlan: DogProfile = {
        ...activeDog,
        planActivo: chosenPlan
      };

      setDogsList(prev => {
        const next = prev.map(d => (d.id === activeDog.id ? dogWithPlan : d));
        localStorage.setItem('walkie_cliente_perros_lista', JSON.stringify(next));
        return next;
      });

      // 3. Crear solicitud con desglose automático de días individuales y PINs de 4 dígitos
      const preliminarySolicitud: Partial<SolicitudPaseo> = {
        id: `sol-${Date.now()}`,
        clienteId: user?.id || `anon-cliente-${Date.now()}`,
        clienteNombre: user ? `${user.nombre} ${user.apellido}` : 'Cliente Walkie',
        clienteTelefono: user?.telefono || '+54 9 3548 456789',
        perro: dogWithPlan,
        tipoPlan: chosenPlan,
        duracionMinutos: 45,
        incluyeGps: true,
        incluyeFotos: true,
        semanasCantidad: weeksCount,
        descuentoPorcentaje: discountRate,
        semanas: weeksData.slice(0, weeksCount),
        diasSeleccionados: weeksData[0]?.selectedDays || ['Lunes', 'Miércoles', 'Viernes'],
        turno: 'tarde',
        tipoCorrea: tipoCorrea,
        precioBaseServicio: precioBaseServicio,
        recargoTiempoExtra: recargoTiempoExtra,
        recargoCorrea: recargoCorrea,
        ubicacion: {
          direccion: userAddress || 'La Cumbre, Córdoba',
          lat: userLat,
          lng: userLng
        },
        modoSeleccion: selectionMode,
        estado: selectedPaseador ? 'aceptada' : 'pendiente',
        etapaSeguimiento: 'esperando',
        montoTotal: totalCalculated,
        montoNetoPaseador: Math.round(totalCalculated * 0.8),
        codigoInicio: code1,
        codigoFin: code2,
        paseadorId: selectedPaseador?.id,
        paseadorNombre: selectedPaseador ? `${selectedPaseador.nombre} ${selectedPaseador.apellido}` : undefined,
        paseadorFoto: selectedPaseador?.fotoPerfil,
        paseadorTelefono: selectedPaseador?.telefono,
        paseadorCoords: selectedPaseador ? { lat: selectedPaseador.lat, lng: selectedPaseador.lng } : undefined,
        fechaCreacion: new Date().toISOString(),
        fechaProgramada: new Date().toISOString().split('T')[0],
        fotosRecorrido: [],
        precioBasePaseo: precioBaseServicio,
        precioTotalConRecargos: totalCalculated
      };

      const diasDesglose = getOrBuildSolicitudDiasDesglose(preliminarySolicitud);

      const newSolicitud: SolicitudPaseo = {
        ...(preliminarySolicitud as SolicitudPaseo),
        diasDesglose: diasDesglose
      };

      onAddSolicitud(newSolicitud);
      setIsProcessingPayment(false);
      setShowPaymentModal(false);

      if (checkoutInitPoint) {
        let openedDirectly = false;
        try {
          const w = window.open(checkoutInitPoint, '_blank');
          if (w) openedDirectly = true;
        } catch (e) {
          console.warn('Popup blocked by browser or iframe:', e);
        }

        setMpCheckoutModal({
          url: checkoutInitPoint,
          preferenceId: preferenceId,
          total: totalCalculated,
          plan: chosenPlan,
          dogName: activeDog.name
        });

        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setToastMessage(
          openedDirectly
            ? '¡Preferencia creada! Abriendo Checkout Pro de Mercado Pago (Sandbox)...'
            : '¡Preferencia creada! Presiona en el botón de Mercado Pago para pagar en modo prueba.'
        );
      } else {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setShowSearchModeModal(true);
        setToastMessage(
          paymentMethod === 'mercadopago'
            ? `¡Pago aprobado por Mercado Pago! Plan ${chosenPlan} activado para ${activeDog.name}.`
            : selectedPaseador
            ? `¡Reserva creada con ${selectedPaseador.nombre}! Notificando asignación.`
            : `¡Reserva iniciada! Notificando a paseadores activos en el radar de 10 km.`
        );
      }
    } catch (error) {
      console.error('Error al procesar reserva:', error);
      setIsProcessingPayment(false);
      setToastMessage('Ocurrió un inconveniente al procesar la reserva. Por favor intentá nuevamente.');
    }
  };

  // Calculate remaining seconds for 10-minute wait (600 seconds)
  const calculateWaitTimeRemainingSec = (sol: SolicitudPaseo): number => {
    if (!sol.inicioEsperaRetornoTimestamp) return 600;
    const elapsed = Math.floor((Date.now() - sol.inicioEsperaRetornoTimestamp) / 1000);
    return Math.max(0, 600 - elapsed);
  };

  const formatWaitTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Simular llegada del paseador a la puerta para retiro (Transición de ETAPA 1 a ETAPA 2)
  const handleSimulateWalkerArrivalAtPickupDoor = (sol: SolicitudPaseo) => {
    const updated: SolicitudPaseo = {
      ...sol,
      estado: 'en_camino',
      etapaPaseo: 'ETAPA_2_LLEGA_RETIRO',
      etapaSeguimiento: 'en_domicilio',
      avisoLlegadaRetiro: true
    };
    onUpdateSolicitud?.(updated);
    setToastMessage(`📍 ¡Paseador en la puerta! El PIN 1 de retiro se ha habilitado para iniciar el paseo.`);
  };

  // Confirm return arrival: YES -> Cambia a ETAPA_6_MOSTRAR_PIN_DEVOLUCION (revela PIN 2)
  const handleConfirmReturnArrivalYes = (sol: SolicitudPaseo) => {
    const updated: SolicitudPaseo = {
      ...sol,
      etapaPaseo: 'ETAPA_6_MOSTRAR_PIN_DEVOLUCION',
      confirmacionRetornoCliente: 'confirmado_si',
      avisoLlegadaRetorno: true,
      etapaSeguimiento: 'en_domicilio_retorno'
    };
    onUpdateSolicitud?.(updated);
    setToastMessage(`✅ ¡Confirmaste la llegada de ${sol.perro.name}! Entregale el PIN 2 (${sol.codigoFin}) al paseador.`);
  };

  // Confirm return arrival: NO -> Permanece en ETAPA_5_CONFIRMACION_CLIENTE_ENTREGA con PIN 2 oculto y habilita contacto directo
  const handleConfirmReturnArrivalNo = (sol: SolicitudPaseo) => {
    const updated: SolicitudPaseo = {
      ...sol,
      etapaPaseo: 'ETAPA_5_CONFIRMACION_CLIENTE_ENTREGA',
      confirmacionRetornoCliente: 'rechazado_no',
      inicioEsperaRetornoTimestamp: Date.now(),
      avisoLlegadaRetorno: true,
      etapaSeguimiento: 'en_domicilio_retorno'
    };
    onUpdateSolicitud?.(updated);
    setToastMessage(`📞 El paseador aún no figura en tu puerta. Podés contactarlo o llamarlo directamente.`);
  };

  // Reintentar o reabrir consulta de confirmación de entrega (ETAPA_5)
  const handleRetryReturnArrival = (sol: SolicitudPaseo) => {
    const updated: SolicitudPaseo = {
      ...sol,
      etapaPaseo: 'ETAPA_5_CONFIRMACION_CLIENTE_ENTREGA',
      confirmacionRetornoCliente: 'pendiente',
      avisoLlegadaRetorno: true,
      etapaSeguimiento: 'en_domicilio_retorno'
    };
    onUpdateSolicitud?.(updated);
  };

  // Simulate Walker arriving & entering Code 1 (Starts 45 min countdown -> ETAPA_3)
  const handleSimulateWalkerArrivalAndCode1 = (sol: SolicitudPaseo) => {
    const updated: SolicitudPaseo = {
      ...sol,
      estado: 'en_curso',
      etapaPaseo: 'ETAPA_3_PASEO_EN_CURSO',
      etapaSeguimiento: 'paseo_activo',
      avisoLlegadaRetiro: false,
      horaInicio: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tiempoRestanteSegundos: 2700,
      temporizadorIniciado: true,
      temporizadorFinalizado: false,
      recorridoGps: [
        { lat: userLat, lng: userLng },
        { lat: userLat + 0.001, lng: userLng + 0.001 }
      ]
    };
    onUpdateSolicitud?.(updated);
    setToastMessage(`¡Paseador validó el Código 1! El cronómetro de 45 minutos inició en reversa.`);
  };

  // Simulate Fast-Forward Timer (Finish 45 min walk & arrive at return door -> ETAPA_5)
  const handleSimulateFinishTimer = (sol: SolicitudPaseo) => {
    const updated: SolicitudPaseo = {
      ...sol,
      tiempoRestanteSegundos: 0,
      temporizadorFinalizado: true,
      etapaPaseo: 'ETAPA_5_CONFIRMACION_CLIENTE_ENTREGA',
      etapaSeguimiento: 'en_domicilio_retorno',
      avisoLlegadaRetorno: true,
      confirmacionRetornoCliente: sol.confirmacionRetornoCliente === 'confirmado_si' ? 'confirmado_si' : 'pendiente'
    };
    onUpdateSolicitud?.(updated);
    setToastMessage(`⚡ 45 min de recorrido concluidos. El paseador llegó para la entrega de ${sol.perro.name}.`);
  };

  // Finish Walk & Release Payment with Code 2 -> ETAPA_7
  const handleCompleteWalkWithCode2 = (sol: SolicitudPaseo) => {
    const updated: SolicitudPaseo = {
      ...sol,
      estado: 'completada',
      etapaPaseo: 'ETAPA_7_PASEO_FINALIZADO',
      etapaSeguimiento: 'finalizado',
      horaFin: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tiempoRestanteSegundos: 0,
      temporizadorFinalizado: true,
      avisoLlegadaRetorno: false
    };
    onUpdateSolicitud?.(updated);
    onContributeSolidarity(500);

    // Eliminar y cerrar el chat temporal de paseo
    try {
      localStorage.removeItem(`walkie_chat_${sol.id}`);
      window.dispatchEvent(new CustomEvent('walkie_chat_update', { detail: { solicitudId: sol.id, messages: [] } }));
    } catch (e) {
      console.error(e);
    }

    // Desplegar automáticamente el modal de calificación al cliente
    setSolicitudToRate(updated);

    // Avanzar contador semanal y reactivar pago si se completa el ciclo
    if (sol.perro?.id) {
      const advanced = advanceDogWalk(sol.perro.id);
      if (advanced.isCycleCompleted) {
        setToastMessage(
          `🎉 ¡${sol.perro.name} completó todos los paseos semanales (${advanced.totalWeeklyWalks}/${advanced.totalWeeklyWalks})! La opción de pago se ha reactivado automáticamente.`
        );
      } else {
        setToastMessage(
          `¡Paseo completado! Progreso semanal de ${sol.perro.name}: ${advanced.completedWalks}/${advanced.totalWeeklyWalks} completados.`
        );
      }
    } else {
      setToastMessage(`¡Paseo completado exitosamente! Pago liberado al paseador.`);
    }

    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
  };

  const handleCancelSolicitud = (solId: string) => {
    const found = solicitudes.find(s => s.id === solId);
    if (found) {
      setSolicitudToCancel(found);
    }
  };

  if (activeTab === 'perfil') {
    return (
      <ClientePerfilHistorialSection
        user={user}
        solicitudes={solicitudes}
        registeredWalkers={registeredWalkers}
        onOpenAuth={onOpenAuth}
        onReturnToMain={() => onSelectTab('main')}
        onAddNewDog={handleAddNewDog}
        onOpenProfileModal={() => {
          window.dispatchEvent(new CustomEvent('walkie_open_profile_modal'));
        }}
      />
    );
  }

  if (activeTab === 'nosotros_faq') {
    return (
      <NosotrosFaqSection
        solidarityAmount={solidarityAmount}
        onOpenSolidarityTab={() => onSelectTab('meta_solidaria')}
        onClose={() => onSelectTab('main')}
        returnButtonLabel="← Volver al Panel de Cliente"
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
        returnButtonLabel="← Volver al Panel de Cliente"
      />
    );
  }

  return (
    <div id="vista-cliente-container" className="pb-24 space-y-4 sm:space-y-5 max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-[9990] max-w-sm bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-emerald-500/80 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 🧭 BARRA DE NAVEGACIÓN SUPERIOR DEL CLIENTE */}
      <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          {/* Botón verde a la izquierda: 'Mis Paseos y Reservas' con ícono de huella */}
          <button
            type="button"
            id="btn-cliente-subtab-paseos"
            onClick={() => onSelectTab('main')}
            className="py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
          >
            <PawPrint className="w-4 h-4" />
            <span>Mis Paseos y Reservas</span>
          </button>

          {/* Enlace de texto '¿Cómo funciona?' con ícono de pregunta directamente a la derecha */}
          <button
            type="button"
            id="btn-como-funciona-guia"
            onClick={() => setIsGuiaReservaOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-emerald-700 transition-colors cursor-pointer px-2.5 py-1.5 rounded-xl hover:bg-slate-100"
            title="Ver Guía de Reserva: Cómo pedir tu paseo"
          >
            <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>¿Cómo funciona?</span>
          </button>
        </div>
      </div>

      {/* BANNER CLARO: TODO LISTO PARA CONFIRMAR PAGO */}
      {isWeekConfirmed && !isDogPaidForWeek && selectedPlan && !isLiveTrackingActive && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          id="banner-todo-listo-pagar"
          className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-3.5 sm:p-4 rounded-2xl shadow-lg border border-emerald-400 flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-white text-emerald-700 flex items-center justify-center font-black text-lg shrink-0 shadow-sm mx-auto sm:mx-0">
              ✓
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 block">
                Semana configurada y guardada
              </span>
              <h3 className="text-sm sm:text-base font-black text-white leading-tight">
                Todo listo para confirmar. Presiona Pagar con Mercado Pago para finalizar
              </h3>
            </div>
          </div>
          <button
            type="button"
            id="btn-banner-proceder-pago"
            onClick={handleOpenPayment}
            className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-slate-950 hover:bg-slate-900 active:scale-95 text-white font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>Pagar con Mercado Pago ({formatPesos(totalCalculated)})</span>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
          </button>
        </motion.div>
      )}

      {/* 🔔 MODAL ELEGANTE CENTRADO: AVISO DE LLEGADA DEL PASEADOR (PIN 1) */}
      <AnimatePresence>
        {activeWalkSolicitud && 
         activeWalkSolicitud.estado === 'en_camino' && 
         (activeWalkSolicitud.etapaSeguimiento === 'en_domicilio' || activeWalkSolicitud.avisoLlegadaRetiro) && 
         !dismissPickupAlert && (
          <div 
            key="modal-aviso-pin-llegada-overlay"
            id="modal-aviso-pin-llegada-overlay"
            className="fixed inset-0 z-[9990] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              id="modal-aviso-pin-llegada"
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 text-center space-y-5"
            >
              {/* Ícono Distintivo de Llave / Seguridad */}
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border-2 border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto shadow-sm animate-pulse">
                <Key className="w-8 h-8" />
              </div>

              {/* Títulos Claros */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-900 px-3 py-0.5 rounded-full inline-block">
                  Seguridad Walkie
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  ¡El paseador está en tu puerta!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-xs mx-auto">
                  Dictale este PIN a <strong className="text-slate-900 font-black">{activeWalkSolicitud.paseadorNombre || 'tu paseador'}</strong> para autorizar el retiro e iniciar los 45 min de paseo:
                </p>
              </div>

              {/* Código PIN en Números Grandes y Limpios */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-center space-y-1 shadow-inner">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">
                  CÓDIGO PIN DE RETIRO
                </span>
                <div className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-white">
                  {activeWalkSolicitud.codigoInicio}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] text-slate-400 font-medium">
                  Este aviso se cerrará automáticamente cuando el paseador valide el código en su teléfono.
                </p>
                <button
                  type="button"
                  onClick={() => setDismissPickupAlert(true)}
                  className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
                >
                  Entendido / Minimizar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIGURADOR PRINCIPAL Y MONITOREO DINÁMICO */}
      <div className="space-y-4 sm:space-y-5">
          {/* 🚨 BANNER SUPERIOR DINÁMICO: PROTOCOLO DE EMERGENCIA CON CICLO DE VIDA (ACTIVA / SOLUCIONADA / CERRADA) 🚨 */}
          <AnimatePresence>
            {emergencyBannerStatus === 'EMERGENCIA_ACTIVA' && activeWalkSolicitud && (
              <motion.div
                key="banner-emergencia-activa"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.4 } }}
                id="banner-superior-emergencia-cliente"
                className="bg-gradient-to-r from-red-600 via-red-700 to-amber-600 text-white p-4 sm:p-5 rounded-3xl shadow-2xl border-2 border-amber-300 space-y-3.5"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/20 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white text-red-600 flex items-center justify-center font-bold text-xl shadow-md shrink-0 animate-bounce">
                      🚨
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-black/30 text-amber-200 px-2.5 py-0.5 rounded-full inline-block mb-0.5">
                        PROTOCOLO DE EMERGENCIA ACTIVO
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                        Emergencia en Paseo de {activeWalkSolicitud.perro.name}
                      </h3>
                      <p className="text-xs text-red-100 font-medium">
                        El GPS sigue transmitiendo en vivo la ubicación del paseador ({activeWalkSolicitud.paseadorNombre || 'Paseador'}).
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleResolveEmergencyFromClient(activeWalkSolicitud)}
                    className="py-2 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
                    title="Marcar incidencia como resuelta y volver a paseo normal"
                  >
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>Marcar Solucionado</span>
                  </button>
                </div>

                <div className="bg-black/40 border border-white/20 rounded-2xl p-4 sm:p-5 text-center space-y-2">
                  <p className="text-xs sm:text-sm font-black text-amber-200 uppercase tracking-wide">
                    PARA FINALIZAR LA EMERGENCIA: Entrega al paseador el PIN de seguridad una vez que tengas a tu perro:
                  </p>
                  <div className="inline-block bg-white text-slate-950 px-6 sm:px-8 py-2.5 rounded-2xl shadow-xl">
                    <span className="text-3xl sm:text-5xl font-black font-mono tracking-widest text-red-600">
                      {activeWalkSolicitud.codigoFin || activeWalkSolicitud.codigoInicio || '5821'}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-red-100 font-medium">
                    El paseador ingresará este PIN en su app para confirmar la devolución segura de {activeWalkSolicitud.perro.name} y dar por finalizado el servicio.
                  </p>
                </div>
              </motion.div>
            )}

            {emergencyBannerStatus === 'EMERGENCIA_SOLUCIONADA' && (
              <motion.div
                key="banner-emergencia-solucionada"
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.6 } }}
                id="banner-superior-emergencia-solucionada"
                className="bg-emerald-50 border-2 border-emerald-500 text-emerald-950 p-4 sm:p-4.5 rounded-3xl shadow-lg flex items-center justify-between gap-3 animate-in fade-in"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                      ESTADO NORMALIZADO
                    </span>
                    <h3 className="text-sm sm:text-base font-black text-emerald-950">
                      Emergencia / Incidencia Solucionada • El paseo continúa con normalidad
                    </h3>
                    <p className="text-xs text-emerald-800">
                      {activeWalkSolicitud ? `El paseo de ${activeWalkSolicitud.perro.name} sigue activo con monitoreo en vivo.` : 'Paseo activo y seguro.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full font-bold hidden sm:inline-block">
                    Cerrando automáticamente...
                  </span>
                  <button
                    type="button"
                    onClick={() => setEmergencyBannerStatus('EMERGENCIA_CERRADA')}
                    className="p-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold cursor-pointer transition-colors"
                    title="Cerrar aviso ahora"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 🌟 LIVE TRACKING VIEW (ACTIVATED ONLY WHEN PASEADOR IS "YENDO A RETIRAR" OR "EN CURSO") 🌟 */}
          {isLiveTrackingActive && activeWalkSolicitud && (
            <motion.section
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              id="seccion-seguimiento-en-vivo"
              className="bg-white rounded-3xl p-4 sm:p-6 border-2 border-emerald-500/80 shadow-xl relative overflow-hidden"
            >
              {/* LAYOUT DE GRILLA DE 2 COLUMNAS (CONTROLES A LA IZQUIERDA, MAPA/CHAT A LA DERECHA) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6 items-stretch">
                
                {/* ============================================================ */}
                {/* COLUMNA IZQUIERDA: CONTROLES OPERATIVOS Y ESTADOS            */}
                {/* ============================================================ */}
                <div className="flex flex-col space-y-4">
                  {/* Header Monitor */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          Seguimiento GPS en Tiempo Real Walkie
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCancelSolicitud(activeWalkSolicitud.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                      >
                        ✕ Cancelar
                      </button>
                    </div>

                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                        <span>Paseo de {activeWalkSolicitud.perro.name}</span>
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-slate-900 text-emerald-400">
                          Plan {activeWalkSolicitud.tipoPlan}
                        </span>
                      </h2>
                      <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>Punto de retiro: <strong className="text-slate-900">{activeWalkSolicitud.ubicacion.direccion}</strong></span>
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                      {activeWalkSolicitud.estado === 'en_camino' && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xs">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Paseador en Camino</span>
                        </div>
                      )}

                      {activeWalkSolicitud.estado === 'en_curso' && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-600 text-white font-bold text-xs shadow-2xs animate-pulse">
                          <Activity className="w-3.5 h-3.5" />
                          <span>Paseo Activo (45 min)</span>
                        </div>
                      )}

                      {(activeWalkSolicitud.estado === 'en_emergencia' || activeWalkSolicitud.enEmergencia) && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-600 text-white font-bold text-xs shadow-2xs animate-bounce">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-200" />
                          <span>🚨 En Emergencia</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ALERTA DE EMERGENCIA PARA EL CLIENTE / DUEÑO */}
                  {(activeWalkSolicitud.estado === 'en_emergencia' || activeWalkSolicitud.enEmergencia) && (
                    <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-4 text-red-950 space-y-3 animate-in fade-in duration-200 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md">
                            <AlertTriangle className="w-5 h-5 animate-pulse" />
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-red-700 block">
                              PROTOCOLO DE EMERGENCIA ACTIVADO
                            </span>
                            <h3 className="text-sm sm:text-base font-black text-red-950">
                              {activeWalkSolicitud.motivoEmergencia || 'Imprevisto reportado por el paseador'}
                            </h3>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-red-900 font-medium">
                        El paseador activó el protocolo para salvaguardar a <strong>{activeWalkSolicitud.perro.name}</strong>. Se ha activado la ruta prioritaria a la veterinaria más cercana y el equipo de soporte está informado.
                      </p>

                      {(() => {
                        const vetInfo = getCleanVeterinariaInfo(activeWalkSolicitud.datosEmergencia?.veterinariaNombre || activeWalkSolicitud.perro.trustedVet);
                        const vetName = vetInfo.nombre;
                        const vetAddress = vetInfo.direccion;
                        const vetPhone = activeWalkSolicitud.datosEmergencia?.veterinariaTelefono || activeWalkSolicitud.perro.emergencyPhonePrimary || vetInfo.telefono || '+54 9 3541 421000';

                        return (
                          <>
                            <div className="bg-white/90 p-3 rounded-xl border border-red-200 space-y-1.5 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Veterinaria asignada:</span>
                                <strong className="text-slate-900 font-bold">
                                  {vetName}
                                </strong>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Dirección física:</span>
                                <span className="text-slate-800 font-semibold">
                                  {vetAddress}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  window.open(formatWhatsAppLink(vetPhone, `Hola, soy el dueño de ${activeWalkSolicitud.perro.name}. Consulto por el estado en emergencia en Walkie.`), '_blank');
                                }}
                                className="py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>Contactar Veterinaria (WhatsApp)</span>
                              </button>

                              {activeWalkSolicitud.paseadorTelefono && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    window.open(formatWhatsAppLink(activeWalkSolicitud.paseadorTelefono, `Hola ${activeWalkSolicitud.paseadorNombre || 'paseador'}, soy el dueño de ${activeWalkSolicitud.perro.name}. ¿Cómo están?`), '_blank');
                                  }}
                                  className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                                >
                                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Contactar Paseador (WhatsApp)</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleResolveEmergencyFromClient(activeWalkSolicitud)}
                                className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Marcar Emergencia Solucionada</span>
                              </button>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* EVALUACIÓN DE ETAPA DE PASEO EXPLÍCITA (ETAPAS 1 A 7) */}
                  {(() => {
                    const etapaActual = getEtapaPaseo(activeWalkSolicitud);

                    return (
                      <>
                        {/* 🚶 ETAPA 1 Y ETAPA 2: FASE DE RETIRO (EN CAMINO Y EN PUERTA) */}
                        {(etapaActual === 'ETAPA_1_EN_CAMINO_RETIRO' || etapaActual === 'ETAPA_2_LLEGA_RETIRO') && (
                          <>
                            {/* FICHA DEL PASEADOR */}
                            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xs space-y-3 border border-slate-800">
                              <div className="flex items-center gap-3">
                                <img
                                  src={activeWalkSolicitud.paseadorFoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'}
                                  alt={activeWalkSolicitud.paseadorNombre}
                                  className="w-12 h-12 rounded-xl object-cover border border-emerald-400 shadow-2xs shrink-0"
                                />
                                <div className="space-y-0.5 flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold truncate">{activeWalkSolicitud.paseadorNombre || 'Paseador Oficial'}</h3>
                                    <span className="bg-emerald-500/30 text-emerald-300 text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0">
                                      {etapaActual === 'ETAPA_2_LLEGA_RETIRO' ? 'En tu Puerta' : 'En Tránsito'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-300">
                                    {etapaActual === 'ETAPA_2_LLEGA_RETIRO'
                                      ? `¡Llegó a tu domicilio para retirar a ${activeWalkSolicitud.perro.name}!`
                                      : `Yendo a retirar a ${activeWalkSolicitud.perro.name} a tu domicilio.`}
                                  </p>
                                  <div className="flex items-center gap-2 pt-0.5 text-[11px] text-emerald-300 font-medium">
                                    <span>Distancia: ~0.8 km</span>
                                    <span>•</span>
                                    <span>Tiempo estimado: ~3 min</span>
                                  </div>
                                </div>
                              </div>

                              {activeWalkSolicitud.paseadorTelefono && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    window.open(formatWhatsAppLink(activeWalkSolicitud.paseadorTelefono, `Hola ${activeWalkSolicitud.paseadorNombre || 'paseador'}, te contacto por el retiro de ${activeWalkSolicitud.perro.name}.`), '_blank');
                                  }}
                                  className="w-full py-2.5 px-3.5 rounded-xl bg-white text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 shadow hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>WhatsApp Paseador</span>
                                </button>
                              )}
                            </div>

                            {/* 🔑 PIN 1 DE RETIRO: Se muestra DIRECTAMENTE en ETAPA 2 (sin preguntas) */}
                            {etapaActual === 'ETAPA_2_LLEGA_RETIRO' ? (
                              <div className="bg-emerald-50/95 p-4 rounded-2xl border-2 border-emerald-400 shadow-md space-y-3 animate-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-2xs">
                                      <Key className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                                        ¡Paseador en tu Puerta!
                                      </span>
                                      <p className="text-xs text-emerald-950 font-semibold">
                                        Entregale este PIN 1 de retiro al paseador:
                                      </p>
                                    </div>
                                  </div>

                                  <div className="bg-white px-3 py-1.5 rounded-xl border border-emerald-400 shadow-2xs text-center shrink-0">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">PIN 1 RETIRO</span>
                                    <span className="text-2xl font-bold text-emerald-700 tracking-wider font-mono">
                                      {activeWalkSolicitud.codigoInicio}
                                    </span>
                                  </div>
                                </div>

                                <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2">
                                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                  <p className="text-[11px] leading-relaxed">
                                    <strong>Seguridad de Inicio:</strong> Dictale este PIN de 4 dígitos al paseador en la puerta para iniciar oficialmente el paseo de 45 minutos.
                                  </p>
                                </div>
                              </div>
                            ) : (
                              /* EN TRÁNSITO (ETAPA 1) -> PIN 1 RESGUARDADO */
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Key className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="text-[11px] leading-tight truncate">PIN 1 resguardado hasta que el paseador llegue a tu puerta.</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-mono font-bold text-slate-400">••••</span>
                                  <button
                                    type="button"
                                    onClick={() => handleSimulateWalkerArrivalAtPickupDoor(activeWalkSolicitud)}
                                    className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold cursor-pointer"
                                    title="Simular llegada del paseador a la puerta"
                                  >
                                    Simular Llegada
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* 🛡️ TARJETA DE GARANTÍA WALKIE Y CARACTERÍSTICAS DEL SERVICIO EN VIVO 🛡️ */}
                            <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 space-y-3 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs shrink-0">
                                    <ShieldCheck className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                                      Garantía Walkie • Tu Paseo Seguro
                                    </h4>
                                    <span className="text-[10px] text-emerald-800 font-semibold">
                                      Monitoreo y protección activa en cada paso
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs shrink-0">
                                  ✓ Oficial
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                                {/* a) GPS en Vivo */}
                                <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex items-start gap-2 shadow-2xs">
                                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs shrink-0 mt-0.5">
                                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-[11px] font-black text-slate-900 leading-tight">📍 GPS en Vivo</div>
                                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">Seguimiento en tiempo real de la ruta.</div>
                                  </div>
                                </div>

                                {/* b) Fotos en Vivo */}
                                <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex items-start gap-2 shadow-2xs">
                                  <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center text-xs shrink-0 mt-0.5">
                                    <Camera className="w-3.5 h-3.5 text-sky-700" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-[11px] font-black text-slate-900 leading-tight">📸 Fotos en Vivo</div>
                                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">Reportes visuales durante el recorrido.</div>
                                  </div>
                                </div>

                                {/* c) Paseadores Certificados */}
                                <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex items-start gap-2 shadow-2xs">
                                  <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xs shrink-0 mt-0.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-[11px] font-black text-slate-900 leading-tight">🛡️ Paseadores Certificados</div>
                                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">Perfil verificado y calificado.</div>
                                  </div>
                                </div>

                                {/* d) Chat Directo */}
                                <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex items-start gap-2 shadow-2xs">
                                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs shrink-0 mt-0.5">
                                    <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-[11px] font-black text-slate-900 leading-tight">💬 Chat Directo</div>
                                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">Comunicación fluida y canal seguro.</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {/* 🐾 ETAPA 3, 4, 5, 6: PASEO EN CURSO Y FASE DE DEVOLUCIÓN */}
                        {(etapaActual === 'ETAPA_3_PASEO_EN_CURSO' || 
                          etapaActual === 'ETAPA_4_LLEGA_DEVOLUCION' || 
                          etapaActual === 'ETAPA_5_CONFIRMACION_CLIENTE_ENTREGA' || 
                          etapaActual === 'ETAPA_6_MOSTRAR_PIN_DEVOLUCION') && (
                          <div className="space-y-3">
                            {/* BLOQUE DE CRONÓMETRO 45 MIN */}
                            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xs space-y-3 border border-slate-800">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg font-bold shadow shrink-0">
                                  <Clock className="w-5 h-5 animate-spin" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                                    Temporizador 45 Minutos en Marcha
                                  </span>
                                  <h3 className="text-sm sm:text-base font-bold truncate">
                                    Paseo Recreativo de {activeWalkSolicitud.perro.name}
                                  </h3>
                                  <p className="text-xs text-slate-400">
                                    Transmitiendo ruta Strava y fotos en vivo.
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-3 bg-black/60 p-3 rounded-xl border border-white/10">
                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">TIEMPO RESTANTE</span>
                                  <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
                                    {formatTimer(activeWalkSolicitud.tiempoRestanteSegundos)}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleSimulateFinishTimer(activeWalkSolicitud)}
                                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                  title="Simular fin de los 45 minutos y llegada de retorno"
                                >
                                  <FastForward className="w-3.5 h-3.5" />
                                  <span>Simular Retorno</span>
                                </button>
                              </div>
                            </div>

                            {/* ❓ ETAPA 5: CONFIRMACIÓN DE ENTREGA AL CLIENTE (PIN 2 OCULTO) */}
                            {etapaActual === 'ETAPA_5_CONFIRMACION_CLIENTE_ENTREGA' && (
                              <div className="space-y-3">
                                {activeWalkSolicitud.confirmacionRetornoCliente === 'rechazado_no' ? (
                                  /* RESPUESTA "NO / AÚN NO LO VEO" -> OPCIONES DE CONTACTO INMEDIATO Y REINTENTO */
                                  <div className="bg-amber-50 p-4 rounded-2xl border-2 border-amber-300 shadow-md space-y-3 animate-in fade-in duration-200">
                                    <div className="flex items-start gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow">
                                        <Phone className="w-5 h-5 text-slate-950" />
                                      </div>
                                      <div className="space-y-0.5 flex-1 min-w-0">
                                        <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider block">
                                          Aviso de Espera Activo
                                        </span>
                                        <h4 className="text-xs sm:text-sm font-black text-amber-950 leading-snug">
                                          El paseador aún no figura en tu puerta. Podés contactarlo directamente:
                                        </h4>
                                        <p className="text-[11px] text-amber-900 leading-tight">
                                          El PIN 2 de entrega permanece resguardado. Seguí su ubicación en vivo en el mapa.
                                        </p>
                                      </div>
                                    </div>

                                    {/* 📞 BOTONES DE CONTACTO DIRECTO HABILITADOS */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-amber-200">
                                      <a
                                        href={`tel:${activeWalkSolicitud.paseadorTelefono || '+5493548000000'}`}
                                        id="btn-llamar-paseador-directo"
                                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow cursor-pointer transition-all active:scale-98 text-center"
                                      >
                                        <Phone className="w-4 h-4 shrink-0" />
                                        <span>📞 Llamar por Teléfono</span>
                                      </a>

                                      <button
                                        type="button"
                                        id="btn-whatsapp-paseador-directo"
                                        onClick={() => {
                                          window.open(
                                            formatWhatsAppLink(
                                              activeWalkSolicitud.paseadorTelefono,
                                              `Hola ${activeWalkSolicitud.paseadorNombre || 'paseador'}, te escribo porque aún no te veo en la puerta para la entrega de ${activeWalkSolicitud.perro.name}.`
                                            ),
                                            '_blank'
                                          );
                                        }}
                                        className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-300 shadow flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 text-center"
                                      >
                                        <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span>💬 Enviar WhatsApp</span>
                                      </button>
                                    </div>

                                    {/* 🔄 BOTONES DE ACCIÓN: REINTENTAR / YA LO VEO */}
                                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                      <button
                                        type="button"
                                        id="btn-reintentar-confirmar-llegada"
                                        onClick={() => handleConfirmReturnArrivalYes(activeWalkSolicitud)}
                                        className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
                                      >
                                        <Check className="w-4 h-4 text-amber-400 shrink-0" />
                                        <span>¡Ya lo veo! (Confirmar y Ver PIN 2)</span>
                                      </button>

                                      <button
                                        type="button"
                                        id="btn-reabrir-pregunta-llegada"
                                        onClick={() => handleRetryReturnArrival(activeWalkSolicitud)}
                                        className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
                                        title="Volver a la consulta de llegada"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                        <span>Reintentar</span>
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* MODAL / ALERTA DE PREGUNTA: "¿El paseador ya está en tu domicilio para entregar a [Mascota]?" */
                                  <div className="bg-amber-500 text-slate-950 p-4 rounded-2xl shadow-lg border-2 border-amber-300 space-y-3 animate-in fade-in duration-200">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 shadow">
                                        <Home className="w-5 h-5" />
                                      </div>
                                      <div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 block">
                                          Verificación de Llegada al Domicilio
                                        </span>
                                        <h4 className="text-sm font-black text-slate-950 leading-snug">
                                          ¿El paseador {activeWalkSolicitud.paseadorNombre || 'oficial'} ya está en tu domicilio para entregar a {activeWalkSolicitud.perro.name}?
                                        </h4>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-1">
                                      <button
                                        type="button"
                                        id="btn-confirmar-retorno-si"
                                        onClick={() => handleConfirmReturnArrivalYes(activeWalkSolicitud)}
                                        className="flex-1 py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-400 font-black text-xs shadow flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
                                      >
                                        <Check className="w-4 h-4" />
                                        <span>Sí, está aquí</span>
                                      </button>

                                      <button
                                        type="button"
                                        id="btn-confirmar-retorno-no"
                                        onClick={() => handleConfirmReturnArrivalNo(activeWalkSolicitud)}
                                        className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs border border-rose-300 shadow flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
                                      >
                                        <X className="w-4 h-4" />
                                        <span>No / Aún no lo veo</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 🔑 ETAPA 6: RECIÉN AQUÍ SE REVELA EL PIN 2 DE DEVOLUCIÓN */}
                            {etapaActual === 'ETAPA_6_MOSTRAR_PIN_DEVOLUCION' && (
                              <div className="bg-emerald-50/95 p-4 rounded-2xl border-2 border-emerald-400 shadow-md space-y-3 animate-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-2xs">
                                      <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                                        ¡Llegada Confirmada!
                                      </span>
                                      <p className="text-xs text-emerald-950 font-semibold">
                                        Entregale este PIN 2 de finalización al paseador:
                                      </p>
                                    </div>
                                  </div>

                                  <div className="bg-white px-3 py-1.5 rounded-xl border border-emerald-400 shadow-2xs text-center shrink-0">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">PIN FINAL (PIN 2)</span>
                                    <span className="text-2xl font-bold text-emerald-700 tracking-wider font-mono">
                                      {activeWalkSolicitud.codigoFin}
                                    </span>
                                  </div>
                                </div>

                                <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2">
                                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                  <p className="text-[11px] leading-relaxed">
                                    <strong>Liberación Automática:</strong> Al brindarle este PIN al paseador en la entrega, el sistema concluye el paseo y acredita los fondos a su billetera.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* 🔒 ETAPA 3: PASEO ACTIVO -> PIN 2 RESGUARDADO + GARANTÍA WALKIE */}
                            {etapaActual === 'ETAPA_3_PASEO_EN_CURSO' && (
                              <>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Key className="w-3.5 h-3.5 text-slate-400" />
                                    <span>PIN de Devolución resguardado: se habilitará al concluir los 45 min o al llegar.</span>
                                  </div>
                                  <span className="font-mono font-bold text-slate-400">••••</span>
                                </div>

                                {/* 🛡️ TARJETA DE GARANTÍA WALKIE Y CARACTERÍSTICAS DEL SERVICIO EN VIVO 🛡️ */}
                                <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 space-y-3 shadow-2xs">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs shrink-0">
                                        <ShieldCheck className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                                          Garantía Walkie • Tu Paseo Seguro
                                        </h4>
                                        <span className="text-[10px] text-emerald-800 font-semibold">
                                          Monitoreo y protección activa en cada paso
                                        </span>
                                      </div>
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs shrink-0">
                                      ✓ Oficial
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                                    {/* a) GPS en Vivo */}
                                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex items-start gap-2 shadow-2xs">
                                      <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs shrink-0 mt-0.5">
                                        <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-[11px] font-black text-slate-900 leading-tight">📍 GPS en Vivo</div>
                                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">Seguimiento en tiempo real de la ruta.</div>
                                      </div>
                                    </div>

                                    {/* b) Fotos en Vivo */}
                                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex items-start gap-2 shadow-2xs">
                                      <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center text-xs shrink-0 mt-0.5">
                                        <Camera className="w-3.5 h-3.5 text-sky-700" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-[11px] font-black text-slate-900 leading-tight">📸 Fotos en Vivo</div>
                                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">Reportes visuales durante el recorrido.</div>
                                      </div>
                                    </div>

                                    {/* c) Paseadores Certificados */}
                                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex items-start gap-2 shadow-2xs">
                                      <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xs shrink-0 mt-0.5">
                                        <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-[11px] font-black text-slate-900 leading-tight">🛡️ Paseadores Certificados</div>
                                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">Perfil verificado y calificado.</div>
                                      </div>
                                    </div>

                                    {/* d) Chat Directo */}
                                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex items-start gap-2 shadow-2xs">
                                      <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs shrink-0 mt-0.5">
                                        <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-[11px] font-black text-slate-900 leading-tight">💬 Chat Directo</div>
                                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">Comunicación fluida y canal seguro.</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* ============================================================ */}
                {/* COLUMNA DERECHA: MAPA INTERACTIVO Y CHAT TEMPORAL            */}
                {/* ============================================================ */}
                <div className="flex flex-col h-full space-y-3">
                  {/* 🌦️ WIDGET METEOROLÓGICO DINÁMICO EN TIEMPO REAL VÍA GPS */}
                  <WeatherAlertWidget
                    lat={activeWalkSolicitud.ubicacion?.lat ?? userLat}
                    lng={activeWalkSolicitud.ubicacion?.lng ?? userLng}
                    locationLabel={activeWalkSolicitud.ubicacion?.direccion || userAddress}
                    onOpenChat={() => {
                      const chatElem = document.getElementById('chat-temporal-cliente-contenedor');
                      if (chatElem) {
                        chatElem.scrollIntoView({ behavior: 'smooth' });
                        const input = chatElem.querySelector('input');
                        if (input) {
                          input.focus();
                        }
                      }
                    }}
                  />

                  {/* MAPA INTERACTIVO SINCRONIZADO CON FLEX-GROW */}
                  <div className="space-y-1.5 flex flex-col flex-grow min-h-[300px]">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-0.5">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        Mapa Interactivo en Vivo (La Cumbre / Valle de Punilla)
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Radio: 10 km</span>
                    </div>

                    <div className="flex-grow min-h-[260px] sm:min-h-[300px] rounded-2xl overflow-hidden shadow-xs border border-slate-200">
                      <WalkieMap
                        mode="cliente"
                        centerLat={userLat}
                        centerLng={userLng}
                        paseadores={walkersIn10Km}
                        activeTrackingSolicitud={activeWalkSolicitud}
                        walkerLiveCoords={activeWalkSolicitud.paseadorCoords}
                      />
                    </div>
                  </div>

                  {/* 💬 CHAT TEMPORAL DE PASEO EN VIVO (CLIENTE - PASEADOR) */}
                  <div id="chat-temporal-cliente-contenedor" className="shrink-0 pt-1">
                    <TemporalWalkChat
                      solicitud={activeWalkSolicitud}
                      currentUserRole="cliente"
                      currentUserName={user ? `${user.nombre} ${user.apellido}` : 'Dueño Walkie'}
                      currentUserPhoto={user?.fotoPerfil}
                      walkerLat={activeWalkSolicitud.paseadorCoords?.lat}
                      walkerLng={activeWalkSolicitud.paseadorCoords?.lng}
                      onPhotoSent={(photoUrl) => {
                        const updatedPhotos = [...(activeWalkSolicitud.fotosRecorrido || []), photoUrl];
                        onUpdateSolicitud?.({ ...activeWalkSolicitud, fotosRecorrido: updatedPhotos });
                      }}
                    />
                  </div>
                </div>

              </div>
            </motion.section>
          )}

          {/* 🌟 3. MAIN CLIENT DASHBOARD & CONFIGURATOR (ALWAYS AVAILABLE WHEN NOT IN LIVE ACTIVE WALK) 🌟 */}
          {!isLiveTrackingActive && (
            <div className="space-y-8">
              {/* FORMULARIO DE REGISTRO EN LA PARTE SUPERIOR (TOP) - SIN SALTOS NI DESPLAZAMIENTOS */}
              {isDogFormOpen && editingDogProfile ? (
                <div id="seccion-registro-perfil-top" className="space-y-4 pt-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 px-5 py-4 rounded-3xl shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-lg font-black shadow-sm">
                        🐾
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-emerald-950">
                          {editingDogProfile.name ? `Editar Ficha de ${editingDogProfile.name}` : 'Registrar Nuevo Perfil de Mascota'}
                        </h3>
                        <p className="text-xs text-emerald-800">
                          Ficha médica y de cuidados para que los paseadores certificados brinden la mejor atención.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      id="btn-cancelar-registro-top"
                      onClick={() => {
                        setIsDogFormOpen(false);
                        setEditingDogProfile(null);
                        if (typeof window !== 'undefined') window.scrollTo(0, 0);
                      }}
                      className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      ✕ Cancelar y Volver al Dashboard
                    </button>
                  </div>

                  <DogProfileForm
                    initialData={editingDogProfile}
                    defaultPickupAddress={userAddress}
                    defaultPhone={user?.telefono}
                    onSave={handleSaveDogProfile}
                    onDelete={handleDeleteDog}
                    onClose={() => {
                      setIsDogFormOpen(false);
                      setEditingDogProfile(null);
                      if (typeof window !== 'undefined') window.scrollTo(0, 0);
                    }}
                  />
                </div>
              ) : (
                <>
                  {/* 🌟 1. TARJETA DE PLAN ACTIVO CONTRATADO (UBICADA ARRIBA DE TODO EN EL PANEL DEL CLIENTE) 🌟 */}
                  {isDogPaidForWeek && activeDogSubscription && (
                    <div
                      id="card-plan-activo-contratado-top"
                      className="bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 text-white p-5 sm:p-6 rounded-3xl border-2 border-emerald-500/70 shadow-xl space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-800/60 pb-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center text-xl font-black shrink-0 shadow-inner">
                            🐾
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] uppercase font-extrabold text-emerald-400 tracking-wider">
                                Plan Activo Contratado
                              </span>
                              <span className="bg-emerald-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-2xs">
                                PAGO AL DÍA
                              </span>
                            </div>
                            <h3 className="text-lg sm:text-xl font-black text-white">
                              Plan {activeDogSubscription.planType} • {activeDog?.name}
                            </h3>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            Tu plan está activo y contratado. Podés alternar entre búsqueda automática o manual en cualquier momento.
                          </span>
                        </div>

                        <button
                          type="button"
                          id="btn-abrir-modal-metodo-busqueda-top"
                          onClick={() => setShowSearchModeModal(true)}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 active:scale-95 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
                        >
                          <Sparkles className="w-4 h-4 text-slate-950" />
                          <span>Elegir Método de Búsqueda ({selectionMode === 'automatico' ? 'Radar 10 km' : 'Manual'})</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Hero Welcome */}
                  <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden border border-slate-800">
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                          <PawPrint className="w-3 h-3" /> Panel del Cliente
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                          Reservá el mejor paseo para {activeDog?.name || 'tu mascota'} 🐕
                        </h1>
                        <p className="text-slate-300 text-xs max-w-xl">
                          Planes garantizados de 45 minutos, seguimiento GPS en vivo por WhatsApp, fotos del recorrido y paseadores certificados dentro de tu radio de 10 km.
                        </p>
                      </div>

                      <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15 text-center shrink-0">
                        <div className="text-lg font-bold text-emerald-400">{walkersIn10Km.length} Paseadores</div>
                        <div className="text-[11px] font-medium text-slate-300">En tu radio de 10 km</div>
                      </div>
                    </div>
                  </div>

                  {/* UNIFIED SINGLE MAP SECTION: DRAGGABLE PIN & 10KM RADIUS */}
                  <section id="seccion-mapa-principal" className="space-y-3 relative z-10 overflow-visible">
                    {/* CONFIGURADOR DE UBICACIÓN DE REFERENCIA (GPS / UBICACIÓN FIJA / PUNILLA) */}
                    <LocationReferenceBar
                      currentLat={userLat}
                      currentLng={userLng}
                      currentAddress={userAddress}
                      activeLocationType={activeLocationType}
                      onSelectLocation={(lat, lng, address, locationType) => {
                        setActiveLocationType(locationType);
                        onLocationChange(lat, lng, address);
                        setToastMessage(`Punto de referencia actualizado: ${address.split(',')[0]} (Radio 10 km)`);
                      }}
                      onToast={(msg) => setToastMessage(msg)}
                    />

                    {/* Aviso estándar cuando no hay paseadores dentro de la zona de 10 km */}
                    {walkersIn10Km.length === 0 && (
                      <div id="aviso-sin-paseadores-10km" className="bg-slate-50 border border-slate-200/90 p-3 sm:p-3.5 rounded-2xl flex items-center gap-3 text-xs text-slate-700 shadow-2xs animate-in fade-in">
                        <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                          📍
                        </div>
                        <div>
                          <span className="font-black text-slate-900 block text-xs sm:text-sm">
                            No hay paseadores disponibles dentro de tu zona (10 km)
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Los paseos se limitan estrictamente al radio de 10 km de tu punto de retiro para garantizar la puntualidad.
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-600" />
                          1. Tu Ubicación y Paseadores Cercanos (Radio 10 km)
                        </h2>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Fijá tu localidad o usá tu GPS para calcular el radio de 10 km y ver a los paseadores activos.
                        </p>
                      </div>

                      {/* Mode switch: Auto vs Manual */}
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                        <button
                          type="button"
                          id="btn-modo-auto"
                          onClick={() => {
                            setSelectionMode('automatico');
                            setSelectedPaseador(null);
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            selectionMode === 'automatico'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Modo Automático
                        </button>
                        <button
                          type="button"
                          id="btn-modo-manual"
                          onClick={() => setSelectionMode('manual')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            selectionMode === 'manual'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Elegir Paseador
                        </button>
                      </div>
                    </div>

                    {/* 🌦️ WIDGET METEOROLÓGICO EN TIEMPO REAL VÍA GPS PARA UBICACIÓN DEL CLIENTE */}
                    <WeatherAlertWidget
                      lat={userLat}
                      lng={userLng}
                      locationLabel={userAddress}
                      className="mb-2"
                      onSelectLocation={(newLat, newLng, newLabel) => {
                        onLocationChange(newLat, newLng, newLabel);
                      }}
                    />

                    <div className="relative z-0 h-[380px] sm:h-[440px] rounded-2xl overflow-hidden shadow-xs border border-slate-200">
                      {/* Estado flotante sobre el mapa según modo de búsqueda */}
                      {selectionMode === 'automatico' ? (
                        <div
                          id="overlay-busqueda-automatica-mapa"
                          className="absolute top-3 left-3 z-10 max-w-[92%] sm:max-w-md bg-slate-950/90 text-white backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-emerald-500/50 shadow-xl flex items-center gap-3 pointer-events-auto"
                        >
                          <div className="relative flex items-center justify-center shrink-0">
                            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute" />
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-white tracking-tight">Buscando paseador...</span>
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded-md border border-emerald-500/30 uppercase tracking-wider">
                                Automático
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 truncate">
                              Notificando en radio de 10 km • {walkersIn10Km.length} disponibles
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div
                          id="overlay-busqueda-manual-mapa"
                          className="absolute top-3 left-3 z-10 max-w-[92%] sm:max-w-md bg-slate-950/90 text-white backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-blue-500/50 shadow-xl flex items-center gap-3 pointer-events-auto"
                        >
                          <div className="relative flex items-center justify-center shrink-0">
                            <span className="w-3 h-3 rounded-full bg-blue-400 animate-ping absolute" />
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-white tracking-tight">Esperando la aceptación de paseo</span>
                              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.5 rounded-md border border-blue-500/30 uppercase tracking-wider">
                                Manual
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 truncate">
                              {selectedPaseador ? `Paseador: ${selectedPaseador.nombre} ${selectedPaseador.apellido}` : 'Seleccioná un paseador en el mapa'}
                            </p>
                          </div>
                        </div>
                      )}

                      <WalkieMap
                        mode="cliente"
                        centerLat={userLat}
                        centerLng={userLng}
                        paseadores={walkersIn10Km}
                        currentClienteId={user?.id}
                        currentClienteEmail={user?.email}
                        currentPaseadorId={paseadorUser?.id}
                        currentPaseadorEmail={paseadorUser?.email}
                        selectedPaseadorId={selectedPaseador?.id}
                        onSelectPaseador={(p) => {
                          setSelectedPaseador(p);
                          setSelectionMode('manual');
                        }}
                        onRequestWalkWithPaseador={(p) => {
                          setSelectedPaseador(p);
                          setSelectionMode('manual');
                          setToastMessage(`¡Seleccionaste a ${p.nombre} ${p.apellido}! Continuá con la configuración de tu paseo.`);
                          const planSec = document.getElementById('seccion-planes-paseo');
                          if (planSec) {
                            planSec.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        onInspectPaseador={(p) => {
                          setInspectingWalker(p);
                        }}
                        onUserLocationChange={(lat, lng, addr) => {
                          onLocationChange(lat, lng, addr);
                        }}
                      />
                    </div>

                    {selectionMode === 'manual' ? (
                      <div className="bg-blue-50/70 border border-blue-200/80 p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-blue-950">
                        {walkersIn10Km.length === 0 ? (
                          <div className="flex items-center gap-2 text-slate-600">
                            <span className="text-base">📍</span>
                            <span>No hay paseadores disponibles en esta zona (radio 10 km). Tu solicitud se procesará en <strong>Modo Automático</strong> con el primer paseador activo de la zona.</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 text-blue-900">
                              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
                              <span><strong>Esperando la aceptación de paseo:</strong> {selectedPaseador ? `Solicitud enviada a ${selectedPaseador.nombre} ${selectedPaseador.apellido}. Esperando su confirmación.` : `Elegí un paseador del mapa (${walkersIn10Km.length} disponibles) para asignarle el paseo de ${activeDog?.name || 'tu mascota'}.`}</span>
                            </div>
                            {selectedPaseador && (
                              <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold shrink-0 self-start sm:self-auto">
                                {selectedPaseador.nombre} {selectedPaseador.apellido}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-950">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
                          <span><strong>Buscando paseador...</strong> Se asignará de forma automática al primer paseador disponible en tu radio de 10 km ({walkersIn10Km.length} activos).</span>
                        </div>
                      </div>
                    )}
              </section>

              {/* DOG PROFILES MANAGER */}
              <section id="seccion-perros-cliente" className="space-y-4">
                <DogProfilesManager
                  dogs={dogsList}
                  selectedDogId={selectedDogId}
                  solicitudes={solicitudes}
                  onSelectDog={(id) => setSelectedDogId(id)}
                  onAddNewDog={handleAddNewDog}
                  onEditDog={handleEditDog}
                  onDeleteDog={handleDeleteDog}
                  onUpdatePlan={handleGoToPlans}
                />
              </section>

              {/* 🌟 TARJETA DE GARANTÍA Y EQUIPAMIENTO DEL PASEADOR (FIJA Y DESTACADA) 🌟 */}
              <section id="seccion-garantia-cuidado-paseador">
                <GarantiaCuidadoCard dogName={activeDog?.name} />
              </section>

              {/* PLAN SELECTION OR ACTIVE PAID PLAN CARD */}
              <section id="seccion-planes-paseo" className="space-y-3">
                {isDogPaidForWeek && activeDogSubscription ? (
                  <>
                    {/* TARJETA / BOTÓN: ¿QUIERES REALIZAR NUEVAMENTE LA BÚSQUEDA? */}
                    {selectionMode === 'automatico' && (!activeWalkSolicitud || activeWalkSolicitud.estado === 'pendiente' || !selectedPaseador) && (
                      <div
                        id="card-reintentar-busqueda-automatica"
                        className="bg-amber-50/90 border-2 border-amber-300 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center text-lg font-black shrink-0 shadow-2xs">
                              <Radio className="w-5 h-5 animate-pulse" />
                            </div>
                            <div>
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-200/90 text-amber-900 text-[10px] font-black uppercase tracking-wider mb-0.5">
                                <Radio className="w-3 h-3 text-amber-700 animate-pulse" /> Búsqueda Automática en Curso
                              </div>
                              <h3 className="text-sm sm:text-base font-black text-slate-900">
                                ¿Quieres realizar nuevamente la búsqueda?
                              </h3>
                              <p className="text-xs text-slate-600">
                                Si los paseadores de tu zona aún no confirmaron el turno, podés reiniciar el radar de 10 km o elegir un paseador manualmente desde el mapa.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                          <button
                            type="button"
                            id="btn-reintentar-busqueda-auto"
                            onClick={() => {
                              setToastMessage(`🔄 Radar de 10 km actualizado. Reenviando notificación a paseadores activos para ${activeDog?.name}...`);
                              const mapEl = document.getElementById('seccion-mapa-principal');
                              if (mapEl) {
                                mapEl.scrollIntoView({ behavior: 'smooth' });
                              }
                            }}
                            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Reintentar Búsqueda Automática</span>
                          </button>

                          <button
                            type="button"
                            id="btn-cambiar-a-busqueda-manual"
                            onClick={() => {
                              setSelectionMode('manual');
                              setToastMessage('📍 Modo cambiado a Búsqueda Manual: Seleccioná un paseador en el mapa para enviarle la solicitud.');
                              const mapEl = document.getElementById('seccion-mapa-principal');
                              if (mapEl) {
                                mapEl.scrollIntoView({ behavior: 'smooth' });
                              }
                            }}
                            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Cambiar a Búsqueda Manual</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Cotizador Assistant Trigger Banner */}
                    <div className="bg-slate-900 text-white rounded-2xl p-3.5 sm:p-4 border border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-center sm:text-left">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shrink-0">
                          <Calculator className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold uppercase tracking-wider mb-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> Cotizaciones Walkie
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-white">
                            ¿Necesitás una cotización personalizada o desglose para WhatsApp?
                          </h4>
                          <p className="text-[11px] text-slate-300">
                            Calculá recargos por tiempo extra ($1.300 / 15 min), correa ($1.000 Walkie / $0 propia) y descuentos.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        id="btn-abrir-asistente-cotizaciones"
                        onClick={() => setIsCotizadorModalOpen(true)}
                        className="py-2 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shrink-0 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        <span>Cotizador Rápido</span>
                      </button>
                    </div>

                    {/* 1. LAS 4 TARJETAS FIJAS EN FILA HORIZONTAL (1x4) */}
                    <PlanSelectionCards
                      selectedPlan={selectedPlan}
                      onSelectPlan={(plan) => {
                        setSelectedPlan(plan);
                        setIsWeekConfirmed(false);
                        setTimeout(() => {
                          const el = document.getElementById('seccion-arma-tu-paseo');
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 120);
                      }}
                      weeksCount={weeksCount}
                      onSelectWeeks={(w) => setWeeksCount(w)}
                    />

                    {/* 2. SECCIÓN INFERIOR "ARMÁ TU PASEO" */}
                    <section id="seccion-arma-tu-paseo" className="space-y-4 pt-4 scroll-mt-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider mb-1">
                            <Sparkles className="w-3 h-3" /> Configuración de Fechas y Días
                          </div>
                          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                            <span>Armá tu paseo</span>
                            {selectedPlan && (
                              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">
                                Plan {selectedPlan}
                              </span>
                            )}
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-600">
                            Personalizá las semanas, días y turnos de paseo para {activeDog?.name || 'tu mascota'}.
                          </p>
                        </div>
                      </div>

                      {/* 3. CONFIGURACIÓN DE SEMANAS Y ACORDEÓN */}
                      {!isDogPaidForWeek && (
                        selectedPlan && planInfo ? (
                          <motion.div
                            key={selectedPlan}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            id="seccion-turnos-dias"
                            className="space-y-3"
                          >
                            <ScheduleConfigurator
                              planType={selectedPlan}
                              basePrice={planInfo.precioUnitario}
                              walksPerWeek={walksPerWeek}
                              weeksCount={weeksCount}
                              onWeeksCountChange={(count) => {
                                setWeeksCount(count);
                                setIsWeekConfirmed(false);
                              }}
                              weeksData={weeksData}
                              onWeeksDataChange={(data) => {
                                setWeeksData(data);
                                setIsWeekConfirmed(false);
                              }}
                              tipoCorrea={tipoCorrea}
                              onTipoCorreaChange={setTipoCorrea}
                              isWeekConfirmed={isWeekConfirmed}
                              onConfirmSchedule={() => {
                                setIsWeekConfirmed(true);
                                setToastMessage("Todo listo para confirmar. Presiona Pagar con Mercado Pago para finalizar");
                                if (typeof window !== 'undefined') {
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                              }}
                            />
                          </motion.div>
                        ) : (
                          <div
                            id="aviso-seleccionar-plan"
                            className="bg-white rounded-3xl p-6 sm:p-8 border border-dashed border-slate-300 text-center space-y-2 shadow-2xs"
                          >
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold mx-auto">
                              👆
                            </div>
                            <h4 className="text-base font-bold text-slate-800">
                              Elegí un plan arriba para armar tu paseo
                            </h4>
                            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                              Hacé clic en cualquiera de los 4 planes de la fila superior (Común/Express, Bronce, Plata u Oro) para habilitar la selección de semanas, turnos y días de paseo.
                            </p>
                          </div>
                        )
                      )}
                    </section>
                  </>
                )}
              </section>
                </>
              )}
            </div>
          )}

          {/* FLOATING ACTION BAR FOR RESERVATION & PAYMENT (SOLO VISIBLE CON PLAN ELEGIDO Y NO PAGADO) */}
          {!isLiveTrackingActive && !isDogFormOpen && !isDogPaidForWeek && selectedPlan && planInfo && (
            <FloatingPaymentBar
              planType={selectedPlan}
              basePrice={planInfo.precioUnitario}
              weeksCount={weeksCount}
              discountPercent={discountRate}
              totalCalculated={totalCalculated}
              dogProfile={activeDog}
              weeksData={weeksData}
              walksPerWeek={walksPerWeek}
              selectionMode={selectionMode}
              selectedPaseador={selectedPaseador}
              isWeekConfirmed={isWeekConfirmed}
              onAttemptPayment={handleOpenPayment}
              onShowWarning={(msg) => setToastMessage(msg)}
            />
          )}
        </div>

      {/* PAYMENT & CHECKOUT MODAL (2-STEP DEMO GATEWAY) */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto"
          >
            {/* Modal Header with 2-Step Progress Indicator */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    paymentStep === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    Paso {paymentStep} de 2
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {paymentStep === 1 ? '• Transparencia del Servicio' : '• Pasarela de Pago'}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {paymentStep === 1 ? 'Impacto y Beneficios del Pago' : 'Confirmación de Pago Seguro'}
                </h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* PASO 1: TRANSPARENCIA Y VALOR DEL SERVICIO */}
            {paymentStep === 1 && (
              <div className="space-y-3.5">
                {/* A) META SOLIDARIA DESTACADA */}
                <div className="p-3.5 bg-linear-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border-2 border-emerald-500/30 rounded-2xl space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                      <Heart className="w-4 h-4 fill-white text-white" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                        Impacto Social en Punilla
                      </span>
                      <h4 className="text-xs font-black text-emerald-950">
                        Meta Solidaria: $200 por cada paseo
                      </h4>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-900 leading-relaxed font-medium">
                    Con tu pago, <strong>$200 de cada paseo</strong> son destinados directamente al fondo de rescate, atención veterinaria y alimentación para perros en situación de calle de Punilla.
                  </p>
                </div>

                {/* B) SERVICIOS INCLUIDOS CON ÍCONOS DESCRIPTIVOS */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    Servicios y Garantías Incluidas:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1 flex flex-col items-center justify-center">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                        <Camera className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-black text-slate-900 block leading-tight">Fotos en Vivo</span>
                      <span className="text-[9px] text-slate-500 leading-none">Reportes en ruta</span>
                    </div>

                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1 flex flex-col items-center justify-center">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-black text-slate-900 block leading-tight">GPS en Vivo</span>
                      <span className="text-[9px] text-slate-500 leading-none">Rastreo continuo</span>
                    </div>

                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1 flex flex-col items-center justify-center">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-black text-slate-900 block leading-tight">Chat Moderado</span>
                      <span className="text-[9px] text-slate-500 leading-none">Contacto directo</span>
                    </div>
                  </div>
                </div>

                {/* Resumen del Contrato / Paseo */}
                <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span>Mascota:</span>
                    <strong className="text-slate-900">{activeDog?.name} ({activeDog?.breed})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Plan seleccionado:</span>
                    <strong>Plan {selectedPlan || 'Personalizado'} ({walksPerWeek} paseos/sem)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Duración contratada:</span>
                    <strong>{weeksCount} {weeksCount === 1 ? 'semana' : 'semanas'} ({totalWalks} paseos)</strong>
                  </div>

                  {/* Desglose de Tarifas */}
                  <div className="border-t border-slate-200/80 pt-1.5 space-y-1 text-[11px] font-medium">
                    <div className="flex justify-between text-slate-800">
                      <span>Precio base servicio:</span>
                      <span className="font-mono font-bold">{formatPesos(precioBaseServicio)}</span>
                    </div>
                    {recargoTiempoExtra > 0 && (
                      <div className="flex justify-between text-amber-800 font-bold">
                        <span>Tiempo extra:</span>
                        <span className="font-mono">+{formatPesos(recargoTiempoExtra)}</span>
                      </div>
                    )}
                    {recargoCorrea > 0 && (
                      <div className="flex justify-between text-emerald-800 font-bold">
                        <span>Correa Walkie:</span>
                        <span className="font-mono">+{formatPesos(recargoCorrea)}</span>
                      </div>
                    )}
                    {discountRate > 0 && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Descuento continuidad ({discountRate}%):</span>
                        <span className="font-mono">-{formatPesos(descuentoMonto)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between border-t border-slate-300 pt-1.5 text-xs">
                    <span className="font-black text-slate-900">Total a Abonar:</span>
                    <span className="font-black text-emerald-700 font-mono text-base">{formatPesos(totalCalculated)}</span>
                  </div>
                </div>

                <GarantiaCuidadoCard variant="compact" dogName={activeDog?.name} />

                {/* Botón de Navegación: Continuar al Pago ➔ */}
                <div className="sticky bottom-0 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-3.5 sm:p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg rounded-b-2xl">
                  <button
                    type="button"
                    id="btn-continuar-al-pago-paso2"
                    onClick={() => setPaymentStep(2)}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Continuar al Pago</span>
                    <ArrowRight className="w-4 h-4 text-emerald-100" />
                  </button>
                </div>
              </div>
            )}

            {/* PASO 2: MERCADO PAGO CHECKOUT PRO & MÉTODOS DE PAGO */}
            {paymentStep === 2 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleConfirmReservation();
                }}
                className="space-y-3.5"
              >
                {/* Total Bar */}
                <div className="p-3 bg-slate-900 text-white rounded-2xl border border-slate-800 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total a Pagar</span>
                    <span className="text-xs text-slate-300">Plan {selectedPlan} ({totalWalks} paseos)</span>
                  </div>
                  <div className="text-right font-mono font-black text-lg text-emerald-400">
                    {formatPesos(totalCalculated)}
                  </div>
                </div>

                {/* Selector de Método de Pago */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mercadopago')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      paymentMethod === 'mercadopago'
                        ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/40 text-slate-900 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-lg bg-[#009EE3] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          MP
                        </div>
                        <span className="font-black text-xs">Mercado Pago</span>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wider bg-sky-200/80 text-sky-900 px-1.5 py-0.5 rounded">
                        Sandbox
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight">
                      Checkout Pro (Tarjetas, Débito, Efectivo y Saldo)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('efectivo')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      paymentMethod === 'efectivo'
                        ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/40 text-slate-900 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          💵
                        </div>
                        <span className="font-black text-xs">Efectivo</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400">Contraentrega</span>
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight">
                      Abonar personalmente en el primer paseo
                    </span>
                  </button>
                </div>

                {/* DETALLE SEGÚN MÉTODO ELEGIDO */}
                {paymentMethod === 'mercadopago' ? (
                  <div className="bg-gradient-to-br from-sky-50 via-sky-50/40 to-slate-50 border border-sky-200 rounded-2xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-sky-950 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                        <span>Mercado Pago Checkout Pro (Modo Prueba)</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-sky-600 text-white text-[9px] font-black tracking-wider uppercase">
                        Sandbox Activo
                      </span>
                    </div>

                    <p className="text-[11px] text-sky-900 leading-relaxed font-medium">
                      Al presionar <strong>Pagar paseo con Mercado Pago</strong>, se generará la preferencia oficial con tus credenciales Sandbox y se abrirá el Checkout Pro de Mercado Pago para procesar el abono de <strong>{activeDog?.name}</strong>.
                    </p>

                    <div className="bg-white/90 p-2.5 rounded-xl border border-sky-100 space-y-1 text-[10px] font-mono text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>Public Key:</span>
                        <strong className="text-slate-800 truncate max-w-[190px]">APP_USR-c1c5f637...</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Access Token:</span>
                        <strong className="text-slate-800 truncate max-w-[190px]">APP_USR-89475067...</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1 text-xs text-slate-700">
                    <span className="font-black text-slate-900 block">Pago en Efectivo Contraentrega:</span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      El abono total de <strong>{formatPesos(totalCalculated)}</strong> será recibido directamente por el paseador asignado al momento de retirar a {activeDog?.name}.
                    </p>
                  </div>
                )}

                {/* Mensaje de Seguridad */}
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-emerald-950 text-[11px] flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Conexión cifrada TLS 1.3 con Mercado Pago Checkout Pro</span>
                  </div>
                  <span className="bg-emerald-200 text-emerald-950 font-bold px-1.5 py-0.5 rounded text-[9px]">
                    Oficial
                  </span>
                </div>

                {/* Acciones del Paso 2: Volver y Pagar */}
                <div className="sticky bottom-0 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-3.5 sm:p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg rounded-b-2xl flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentStep(1)}
                    disabled={isProcessingPayment}
                    className="py-3 px-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver</span>
                  </button>

                  <button
                    type="submit"
                    id="btn-confirmar-pago-final"
                    disabled={isProcessingPayment}
                    className="flex-1 py-3.5 px-4 rounded-xl bg-[#009EE3] hover:bg-[#0081B9] active:scale-[0.98] text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isProcessingPayment ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Generando Checkout Pro de Mercado Pago...</span>
                      </div>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 text-white" />
                        <span>Pagar paseo con Mercado Pago ({formatPesos(totalCalculated)})</span>
                        <ArrowRight className="w-4 h-4 text-white" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* MODAL LAUNCHER: MERCADO PAGO CHECKOUT PRO (SANDBOX) */}
      <AnimatePresence>
        {mpCheckoutModal && (
          <div
            key="modal-mp-checkout-launcher"
            id="modal-mp-checkout-launcher"
            className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-sky-300 text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-sky-50 text-[#009EE3] flex items-center justify-center mx-auto border-2 border-sky-200 shadow-xs">
                <CreditCard className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-100 text-[#0081B9] text-[10px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" /> Mercado Pago Checkout Pro (Sandbox)
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  ¡Preferencia de Pago Generada!
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  Plan {mpCheckoutModal.plan} para <strong>{mpCheckoutModal.dogName}</strong> ({formatPesos(mpCheckoutModal.total)})
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-left text-xs space-y-1 font-mono text-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[10px] uppercase font-sans">ID Preferencia:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[180px]">{mpCheckoutModal.preferenceId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[10px] uppercase font-sans">Modo:</span>
                  <span className="text-sky-700 font-bold font-sans">Prueba / Sandbox</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <a
                  href={mpCheckoutModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="btn-abrir-checkout-pro-mp"
                  className="w-full py-3.5 px-5 rounded-2xl bg-[#009EE3] hover:bg-[#0081B9] active:scale-98 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-white" />
                  <span>Abrir Checkout Pro de Mercado Pago ↗</span>
                </a>

                <button
                  type="button"
                  id="btn-continuar-post-pago-mp"
                  onClick={() => {
                    setMpCheckoutModal(null);
                    setShowSearchModeModal(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Continuar a la Reserva y Monitoreo
                </button>
              </div>

              <p className="text-[10px] text-slate-400">
                Si la pestaña no se abrió automáticamente debido al bloqueador del navegador, hacé clic en el botón azul para acceder al checkout oficial.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COTIZADOR ASSISTANT MODAL */}
      {isCotizadorModalOpen && (
        <CotizadorAssistantModal
          isOpen={isCotizadorModalOpen}
          onClose={() => setIsCotizadorModalOpen(false)}
          initialPlan={selectedPlan || 'Bronce'}
          initialWeeks={weeksCount || 1}
          initialTipoCorrea={tipoCorrea || 'propia'}
          dogName={activeDog?.name || 'tu mascota'}
          onApplyQuote={(config) => {
            setSelectedPlan(config.planType);
            setWeeksCount(config.weeksCount);
            setTipoCorrea(config.tipoCorrea);
            setWeeksData(prev => prev.map(w => ({ ...w, extraTimeMinutes: config.extraMinutes })));
            setToastMessage('¡Cotización aplicada exitosamente a tu configuración de reserva!');
          }}
        />
      )}

      {/* WALKER DETAILS & REVIEWS MODAL */}
      <WalkerDetailsModal
        walker={inspectingWalker}
        isOpen={!!inspectingWalker}
        onClose={() => setInspectingWalker(null)}
        onSelectWalker={(w) => {
          setSelectedPaseador(w);
          setSelectionMode('manual');
          setToastMessage(`Seleccionaste a ${w.nombre} ${w.apellido} como tu paseador preferido.`);
        }}
        isSelected={selectedPaseador?.id === inspectingWalker?.id}
      />

      {/* MODAL DE RESTRICCIÓN MODO INVITADO (CREAR PERFIL DE PERRO) */}
      <AnimatePresence>
        {showGuestDogModal && (
          <div
            key="modal-restriccion-perfil-perro-backdrop"
            id="modal-restriccion-perfil-perro-backdrop"
            className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowGuestDogModal(false)}
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
                id="btn-close-guest-dog-modal"
                onClick={() => setShowGuestDogModal(false)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                title="Cerrar"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl mx-auto shadow-2xs">
                🐶
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
                  <AlertCircle className="w-3 h-3 text-amber-700" /> Registro Requerido
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Iniciá sesión o Registrate como Cliente
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                  Para crear el perfil de tu perro, cargar su ficha médica y solicitar paseos personalizados, necesitás una cuenta activa de Cliente.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  id="btn-modal-guest-login-cliente"
                  onClick={() => {
                    setShowGuestDogModal(false);
                    if (onOpenAuth) onOpenAuth('cliente');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Iniciar sesión / Registrarse como Cliente</span>
                </button>

                <button
                  type="button"
                  id="btn-modal-guest-continue-exploring"
                  onClick={() => setShowGuestDogModal(false)}
                  className="w-full py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-xs transition-all cursor-pointer"
                >
                  Seguir explorando como Invitado
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {/* MODAL DE CALIFICACIÓN DE PASEO FINALIZADO (OBLIGATORIO) */}
        {solicitudToRate && (
          <RatingPaseoModal
            solicitud={solicitudToRate}
            onSubmitRating={(_review) => {
              setToastMessage('⭐ ¡Muchas gracias! Tu calificación fue enviada y registrada con éxito.');
              setSolicitudToRate(null);
              // Redirigir a vista de reservas o inicio
              if (onSelectTab) {
                onSelectTab('main');
              }
              const reservationsEl = document.getElementById('seccion-historial-reservas-cliente') || document.getElementById('seccion-mapa-principal');
              if (reservationsEl) {
                reservationsEl.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          />
        )}

        {/* MODAL DE SELECCIÓN DE MÉTODO DE BÚSQUEDA (AUTOMÁTICA / MANUAL) */}
        {showSearchModeModal && (
          <SearchModeSelectionModal
            isOpen={showSearchModeModal}
            onClose={() => setShowSearchModeModal(false)}
            currentMode={selectionMode}
            onSelectMode={(mode) => {
              setSelectionMode(mode);
              const mapEl = document.getElementById('seccion-mapa-principal');
              if (mapEl) {
                mapEl.scrollIntoView({ behavior: 'smooth' });
              }
              if (mode === 'manual') {
                setToastMessage('📍 Búsqueda Manual: Elegí tu paseador en el mapa para enviarle la solicitud.');
              } else {
                setSelectedPaseador(null);
                setToastMessage('🚀 Búsqueda Automática: Buscando y notificando a paseadores en tu radio de 10 km.');
              }
            }}
            walkersCount10Km={walkersIn10Km.length}
            dogName={activeDog?.name}
          />
        )}

        {/* MODAL DE GESTIÓN Y CANCELACIÓN INDIVIDUAL POR DÍA */}
        {solicitudToCancel && (
          <CancelacionIndividualModal
            solicitud={solicitudToCancel}
            isOpen={!!solicitudToCancel}
            onClose={() => setSolicitudToCancel(null)}
            onUpdateSolicitud={(updated) => {
              onUpdateSolicitud?.(updated);
              setSolicitudToCancel(updated);
            }}
            onShowToast={(msg) => setToastMessage(msg)}
          />
        )}

        {/* MODAL DE GUÍA DE RESERVA: CÓMO PEDIR TU PASEO */}
        <GuiaReservaModal
          isOpen={isGuiaReservaOpen}
          onClose={() => setIsGuiaReservaOpen(false)}
        />
      </AnimatePresence>
    </div>
  );
};
