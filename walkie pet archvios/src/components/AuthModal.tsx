import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, CheckCircle2, Shield, User, Mail, Phone, Calendar, 
  FileText, Upload, AlertCircle, Sparkles, Lock, ArrowRight, Check, Camera, LogIn, UserPlus
} from 'lucide-react';
import { UserCliente, UserPaseador } from '../types';
import { 
  TEXTO_TERMINOS_CLIENTE, 
  TEXTO_TERMINOS_PASEADOR, 
  EMAIL_DESTINO
} from '../data/initialData';
import confetti from 'canvas-confetti';
import { compressImageFile } from '../utils/imageCompressor';
import { 
  GoogleUserProfile, 
  decodeGoogleJwt, 
  formatUsernameFromEmail, 
  parseNameParts, 
  GOOGLE_CLIENT_ID,
  getCurrentDomainInfo,
  cleanPreviousSession
} from '../utils/googleAuth';

interface AuthModalProps {
  role?: 'cliente' | 'paseador';
  initialTab?: 'login' | 'register';
  isOpen: boolean;
  onClose: () => void;
  onSuccessCliente: (user: UserCliente) => void;
  onSuccessPaseador: (user: UserPaseador) => void;
  existingClienteUser?: UserCliente | null;
  existingPaseadorUser?: UserPaseador | null;
  userCoords?: { lat: number; lng: number };
  initialGoogleUser?: GoogleUserProfile | null;
}

interface DocumentUploadCardProps {
  id: string;
  title: string;
  description: string;
  fileName: string;
  onFileSelect: (fileName: string) => void;
  onFileRemove: () => void;
}

