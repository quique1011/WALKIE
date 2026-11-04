import React from 'react';
import { UserCliente, SolicitudPaseo, PaseadorPublico, DogProfile } from '../types';
import { formatPesos, formatWhatsAppLink } from '../utils/geo';
import { getOrBuildSolicitudDiasDesglose } from '../utils/planCalculations';
import { 
  User, CheckCircle2, Clock, Calendar, Dog, 
  Award, Phone, Star, ShieldCheck, MapPin, 
  ChevronRight, Plus, Heart, Sparkles, MessageSquare, ArrowLeft
} from 'lucide-react';
import { motion } from 'motion/react';

interface ClientePerfilHistorialSectionProps {
  user: UserCliente | null;
  solicitudes: SolicitudPaseo[];
  registeredWalkers?: PaseadorPublico[];
  onOpenAuth: () => void;
  onReturnToMain: () => void;
  onAddNewDog?: () => void;
  onOpenProfileModal?: () => void;
}

export const ClientePerfilHistorialSection: React.FC<ClientePerfilHistorialSectionProps> = ({
  user,
  solicitudes,
  registeredWalkers = [],
  onOpenAuth,
  onReturnToMain,
  onAddNewDog,
  onOpenProfileModal
}) => {
  // a) Historial de Paseos Realizados (Paseos completados de este cliente)
  const paseosCompletados = React.useMemo(() => {
    const list: Array<{
      id: string;
      fechaStr: string;
      horario: string;
      perroNombre: string;
      perroFoto?: string;
      perroRaza?: string;
      paseadorNombre: string;
      paseadorFoto?: string;
      paseadorTelefono?: string;
      tipoPlan: string;
      montoTotal: number;
      direccion: string;
    }> = [];

    solicitudes.forEach((sol) => {
      const isOwner = Boolean(user && sol.clienteId === user.id);
      if (!isOwner) return;

      const dias = getOrBuildSolicitudDiasDesglose(sol);
      const completedDays = dias.filter(d => d.estado === 'completado');

      if (completedDays.length > 0) {
        completedDays.forEach(cd => {
          list.push({
            id: `${sol.id}_${cd.id || cd.fechaStr}`,
            fechaStr: cd.fechaStr || sol.fechaProgramada || new Date().toISOString().split('T')[0],
            horario: cd.horario || sol.horarioPaseo || '17:00 hs',
            perroNombre: sol.perro.name,
            perroFoto: sol.perro.photoUrl,
            perroRaza: sol.perro.breed || sol.perro.raza || 'Canino',
            paseadorNombre: cd.paseadorNombre || sol.paseadorNombre || 'Paseador Walkie Certificado',
            paseadorFoto: cd.paseadorFoto || sol.paseadorFoto,
            paseadorTelefono: cd.paseadorTelefono || sol.paseadorTelefono,
            tipoPlan: sol.tipoPlan,
            montoTotal: cd.montoTotalCliente || Math.round(sol.montoTotal / (sol.diasSeleccionados?.length || 1)),
            direccion: sol.ubicacion.direccion
          });
        });
      } else if (sol.estado === 'completada') {
        list.push({
          id: sol.id,
          fechaStr: sol.fechaProgramada || new Date().toISOString().split('T')[0],
          horario: sol.horarioPaseo || '17:00 hs',
          perroNombre: sol.perro.name,
          perroFoto: sol.perro.photoUrl,
          perroRaza: sol.perro.breed || sol.perro.raza || 'Canino',
          paseadorNombre: sol.paseadorNombre || 'Paseador Walkie Certificado',
          paseadorFoto: sol.paseadorFoto,
          paseadorTelefono: sol.paseadorTelefono,
          tipoPlan: sol.tipoPlan,
          montoTotal: sol.montoTotal,
          direccion: sol.ubicacion.direccion
        });
      }
    });

    return list.sort((a, b) => (b.fechaStr > a.fechaStr ? 1 : -1));
  }, [solicitudes, user]);

  // b) Historial de Paseadores (Paseadores que han atendido a sus mascotas)
  const paseadoresAtendidos = React.useMemo(() => {
    const map = new Map<string, {
      id: string;
      nombre: string;
      fotoPerfil: string;
      telefono: string;
      calificacion: number;
      totalPaseosConMascotas: number;
      ultimosPerros: string[];
    }>();

    solicitudes.forEach((sol) => {
      const isOwner = Boolean(user && sol.clienteId === user.id);
      if (!isOwner) return;

      const walkerName = sol.paseadorNombre;
      const walkerId = sol.paseadorId || walkerName || 'paseador-cert';

      if (walkerName) {
        const existing = map.get(walkerId);
        const registered = registeredWalkers.find(w => w.id === walkerId || w.nombre === walkerName);

        if (existing) {
          existing.totalPaseosConMascotas += 1;
          if (!existing.ultimosPerros.includes(sol.perro.name)) {
            existing.ultimosPerros.push(sol.perro.name);
          }
        } else {
          map.set(walkerId, {
            id: walkerId,
            nombre: walkerName,
            fotoPerfil: sol.paseadorFoto || registered?.fotoPerfil || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
            telefono: sol.paseadorTelefono || registered?.telefono || '+54 9 3541 450123',
            calificacion: registered?.calificacion || 5.0,
            totalPaseosConMascotas: 1,
            ultimosPerros: [sol.perro.name]
          });
        }
      }
    });

    return Array.from(map.values());
  }, [solicitudes, registeredWalkers, user]);

  return (
    <div id="seccion-perfil-cliente-independiente" className="max-w-5xl mx-auto px-3 sm:px-4 space-y-6 pt-3 pb-24 animate-in fade-in duration-200">
      {/* Botón Volver y Título de la Solapa */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onReturnToMain}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600" />
            <span>Volver a Inicio</span>
          </button>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight flex items-center gap-2">
              <span>Mi Perfil e Historial</span>
              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                Cliente
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Historial de paseos realizados y red de paseadores que cuidaron a tus mascotas.
            </p>
          </div>
        </div>

        {user ? (
          <button
            type="button"
            onClick={onOpenProfileModal}
            className="py-2 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            Editar Datos de Cuenta
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            Registrar Cuenta de Cliente
          </button>
        )}
      </div>

      {/* Tarjeta de Resumen del Usuario */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
            {user?.fotoPerfil ? (
              <img src={user.fotoPerfil} alt={user.nombre} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              '🐾'
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                {user ? `${user.nombre} ${user.apellido}` : 'Usuario Dueño (Modo Invitado)'}
              </h3>
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono">
                {user?.nombreUsuario || '@dueno_walkie'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 justify-center sm:justify-start">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>{user?.direccionPredeterminada || 'Valle de Punilla, Córdoba'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center w-full sm:w-auto justify-around">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Paseos Hechos</span>
            <span className="text-lg font-black text-emerald-700 font-mono">{paseosCompletados.length}</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Paseadores</span>
            <span className="text-lg font-black text-slate-900 font-mono">{paseadoresAtendidos.length}</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 🌟 APARTADO A: HISTORIAL DE PASEOS REALIZADOS 🌟 */}
      {/* ======================================================== */}
      <section id="apartado-historial-paseos-realizados" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Historial de Paseos Realizados ({paseosCompletados.length})
              </h3>
              <p className="text-xs text-slate-500">
                Registro cronológico de servicios de 45 min concluidos con entrega por PIN.
              </p>
            </div>
          </div>
        </div>

        {paseosCompletados.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-dashed border-slate-300 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mx-auto shadow-2xs">
              🐕
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              Aún no tenés paseos completados en tu historial
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Cuando contrates un plan y el paseador finalice el recorrido mediante el PIN de seguridad, aparecerán aquí todos los detalles.
            </p>
            <button
              type="button"
              onClick={onReturnToMain}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
            >
              <span>Explorar Planes de Paseo</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {paseosCompletados.map((item, itemIdx) => (
              <div
                key={`comp-item-${item.id}-${itemIdx}`}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={item.perroFoto || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=300&q=80'}
                      alt={item.perroNombre}
                      className="w-10 h-10 rounded-xl object-cover border-2 border-emerald-400 shrink-0 shadow-2xs"
                    />
                    <div>
                      <h4 className="text-sm font-black text-slate-900 leading-tight">
                        {item.perroNombre}
                      </h4>
                      <span className="text-[10px] text-slate-500">
                        {item.perroRaza} • Plan {item.tipoPlan}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] font-black font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg shrink-0">
                    {formatPesos(item.montoTotal)}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Fecha y Turno:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      📅 {item.fechaStr} • ⏰ {item.horario}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Paseador:</span>
                    <span className="font-black text-slate-800">
                      🦮 {item.paseadorNombre}
                    </span>
                  </div>

                  <div className="flex items-start gap-1 pt-0.5 text-[11px] text-slate-500 truncate">
                    <MapPin className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                    <span className="truncate">{item.direccion}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Servicio Finalizado y Entregado</span>
                  </span>

                  {item.paseadorTelefono && (
                    <a
                      href={formatWhatsAppLink(item.paseadorTelefono, `Hola ${item.paseadorNombre}, te contacto desde Walkie por los paseos de ${item.perroNombre}.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 🌟 APARTADO B: HISTORIAL DE PASEADORES 🌟 */}
      {/* ======================================================== */}
      <section id="apartado-historial-paseadores" className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold">
              <Award className="w-4 h-4 text-teal-700" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Historial de Paseadores Certificados ({paseadoresAtendidos.length})
              </h3>
              <p className="text-xs text-slate-500">
                Paseadores verificados que han realizado servicios para tus mascotas.
              </p>
            </div>
          </div>
        </div>

        {paseadoresAtendidos.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-dashed border-slate-300 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center text-xl mx-auto shadow-2xs">
              🦮
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              No hay paseadores en tu historial aún
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Cuando asignes o completes paseos con los paseadores del Valle de Punilla, verás sus fichas de contacto directo aquí.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {paseadoresAtendidos.map((walker, wIdx) => (
              <div
                key={`walker-atendido-${walker.id}-${wIdx}`}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={walker.fotoPerfil}
                      alt={walker.nombre}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-500 shrink-0 shadow-2xs"
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-slate-900 truncate">
                        {walker.nombre}
                      </h4>
                      <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold mt-0.5">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{walker.calificacion.toFixed(1)} / 5.0</span>
                        <span className="text-slate-400 font-normal">
                          ({walker.totalPaseosConMascotas} paseos)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1 text-xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Mascotas atendidas:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {walker.ultimosPerros.map((dogName, idx) => (
                        <span key={idx} className="bg-white text-slate-800 font-bold px-2 py-0.5 rounded-md border border-slate-200 text-[10px]">
                          🐶 {dogName}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <a
                    href={formatWhatsAppLink(walker.telefono, `Hola ${walker.nombre}, te escribo desde Walkie.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Contactar WhatsApp</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
