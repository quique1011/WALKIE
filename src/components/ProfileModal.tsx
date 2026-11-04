import React, { useState, useEffect } from 'react';
import { UserCliente, UserPaseador, UserRole, DogProfile, SolicitudPaseo } from '../types';
import { formatPesos } from '../utils/geo';
import { getPaseadorWallet, withdrawPaseadorBalance } from '../utils/walletPaseador';
import {
  User,
  Phone,
  Calendar,
  Mail,
  MapPin,
  ShieldCheck,
  Award,
  X,
  LogOut,
  PawPrint,
  Plus,
  Edit2,
  Trash2,
  Heart,
  CheckCircle2,
  Clock,
  Star,
  Dog,
  DollarSign,
  Sparkles,
  Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DogWeeklyWalksProgressBar } from './DogWeeklyWalksProgressBar';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  clienteUser: UserCliente | null;
  paseadorUser: UserPaseador | null;
  onSwitchRole: () => void;
  onLogout?: () => void;
  onLoginGoogle?: (role: UserRole) => void;
  onOpenAuth?: (role: UserRole) => void;
  dogs?: DogProfile[];
  onAddNewDog?: () => void;
  onEditDog?: (dog: DogProfile) => void;
  onDeleteDog?: (dogId: string) => void;
  solicitudes?: SolicitudPaseo[];
  onResetAppData?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  clienteUser,
  paseadorUser,
  onSwitchRole,
  onLogout,
  onLoginGoogle,
  onOpenAuth,
  dogs,
  onAddNewDog,
  onEditDog,
  onDeleteDog,
  solicitudes = [],
  onResetAppData
}) => {
  const [localDogs, setLocalDogs] = useState<DogProfile[]>([]);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  // Sincronizar lista de mascotas desde props o localStorage únicamente si el modal está abierto
  useEffect(() => {
    if (!isOpen) return;
    if (dogs && dogs.length > 0) {
      setLocalDogs(prev => JSON.stringify(prev) === JSON.stringify(dogs) ? prev : dogs);
    } else {
      const saved = localStorage.getItem('walkie_cliente_perros_lista');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setLocalDogs(prev => JSON.stringify(prev) === JSON.stringify(parsed) ? prev : parsed);
          }
        } catch (e) {
          console.error(e);
        }
      } else if (clienteUser?.perros && clienteUser.perros.length > 0) {
        setLocalDogs(prev => JSON.stringify(prev) === JSON.stringify(clienteUser.perros) ? prev : (clienteUser.perros || []));
      }
    }
  }, [dogs, clienteUser, isOpen]);

  if (!isOpen) return null;

  const isCliente = currentRole === 'cliente';
  const user = isCliente ? clienteUser : paseadorUser;

  const handleAddPet = () => {
    if (!user) {
      onClose();
      if (onOpenAuth) {
        onOpenAuth('cliente');
      }
      return;
    }
    onClose();
    if (onAddNewDog) {
      onAddNewDog();
    } else {
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
        window.dispatchEvent(new CustomEvent('walkie_open_add_dog'));
      }
    }
  };

  const handleEditPet = (dog: DogProfile) => {
    if (!user) {
      onClose();
      if (onOpenAuth) {
        onOpenAuth('cliente');
      }
      return;
    }
    onClose();
    if (onEditDog) {
      onEditDog(dog);
    } else {
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
        window.dispatchEvent(new CustomEvent('walkie_open_edit_dog', { detail: dog }));
      }
    }
  };

  const handleDeletePet = (dogId: string, dogName: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el perfil de ${dogName}?`)) {
      const updated = localDogs.filter(d => d.id !== dogId);
      setLocalDogs(updated);
      localStorage.setItem('walkie_cliente_perros_lista', JSON.stringify(updated));
      if (onDeleteDog) {
        onDeleteDog(dogId);
      }
    }
  };

  return (
    <AnimatePresence>
      <div
        key="profile-modal-backdrop"
        id="profile-modal-backdrop"
        className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden relative my-auto max-h-[90vh] flex flex-col"
        >
          {/* Header del Perfil */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 sm:p-6 relative shrink-0">
            <button
              type="button"
              id="btn-close-profile"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {user?.fotoPerfil ? (
                  <img
                    src={user.fotoPerfil}
                    alt={user.nombreUsuario}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border-2 border-emerald-400 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-2xl font-black shadow-md">
                    {user?.nombre ? user.nombre.charAt(0) : (isCliente ? '🐾' : '🦮')}
                  </div>
                )}
                {user && (
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[10px] text-white">
                    ✓
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-black text-white truncate">
                    {user ? `${user.nombre} ${user.apellido || ''}` : '¡Sumate a Walkie!'}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {isCliente ? 'Perfil Cliente' : 'Perfil Paseador'}
                  </span>
                </div>
                <p className="text-emerald-400 font-mono text-xs mt-0.5">
                  {user ? `@${user.nombreUsuario}` : 'Modo Invitado / Sin Sesión'}
                </p>
                <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Valle de Punilla, Córdoba</span>
                </p>
              </div>
            </div>
          </div>

          {/* CUERPO DEL MODAL */}
          {!user ? (
            /* ========================================================================= */
            /* 🌟 INVITACIÓN A REGISTRO CON GOOGLE (USUARIO NO REGISTRADO / INVITADO)    */
            /* ========================================================================= */
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 flex flex-col justify-between">
              <div className="bg-gradient-to-b from-emerald-50/80 via-teal-50/40 to-white border-2 border-emerald-200/90 rounded-3xl p-6 sm:p-7 shadow-lg text-center relative overflow-hidden">
                <div className="w-16 h-16 rounded-3xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-4 shadow-md shadow-emerald-600/30">
                  <PawPrint className="w-8 h-8 animate-bounce" />
                </div>

                <h4 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  ¡Sumate a Walkie!
                </h4>

                <p className="text-slate-600 text-xs sm:text-sm mt-2 leading-relaxed max-w-sm mx-auto font-medium">
                  Registrate o iniciá sesión para gestionar tus paseos, mascotas y pagos.
                </p>

                {/* Beneficios Clave */}
                <div className="mt-5 space-y-2.5 text-left bg-white/95 backdrop-blur-xs p-4 rounded-2xl border border-emerald-100 shadow-2xs">
                  <div className="flex items-start gap-2.5 text-slate-700 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Administrá los perfiles médicos y rutinas de tus mascotas.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-slate-700 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Seguimiento GPS en vivo con cronómetro estricto de 45 minutos.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-slate-700 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Chat directo con paseadores certificados de Punilla.</span>
                  </div>
                </div>

                {/* Acciones de Autenticación */}
                <div className="mt-6 space-y-3">
                  {/* Botón Principal: Iniciar sesión / Registrarse */}
                  <button
                    id="btn-iniciar-sesion-registrarse"
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onOpenAuth) {
                        onOpenAuth(currentRole);
                      }
                    }}
                    className="w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/40 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-5 h-5 text-emerald-200" />
                    <span>Iniciar sesión / Registrarse</span>
                  </button>

                  {/* Opción Rápida: Google */}
                  <button
                    id="btn-profile-google-login"
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onLoginGoogle) {
                        onLoginGoogle(currentRole);
                      } else if (onOpenAuth) {
                        onOpenAuth(currentRole);
                      }
                    }}
                    className="w-full py-3.5 px-5 rounded-2xl border-2 border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/20 active:scale-[0.98] text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 shadow-xs hover:shadow-md transition-all cursor-pointer"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Continuar con Google</span>
                  </button>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>🔒 Acceso instantáneo</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSwitchRole();
                      }}
                      className="text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                    >
                      Alternar a Modo {isCliente ? 'Paseador' : 'Cliente'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Botones de acción al pie */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSwitchRole();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  🔄 Cambiar a Modo {isCliente ? 'Paseador' : 'Cliente'}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer transition-all text-center"
                >
                  Continuar como Invitado
                </button>
              </div>
            </div>
          ) : (
            /* Cuerpo del Modal con Scroll para Usuario Autenticado */
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs flex-1">
            {/* 1. INFORMACIÓN PERSONAL DEL CLIENTE */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Información Personal
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-600" /> Teléfono Móvil
                  </span>
                  <p className="font-bold text-slate-800 text-xs">
                    {user?.telefono || 'No especificado'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600" /> Domicilio / Ubicación
                  </span>
                  <p className="font-bold text-slate-800 text-xs truncate">
                    {isCliente
                      ? (clienteUser?.direccionPredeterminada || 'Villa Carlos Paz, Punilla')
                      : (paseadorUser?.zonaOperacion || 'Valle de Punilla (Radio 10 km)')}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-500" /> Correo Electrónico
                  </span>
                  <p className="font-semibold text-slate-700 text-xs break-all">
                    {user?.email || 'No registrado'}
                  </p>
                </div>

                {user?.fechaNacimiento && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" /> Fecha de Nacimiento
                    </span>
                    <p className="font-semibold text-slate-700 text-xs">
                      {user.fechaNacimiento}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. GESTIÓN DE SUS MASCOTAS (EXCLUSIVO CLIENTE) */}
            {isCliente && (
              <div className="space-y-3 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <PawPrint className="w-4 h-4 text-emerald-600" />
                      Mis Mascotas ({localDogs.length})
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Fichas médicas y cuidados especiales de tus perritos
                    </p>
                  </div>

                  {/* Botón "+" para agregar mascota */}
                  <button
                    type="button"
                    id="btn-perfil-modal-agregar-perro"
                    onClick={handleAddPet}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                    title="Agregar una nueva mascota"
                  >
                    <div className="w-4 h-4 rounded-full bg-white text-emerald-700 flex items-center justify-center text-xs font-black">
                      +
                    </div>
                    <span>+ Agregar Mascota</span>
                  </button>
                </div>

                {/* Tarjetas de mascotas */}
                {localDogs.length === 0 ? (
                  <div className="p-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-black mx-auto">
                      🐾
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-xs">
                        Aún no registraste ninguna mascota
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Agregá la ficha de tu perrito con su temperamento, peso y veterinario.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPet}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Registrar mi primer perro
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {localDogs.map((dog, dogIdx) => (
                      <div
                        key={`profile-dog-${dog.id || 'd'}-${dogIdx}`}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm transition-all space-y-2.5 flex flex-col justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                            <Dog className="w-6 h-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="font-black text-slate-900 text-sm truncate">
                              {dog.name}
                            </h5>
                            <p className="text-slate-500 text-[11px] truncate">
                              {dog.breed || 'Mestizo / Sin raza'} • {dog.age ? `${dog.age} años` : ''}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-bold">
                                {dog.temperament}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[9px] font-semibold">
                                {dog.weightCategory}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Barra de Progreso Semanal de Paseos */}
                        <DogWeeklyWalksProgressBar dog={dog} />

                        {/* Botones de acción de mascota */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleEditPet(dog)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 text-emerald-600" />
                            Editar Ficha
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePet(dog.id, dog.name)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Eliminar mascota"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Tarjeta rápida "+" para añadir otra */}
                    <button
                      type="button"
                      onClick={handleAddPet}
                      className="p-3.5 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-500 transition-all flex flex-col items-center justify-center text-center gap-1.5 min-h-[100px] cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-lg font-black group-hover:scale-110 transition-transform shadow-xs">
                        +
                      </div>
                      <span className="text-xs font-black text-emerald-950">
                        + Añadir otra mascota
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* CONTENIDO EXCLUSIVO PASEADOR: 3 CATEGORÍAS BIEN DEFINIDAS */}
            {!isCliente && (
              <div className="space-y-6">
                {/* 1. INFORMACIÓN PERSONAL */}
                <div id="perfil-modal-paseador-datos" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-4 h-4 text-emerald-600" />
                      1. Información Personal
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                      Verificado DNI
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" /> Nombre Completo
                      </span>
                      <p className="font-black text-slate-900 text-xs">
                        {user ? `${user.nombre} ${user.apellido}` : 'Carlos Gómez'}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" /> Teléfono Móvil
                      </span>
                      <p className="font-black text-slate-900 text-xs">
                        {user?.telefono || '+54 9 3541 55-8921'}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> DNI / Certificación
                      </span>
                      <p className="font-bold text-emerald-800 text-xs">
                        Identidad Verificada • Sin Antecedentes
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-600" /> Zona de Cobertura
                      </span>
                      <p className="font-bold text-slate-800 text-xs truncate">
                        {paseadorUser?.zonaOperacion || 'Valle de Punilla (Radio 10 km)'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. PASEOS REALIZADOS */}
                {(() => {
                  const paseosRealizados = solicitudes.filter(s => s.estado === 'completada' || s.estado === 'finalizado' || s.etapaSeguimiento === 'finalizado');
                  const totalPaseosCount = paseosRealizados.length;
                  const totalMinutosPaseos = paseosRealizados.reduce((acc, s) => acc + (s.duracionMinutos || 45), 0);
                  const horasEnCampo = totalMinutosPaseos / 60;
                  const caloriasQuemadas = totalMinutosPaseos * 3.5;
                  const totalEarnedNeto = paseosRealizados.reduce((acc, s) => acc + (s.montoNetoPaseador || Math.round(s.montoTotal * 0.8)), 0);

                  return (
                    <div id="perfil-paseos-realizados-seccion" className="space-y-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          2. Paseos Realizados
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                          {totalPaseosCount} completados
                        </span>
                      </div>

                      {/* Métricas esenciales de paseos y saldo */}
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Paseos Realizados</span>
                          <span className="text-base font-black text-slate-900 block mt-0.5">{totalPaseosCount}</span>
                          <span className="text-[9px] text-emerald-700 font-semibold">100% finalizados</span>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase block">Saldo Neto Generado</span>
                          <span className="text-base font-black text-emerald-700 block mt-0.5 font-mono">
                            {formatPesos(totalEarnedNeto)}
                          </span>
                          <span className="text-[9px] text-emerald-800 font-semibold">80% directo por paseo</span>
                        </div>
                      </div>

                      {/* Lista de historial de paseos completados */}
                      <div className="space-y-2">
                        {paseosRealizados.length === 0 ? (
                          <div className="p-3.5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1">
                            <Dog className="w-5 h-5 text-slate-300 mx-auto" />
                            <p className="text-xs font-bold text-slate-600">
                              Sin paseos completados en la sesión actual
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Al validar el Código 2 de Devolución en tus paseos de hoy, aparecerán registrados aquí.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                            {paseosRealizados.map((sol, solIdx) => (
                              <div
                                key={`profile-realizado-${sol.id}-${solIdx}`}
                                className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 shadow-2xs flex items-center justify-between gap-2.5 transition-all"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-400 text-emerald-700 flex items-center justify-center shrink-0">
                                    <Dog className="w-5 h-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1">
                                      <h5 className="font-black text-slate-900 text-xs truncate">
                                        {sol.perro.name}
                                      </h5>
                                      <span className="text-[8px] font-bold bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded-full">
                                        Plan {sol.tipoPlan}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 truncate">
                                      {sol.clienteNombre} • {sol.ubicacion.direccion}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="text-xs font-black text-emerald-600 font-mono block">
                                    {formatPesos(sol.montoNetoPaseador || Math.round(sol.montoTotal * 0.8))}
                                  </span>
                                  <span className="text-[9px] text-slate-400">Cobrado</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 3. BILLETERA Y RESEÑAS */}
                {(() => {
                  const wallet = getPaseadorWallet();

                  return (
                    <div id="perfil-billetera-resenas-seccion" className="space-y-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          3. Billetera y Reseñas
                        </h4>
                        <span className="text-[10px] font-black text-amber-600 flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> 5.0 (Excelente)
                        </span>
                      </div>

                      {/* Tarjeta de Billetera Financiera */}
                      <div className="p-4 rounded-2xl bg-emerald-950 text-white flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider block">
                            Saldo Disponible
                          </span>
                          <span className="text-xl font-black text-white font-mono block">
                            {formatPesos(wallet.saldoDisponible)}
                          </span>
                          <span className="text-[9px] text-emerald-200/80">
                            {wallet.totalRetirado > 0 ? `Total retirado histórico: ${formatPesos(wallet.totalRetirado)}` : 'Sin multas registradas ($0)'}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={wallet.saldoDisponible <= 0}
                          onClick={() => {
                            if (wallet.saldoDisponible <= 0) return;
                            withdrawPaseadorBalance(wallet.saldoDisponible, 'alias', 'carlos.walkie.mp');
                            alert(`¡Retiro exitoso! Se transfirió todo el saldo disponible a tu cuenta. Saldo actual: $0.`);
                          }}
                          className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs cursor-pointer shadow transition-all"
                        >
                          Retirar dinero
                        </button>
                      </div>

                      {/* Resumen de Calificaciones y Reseñas */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Opiniones de Clientes
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700">
                            100% Recomendado
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 italic">
                          "Excelente paseador, muy puntual y cariñoso con los perritos en Carlos Paz."
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Acciones del perfil */}
            <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSwitchRole();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  🔄 Cambiar a Modo {isCliente ? 'Paseador' : 'Cliente'}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer transition-all text-center"
                >
                  Cerrar
                </button>
              </div>

              {onLogout && (
                <button
                  type="button"
                  id="btn-logout-modal"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-rose-200 hover:border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  Cerrar Sesión de la Cuenta
                </button>
              )}

              {onResetAppData && (
                <button
                  type="button"
                  id="btn-reset-db-modal"
                  onClick={() => {
                    if (window.confirm('¿Deseas reiniciar y vaciar todos los datos de almacenamiento local (cuentas, perros, solicitudes y billetera)? La app arrancará en estado 100% limpio.')) {
                      onClose();
                      onResetAppData();
                    }
                  }}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                  Restablecer / Vaciar Base de Datos Local
                </button>
              )}
            </div>
          </div>
        )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