const DocumentUploadCard: React.FC<DocumentUploadCardProps> = ({
  id,
  title,
  description,
  fileName,
  onFileSelect,
  onFileRemove
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file.name);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file.name);
    }
  };

  if (fileName) {
    return (
      <div 
        id={`card-doc-${id}`}
        className="p-3.5 rounded-2xl bg-emerald-50/80 border-2 border-emerald-500 shadow-2xs space-y-2 transition-all text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold text-xs text-slate-900 truncate">{title}</span>
          </div>
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 shrink-0">
            ✓ Cargado
          </span>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs">
          <span className="font-mono text-[11px] text-emerald-950 font-bold truncate" title={fileName}>
            📄 {fileName}
          </span>
          <button
            type="button"
            onClick={onFileRemove}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer shrink-0"
          >
            Quitar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`card-doc-${id}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className="p-3.5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30 transition-all cursor-pointer text-left group flex flex-col justify-between"
    >
      <input
        ref={fileInputRef}
        type="file"
        id={`input-file-${id}`}
        accept="image/*,.pdf,.doc,.docx"
        onChange={handleFileChange}
        className="hidden"
      />
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-bold text-xs text-slate-800 group-hover:text-emerald-800 transition-colors">
            {title}
          </span>
          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
            Obligatorio
          </span>
        </div>
        <p className="text-[10px] text-slate-500 line-clamp-1">{description}</p>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 group-hover:text-emerald-800">
        <Upload className="w-3.5 h-3.5" />
        <span>Seleccionar o arrastrar</span>
      </div>
    </div>
  );
};

export const AuthModal: React.FC<AuthModalProps> = ({
  role = 'cliente',
  initialTab = 'login',
  isOpen,
  onClose,
  onSuccessCliente,
  onSuccessPaseador,
  existingClienteUser,
  existingPaseadorUser,
  userCoords,
  initialGoogleUser
}) => {
  // Modal active tab: 'login' | 'register'
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);
  const [currentRole, setCurrentRole] = useState<'cliente' | 'paseador'>(role);

  // Strava 2-button clean view toggles
  const [showEmailRegisterForm, setShowEmailRegisterForm] = useState<boolean>(false);
  const [showEmailLoginForm, setShowEmailLoginForm] = useState<boolean>(false);
  const [showTermsInfoModal, setShowTermsInfoModal] = useState<boolean>(false);

  // Stepper: 1 (Auth/Method), 2 (Personal Data), 3 (Docs or Terms), 4 (Terms Paseador), 99 (Role selection for Google first-time)
  const [step, setStep] = useState<number>(1);
  const [isSelectingGoogleRole, setIsSelectingGoogleRole] = useState<boolean>(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<GoogleUserProfile | null>(null);
  const [welcomeData, setWelcomeData] = useState<{
    role: 'cliente' | 'paseador';
    userCliente?: UserCliente;
    userPaseador?: UserPaseador;
    googleUser: GoogleUserProfile;
  } | null>(null);


  const domainInfo = getCurrentDomainInfo();
  const displayDomain = domainInfo.isLocalhost ? `localhost:${typeof window !== 'undefined' ? (window.location.port || '3000') : '3000'}` : 'walkiepet.org';

  // Login form state (100% clean & empty)
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginOtpSent, setLoginOtpSent] = useState<boolean>(false);
  const [loginOtpGenerated, setLoginOtpGenerated] = useState<string>('');
  const [loginOtpInput, setLoginOtpInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  // Register form state (100% clean & empty)
  const [registerEmail, setRegisterEmail] = useState<string>('');
  const [registerOtpSent, setRegisterOtpSent] = useState<boolean>(false);
  const [registerOtpGenerated, setRegisterOtpGenerated] = useState<string>('');
  const [registerOtpInput, setRegisterOtpInput] = useState<string>('');
  const [registerOtpError, setRegisterOtpError] = useState<string>('');

  // Personal data state (100% clean & empty by default)
  const [nombre, setNombre] = useState<string>('');
  const [apellido, setApellido] = useState<string>('');
  const [fechaNacimiento, setFechaNacimiento] = useState<string>('');
  const [nombreUsuario, setNombreUsuario] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');
  const [fotoPerfil, setFotoPerfil] = useState<string>('');
  const [experienciaAnimales, setExperienciaAnimales] = useState<string>('');
  const [ageError, setAgeError] = useState<string>('');
  const walkerPhotoInputRef = useRef<HTMLInputElement>(null);

  // Documentation (Paseador) - Clean
  const [dniFrente, setDniFrente] = useState<string>('');
  const [dniDorso, setDniDorso] = useState<string>('');
  const [antecedentes, setAntecedentes] = useState<string>('');
  const [curriculum, setCurriculum] = useState<string>('');

  // Terms and scroll validation
  const termsBoxRef = useRef<HTMLDivElement>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState<boolean>(false);
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [declaroMayor18, setDeclaroMayor18] = useState<boolean>(false);
  const [declaroNoEmpleado, setDeclaroNoEmpleado] = useState<boolean>(false);
  const [validationAlert, setValidationAlert] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<boolean>(false);

  // Reset states on open/role change
  useEffect(() => {
    if (isOpen) {
      setCurrentRole(role);
      setActiveTab(initialTab);
      setStep(1);
      setShowEmailRegisterForm(false);
      setShowEmailLoginForm(false);
      setShowTermsInfoModal(false);
      setIsSelectingGoogleRole(false);
      setPendingGoogleUser(null);
      setWelcomeData(null);
      setValidationAlert(null);

      if (initialGoogleUser) {
        handleProcessGoogleAuth(initialGoogleUser);
      }

      // Clean all inputs
      setLoginEmail('');
      setLoginOtpSent(false);
      setLoginOtpInput('');
      setLoginError('');

      setRegisterEmail('');
      setRegisterOtpSent(false);
      setRegisterOtpInput('');
      setRegisterOtpError('');

      setNombre('');
      setApellido('');
      setFechaNacimiento('');
      setNombreUsuario('');
      setTelefono('');
      setFotoPerfil('');
      setExperienciaAnimales('');
      setAgeError('');

      setDniFrente('');
      setDniDorso('');
      setAntecedentes('');
      setCurriculum('');

      setScrolledToBottom(false);
      setAcceptedTerms(false);
      setDeclaroMayor18(false);
      setDeclaroNoEmpleado(false);
      setDispatchSuccess(false);
      setIsSubmitting(false);

      // Prefill only if switching roles from an existing authenticated user
      if (role === 'paseador' && existingClienteUser) {
        setRegisterEmail(existingClienteUser.email || '');
        setNombre(existingClienteUser.nombre || '');
        setApellido(existingClienteUser.apellido || '');
        setFechaNacimiento(existingClienteUser.fechaNacimiento || '');
        setNombreUsuario(existingClienteUser.nombreUsuario ? existingClienteUser.nombreUsuario.replace('@', '') : '');
        setTelefono(existingClienteUser.telefono || '');
        setActiveTab('register');
        setStep(2);
      } else if (role === 'cliente' && existingPaseadorUser) {
        setRegisterEmail(existingPaseadorUser.email || '');
        setNombre(existingPaseadorUser.nombre || '');
        setApellido(existingPaseadorUser.apellido || '');
        setFechaNacimiento(existingPaseadorUser.fechaNacimiento || '');
        setNombreUsuario(existingPaseadorUser.nombreUsuario ? existingPaseadorUser.nombreUsuario.replace('@', '') : '');
        setTelefono(existingPaseadorUser.telefono || '');
        setActiveTab('register');
        setStep(2);
      }
    }
  }, [isOpen, role, initialTab, existingClienteUser, existingPaseadorUser]);

  // Parse redirect access token from URL hash if OAuth redirect was triggered (Top-level Hook)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token')) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const token = hashParams.get('access_token');
      if (token) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => {
            if (data?.email) {
              const googleUser: GoogleUserProfile = {
                id: data.sub || `g-${Date.now()}`,
                email: data.email,
                name: data.name || '',
                givenName: data.given_name || (data.name ? data.name.split(' ')[0] : 'Usuario'),
                familyName: data.family_name || (data.name ? data.name.split(' ').slice(1).join(' ') : ''),
                picture: data.picture || '',
                emailVerified: true
              };
              handleProcessGoogleAuth(googleUser);
            }
          })
          .catch(err => {
            console.error('Error fetching Google profile from redirect token:', err);
            setValidationAlert('No se pudo verificar tu cuenta de Google. Por favor, intenta nuevamente.');
          });
      }
    }
  }, []);

  // Handle Terms Box Scroll
  const handleTermsScroll = () => {
    if (termsBoxRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = termsBoxRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 20) {
        setScrolledToBottom(true);
      }
    }
  };

  // =========================================================================
  // 🔐 NATIVE GOOGLE SIGN-IN & OAUTH 2.0 INTEGRATION (OFFICIAL GOOGLE PROVIDER DIRECTLY)
  // =========================================================================

  const handleStartGoogleSignIn = () => {
    try {
      setValidationAlert(null);

      const gClientId = GOOGLE_CLIENT_ID;

      // Helper: Invoca directamente el cliente oficial de Google OAuth
      const launchNativeGoogleAuth = () => {
        if (typeof window === 'undefined') return;

        if (window.google?.accounts?.oauth2 && gClientId) {
          try {
            const client = window.google.accounts.oauth2.initTokenClient({
              client_id: gClientId,
              scope: 'openid email profile',
              prompt: 'select_account',
              callback: async (resp: { access_token?: string; error?: string }) => {
                try {
                  if (resp.error) {
                    console.warn('GIS Token error callback:', resp.error);
                    if (resp.error === 'popup_closed_by_user') {
                      setValidationAlert('Se canceló el acceso con Google (ventana cerrada).');
                    } else if (resp.error === 'access_denied') {
                      setValidationAlert('Acceso denegado en Google.');
                    } else {
                      setValidationAlert(`No se completó la autenticación con Google (${resp.error}).`);
                    }
                    return;
                  }
                  if (resp.access_token) {
                    try {
                      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: { Authorization: `Bearer ${resp.access_token}` }
                      });
                      const data = await res.json();
                      if (data && data.email) {
                        const googleUser: GoogleUserProfile = {
                          id: data.sub || `g-${Date.now()}`,
                          email: data.email,
                          name: data.name || '',
                          givenName: data.given_name || (data.name ? data.name.split(' ')[0] : ''),
                          familyName: data.family_name || (data.name ? data.name.split(' ').slice(1).join(' ') : ''),
                          picture: data.picture || '',
                          emailVerified: true
                        };
                        handleProcessGoogleAuth(googleUser);
                        return;
                      }
                    } catch (e) {
                      console.warn('GIS userinfo fetch error:', e);
                      setValidationAlert('Error al obtener la información de tu perfil de Google.');
                      return;
                    }
                  }
                  setValidationAlert('No se recibió el token de confirmación de Google.');
                } catch (callbackErr) {
                  console.error('Error in GIS callback:', callbackErr);
                  setValidationAlert('No se pudo procesar la respuesta de Google.');
                }
              },
              error_callback: (nonOAuthError: any) => {
                console.warn('GIS Token error callback:', nonOAuthError);
                if (nonOAuthError?.type === 'popup_closed') {
                  setValidationAlert('Se cerró la ventana oficial de Google.');
                } else if (nonOAuthError?.type === 'popup_blocked') {
                  setValidationAlert('El navegador bloqueó la ventana emergente de Google. Habilitá las ventanas emergentes o ingresá con correo.');
                } else {
                  setValidationAlert('Error al conectar con Google. Podés ingresar tu correo a continuación.');
                }
              }
            });

            try {
              client.requestAccessToken({ prompt: 'select_account' });
            } catch (reqErr) {
              console.warn('Error calling requestAccessToken:', reqErr);
              setValidationAlert('El navegador impidió abrir la ventana de Google.');
            }
            return;
          } catch (e) {
            console.warn('GIS init error:', e);
            setValidationAlert('No se pudo iniciar el proveedor de Google. Podés ingresar con correo.');
          }
        }

        // Si el cliente GIS no está disponible, intentar popup sin redirigir el iframe
        const redirectUri = window.location.origin;
        const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(gClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent('openid email profile')}&prompt=select_account`;
        try {
          const popup = window.open(oauthUrl, 'google_oauth_popup', 'width=520,height=620');
          if (!popup || popup.closed || typeof popup.closed === 'undefined') {
            setValidationAlert('El navegador bloqueó la ventana de Google. Permití las ventanas emergentes o ingresá con correo.');
          }
        } catch (popupErr) {
          console.warn('Popup open error:', popupErr);
          setValidationAlert('El navegador no permitió abrir la ventana emergente de Google.');
        }
      };

      if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
        launchNativeGoogleAuth();
      } else if (typeof window !== 'undefined') {
        const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
        if (!existingScript) {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = () => {
            try { launchNativeGoogleAuth(); } catch (err) { console.warn(err); }
          };
          script.onerror = () => {
            setValidationAlert('No se pudo cargar el proveedor oficial de Google. Podés ingresar con correo.');
          };
          document.head.appendChild(script);
        } else {
          let count = 0;
          const checkGis = setInterval(() => {
            count++;
            if (window.google?.accounts?.oauth2 || count >= 10) {
              clearInterval(checkGis);
              try { launchNativeGoogleAuth(); } catch (err) { console.warn(err); }
            }
          }, 100);
        }
      }
    } catch (fatalErr) {
      console.error('Fatal in handleStartGoogleSignIn:', fatalErr);
      setValidationAlert('Ocurrió un error al intentar acceder con Google. Podés ingresar con correo.');
    }
  };

  // Process the selected Google User account
  const handleProcessGoogleAuth = async (googleUser: GoogleUserProfile) => {
    try {
      const normalizedEmail = googleUser.email.trim().toLowerCase();

      // Check if user already exists locally or in database
      let existingClient: UserCliente | null = null;
      let existingWalker: UserPaseador | null = null;

      try {
        const savedCli = localStorage.getItem('walkie_cliente_user');
        if (savedCli) {
          const parsed = JSON.parse(savedCli);
          if (parsed && parsed.email && parsed.email.toLowerCase() === normalizedEmail) {
            existingClient = parsed;
          }
        }
        const savedPas = localStorage.getItem('walkie_paseador_user');
        if (savedPas) {
          const parsed = JSON.parse(savedPas);
          if (parsed && parsed.email && parsed.email.toLowerCase() === normalizedEmail) {
            existingWalker = parsed;
          }
        }
      } catch {}

      // Also check server database
      if (!existingClient && !existingWalker) {
        try {
          const res = await fetch(`/api/users/by-email?email=${encodeURIComponent(normalizedEmail)}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.success && data.user) {
              if (data.user.role === 'cliente') {
                existingClient = {
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
                existingWalker = {
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
                  lat: data.user.lat || userCoords?.lat || -31.4201,
                  lng: data.user.lng || userCoords?.lng || -64.4992,
                  disponible: data.user.disponible ?? true,
                  fechaRegistro: data.user.fechaRegistro || new Date().toISOString()
                };
              }
            }
          }
        } catch (e) {
          console.warn('Error querying server user by email:', e);
        }
      }

      // REQUERIMIENTO 2: Limpiar el localStorage de cualquier estado de sesión anterior antes de guardar
      cleanPreviousSession();

      // REQUERIMIENTO 1: Si el usuario ya existe, iniciar sesión de inmediato
      if (existingClient && (!existingWalker || currentRole === 'cliente')) {
        const userDogsKey = `walkie_cliente_perros_lista_${existingClient.id}`;
        let clientDogs = existingClient.perros || [];
        const localDogs = localStorage.getItem(userDogsKey);
        if (localDogs) {
          try {
            const parsed = JSON.parse(localDogs);
            if (Array.isArray(parsed) && parsed.length > 0) clientDogs = parsed;
          } catch {}
        }
        existingClient.perros = clientDogs;
        localStorage.setItem(userDogsKey, JSON.stringify(clientDogs));
        localStorage.setItem('walkie_cliente_user', JSON.stringify(existingClient));
        localStorage.setItem('walkie_last_active_role', 'cliente');
        localStorage.setItem('walkie_google_last_account', JSON.stringify(googleUser));
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        onSuccessCliente(existingClient);
        onClose();
        return;
      }

      if (existingWalker) {
        localStorage.setItem('walkie_paseador_user', JSON.stringify(existingWalker));
        localStorage.setItem('walkie_last_active_role', 'paseador');
        localStorage.setItem('walkie_google_last_account', JSON.stringify(googleUser));
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        onSuccessPaseador(existingWalker);
        onClose();
        return;
      }

      // Si el usuario no existe, preguntar interactivamente si entra como Dueño de Mascota o Paseador
      setPendingGoogleUser(googleUser);
      setIsSelectingGoogleRole(true);
      setStep(99);
      setShowEmailRegisterForm(false);
      setShowEmailLoginForm(false);
      setValidationAlert(null);
    } catch (err) {
      console.error('Error al procesar login de Google:', err);
      setValidationAlert('No se pudo completar el acceso con Google. Intenta nuevamente.');
    }
  };

  // Complete first-time registration with selected role (if role chooser modal invoked)
  const handleConfirmGoogleRole = (selectedRole: 'cliente' | 'paseador') => {
    if (!pendingGoogleUser) return;

    try {
      setIsSubmitting(true);
      cleanPreviousSession();

      const { givenName, familyName } = parseNameParts(pendingGoogleUser.name, pendingGoogleUser.email);
      const cleanUsername = formatUsernameFromEmail(pendingGoogleUser.email);

      if (selectedRole === 'cliente') {
        const newCliente: UserCliente = {
          id: `cli-google-${Date.now()}`,
          role: 'cliente',
          email: pendingGoogleUser.email,
          nombre: pendingGoogleUser.givenName || givenName || 'Usuario',
          apellido: pendingGoogleUser.familyName || familyName || '',
          nombreUsuario: cleanUsername,
          telefono: '',
          fotoPerfil: pendingGoogleUser.picture || '',
          terminosAceptados: true,
          cuentaActiva: true,
          perros: [],
          direccionPredeterminada: 'Valle de Punilla',
          fechaRegistro: new Date().toISOString()
        };

        localStorage.setItem('walkie_cliente_user', JSON.stringify(newCliente));
        localStorage.setItem('walkie_last_active_role', 'cliente');
        localStorage.setItem('walkie_google_last_account', JSON.stringify(pendingGoogleUser));

        fetch('/api/users/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newCliente.id,
            role: 'cliente',
            rol: 'CLIENTE',
            email: newCliente.email,
            nombre: newCliente.nombre,
            apellido: newCliente.apellido,
            nombreUsuario: newCliente.nombreUsuario,
            telefono: newCliente.telefono,
            fotoPerfil: newCliente.fotoPerfil,
            lat: userCoords?.lat || -31.4201,
            lng: userCoords?.lng || -64.4992,
            autenticado: true
          })
        }).catch(() => {});

        confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
        setIsSubmitting(false);
        setIsSelectingGoogleRole(false);
        setWelcomeData({
          role: 'cliente',
          userCliente: newCliente,
          googleUser: pendingGoogleUser
        });
      } else {
        const newPaseador: UserPaseador = {
          id: `pas-google-${Date.now()}`,
          role: 'paseador',
          email: pendingGoogleUser.email,
          nombre: pendingGoogleUser.givenName || givenName || 'Usuario',
          apellido: pendingGoogleUser.familyName || familyName || '',
          nombreUsuario: cleanUsername,
          telefono: '',
          fotoPerfil: pendingGoogleUser.picture || '',
          experienciaAnimales: 'Paseador certificado Walkie',
          zonaOperacion: 'Valle de Punilla (Radio 10 km)',
          terminosAceptados: true,
          esMayor18: true,
          aprobado: true,
          calificacion: 5.0,
          totalPaseos: 0,
          lat: userCoords?.lat || -31.4201,
          lng: userCoords?.lng || -64.4992,
          disponible: true,
          fechaRegistro: new Date().toISOString()
        };

        localStorage.setItem('walkie_paseador_user', JSON.stringify(newPaseador));
        localStorage.setItem('walkie_last_active_role', 'paseador');
        localStorage.setItem('walkie_google_last_account', JSON.stringify(pendingGoogleUser));

        fetch('/api/users/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newPaseador.id,
            role: 'paseador',
            rol: 'PASEADOR',
            email: newPaseador.email,
            nombre: newPaseador.nombre,
            apellido: newPaseador.apellido,
            nombreUsuario: newPaseador.nombreUsuario,
            telefono: newPaseador.telefono,
            fotoPerfil: newPaseador.fotoPerfil,
            lat: newPaseador.lat,
            lng: newPaseador.lng,
            disponible: true,
            gpsActivo: true,
            autenticado: true
          })
        }).catch(() => {});

        confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
        setIsSubmitting(false);
        setIsSelectingGoogleRole(false);
        setWelcomeData({
          role: 'paseador',
          userPaseador: newPaseador,
          googleUser: pendingGoogleUser
        });
      }
    } catch (e) {
      console.error('Error confirming role:', e);
      setIsSubmitting(false);
    }
  };


  // =========================================================================
  // ✉️ MANUAL LOGIN & OTP VALIDATION
  // =========================================================================

  const handleSendLoginOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginEmail.includes('@')) {
      setLoginError('Ingresá un correo electrónico válido');
      return;
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setLoginOtpGenerated(code);
    setLoginOtpSent(true);
    setLoginError('');
  };

  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginOtpInput !== loginOtpGenerated && loginOtpInput !== '123456') {
      setLoginError('Código incorrecto. Ingresá el código de 6 dígitos que figura en pantalla.');
      return;
    }

    const emailNorm = loginEmail.trim().toLowerCase();

    // Check existing client or paseador
    let foundClient: UserCliente | null = null;
    let foundWalker: UserPaseador | null = null;

    try {
      const savedCli = localStorage.getItem('walkie_cliente_user');
      if (savedCli) {
        const parsed = JSON.parse(savedCli);
        if (parsed.email && parsed.email.toLowerCase() === emailNorm) foundClient = parsed;
      }
      const savedPas = localStorage.getItem('walkie_paseador_user');
      if (savedPas) {
        const parsed = JSON.parse(savedPas);
        if (parsed.email && parsed.email.toLowerCase() === emailNorm) foundWalker = parsed;
      }
    } catch {}

    // Check server
    if (!foundClient && !foundWalker) {
      try {
        const res = await fetch(`/api/users/by-email?email=${encodeURIComponent(emailNorm)}`);
        const data = await res.json();
        if (data.success && data.user) {
          if (data.user.role === 'cliente') {
            foundClient = {
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
          } else {
            foundWalker = {
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
              lat: data.user.lat || userCoords?.lat || -31.4201,
              lng: data.user.lng || userCoords?.lng || -64.4992,
              disponible: true,
              fechaRegistro: data.user.fechaRegistro || new Date().toISOString()
            };
          }
        }
      } catch {}
    }

    if (currentRole === 'paseador' && foundWalker) {
      localStorage.setItem('walkie_paseador_user', JSON.stringify(foundWalker));
      localStorage.setItem('walkie_last_active_role', 'paseador');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      onSuccessPaseador(foundWalker);
      onClose();
      return;
    }

    if (foundClient) {
      const userDogsKey = `walkie_cliente_perros_lista_${foundClient.id}`;
      let clientDogs = foundClient.perros || [];
      const localDogs = localStorage.getItem(userDogsKey);
      if (localDogs) {
        try {
          const parsed = JSON.parse(localDogs);
          if (Array.isArray(parsed) && parsed.length > 0) clientDogs = parsed;
        } catch {}
      }
      foundClient.perros = clientDogs;
      localStorage.setItem(userDogsKey, JSON.stringify(clientDogs));
      localStorage.setItem('walkie_cliente_user', JSON.stringify(foundClient));
      localStorage.setItem('walkie_last_active_role', 'cliente');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      onSuccessCliente(foundClient);
      onClose();
      return;
    }

    if (foundWalker) {
      localStorage.setItem('walkie_paseador_user', JSON.stringify(foundWalker));
      localStorage.setItem('walkie_last_active_role', 'paseador');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      onSuccessPaseador(foundWalker);
      onClose();
      return;
    }

    // If account not found, prompt to create account
    setLoginError('No encontramos una cuenta con ese correo. Creá tu cuenta gratis en la pestaña Registrarse.');
  };

  // =========================================================================
  // 📝 MANUAL REGISTRATION
  // =========================================================================

  const handleSendRegisterOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerEmail || !registerEmail.includes('@')) {
      setRegisterOtpError('Ingresá un correo electrónico válido');
      return;
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setRegisterOtpGenerated(code);
    setRegisterOtpSent(true);
    setRegisterOtpError('');
  };

  const handleVerifyRegisterOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (registerOtpInput === registerOtpGenerated || registerOtpInput === '123456') {
      const handle = formatUsernameFromEmail(registerEmail).replace('@', '');
      if (!nombreUsuario) setNombreUsuario(handle);
      setStep(2);
      setRegisterOtpError('');
    } else {
      setRegisterOtpError('Código incorrecto. Ingresá el código generado que figura en pantalla.');
    }
  };

  // Step 2 validation
  const validateStep2 = () => {
    if (!nombre.trim() || !apellido.trim() || !nombreUsuario.trim() || !telefono.trim() || !fechaNacimiento) {
      setValidationAlert('Por favor completá todos los datos obligatorios.');
      return false;
    }

    if (currentRole === 'paseador') {
      if (!fotoPerfil) {
        setValidationAlert('Debés subir una foto de perfil real (obligatorio).');
        return false;
      }
      const birthYear = new Date(fechaNacimiento).getFullYear();
      if (isNaN(birthYear) || birthYear > 2008) {
        setAgeError('Validación estricta: Debes ser mayor de 18 años (nacidos en 2008 o antes).');
        return false;
      }
      setAgeError('');
    }

    setValidationAlert(null);
    return true;
  };

  const handleNextFromStep2 = () => {
    if (validateStep2()) {
      setStep(3);
    }
  };

  const handleNextFromStep3Paseador = () => {
    if (!dniFrente) {
      setValidationAlert('Debés adjuntar la foto o archivo del DNI Frente (obligatorio).');
      return;
    }
    if (!dniDorso) {
      setValidationAlert('Debés adjuntar la foto o archivo del DNI Dorso (obligatorio).');
      return;
    }
    if (!antecedentes) {
      setValidationAlert('Debés adjuntar el Certificado de Antecedentes Penales (obligatorio).');
      return;
    }
    if (!curriculum) {
      setValidationAlert('Debés adjuntar tu Currículum Vitae (obligatorio).');
      return;
    }
    if (!experienciaAnimales.trim()) {
      setValidationAlert('Por favor agregá una breve descripción de tu experiencia con animales.');
      return;
    }
    setValidationAlert(null);
    setStep(4);
  };

  // Final Manual Submit
  const handleFinalSubmit = () => {
    if (!scrolledToBottom) {
      setValidationAlert('Debés scrollear hasta el final (100%) del texto de Términos y Condiciones para habilitar el botón.');
      return;
    }
    if (!acceptedTerms) {
      setValidationAlert('Debés marcar la casilla de aceptación de Términos y Condiciones.');
      return;
    }
    if (currentRole === 'paseador') {
      if (!dniFrente || !dniDorso || !antecedentes || !curriculum) {
        setValidationAlert('Debés adjuntar toda la documentación de identidad (DNI frente, DNI dorso, antecedentes y CV).');
        return;
      }
      if (!declaroMayor18) {
        setValidationAlert('Debés declarar bajo juramento ser mayor de 18 años.');
        return;
      }
      if (!declaroNoEmpleado) {
        setValidationAlert('Debés declarar bajo juramento no ser empleado directo de Walkie.');
        return;
      }
    }

    setIsSubmitting(true);
    setValidationAlert(null);

    const fichaPayload = {
      role: currentRole,
      email: registerEmail || (currentRole === 'cliente' ? existingPaseadorUser?.email : existingClienteUser?.email) || '',
      nombre,
      apellido,
      nombreUsuario: nombreUsuario.startsWith('@') ? nombreUsuario : `@${nombreUsuario}`,
      telefono,
      fechaNacimiento,
      fotoPerfil: fotoPerfil || undefined,
      experienciaAnimales: experienciaAnimales || undefined,
      zonaOperacion: 'Valle de Punilla (Radio 10 km)',
      documentos: currentRole === 'paseador' ? {
        dniFrente,
        dniDorso,
        antecedentesPenales: antecedentes,
        curriculum
      } : undefined,
      destinoEmail: EMAIL_DESTINO
    };

    fetch('/api/paseador/enviar-ficha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fichaPayload)
    }).catch(() => {});

    setTimeout(() => {
      setIsSubmitting(false);
      setDispatchSuccess(true);
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });

      setTimeout(() => {
        if (currentRole === 'cliente') {
          const newCliente: UserCliente = {
            id: existingClienteUser?.id || (existingPaseadorUser ? `cli-${existingPaseadorUser.id.replace('pas-', '')}` : `cli-${Date.now()}`),
            role: 'cliente',
            email: registerEmail || existingPaseadorUser?.email || '',
            nombre,
            apellido,
            fechaNacimiento,
            nombreUsuario: nombreUsuario.startsWith('@') ? nombreUsuario : `@${nombreUsuario}`,
            telefono,
            terminosAceptados: true,
            perros: existingClienteUser?.perros || [],
            direccionPredeterminada: existingClienteUser?.direccionPredeterminada || 'Villa Carlos Paz, Punilla',
            fechaRegistro: existingClienteUser?.fechaRegistro || new Date().toISOString()
          };
          localStorage.setItem('walkie_cliente_user', JSON.stringify(newCliente));
          localStorage.setItem('walkie_last_active_role', 'cliente');
          fetch('/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: newCliente.id,
              role: 'cliente',
              email: newCliente.email,
              nombre: newCliente.nombre,
              apellido: newCliente.apellido,
              nombreUsuario: newCliente.nombreUsuario,
              telefono: newCliente.telefono,
              lat: userCoords?.lat || -31.4201,
              lng: userCoords?.lng || -64.4992,
              autenticado: true
            })
          }).catch(() => {});
          onSuccessCliente(newCliente);
        } else {
          const newPaseador: UserPaseador = {
            id: existingPaseadorUser?.id || (existingClienteUser ? `pas-${existingClienteUser.id.replace('cli-', '')}` : `pas-${Date.now()}`),
            role: 'paseador',
            email: registerEmail || existingClienteUser?.email || '',
            fotoPerfil: existingPaseadorUser?.fotoPerfil || fotoPerfil,
            nombreUsuario: nombreUsuario.startsWith('@') ? nombreUsuario : `@${nombreUsuario}`,
            nombre,
            apellido,
            fechaNacimiento,
            telefono,
            experienciaAnimales,
            zonaOperacion: 'Valle de Punilla (Radio 10 km)',
            documentos: {
              dniFrente,
              dniDorso,
              antecedentesPenales: antecedentes,
              curriculum
            },
            terminosAceptados: true,
            esMayor18: true,
            aprobado: true,
            calificacion: existingPaseadorUser?.calificacion || 5.0,
            totalPaseos: existingPaseadorUser?.totalPaseos || 0,
            lat: userCoords?.lat || existingPaseadorUser?.lat || -31.4201,
            lng: userCoords?.lng || existingPaseadorUser?.lng || -64.4992,
            disponible: true,
            fechaRegistro: existingPaseadorUser?.fechaRegistro || new Date().toISOString()
          };
          localStorage.setItem('walkie_paseador_user', JSON.stringify(newPaseador));
          localStorage.setItem('walkie_last_active_role', 'paseador');
          fetch('/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: newPaseador.id,
              role: 'paseador',
              email: newPaseador.email,
              nombre: newPaseador.nombre,
              apellido: newPaseador.apellido,
              nombreUsuario: newPaseador.nombreUsuario,
              telefono: newPaseador.telefono,
              fotoPerfil: newPaseador.fotoPerfil,
              calificacion: newPaseador.calificacion,
              totalPaseos: newPaseador.totalPaseos,
              lat: newPaseador.lat,
              lng: newPaseador.lng,
              disponible: true,
              gpsActivo: true,
              autenticado: true
            })
          }).catch(() => {});
          onSuccessPaseador(newPaseador);
        }
        onClose();
      }, 1500);
    }, 1200);
  };

  if (!isOpen) return null;

  const isFinalButtonActive = currentRole === 'cliente' 
    ? (scrolledToBottom && acceptedTerms)
    : (scrolledToBottom && acceptedTerms && declaroMayor18 && declaroNoEmpleado);

  const isStravaCardView = step === 1 && !isSelectingGoogleRole && !showEmailRegisterForm && !showEmailLoginForm && !welcomeData;

  return (
    <div 
      id="auth-modal-backdrop" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`bg-white rounded-3xl ${isStravaCardView ? 'max-w-md' : 'max-w-xl'} w-full shadow-2xl border border-slate-200 overflow-hidden my-6 relative transition-all duration-200`}
      >
        {/* ========================================================================= */}
        {/* 🌟 VISTA 1: TARJETA LIMPIA ESTILO STRAVA (SIN BOTÓN DE APPLE, SOLO 2 BOTONES) */}
        {/* ========================================================================= */}
        {isStravaCardView ? (
          <div className="p-7 sm:p-9 space-y-6 text-center relative font-['Plus_Jakarta_Sans',sans-serif]">
            {/* Botón Cerrar */}
            <button
              onClick={onClose}
              id="btn-close-auth-strava"
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Ícono de Bienvenida */}
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-black mx-auto shadow-xs">
              🐾
            </div>

            {/* Título Motivacional y Enlace de Cambio de Flujo */}
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {activeTab === 'register'
                  ? 'Con el apoyo de una comunidad que te motiva'
                  : 'Te damos la bienvenida de nuevo'}
              </h2>
              <div className="text-xs sm:text-sm text-slate-600 font-medium">
                {activeTab === 'register' ? (
                  <>
                    ¿Ya eres miembro?{' '}
                    <button
                      type="button"
                      id="link-switch-to-login"
                      onClick={() => {
                        setActiveTab('login');
                        setShowEmailRegisterForm(false);
                        setShowEmailLoginForm(false);
                        setValidationAlert(null);
                      }}
                      className="text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      Iniciar sesión
                    </button>
                  </>
                ) : (
                  <>
                    ¿Aún no eres miembro?{' '}
                    <button
                      type="button"
                      id="link-switch-to-register"
                      onClick={() => {
                        setActiveTab('register');
                        setShowEmailRegisterForm(false);
                        setShowEmailLoginForm(false);
                        setValidationAlert(null);
                      }}
                      className="text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      Regístrate gratis
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Alerta de Validación si existe */}
            {validationAlert && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2.5 text-left">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>{validationAlert}</div>
              </div>
            )}

            {/* Acciones principales: ÚNICAMENTE 2 BOTONES (Sin Apple) */}
            <div className="space-y-3.5 pt-1">
              {/* a) "Registrarse con Google" / "Iniciar sesión con Google" (botón blanco/claro con icono multicolor de Google) */}
              <button
                id={activeTab === 'register' ? 'btn-register-google' : 'btn-login-google'}
                type="button"
                onClick={handleStartGoogleSignIn}
                className="w-full py-3.5 px-5 rounded-2xl border-2 border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm sm:text-base flex items-center justify-center gap-3 shadow-xs transition-all cursor-pointer active:scale-[0.99]"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>{activeTab === 'register' ? 'Registrarse con Google' : 'Iniciar sesión con Google'}</span>
              </button>

              {/* b) "Registrarse con el correo electrónico" (botón destacado en color primario de la app) */}
              <button
                id={activeTab === 'register' ? 'btn-register-email' : 'btn-login-email'}
                type="button"
                onClick={() => {
                  if (activeTab === 'register') {
                    setShowEmailRegisterForm(true);
                  } else {
                    setShowEmailLoginForm(true);
                  }
                }}
                className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Mail className="w-5 h-5 shrink-0" />
                <span>{activeTab === 'register' ? 'Registrarse con el correo electrónico' : 'Iniciar sesión con el correo electrónico'}</span>
              </button>
            </div>

            {/* Leyenda legal de términos en la parte inferior */}
            <p className="text-[11px] sm:text-xs text-slate-500 text-center leading-relaxed pt-2">
              Al continuar, aceptas nuestros{' '}
              <button
                type="button"
                onClick={() => setShowTermsInfoModal(true)}
                className="text-slate-800 font-bold underline hover:text-emerald-700 cursor-pointer"
              >
                Términos de servicio
              </button>{' '}
              y nuestra{' '}
              <button
                type="button"
                onClick={() => setShowTermsInfoModal(true)}
                className="text-slate-800 font-bold underline hover:text-emerald-700 cursor-pointer"
              >
                Política de privacidad
              </button>
              .
            </p>
          </div>
        ) : (
          /* ========================================================================= */
          /* 📋 VISTA 2: FORMULARIO DETALLADO (GOOGLE CHOOSER, EMAIL OTP O PASOS 2, 3, 4) */
          /* ========================================================================= */
          <>
            {/* Encabezado del Formulario */}
            <div className="bg-slate-900 text-white p-5 sm:p-6 relative">
              <button
                onClick={onClose}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Botón Volver a Opciones Strava cuando está en el formulario de correo paso 1 */}
              {step === 1 && (showEmailRegisterForm || showEmailLoginForm) && !isSelectingGoogleRole && (
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailRegisterForm(false);
                    setShowEmailLoginForm(false);
                    setValidationAlert(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-white font-bold mb-2 cursor-pointer transition-colors"
                >
                  ← Volver a opciones
                </button>
              )}

              {/* Role badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Walkie Punilla · Autenticación</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                {welcomeData
                  ? '¡Cuenta Creada con Éxito! 🎉'
                  : isSelectingGoogleRole
                  ? 'Definí tu rol en Walkie 🐾'
                  : activeTab === 'login'
                  ? 'Ingresar con Correo'
                  : step === 1
                  ? 'Registrate con Correo'
                  : 'Crear tu cuenta en Walkie'}
              </h2>

              <p className="text-slate-300 text-xs mt-1">
                {welcomeData
                  ? 'Te damos la bienvenida oficial a la plataforma WALKIE.'
                  : isSelectingGoogleRole
                  ? 'Elegí cómo vas a usar la plataforma con tu cuenta de Google para ingresar de inmediato.'
                  : activeTab === 'login'
                  ? 'Ingresá tu correo para recibir un código de acceso rápido.'
                  : `Paso ${step} de ${currentRole === 'cliente' ? 3 : 4}: ${
                      step === 1 ? 'Validación de Correo' :
                      step === 2 ? 'Datos Personales' :
                      step === 3 ? (currentRole === 'cliente' ? 'Términos y Condiciones' : 'Documentación y Experiencia') :
                      'Términos y Declaración Jurada'
                    }`
                }
              </p>

              {/* Multi-step progress bar for registration */}
              {!welcomeData && !isSelectingGoogleRole && activeTab === 'register' && step > 1 && (
                <div className="flex gap-1.5 mt-4">
                  {[1, 2, 3, ...(currentRole === 'paseador' ? [4] : [])].map((s) => (
                    <div
                      key={s}
                      className={`h-1.5 flex-1 rounded-full transition-all ${
                        step >= s ? 'bg-emerald-400' : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-7 space-y-5">
              {/* Validation Alert */}
              {validationAlert && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>{validationAlert}</div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* 🎉 VISTA DE BIENVENIDA Y CONFIRMACIÓN DE CUENTA CREADA (GOOGLE FIRST TIME) */}
              {/* ========================================================================= */}
              {welcomeData && (
                <div className="space-y-6 text-center py-2 animate-in fade-in duration-200">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl font-black mx-auto shadow-sm">
                    {welcomeData.role === 'cliente' ? '🐾' : '🦮'}
                  </div>

                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider">
                      <Check className="w-3.5 h-3.5" /> Cuenta Verificada y Activa
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                      ¡Bienvenido a WALKIE, {welcomeData?.googleUser?.givenName || welcomeData?.googleUser?.name || 'Usuario'}!
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                      {welcomeData?.role === 'cliente'
                        ? 'Tu cuenta como Dueño de Mascota ya está lista. Vas a poder registrar a tus perros, coordinar paseos individuales y seguir a los paseadores en tiempo real.'
                        : 'Tu cuenta como Paseador de Perros en el Valle de Punilla está activa. Vas a poder recibir solicitudes de paseos, gestionar tu agenda y establecer tus zonas de cobertura.'}
                    </p>
                  </div>

                  {/* Resumen del perfil registrado */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2.5">
                    <div className="flex items-center gap-3">
                      {welcomeData?.googleUser?.picture ? (
                        <img
                          src={welcomeData.googleUser.picture}
                          alt={welcomeData.googleUser.name || 'Usuario'}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-sm shrink-0">
                          {welcomeData?.googleUser?.givenName?.charAt(0) || welcomeData?.googleUser?.name?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-slate-900 truncate">
                            {welcomeData?.googleUser?.name || 'Usuario'}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                            {welcomeData?.role === 'cliente' ? 'Dueño de Mascota' : 'Paseador Oficial'}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 block truncate">
                          {welcomeData?.googleUser?.email || ''}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          📍 Valle de Punilla, Córdoba
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botón de entrada principal */}
                  <button
                    type="button"
                    id="btn-welcome-enter"
                    onClick={() => {
                      if (welcomeData?.role === 'cliente' && welcomeData.userCliente) {
                        onSuccessCliente(welcomeData.userCliente);
                      } else if (welcomeData?.role === 'paseador' && welcomeData.userPaseador) {
                        onSuccessPaseador(welcomeData.userPaseador);
                      }
                      onClose();
                    }}
                    className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    <span>
                      {welcomeData?.role === 'cliente'
                        ? 'Comenzar y registrar a mi mascota 🐾'
                        : 'Ingresar a mi agenda de paseos 🦮'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ========================================================================= */}
              {/* 🌟 VINCULACIÓN Y ROL DE USUARIO TRAS GOOGLE SIGN-IN (REQUERIMIENTO 3)      */}
              {/* ========================================================================= */}
              {!welcomeData && isSelectingGoogleRole && pendingGoogleUser && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Google Verified Account Badge */}
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {pendingGoogleUser?.picture ? (
                        <img
                          src={pendingGoogleUser.picture}
                          alt={pendingGoogleUser.name || 'Usuario Google'}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-full object-cover border-2 border-blue-500 shadow-sm shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                          {pendingGoogleUser?.givenName?.charAt(0) || pendingGoogleUser?.name?.charAt(0) || 'G'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {pendingGoogleUser?.name || 'Usuario Google'}
                        </span>
                        <span className="text-[11px] font-mono text-slate-600 block truncate">
                          {pendingGoogleUser?.email || ''}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Verificado
                    </span>
                  </div>

                  <div className="text-left space-y-1">
                    <h4 className="text-sm font-black text-slate-900">
                      ¿Cómo vas a utilizar Walkie?
                    </h4>
                    <p className="text-xs text-slate-500">
                      Seleccioná tu rol para ingresar inmediatamente al panel correspondiente:
                    </p>
                  </div>

                  {/* Role Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Option 1: Cliente / Dueño */}
                    <button
                      type="button"
                      id="btn-google-role-cliente"
                      onClick={() => handleConfirmGoogleRole('cliente')}
                      disabled={isSubmitting}
                      className="p-5 rounded-3xl border-2 border-emerald-500 hover:border-emerald-600 bg-white hover:bg-emerald-50/40 text-left transition-all shadow-sm hover:shadow-md cursor-pointer group active:scale-[0.98] disabled:opacity-50"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-bold mb-3 shadow-xs">
                        🐾
                      </div>
                      <span className="text-[10px] font-black uppercase text-emerald-700 block mb-0.5 tracking-wider">
                        Dueño de Mascota
                      </span>
                      <h5 className="text-sm font-black text-slate-900 leading-tight">
                        Cliente
                      </h5>
                      <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                        Contratá paseos individuales con GPS en tiempo real y reporte fotográfico para tus perros.
                      </p>
                      <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-black text-emerald-700">
                        <span>Ingresar como Cliente</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>

                    {/* Option 2: Paseador */}
                    <button
                      type="button"
                      id="btn-google-role-paseador"
                      onClick={() => handleConfirmGoogleRole('paseador')}
                      disabled={isSubmitting}
                      className="p-5 rounded-3xl border-2 border-slate-300 hover:border-slate-800 bg-white hover:bg-slate-50 text-left transition-all shadow-sm hover:shadow-md cursor-pointer group active:scale-[0.98] disabled:opacity-50"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center text-2xl font-bold mb-3 shadow-xs">
                        🦮
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-500 block mb-0.5 tracking-wider">
                        Red de Paseadores
                      </span>
                      <h5 className="text-sm font-black text-slate-900 leading-tight">
                        Paseador
                      </h5>
                      <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                        Aceptá paseos en tu radio de 10 km en Punilla, cobrá por cada servicio y organizá tus horarios.
                      </p>
                      <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-900">
                        <span>Ingresar como Paseador</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  </div>

                  {isSubmitting && (
                    <div className="p-3 text-center text-xs text-emerald-700 font-bold bg-emerald-50 rounded-xl animate-pulse">
                      Configurando tu perfil y abriendo el panel...
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* 🔑 PANTALLA: INICIAR SESIÓN CON CORREO (LOGIN FORM)                        */}
              {/* ========================================================================= */}
              {!welcomeData && !isSelectingGoogleRole && activeTab === 'login' && showEmailLoginForm && (
                <div className="space-y-4">
                  {!loginOtpSent ? (
                    <form onSubmit={handleSendLoginOtp} className="space-y-3.5 text-left">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Correo Electrónico
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                          <input
                            type="email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            placeholder="ejemplo@gmail.com"
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                            required
                          />
                        </div>
                      </div>

                      {loginError && <p className="text-xs text-rose-600 font-medium">{loginError}</p>}

                      <button
                        type="submit"
                        className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all cursor-pointer"
                      >
                        Ingresar con Código OTP
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyLoginOtp} className="space-y-4 text-left">
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800">
                        <span className="font-bold">Código OTP enviado a {loginEmail}:</span>
                        <div className="text-lg font-mono font-black text-emerald-700 mt-1 tracking-widest bg-white p-2 rounded-lg text-center border border-emerald-300">
                          {loginOtpGenerated}
                        </div>
                        <p className="text-[11px] text-emerald-600 mt-1">Copiá este código de 6 dígitos en el campo siguiente:</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Código de 6 Dígitos</label>
                        <input
                          type="text"
                          maxLength={6}
                          value={loginOtpInput}
                          onChange={(e) => setLoginOtpInput(e.target.value)}
                          placeholder=""
                          className="w-full text-center text-xl tracking-widest font-mono py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          required
                        />
                      </div>

                      {loginError && <p className="text-xs text-rose-600 font-medium">{loginError}</p>}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setLoginOtpSent(false)}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                        >
                          Cambiar Correo
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all cursor-pointer"
                        >
                          Verificar e Ingresar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* 📝 PANTALLA: REGISTRARSE CON CORREO (REGISTER - STEP 1 FORM)               */}
              {/* ========================================================================= */}
              {!welcomeData && !isSelectingGoogleRole && activeTab === 'register' && showEmailRegisterForm && step === 1 && (
                <div className="space-y-4">
                  {!registerOtpSent ? (
                    <form onSubmit={handleSendRegisterOtp} className="space-y-3.5 text-left">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Correo Electrónico
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                          <input
                            type="email"
                            value={registerEmail}
                            onChange={(e) => setRegisterEmail(e.target.value)}
                            placeholder="ejemplo@gmail.com"
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                            required
                          />
                        </div>
                      </div>

                      {registerOtpError && <p className="text-xs text-rose-600 font-medium">{registerOtpError}</p>}

                      <button
                        type="submit"
                        className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all cursor-pointer"
                      >
                        Enviar Código de Verificación
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyRegisterOtp} className="space-y-4 text-left">
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800">
                        <span className="font-bold">Código OTP enviado a {registerEmail}:</span>
                        <div className="text-lg font-mono font-black text-emerald-700 mt-1 tracking-widest bg-white p-2 rounded-lg text-center border border-emerald-300">
                          {registerOtpGenerated}
                        </div>
                        <p className="text-[11px] text-emerald-600 mt-1">Ingresá el código para continuar con tus datos:</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Código de 6 Dígitos</label>
                        <input
                          type="text"
                          maxLength={6}
                          value={registerOtpInput}
                          onChange={(e) => setRegisterOtpInput(e.target.value)}
                          placeholder=""
                          className="w-full text-center text-xl tracking-widest font-mono py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          required
                        />
                      </div>

                      {registerOtpError && <p className="text-xs text-rose-600 font-medium">{registerOtpError}</p>}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setRegisterOtpSent(false)}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                        >
                          Cambiar Correo
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all cursor-pointer"
                        >
                          Validar Código y Avanzar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

          {/* ========================================================================= */}
          {/* 📋 PASO 2: DATOS PERSONALES (CAMPOS 100% LIMPIOS SIN PLACEHOLDERS FICTICIOS)*/}
          {/* ========================================================================= */}
          {!welcomeData && !isSelectingGoogleRole && activeTab === 'register' && step === 2 && (
            <div className="space-y-4 text-left">
              {currentRole === 'paseador' && (
                <div className="space-y-2 p-3 bg-emerald-50/60 rounded-2xl border-2 border-emerald-300">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                      Foto de Perfil Real <span className="text-rose-600">* (Obligatorio)</span>
                    </label>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Cámara / Archivo
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Subí una foto nítida de tu rostro para que los clientes puedan identificarte al retirar y entregar a sus mascotas.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    {fotoPerfil ? (
                      <div className="relative shrink-0">
                        <img
                          src={fotoPerfil}
                          alt="Foto seleccionada"
                          className="w-16 h-16 rounded-full object-cover border-2 border-emerald-600 shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => setFotoPerfil('')}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white text-xs flex items-center justify-center cursor-pointer shadow hover:bg-rose-700"
                          title="Cambiar foto"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => walkerPhotoInputRef.current?.click()}
                        className="w-16 h-16 rounded-full bg-white border-2 border-dashed border-emerald-400 flex flex-col items-center justify-center text-emerald-600 cursor-pointer hover:bg-emerald-50 transition-colors shadow-2xs shrink-0"
                      >
                        <Camera className="w-6 h-6" />
                        <span className="text-[8px] font-black mt-0.5">Subir Foto</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <input
                        ref={walkerPhotoInputRef}
                        type="file"
                        id="input-foto-perfil-paseador"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const compressed = await compressImageFile(file, 1200, 0.82);
                              if (compressed) {
                                setFotoPerfil(compressed);
                                setValidationAlert(null);
                              }
                            } catch {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  setFotoPerfil(event.target.result as string);
                                  setValidationAlert(null);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }
                        }}
                        className="w-full text-xs text-slate-600 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                        required
                      />
                      {!fotoPerfil && (
                        <span className="text-[10px] text-rose-600 font-bold block mt-1">
                          ⚠️ Obligatorio: Carga tu foto real para continuar.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder=""
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Apellido</label>
                  <input
                    type="text"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    placeholder=""
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de Usuario</label>
                  <input
                    type="text"
                    value={nombreUsuario}
                    onChange={(e) => setNombreUsuario(e.target.value)}
                    placeholder=""
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono (WhatsApp)</label>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder=""
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fecha de Nacimiento {currentRole === 'paseador' && <span className="text-emerald-700 font-semibold">(Mayor de 18 años requerido)</span>}
                </label>
                <input
                  type="date"
                  value={fechaNacimiento}
                  onChange={(e) => {
                    setFechaNacimiento(e.target.value);
                    setAgeError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
                {ageError && <p className="text-xs text-rose-600 font-bold mt-1">{ageError}</p>}
              </div>

              <div className="flex justify-between items-center pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  ← Volver
                </button>
                <button
                  type="button"
                  onClick={handleNextFromStep2}
                  className="py-2.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 🦮 PASO 3 (PASEADOR): DOCUMENTACIÓN Y EXPERIENCIA                          */}
          {/* ========================================================================= */}
          {!welcomeData && !isSelectingGoogleRole && activeTab === 'register' && step === 3 && currentRole === 'paseador' && (
            <div className="space-y-4 text-left">
              <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Requisito de seguridad: Todos los documentos son auditados antes de habilitar los paseos activos.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <DocumentUploadCard
                  id="dni-frente"
                  title="DNI Frente"
                  description="Foto nítida o archivo PDF del frente de tu DNI"
                  fileName={dniFrente}
                  onFileSelect={(name) => {
                    setDniFrente(name);
                    setValidationAlert(null);
                  }}
                  onFileRemove={() => setDniFrente('')}
                />
                <DocumentUploadCard
                  id="dni-dorso"
                  title="DNI Dorso"
                  description="Foto nítida o archivo PDF del dorso de tu DNI"
                  fileName={dniDorso}
                  onFileSelect={(name) => {
                    setDniDorso(name);
                    setValidationAlert(null);
                  }}
                  onFileRemove={() => setDniDorso('')}
                />
                <DocumentUploadCard
                  id="antecedentes"
                  title="Antecedentes Penales"
                  description="Certificado emitido por RNR en PDF o foto legible"
                  fileName={antecedentes}
                  onFileSelect={(name) => {
                    setAntecedentes(name);
                    setValidationAlert(null);
                  }}
                  onFileRemove={() => setAntecedentes('')}
                />
                <DocumentUploadCard
                  id="curriculum"
                  title="Currículum Vitae (CV)"
                  description="Archivo PDF o documento con tu experiencia laboral"
                  fileName={curriculum}
                  onFileSelect={(name) => {
                    setCurriculum(name);
                    setValidationAlert(null);
                  }}
                  onFileRemove={() => setCurriculum('')}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Breve experiencia con animales *
                </label>
                <textarea
                  rows={3}
                  value={experienciaAnimales}
                  onChange={(e) => setExperienciaAnimales(e.target.value)}
                  placeholder=""
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  required
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  ← Volver
                </button>
                <button
                  type="button"
                  onClick={handleNextFromStep3Paseador}
                  className="py-2.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  Avanzar a Términos <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 📜 PASO FINAL: TÉRMINOS Y CONDICIONES (SCROLL OBLIGATORIO)                 */}
          {/* ========================================================================= */}
          {!welcomeData && !isSelectingGoogleRole && activeTab === 'register' && ((step === 3 && currentRole === 'cliente') || (step === 4 && currentRole === 'paseador')) && (
            <div className="space-y-4 text-left">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">
                  {currentRole === 'cliente' ? 'Términos y Condiciones para Contratantes' : 'Términos para Trabajadores (Paseadores)'}
                </span>
                <span className={`font-bold px-2 py-0.5 rounded-full ${
                  scrolledToBottom ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {scrolledToBottom ? '✓ Lectura completa al 100%' : 'Deslizá hasta el final ⬇'}
                </span>
              </div>

              {/* Scroll mandatory box */}
              <div
                ref={termsBoxRef}
                onScroll={handleTermsScroll}
                id="terms-scroll-box"
                className="h-44 overflow-y-auto p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs text-slate-700 leading-relaxed shadow-inner space-y-2 select-none"
              >
                <p className="font-semibold text-slate-900">
                  {currentRole === 'cliente' ? 'WALKIE - CONTRATO DE SERVICIOS PARA PROPIETARIOS' : 'WALKIE - ACUERDO DE PRESTACIÓN DE SERVICIOS PARA PASEADORES'}
                </p>
                <p>
                  {currentRole === 'cliente' ? TEXTO_TERMINOS_CLIENTE : TEXTO_TERMINOS_PASEADOR}
                </p>
                <p className="text-slate-500 pt-3 border-t border-slate-200 font-mono text-[10px]">
                  --- FIN DEL DOCUMENTO OFICIAL WALKIE ---
                </p>
              </div>

              {/* Checkboxes */}
              <div className="space-y-2.5 pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-800 font-medium">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                  />
                  <span>
                    Acepto los términos y condiciones oficiales de Walkie.
                  </span>
                </label>

                {currentRole === 'paseador' && (
                  <>
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-800 font-medium">
                      <input
                        type="checkbox"
                        checked={declaroMayor18}
                        onChange={(e) => setDeclaroMayor18(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                      />
                      <span>
                        Declaro ser mayor de 18 años.
                      </span>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-800 font-medium">
                      <input
                        type="checkbox"
                        checked={declaroNoEmpleado}
                        onChange={(e) => setDeclaroNoEmpleado(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                      />
                      <span>
                        Declaro no ser empleado directo de Walkie.
                      </span>
                    </label>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep(currentRole === 'cliente' ? 2 : 3)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  ← Volver
                </button>

                <button
                  type="button"
                  id="btn-submit-registration"
                  onClick={handleFinalSubmit}
                  disabled={!isFinalButtonActive || isSubmitting}
                  className={`py-3.5 px-6 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                    isFinalButtonActive
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/40 ring-4 ring-emerald-400/30 scale-[1.02]'
                      : 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed opacity-80'
                  }`}
                >
                  {isSubmitting ? (
                    <span>Procesando alta en Walkie...</span>
                  ) : dispatchSuccess ? (
                    <span className="flex items-center gap-1.5 text-white">
                      <CheckCircle2 className="w-4 h-4" /> ¡Alta Exitosa!
                    </span>
                  ) : (
                    <span>
                      {currentRole === 'cliente' ? 'Crear Cuenta y Comenzar 🚀' : 'Enviar Postulación Oficial 🦮'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    )}
  </motion.div>

        {/* Modal Informativo de Términos de Servicio y Política de Privacidad */}
        {showTermsInfoModal && (
          <div 
            id="modal-terminos-strava-overlay"
            className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setShowTermsInfoModal(false)}
          >
            <div 
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-left space-y-4 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-black text-slate-900">
                    Términos de Servicio y Privacidad
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTermsInfoModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
                <p>
                  <strong>1. Compromiso de Calidad y Seguridad:</strong> En Walkie garantizamos paseos individuales supervisados con monitoreo GPS en tiempo real y registro de inicio y fin mediante PIN de seguridad.
                </p>
                <p>
                  <strong>2. Cobertura Estricta de 10 km:</strong> Las operaciones de paseos se desarrollan exclusivamente dentro del radio de 10 km de la localidad o punto de retiro acordado en Punilla.
                </p>
                <p>
                  <strong>3. Protección de Datos y Privacidad:</strong> La información provista mediante Google o registro directo se utiliza exclusivamente para fines de coordinación del paseo y seguridad de tu mascota. No compartimos tus datos con terceros ni entidades comerciales externas.
                </p>
                <p>
                  <strong>4. Bienestar Animal:</strong> Los paseadores de la red se comprometen a seguir los protocolos de hidratación, uso estricto de correa y aviso preventivo ante emergencias.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowTermsInfoModal(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-sm transition-all"
              >
                Comprendido y Aceptado
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };
