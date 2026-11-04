import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  UserRole, UserCliente, UserPaseador, 
  SolicitudPaseo, RoleTab, PaseadorPublico,
  PlanType, UserClientePublico
} from './types';
import { SOLICITUDES_INICIALES, PASEADORES_INICIALES } from './data/initialData';
import { Navbar } from './components/Navbar';
import { LandingView } from './components/LandingView';
import { VistaCliente } from './components/VistaCliente';
import { VistaPaseador } from './components/VistaPaseador';
import { AuthModal } from './components/AuthModal';
import { GpsBlockerModal } from './components/GpsBlockerModal';
import { ProfileModal } from './components/ProfileModal';
import { NosotrosMetasModal } from './components/NosotrosMetasModal';
import { SuspendedAccountScreen, SuspendedAccountDetails } from './components/SuspendedAccountScreen';
import { GoogleOneTapPrompt } from './components/GoogleOneTapPrompt';
import { GoogleUserProfile, cleanPreviousSession, parseNameParts, formatUsernameFromEmail } from './utils/googleAuth';
import { getAccurateCurrentPosition, DEFAULT_FALLBACK_LOCATION } from './utils/geolocation';
import { Home, MapPin, Calendar, User, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

// Clean slate key for manual resets only
const CLEAN_SLATE_KEY = 'walkie_clean_slate_v6_real_users_purged';

export const App: React.FC = () => {
  // Main view mode: 'inicio' | 'cliente' | 'paseador'
  const [modo, setModo] = useState<UserRole>('inicio');

  // Sub-tabs for Cliente and Paseador views: 'main' | 'nosotros_faq' | 'meta_solidaria'
  const [activeTab, setActiveTab] = useState<RoleTab>('main');

  // Modal informativo para 'Nosotros & FAQ' y 'Meta Solidaria' (solo activo en modo 'inicio' / landing)
  const [infoModal, setInfoModal] = useState<'nosotros' | 'metas' | null>(null);

  const handleSelectTab = (tab: RoleTab) => {
    setActiveTab(tab);
    if (modo === 'inicio') {
      // En modo Portada / Landing (sin sesión o modo invitado), abrir modal flotante
      if (tab === 'nosotros_faq') {
        setInfoModal('nosotros');
      } else if (tab === 'meta_solidaria') {
        setInfoModal('metas');
      } else {
        setInfoModal(null);
      }
    } else {
      // En paneles de Cliente o Paseador, NO abrir modal flotante, sino vista estática a pantalla completa
      setInfoModal(null);
    }
  };

  const handleCloseInfoModal = () => {
    setInfoModal(null);
    setActiveTab('main');
  };

  // GPS state (defaults to true so users can immediately interact with the app and select/detect location freely)
  const [hasGpsPermission, setHasGpsPermission] = useState<boolean>(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; address: string }>({
    lat: -31.4201,
    lng: -64.4992,
    address: 'Av. San Martín 450, Villa Carlos Paz, Punilla'
  });

  // Dedicated Cliente Location State for Real-Time Synchronization across roles
  const [clienteLocation, setClienteLocation] = useState<{ lat: number; lng: number; address: string }>(() => {
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
  });

  // User Auth State (100% Real, null if not registered or logged in, safe against corrupted local data)
  const [clienteUser, setClienteUser] = useState<UserCliente | null>(() => {
    try {
      const saved = localStorage.getItem('walkie_cliente_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [paseadorUser, setPaseadorUser] = useState<UserPaseador | null>(() => {
    try {
      const saved = localStorage.getItem('walkie_paseador_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Real registered certified walkers pool (WHERE role = 'PASEADOR')
  const [registeredWalkers, setRegisteredWalkers] = useState<PaseadorPublico[]>(() => {
    const saved = localStorage.getItem('walkie_registered_walkers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // Real registered clients pool (WHERE role = 'CLIENTE')
  const [registeredClients, setRegisteredClients] = useState<UserClientePublico[]>(() => {
    const saved = localStorage.getItem('walkie_registered_clients');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // Auth modal control
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authRoleTarget, setAuthRoleTarget] = useState<'cliente' | 'paseador'>('cliente');
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login');
  const [initialGoogleUserForModal, setInitialGoogleUserForModal] = useState<GoogleUserProfile | null>(null);
  const authPromptedRef = useRef<boolean>(
    typeof window !== 'undefined' && sessionStorage.getItem('walkie_auth_prompt_dismissed') === 'true'
  );

  // ⏱️ REGISTRO/LOGIN DIFERIDO: Temporizador de 30 segundos continuos de navegación libre para invitados
  useEffect(() => {
    // Si el usuario ya está autenticado o ya se le mostró/descartó la invitación en esta sesión, no disparar
    const isDismissed = typeof window !== 'undefined' && sessionStorage.getItem('walkie_auth_prompt_dismissed') === 'true';
    if (clienteUser || paseadorUser || authPromptedRef.current || isDismissed) {
      return;
    }

    const timer = setTimeout(() => {
      const alreadyDismissed = typeof window !== 'undefined' && sessionStorage.getItem('walkie_auth_prompt_dismissed') === 'true';
      if (!clienteUser && !paseadorUser && !authPromptedRef.current && !alreadyDismissed) {
        authPromptedRef.current = true;
        setAuthRoleTarget(modo === 'paseador' ? 'paseador' : 'cliente');
        setAuthInitialTab('login');
        setIsAuthOpen(true);
      }
    }, 30000); // 30 segundos de navegación libre continua

    return () => clearTimeout(timer);
  }, [clienteUser, paseadorUser, modo]);

  // Profile modal control
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  // Hiring plan state - initialized to null by default (no plan pre-selected)
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanType | null>(null);

  // Solicitudes activas persistence (real local storage, starts empty)
  const [solicitudes, setSolicitudes] = useState<SolicitudPaseo[]>(() => {
    const saved = localStorage.getItem('solicitudes_activas');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // Solidarity fund persistence
  const [solidarityAmount, setSolidarityAmount] = useState<number>(() => {
    const saved = localStorage.getItem('walkie_meta_solidaria');
    return saved ? JSON.parse(saved) : 0;
  });

  // Switch role modal confirmation state
  const [showRoleSwitchModal, setShowRoleSwitchModal] = useState<boolean>(false);

  // Complete clean slate reset function
  const handleResetAllAppData = async () => {
    try {
      await fetch('/api/admin/purge-test-data', { method: 'POST' }).catch(() => {});
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem(CLEAN_SLATE_KEY, 'true');
      setClienteUser(null);
      setPaseadorUser(null);
      setSolicitudes([]);
      setRegisteredWalkers([]);
      setRegisteredClients([]);
      setModo('inicio');
      setActiveTab('main');
      window.location.reload();
    }
  };

  // 🚨 Account Suspension State (Content Moderation System)
  const [suspendedDetails, setSuspendedDetails] = useState<SuspendedAccountDetails | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('walkie_suspended_account');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  // 📍 Detección de Ubicación Inicial de Alta Precisión (GPS en vivo con fallback silencioso)
  useEffect(() => {
    let isMounted = true;
    getAccurateCurrentPosition().then((posResult) => {
      if (!isMounted) return;
      if (!posResult.isFallback) {
        setUserLocation({
          lat: posResult.lat,
          lng: posResult.lng,
          address: posResult.address
        });
        setClienteLocation(prev => {
          const isAtDefault = Math.abs(prev.lat - DEFAULT_FALLBACK_LOCATION.lat) < 0.001 && Math.abs(prev.lng - DEFAULT_FALLBACK_LOCATION.lng) < 0.001;
          const hasSaved = !!localStorage.getItem('walkie_cliente_location');
          if (isAtDefault || !hasSaved) {
            const newLoc = {
              lat: posResult.lat,
              lng: posResult.lng,
              address: posResult.address
            };
            try { localStorage.setItem('walkie_cliente_location', JSON.stringify(newLoc)); } catch {}
            return newLoc;
          }
          return prev;
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Sincronizar posición del paseador registrado en el servidor sin auto-contaminar el radar de paseadores
  useEffect(() => {
    if (paseadorUser) {
      const isAccountActiveSaved = localStorage.getItem('walkie_paseador_cuenta_activa');
      const isAvailable = isAccountActiveSaved !== null ? isAccountActiveSaved === 'true' : (paseadorUser.disponible ?? true);

      fetch('/api/paseadores/posicion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: paseadorUser.id,
          nombre: paseadorUser.nombre,
          apellido: paseadorUser.apellido,
          fotoPerfil: paseadorUser.fotoPerfil,
          telefono: paseadorUser.telefono,
          lat: userLocation.lat,
          lng: userLocation.lng,
          disponible: isAvailable,
          gpsActivo: isAvailable
        })
      }).catch(() => {});
    }
  }, [paseadorUser, userLocation.lat, userLocation.lng]);

  // Listener para sincronización reactiva cuando el paseador cambia su estado activo/inactivo (apagar cuenta)
  useEffect(() => {
    const handleStatusChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ paseadorId?: string; disponible: boolean }>;
      const { paseadorId, disponible } = customEvent.detail || {};
      if (paseadorUser && (!paseadorId || paseadorId === paseadorUser.id)) {
        setPaseadorUser(prev => prev ? { ...prev, disponible } : null);
        fetch('/api/paseadores/posicion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: paseadorUser.id,
            nombre: paseadorUser.nombre,
            apellido: paseadorUser.apellido,
            fotoPerfil: paseadorUser.fotoPerfil,
            telefono: paseadorUser.telefono,
            lat: userLocation.lat,
            lng: userLocation.lng,
            disponible,
            gpsActivo: disponible
          })
        }).catch(() => {});
      }
      setRegisteredWalkers(prev => prev.map(p => {
        if (!paseadorId || p.id === paseadorId || (paseadorUser && p.id === paseadorUser.id)) {
          return { ...p, disponible, gpsActivo: disponible };
        }
        return p;
      }));
    };

    window.addEventListener('walkie_paseador_status_change', handleStatusChange);
    return () => {
      window.removeEventListener('walkie_paseador_status_change', handleStatusChange);
    };
  }, [paseadorUser, userLocation.lat, userLocation.lng]);

  useEffect(() => {
    localStorage.setItem('walkie_registered_walkers', JSON.stringify(registeredWalkers));
  }, [registeredWalkers]);

  useEffect(() => {
    localStorage.setItem('walkie_registered_clients', JSON.stringify(registeredClients));
  }, [registeredClients]);

  // Sincronización dinámica en tiempo real (SSE Stream + Polling continuo cada 3s)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pollInterval: any = null;

    const areWalkersEquivalent = (a: PaseadorPublico[], b: PaseadorPublico[]): boolean => {
      if (a.length !== b.length) return false;
      const mapA = new Map(a.map(w => [w.id, w]));
      for (const wB of b) {
        const wA = mapA.get(wB.id);
        if (!wA) return false;
        if (
          Math.abs(wA.lat - wB.lat) > 0.0001 ||
          Math.abs(wA.lng - wB.lng) > 0.0001 ||
          Boolean(wA.disponible) !== Boolean(wB.disponible) ||
          wA.fotoPerfil !== wB.fotoPerfil ||
          wA.nombre !== wB.nombre
        ) return false;
      }
      return true;
    };

    const areClientsEquivalent = (a: UserClientePublico[], b: UserClientePublico[]): boolean => {
      if (a.length !== b.length) return false;
      const mapA = new Map(a.map(c => [c.id, c]));
      for (const cB of b) {
        const cA = mapA.get(cB.id);
        if (!cA) return false;
        if (
          Math.abs(cA.lat - cB.lat) > 0.0001 ||
          Math.abs(cA.lng - cB.lng) > 0.0001 ||
          cA.nombre !== cB.nombre ||
          cA.fotoPerfil !== cB.fotoPerfil
        ) return false;
      }
      return true;
    };

    const fetchOppositeRoleUsers = async () => {
      try {
        // 1. Consultar Paseadores reales (WHERE role = 'PASEADOR')
        const resWalkers = await fetch('/api/paseadores/activos');
        if (resWalkers.ok) {
          const data = await resWalkers.json();
          if (data && Array.isArray(data.paseadores)) {
            setRegisteredWalkers(prev => areWalkersEquivalent(prev, data.paseadores) ? prev : data.paseadores);
          }
        }

        // 2. Consultar Clientes reales (WHERE role = 'CLIENTE')
        const resClients = await fetch('/api/clientes/activos');
        if (resClients.ok) {
          const data = await resClients.json();
          if (data && Array.isArray(data.clientes)) {
            setRegisteredClients(prev => areClientsEquivalent(prev, data.clientes) ? prev : data.clientes);
          }
        }
      } catch (e) {
        // Fallback silencioso
      }
    };

    // Consulta inicial inmediata
    fetchOppositeRoleUsers();

    // Polling continuo cada 3 segundos como garantía absoluta entre múltiples navegadores y pestañas
    pollInterval = setInterval(fetchOppositeRoleUsers, 3000);

    // Conectar a Server-Sent Events (SSE) para actualización dinámica instantánea (push)
    if (typeof EventSource !== 'undefined') {
      try {
        eventSource = new EventSource('/api/paseadores/stream');

        const filterPayload = (data: any) => {
          if (data?.paseadores && Array.isArray(data.paseadores)) {
            setRegisteredWalkers(prev => areWalkersEquivalent(prev, data.paseadores) ? prev : data.paseadores);
          }
          if (data?.clientes && Array.isArray(data.clientes)) {
            setRegisteredClients(prev => areClientsEquivalent(prev, data.clientes) ? prev : data.clientes);
          }
        };

        eventSource.addEventListener('init', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            filterPayload(data);
          } catch (err) {
            console.error('Error procesando SSE init:', err);
          }
        });

        eventSource.addEventListener('update', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            filterPayload(data);
          } catch (err) {
            console.error('Error procesando SSE update:', err);
          }
        });

        eventSource.addEventListener('users_update', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            filterPayload(data);
          } catch (err) {
            console.error('Error procesando SSE users_update:', err);
          }
        });
      } catch (err) {
        // En caso de que falle SSE, el polling continuo se encarga de todo
      }
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [modo, clienteUser?.id, paseadorUser?.id]);

  // Sincronizar paseador real con la base de datos backend
  useEffect(() => {
    if (paseadorUser) {
      const isPaseadorAccountActive = localStorage.getItem('walkie_paseador_cuenta_activa') !== 'false';
      const isDisp = isPaseadorAccountActive && (paseadorUser.disponible ?? true);
      fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: paseadorUser.id,
          role: 'paseador',
          rol: 'PASEADOR',
          nombre: paseadorUser.nombre,
          apellido: paseadorUser.apellido,
          nombreUsuario: paseadorUser.nombreUsuario,
          email: paseadorUser.email,
          fotoPerfil: paseadorUser.fotoPerfil,
          telefono: paseadorUser.telefono,
          calificacion: paseadorUser.calificacion || 5.0,
          totalPaseos: paseadorUser.totalPaseos || 0,
          biografia: paseadorUser.biografia,
          lat: userLocation.lat || paseadorUser.lat || -31.4201,
          lng: userLocation.lng || paseadorUser.lng || -64.4992,
          disponible: isDisp,
          gpsActivo: isDisp,
          autenticado: true
        })
      }).catch(() => {});
    }
  }, [paseadorUser, userLocation.lat, userLocation.lng]);

  // Sincronizar cliente real con la base de datos backend
  useEffect(() => {
    if (clienteUser) {
      fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: clienteUser.id,
          role: 'cliente',
          rol: 'CLIENTE',
          email: clienteUser.email,
          nombre: clienteUser.nombre,
          apellido: clienteUser.apellido,
          nombreUsuario: clienteUser.nombreUsuario,
          telefono: clienteUser.telefono,
          fotoPerfil: clienteUser.fotoPerfil,
          direccion: clienteUser.direccionPredeterminada || clienteLocation.address,
          perros: clienteUser.perros || [],
          lat: clienteLocation.lat || -31.4201,
          lng: clienteLocation.lng || -64.4992,
          autenticado: true
        })
      }).catch(() => {});
    }
  }, [clienteUser, clienteLocation.lat, clienteLocation.lng, clienteLocation.address]);


  // 45-Minute Synchronized Live Countdown Timer for Walks in Progress ('en_curso')
  useEffect(() => {
    const hasActiveWalk = solicitudes.some(
      s => s.estado === 'en_curso' && !s.temporizadorFinalizado && (s.tiempoRestanteSegundos ?? 2700) > 0
    );
    if (!hasActiveWalk) return;

    const timerInterval = setInterval(() => {
      setSolicitudes(prev =>
        prev.map(sol => {
          if (sol.estado === 'en_curso' && !sol.temporizadorFinalizado) {
            const currentSec = sol.tiempoRestanteSegundos !== undefined ? sol.tiempoRestanteSegundos : 2700;
            if (currentSec > 1) {
              const nextGps = sol.recorridoGps && currentSec % 15 === 0 && sol.recorridoGps.length < 50
                ? [
                    ...sol.recorridoGps,
                    {
                      lat: sol.ubicacion.lat + (Math.sin(currentSec / 30) * 0.003),
                      lng: sol.ubicacion.lng + (Math.cos(currentSec / 30) * 0.003)
                    }
                  ]
                : sol.recorridoGps;

              return {
                ...sol,
                tiempoRestanteSegundos: currentSec - 1,
                recorridoGps: nextGps
              };
            } else {
              return {
                ...sol,
                tiempoRestanteSegundos: 0,
                temporizadorFinalizado: true,
                etapaSeguimiento: 'en_domicilio'
              };
            }
          }
          return sol;
        })
      );
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [solicitudes]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('solicitudes_activas', JSON.stringify(solicitudes));
  }, [solicitudes]);

  useEffect(() => {
    localStorage.setItem('walkie_meta_solidaria', JSON.stringify(solidarityAmount));
  }, [solidarityAmount]);

  // 💳 Procesamiento de Retorno/Callback de Mercado Pago Checkout Pro (Acreditación exacta por Entidad)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const status = urlParams.get('status') || urlParams.get('collection_status');

      if (status === 'approved') {
        let causeType = urlParams.get('cause_type');
        let targetId = urlParams.get('target_id');
        let amount = Number(urlParams.get('amount')) || 0;

        // Fallback a pending donation de sessionStorage si falta en URL
        const pendingStr = sessionStorage.getItem('walkie_pending_donation');
        if (pendingStr) {
          try {
            const pending = JSON.parse(pendingStr);
            if (!causeType && pending.category) causeType = pending.category;
            if (!targetId && pending.targetId) targetId = pending.targetId;
            if ((!amount || isNaN(amount)) && pending.amount) amount = Number(pending.amount);
            sessionStorage.removeItem('walkie_pending_donation');
          } catch {
            // ignore
          }
        }

        if (causeType === 'emergency_case' && targetId) {
          // 🚑 CASOS DE EMERGENCIA: Suma ÚNICAMENTE a la meta del animal específico
          const storageKey = targetId.startsWith('walkie_') ? targetId : `walkie_raised_${targetId}`;
          const currentSaved = Number(localStorage.getItem(storageKey)) || 0;
          const newTotal = currentSaved + amount;
          localStorage.setItem(storageKey, newTotal.toString());

          window.dispatchEvent(new CustomEvent('walkie_emergency_updated', {
            detail: { caseId: targetId, amount, newTotal }
          }));

          confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
        } else if (causeType === 'food_donation') {
          // 🍖 META DE ALIMENTO: Se incrementa EXCLUSIVAMENTE cuando la donación es de alimentos
          if (amount > 0) {
            setSolidarityAmount(prev => {
              const next = prev + amount;
              localStorage.setItem('walkie_meta_solidaria', JSON.stringify(next));
              return next;
            });
          }
          confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
        }

        // Limpiar parámetros para evitar re-procesamiento accidental al recargar
        const cleanPath = window.location.pathname;
        window.history.replaceState({}, '', cleanPath);
      }
    } catch (e) {
      console.warn('Error verificando retorno de Mercado Pago:', e);
    }
  }, []);

  useEffect(() => {
    if (clienteUser) {
      localStorage.setItem('walkie_cliente_user', JSON.stringify(clienteUser));
    } else {
      localStorage.removeItem('walkie_cliente_user');
    }
  }, [clienteUser]);

  useEffect(() => {
    if (paseadorUser) {
      localStorage.setItem('walkie_paseador_user', JSON.stringify(paseadorUser));
    } else {
      localStorage.removeItem('walkie_paseador_user');
    }
  }, [paseadorUser]);

  // 🛡️ Moderation: Handle Account Suspension on Banned Content
  const handleAccountSuspended = (detectedWord?: string, reason?: string) => {
    const email = clienteUser?.email || paseadorUser?.email || '';
    const telefono = clienteUser?.telefono || paseadorUser?.telefono || '';
    const nombre = clienteUser 
      ? `${clienteUser.nombre} ${clienteUser.apellido}` 
      : (paseadorUser ? `${paseadorUser.nombre} ${paseadorUser.apellido}` : 'Usuario Registrado');

    const details: SuspendedAccountDetails = {
      email,
      telefono,
      nombre,
      fechaSuspension: new Date().toLocaleString(),
      motivo: reason || 'Uso de lenguaje inapropiado, ofensivo o acoso detectado en el chat.',
      palabraDetectada: detectedWord
    };

    localStorage.setItem('walkie_suspended_account', JSON.stringify(details));
    setSuspendedDetails(details);
  };

  // Reset suspension (for demo / testing)
  const handleResetSuspension = () => {
    localStorage.removeItem('walkie_suspended_account');
    setSuspendedDetails(null);
  };

  // Session Logout Handler
  const handleLogout = () => {
    const walkerId = paseadorUser?.id;
    const clienteId = clienteUser?.id;
    if (walkerId) {
      fetch('/api/users/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: walkerId })
      }).catch(() => {});
    } else if (clienteId) {
      fetch('/api/users/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clienteId })
      }).catch(() => {});
    }
    setClienteUser(null);
    setPaseadorUser(null);
    localStorage.removeItem('walkie_cliente_user');
    localStorage.removeItem('walkie_paseador_user');
    authPromptedRef.current = false;
    setModo('inicio');
    setActiveTab('main');
    setInfoModal(null);
    setIsProfileOpen(false);
    setIsAuthOpen(false);
    setShowRoleSwitchModal(false);
  };

  // Add new request
  const handleAddSolicitud = (newSol: SolicitudPaseo) => {
    setSolicitudes(prev => [newSol, ...prev]);
  };

  // Update existing request (or append if accepted from dynamic test items)
  const handleUpdateSolicitud = (updated: SolicitudPaseo) => {
    setSolicitudes(prev => {
      const exists = prev.some(s => s.id === updated.id);
      if (exists) {
        return prev.map(s => s.id === updated.id ? updated : s);
      } else {
        return [updated, ...prev];
      }
    });
  };

  // Immediate Walker Location Sync handler across roles with delta check and backend push
  const handleWalkerLocationChange = useCallback((lat: number, lng: number, address: string) => {
    setUserLocation(prev => {
      if (Math.abs(prev.lat - lat) < 0.0001 && Math.abs(prev.lng - lng) < 0.0001 && prev.address === address) {
        return prev;
      }
      return { lat, lng, address };
    });

    const isAccountActiveSaved = localStorage.getItem('walkie_paseador_cuenta_activa');
    const isAvailable = isAccountActiveSaved !== null ? isAccountActiveSaved === 'true' : (paseadorUser?.disponible ?? true);
    const walkerId = paseadorUser?.id || 'pas-12345';

    fetch('/api/paseadores/posicion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: walkerId,
        nombre: paseadorUser?.nombre || 'Juan',
        apellido: paseadorUser?.apellido || 'Pérez',
        fotoPerfil: paseadorUser?.fotoPerfil,
        telefono: paseadorUser?.telefono,
        lat,
        lng,
        disponible: isAvailable,
        gpsActivo: isAvailable
      })
    }).catch(() => {});
  }, [paseadorUser]);

  // Immediate Client Location Sync handler across roles with delta check and backend push
  const handleClientLocationChange = useCallback((lat: number, lng: number, address: string) => {
    setClienteLocation(prev => {
      if (Math.abs(prev.lat - lat) < 0.0001 && Math.abs(prev.lng - lng) < 0.0001 && prev.address === address) {
        return prev;
      }
      const newLoc = { lat, lng, address };
      try { localStorage.setItem('walkie_cliente_location', JSON.stringify(newLoc)); } catch {}
      return newLoc;
    });

    // Notify backend so that walkers' radar and SSE stream receive the updated client position immediately:
    const clientId = clienteUser?.id || 'cli-active-client';
    const clientName = clienteUser ? `${clienteUser.nombre} ${clienteUser.apellido}`.trim() : 'Cliente Walkie';

    fetch('/api/clientes/posicion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: clientId,
        nombre: clientName,
        direccion: address,
        lat,
        lng,
        perros: clienteUser?.perros || []
      })
    }).catch(() => {});

    // Synchronize coordinates immediately across any existing requests owned by this client:
    setSolicitudes(prev => {
      let changed = false;
      const updated = prev.map(s => {
        const isClientMatch = (clienteUser && s.clienteId === clienteUser.id) || s.id.startsWith('sol-own-') || s.id.startsWith('sol-active-client-');
        if (isClientMatch) {
          if (Math.abs(s.ubicacion.lat - lat) < 0.0001 && Math.abs(s.ubicacion.lng - lng) < 0.0001 && s.ubicacion.direccion === address) {
            return s;
          }
          changed = true;
          return {
            ...s,
            ubicacion: { lat, lng, direccion: address }
          };
        }
        return s;
      });
      return changed ? updated : prev;
    });
  }, [clienteUser]);

  // Contribute to solidarity fund
  const handleContributeSolidarity = (amount: number) => {
    setSolidarityAmount(prev => prev + amount);
  };

  // Centralized role switch - Modo Invitado/Preview Libre sin bloqueo inmediato
  const handleSwitchToRole = (targetRole: 'cliente' | 'paseador' | 'inicio') => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0);

    if (targetRole === 'paseador') {
      setModo('paseador');
      setActiveTab('main');
      setInfoModal(null);
      setShowRoleSwitchModal(false);
      return;
    }

    if (targetRole === 'cliente') {
      setModo('cliente');
      setActiveTab('main');
      setInfoModal(null);
      setShowRoleSwitchModal(false);
      return;
    }

    setModo('inicio');
    setActiveTab('main');
    setInfoModal(null);
    setShowRoleSwitchModal(false);
  };

  // Role Selection from Landing / Header
  const handleSelectRole = (role: 'cliente' | 'paseador') => {
    handleSwitchToRole(role);
  };

  // Scroll to top whenever primary mode or activeTab changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [modo, activeTab]);

  // Open Auth for specific target and tab
  const handleOpenAuth = (role: 'cliente' | 'paseador' = 'cliente', initialTab: 'login' | 'register' = 'login') => {
    setAuthRoleTarget(role);
    setAuthInitialTab(initialTab);
    setIsAuthOpen(true);
  };

  // Autenticación con Google desde el Perfil
  const handleGoogleLoginFromProfile = (role: UserRole) => {
    setIsProfileOpen(false);
    handleOpenAuth(role === 'paseador' ? 'paseador' : 'cliente', 'login');
  };

  // 🔐 Integración Oficial Google One Tap GIS Callback
  const handleGoogleSuccessFromOneTap = async (googleUser: GoogleUserProfile) => {
    try {
      if (!googleUser || !googleUser.email) return;
      authPromptedRef.current = true;
      const normalizedEmail = (googleUser.email || '').trim().toLowerCase();

      // Comprobar si ya existe localmente
      let foundCli: UserCliente | null = null;
      let foundPas: UserPaseador | null = null;
      try {
        const savedCli = localStorage.getItem('walkie_cliente_user');
        if (savedCli) {
          const parsed = JSON.parse(savedCli);
          if (parsed.email && parsed.email.toLowerCase() === normalizedEmail) foundCli = parsed;
        }
        const savedPas = localStorage.getItem('walkie_paseador_user');
        if (savedPas) {
          const parsed = JSON.parse(savedPas);
          if (parsed.email && parsed.email.toLowerCase() === normalizedEmail) foundPas = parsed;
        }
      } catch {}

      // Consultar base de datos si no está en local
      if (!foundCli && !foundPas) {
        try {
          const res = await fetch(`/api/users/by-email?email=${encodeURIComponent(normalizedEmail)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
              if (data.user.role === 'cliente') {
                foundCli = {
                  id: data.user.id,
                  role: 'cliente',
                  email: data.user.email,
                  nombre: data.user.nombre,
                  apellido: data.user.apellido,
                  nombreUsuario: data.user.nombreUsuario,
                  telefono: data.user.telefono || '',
                  fotoPerfil: data.user.fotoPerfil,
                  terminosAceptados: true,
                  perros: data.user.perros || [],
                  direccionPredeterminada: data.user.direccion || 'Valle de Punilla',
                  fechaRegistro: data.user.fechaRegistro || new Date().toISOString()
                };
              } else if (data.user.role === 'paseador') {
                foundPas = {
                  id: data.user.id,
                  role: 'paseador',
                  email: data.user.email,
                  nombre: data.user.nombre,
                  apellido: data.user.apellido,
                  nombreUsuario: data.user.nombreUsuario,
                  telefono: data.user.telefono || '',
                  fotoPerfil: data.user.fotoPerfil,
                  experienciaAnimales: data.user.biografia || '',
                  zonaOperacion: 'Valle de Punilla (Radio 10 km)',
                  terminosAceptados: true,
                  esMayor18: true,
                  aprobado: true,
                  calificacion: data.user.calificacion || 5.0,
                  totalPaseos: data.user.totalPaseos || 0,
                  lat: data.user.lat || userLocation.lat,
                  lng: data.user.lng || userLocation.lng,
                  disponible: true,
                  fechaRegistro: data.user.fechaRegistro || new Date().toISOString()
                };
              }
            }
          }
        } catch {}
      }

      // Limpiar cualquier sesión anterior antes de persistir la nueva cuenta de Google
      cleanPreviousSession();

      if (foundCli) {
        localStorage.setItem('walkie_cliente_user', JSON.stringify(foundCli));
        localStorage.setItem('walkie_last_active_role', 'cliente');
        localStorage.setItem('walkie_google_last_account', JSON.stringify(googleUser));
        setClienteUser(foundCli);
        setModo('cliente');
        setActiveTab('main');
        setIsAuthOpen(false);
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        return;
      }

      if (foundPas) {
        localStorage.setItem('walkie_paseador_user', JSON.stringify(foundPas));
        localStorage.setItem('walkie_last_active_role', 'paseador');
        localStorage.setItem('walkie_google_last_account', JSON.stringify(googleUser));
        setPaseadorUser(foundPas);
        setModo('paseador');
        setActiveTab('main');
        setIsAuthOpen(false);
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        return;
      }

      // Si la cuenta no existe en el sistema, abrir el selector interactivo de rol (Dueño o Paseador)
      setInitialGoogleUserForModal(googleUser);
      setAuthRoleTarget(modo === 'paseador' ? 'paseador' : 'cliente');
      setAuthInitialTab('register');
      setIsAuthOpen(true);
    } catch (err) {
      console.error('Error en autenticación Google One Tap:', err);
    }
  };

  // Dynamic active walkers and clients lists guaranteeing bidirectional visibility with memoization
  const activeWalkersList: PaseadorPublico[] = useMemo(() => {
    const list: PaseadorPublico[] = [...registeredWalkers];
    if (paseadorUser) {
      const isAccountActiveSaved = typeof window !== 'undefined' ? localStorage.getItem('walkie_paseador_cuenta_activa') : null;
      const isAvailable = isAccountActiveSaved !== null ? isAccountActiveSaved === 'true' : (paseadorUser.disponible ?? true);
      const userWalkerItem: PaseadorPublico = {
        id: paseadorUser.id,
        nombre: paseadorUser.nombre,
        apellido: paseadorUser.apellido || '',
        nombreUsuario: paseadorUser.nombreUsuario || `@paseador_${paseadorUser.id.slice(-4)}`,
        email: paseadorUser.email,
        fotoPerfil: paseadorUser.fotoPerfil || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        telefono: paseadorUser.telefono || '',
        calificacion: paseadorUser.calificacion || 5.0,
        totalPaseos: paseadorUser.totalPaseos || 0,
        lat: userLocation.lat || paseadorUser.lat || -31.4201,
        lng: userLocation.lng || paseadorUser.lng || -64.4992,
        disponible: isAvailable,
        gpsActivo: isAvailable,
        biografia: paseadorUser.biografia || 'Paseador certificado Walkie'
      };
      const idx = list.findIndex(w => w.id === paseadorUser.id || (w.email && w.email.toLowerCase() === paseadorUser.email?.toLowerCase()));
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...userWalkerItem };
      } else {
        list.unshift(userWalkerItem);
      }
    }
    return list;
  }, [registeredWalkers, paseadorUser, userLocation.lat, userLocation.lng]);

  const activeClientsList: UserClientePublico[] = useMemo(() => {
    const list: UserClientePublico[] = [...registeredClients];
    if (clienteUser) {
      const clientItem: UserClientePublico = {
        id: clienteUser.id,
        nombre: `${clienteUser.nombre} ${clienteUser.apellido}`.trim() || 'Cliente Walkie',
        apellido: clienteUser.apellido || '',
        nombreUsuario: clienteUser.nombreUsuario || `@user_${clienteUser.id.slice(-4)}`,
        telefono: clienteUser.telefono || '',
        fotoPerfil: clienteUser.fotoPerfil || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
        lat: clienteLocation.lat || -31.4201,
        lng: clienteLocation.lng || -64.4992,
        direccion: clienteLocation.address || clienteUser.direccionPredeterminada || 'Punto de Retiro',
        perros: clienteUser.perros || []
      };
      const idx = list.findIndex(c => c.id === clienteUser.id || (c.email && c.email.toLowerCase() === clienteUser.email?.toLowerCase()));
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...clientItem };
      } else {
        list.unshift(clientItem);
      }
    } else {
      const guestItem: UserClientePublico = {
        id: 'cli-guest-preview',
        nombre: 'Cliente en Vivo',
        apellido: '',
        nombreUsuario: '@cliente_invitado',
        telefono: '',
        fotoPerfil: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
        lat: clienteLocation.lat || -31.4201,
        lng: clienteLocation.lng || -64.4992,
        direccion: clienteLocation.address || 'Punto de Retiro',
        perros: []
      };
      if (!list.some(c => c.id === 'cli-guest-preview' || c.id === 'cli-active-client')) {
        list.unshift(guestItem);
      }
    }
    return list;
  }, [registeredClients, clienteUser, clienteLocation.lat, clienteLocation.lng, clienteLocation.address]);

  return (
    <div className="min-h-screen bg-slate-100/60 font-sans text-slate-900 flex flex-col selection:bg-emerald-500 selection:text-white relative">
      {/* 🚨 PERMANENT ACCOUNT SUSPENSION SCREEN (Blocks system access upon inappropriate conduct) 🚨 */}
      {suspendedDetails && (
        <SuspendedAccountScreen
          details={suspendedDetails}
          onResetSuspension={handleResetSuspension}
          onLogout={() => {
            handleResetSuspension();
            handleLogout();
          }}
        />
      )}

      {/* GPS Enforcement Modal (Strict GPS requirement) */}
      {!hasGpsPermission && (
        <GpsBlockerModal
          hasPermission={hasGpsPermission}
          onPermissionGranted={(lat, lng, address) => {
            setHasGpsPermission(true);
            try { localStorage.setItem('walkie_gps_allowed', 'true'); } catch {}
            setUserLocation({ lat, lng, address });
          }}
          onSimulateDefaultLocation={() => {
            setHasGpsPermission(true);
            try { localStorage.setItem('walkie_gps_allowed', 'true'); } catch {}
          }}
          onClose={() => {
            setHasGpsPermission(true);
            try { localStorage.setItem('walkie_gps_allowed', 'true'); } catch {}
          }}
        />
      )}

      {/* Global Navigation */}
      <Navbar
        currentRole={modo}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onSwitchRole={() => setShowRoleSwitchModal(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={handleLogout}
        clienteUser={clienteUser}
        paseadorUser={paseadorUser}
        solidarityAmount={solidarityAmount}
        onOpenAuth={handleOpenAuth}
      />

      {/* Main App Content router */}
      <main className={`flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 ${modo === 'inicio' ? 'flex flex-col justify-center' : 'pb-24 md:pb-8'}`}>
        {modo === 'inicio' && (
          <LandingView
            onSelectRole={handleSelectRole}
            clienteUser={clienteUser}
            paseadorUser={paseadorUser}
            currentRoleState={modo}
            userLocation={userLocation}
            onLocationChange={handleWalkerLocationChange}
            onContinueCurrentRole={() => {
              if (clienteUser) {
                setModo('cliente');
                setActiveTab('main');
              } else if (paseadorUser) {
                setModo('paseador');
                setActiveTab('main');
              } else {
                setModo('cliente');
                setActiveTab('main');
              }
            }}
            onContinueToProfile={() => {
              if (clienteUser) {
                setModo('cliente');
                setActiveTab('main');
              } else if (paseadorUser) {
                setModo('paseador');
                setActiveTab('main');
              }
            }}
            onOpenNosotros={() => handleSelectTab('nosotros_faq')}
            onOpenMetas={() => handleSelectTab('meta_solidaria')}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {modo === 'cliente' && (
          <VistaCliente
            user={clienteUser}
            paseadorUser={paseadorUser}
            onOpenAuth={() => handleOpenAuth('cliente')}
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            solicitudes={solicitudes}
            onAddSolicitud={handleAddSolicitud}
            onUpdateSolicitud={handleUpdateSolicitud}
            solidarityAmount={solidarityAmount}
            onContributeSolidarity={handleContributeSolidarity}
            userLat={clienteLocation.lat}
            userLng={clienteLocation.lng}
            userAddress={clienteLocation.address}
            onLocationChange={handleClientLocationChange}
            registeredWalkers={activeWalkersList}
            onSwitchToPaseador={() => handleSwitchToRole('paseador')}
            selectedPlan={planSeleccionado}
            onSelectPlan={setPlanSeleccionado}
          />
        )}

        {modo === 'paseador' && (
          <VistaPaseador
            user={paseadorUser}
            clienteUser={clienteUser}
            clienteLocation={clienteLocation}
            onOpenAuth={() => handleOpenAuth('paseador')}
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            solicitudes={solicitudes}
            onUpdateSolicitud={handleUpdateSolicitud}
            solidarityAmount={solidarityAmount}
            onContributeSolidarity={handleContributeSolidarity}
            walkerLat={userLocation.lat}
            walkerLng={userLocation.lng}
            registeredWalkers={activeWalkersList}
            registeredClients={activeClientsList}
            onLocationChange={handleWalkerLocationChange}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Thumb-Friendly, Fixed Bottom) */}
      <nav
        id="mobile-bottom-navigation"
        aria-label="Navegación Móvil Rápida"
        className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-2 py-1.5 md:hidden flex items-center justify-around shadow-2xl safe-area-bottom"
      >
        {/* 1. Inicio */}
        <button
          type="button"
          id="btn-mobile-nav-inicio"
          onClick={() => {
            if (modo !== 'inicio') {
              setActiveTab('main');
            }
            if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1.5 px-2.5 rounded-2xl transition-all cursor-pointer active:scale-95 ${
            activeTab === 'main'
              ? 'text-emerald-600 font-black'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight font-bold">Inicio</span>
        </button>

        {/* 2. Mapa */}
        <button
          type="button"
          id="btn-mobile-nav-mapa"
          onClick={() => {
            if (modo === 'inicio') {
              setModo('cliente');
              setActiveTab('main');
            } else if (modo === 'paseador') {
              window.dispatchEvent(new CustomEvent('walkie_paseador_subtab', { detail: 'mapa_solicitudes' }));
            }
            setTimeout(() => {
              const el = document.getElementById('seccion-mapa-principal') || document.getElementById('seccion-radar-mapa');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
          className="flex flex-col items-center justify-center min-h-[48px] py-1.5 px-2.5 rounded-2xl text-slate-500 hover:text-emerald-600 transition-all cursor-pointer active:scale-95"
        >
          <MapPin className="w-5 h-5 mb-0.5 text-emerald-600" />
          <span className="text-[10px] tracking-tight font-bold">Mapa</span>
        </button>

        {/* 3. Calendario */}
        <button
          type="button"
          id="btn-mobile-nav-calendario"
          onClick={() => {
            if (modo === 'inicio') {
              setModo('cliente');
              setActiveTab('main');
            } else if (modo === 'paseador') {
              window.dispatchEvent(new CustomEvent('walkie_paseador_subtab', { detail: 'agenda_mensual' }));
            }
            setTimeout(() => {
              const el = document.getElementById('seccion-agenda-mensual') || document.getElementById('seccion-planes-paseo') || document.getElementById('seccion-calendario-semanas');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
          className="flex flex-col items-center justify-center min-h-[48px] py-1.5 px-2.5 rounded-2xl text-slate-500 hover:text-blue-600 transition-all cursor-pointer active:scale-95"
        >
          <Calendar className="w-5 h-5 mb-0.5 text-blue-600" />
          <span className="text-[10px] tracking-tight font-bold">Calendario</span>
        </button>

        {/* 4. Perfil */}
        <button
          type="button"
          id="btn-mobile-nav-perfil"
          onClick={() => {
            if (modo === 'cliente') {
              setActiveTab('perfil');
            } else {
              setIsProfileOpen(true);
            }
          }}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1.5 px-2.5 rounded-2xl transition-all cursor-pointer active:scale-95 ${
            activeTab === 'perfil'
              ? 'text-purple-600 font-black'
              : 'text-slate-500 hover:text-purple-600'
          }`}
        >
          <User className="w-5 h-5 mb-0.5 text-purple-600" />
          <span className="text-[10px] tracking-tight font-bold">Perfil</span>
        </button>

        {/* 5. Rol */}
        <button
          type="button"
          id="btn-mobile-nav-rol"
          onClick={() => setShowRoleSwitchModal(true)}
          className="flex flex-col items-center justify-center min-h-[48px] py-1.5 px-2.5 rounded-2xl text-slate-800 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer active:scale-95 border border-slate-200"
        >
          <RefreshCw className="w-4 h-4 mb-0.5 text-slate-700" />
          <span className="text-[9px] font-black uppercase text-slate-700">{modo === 'paseador' ? 'Paseador' : 'Cliente'}</span>
        </button>
      </nav>

      {/* 🌟 Google One Tap Prompt Oficial de GIS ("Accede a walkiepet.org con google.com") */}
      <GoogleOneTapPrompt
        isLoggedIn={Boolean(clienteUser || paseadorUser)}
        onGoogleSuccess={handleGoogleSuccessFromOneTap}
      />

      {/* Registration & Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setInitialGoogleUserForModal(null);
          authPromptedRef.current = true;
          try {
            sessionStorage.setItem('walkie_auth_prompt_dismissed', 'true');
          } catch {}
        }}
        role={authRoleTarget}
        initialTab={authInitialTab}
        existingClienteUser={clienteUser}
        existingPaseadorUser={paseadorUser}
        initialGoogleUser={initialGoogleUserForModal}
        userCoords={{ lat: userLocation.lat, lng: userLocation.lng }}
        onSuccessCliente={(user) => {
          setClienteUser(user);
          authPromptedRef.current = true;
          setInitialGoogleUserForModal(null);
          setModo('cliente');
          setActiveTab('main');
          setIsAuthOpen(false);
        }}
        onSuccessPaseador={(user) => {
          setPaseadorUser(user);
          authPromptedRef.current = true;
          setInitialGoogleUserForModal(null);
          setModo('paseador');
          setActiveTab('main');
          setIsAuthOpen(false);
        }}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentRole={modo}
        clienteUser={clienteUser}
        paseadorUser={paseadorUser}
        solicitudes={solicitudes}
        onOpenAuth={(role) => {
          setIsProfileOpen(false);
          setAuthRoleTarget(role === 'paseador' ? 'paseador' : 'cliente');
          setIsAuthOpen(true);
        }}
        onLoginGoogle={handleGoogleLoginFromProfile}
        onSwitchRole={() => {
          setShowRoleSwitchModal(true);
        }}
        onLogout={handleLogout}
        onAddNewDog={() => {
          setIsProfileOpen(false);
          setModo('cliente');
          setActiveTab('main');
          if (typeof window !== 'undefined') window.scrollTo(0, 0);
          window.dispatchEvent(new CustomEvent('walkie_open_add_dog'));
        }}
        onEditDog={(dog) => {
          setIsProfileOpen(false);
          setModo('cliente');
          setActiveTab('main');
          if (typeof window !== 'undefined') window.scrollTo(0, 0);
          window.dispatchEvent(new CustomEvent('walkie_open_edit_dog', { detail: dog }));
        }}
        onResetAppData={handleResetAllAppData}
      />

      {/* Modal Informativo Flotante 'Nosotros & FAQ' y 'Meta Solidaria' (Exclusivo para navegación desde Portada / Landing) */}
      <NosotrosMetasModal
        isOpen={infoModal !== null && modo === 'inicio'}
        activeModal={infoModal}
        onClose={handleCloseInfoModal}
        onSwitchModal={(modal) => {
          setInfoModal(modal);
          setActiveTab(modal === 'nosotros' ? 'nosotros_faq' : 'meta_solidaria');
        }}
        solidarityAmount={solidarityAmount}
        onContributeSolidarity={handleContributeSolidarity}
      />

      {/* Modal Compacto y Ergonómico de Cambio de Rol / Perfil */}
      {showRoleSwitchModal && (
        <div 
          className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150"
          onClick={() => setShowRoleSwitchModal(false)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl w-[85%] max-w-xs p-4 sm:p-5 shadow-2xl border border-slate-200 space-y-3.5 text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera compacta con botón cerrar */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-2 text-left">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm shadow-xs shrink-0">
                  🔄
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Cambiar Perfil
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Elegí tu modo de uso
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowRoleSwitchModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Opciones de Selección Rápida: Cliente / Paseador / Invitado */}
            <div className="space-y-2 pt-0.5">
              <button
                type="button"
                onClick={() => handleSwitchToRole('cliente')}
                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                  modo === 'cliente'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🐾</span>
                  <span className="text-left font-black">Modo Cliente</span>
                </div>
                {modo === 'cliente' && (
                  <span className="text-[9px] bg-white/25 text-white px-2 py-0.5 rounded-full font-bold">
                    Activo
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSwitchToRole('paseador')}
                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                  modo === 'paseador'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🦮</span>
                  <span className="text-left font-black">Modo Paseador</span>
                </div>
                {modo === 'paseador' && (
                  <span className="text-[9px] bg-white/25 text-white px-2 py-0.5 rounded-full font-bold">
                    Activo
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSwitchToRole('inicio')}
                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                  modo === 'inicio'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🏠</span>
                  <span className="text-left font-black">Modo Invitado</span>
                </div>
                {modo === 'inicio' && (
                  <span className="text-[9px] bg-white/25 text-white px-2 py-0.5 rounded-full font-bold">
                    Activo
                  </span>
                )}
              </button>
            </div>

            <p className="text-[10px] text-slate-400 leading-snug pt-0.5">
              Alterná cuando quieras entre contratar paseos o prestar servicios en Punilla.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
