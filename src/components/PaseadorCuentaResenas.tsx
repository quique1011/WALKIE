import React, { useState, useEffect } from 'react';
import { UserPaseador, SolicitudPaseo, ReviewItem } from '../types';
import { formatPesos } from '../utils/geo';
import { 
  getPaseadorWallet, 
  withdrawPaseadorBalance, 
  PaseadorWallet 
} from '../utils/walletPaseador';
import { 
  User, Star, ShieldCheck, DollarSign, 
  MapPin, Phone, Calendar, CheckCircle2, 
  MessageSquare, Dog, Wallet, ArrowUpRight, 
  AlertCircle, ChevronRight, X, Clock, FileText, Check, Flame, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PaseadorCuentaResenasProps {
  user: UserPaseador | null;
  solicitudes: SolicitudPaseo[];
  onOpenAuth: () => void;
}

type PerfilCategoria = 'todas' | 'datos_personales' | 'billetera_resenas';

export const PaseadorCuentaResenas: React.FC<PaseadorCuentaResenasProps> = ({
  user,
  solicitudes,
  onOpenAuth
}) => {
  const [activeCategory, setActiveCategory] = useState<PerfilCategoria>('todas');
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>(() => {
    try {
      const saved = localStorage.getItem('walkie_reviews_list');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [filterRating, setFilterRating] = useState<number | 'todos'>('todos');

  // Sincronización en tiempo real de calificaciones y reseñas recibidas
  useEffect(() => {
    const handleReviewsUpdate = () => {
      try {
        const saved = localStorage.getItem('walkie_reviews_list');
        setReviewsList(saved ? JSON.parse(saved) : []);
      } catch {}
    };
    window.addEventListener('walkie_reviews_change', handleReviewsUpdate);
    window.addEventListener('storage', handleReviewsUpdate);
    return () => {
      window.removeEventListener('walkie_reviews_change', handleReviewsUpdate);
      window.removeEventListener('storage', handleReviewsUpdate);
    };
  }, []);

  // Billetera Persistente del Paseador
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

  // Retirar Dinero Modal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawCvu, setWithdrawCvu] = useState('0000003100010000000000');
  const [withdrawAlias, setWithdrawAlias] = useState('carlos.walkie.mp');
  const [withdrawTitular, setWithdrawTitular] = useState(user?.nombre ? `${user.nombre} ${user.apellido || ''}`.trim() : 'Carlos Pérez');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState('');

  // Finanzas esenciales del paseador
  const totalEarnedNeto = wallet.totalHistoricoGanado;
  const saldoDisponibleActual = wallet.saldoDisponible;
  const [withdrawAmountInput, setWithdrawAmountInput] = useState<number>(saldoDisponibleActual);

  // Sync withdraw input when modal opens or balance changes
  useEffect(() => {
    setWithdrawAmountInput(wallet.saldoDisponible);
    setWithdrawError(null);
  }, [wallet.saldoDisponible, isWithdrawModalOpen]);

  const averageRating = reviewsList.length > 0
    ? (reviewsList.reduce((acc, r) => acc + r.calificacion, 0) / reviewsList.length).toFixed(1)
    : (user?.calificacionPromedio ? user.calificacionPromedio.toFixed(1) : '5.0');

  const filteredReviews = reviewsList.filter(r => {
    if (filterRating === 'todos') return true;
    return r.calificacion === filterRating;
  });

  const handleProcessWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);

    // 1. Validación de Monto: Límite mínimo $1 y límite máximo el saldo total
    if (saldoDisponibleActual <= 0) {
      setWithdrawError('No tenés saldo disponible para retirar.');
      return;
    }
    if (withdrawAmountInput < 1) {
      setWithdrawError('El monto mínimo de retiro es de $1.');
      return;
    }
    if (withdrawAmountInput > saldoDisponibleActual) {
      setWithdrawError(`El monto no puede superar tu saldo disponible actual (${formatPesos(saldoDisponibleActual)}).`);
      return;
    }

    // 2. Validación de CVU (22 dígitos numéricos)
    const cleanCvu = withdrawCvu.replace(/\D/g, '');
    if (cleanCvu.length !== 22) {
      setWithdrawError(`El CVU debe tener exactamente 22 dígitos numéricos (ingresaste ${cleanCvu.length}).`);
      return;
    }

    // 3. Validación de Alias
    if (!withdrawAlias.trim()) {
      setWithdrawError('Por favor ingresá un Alias CBU/CVU válido.');
      return;
    }

    // 4. Validación de Titular
    if (!withdrawTitular.trim()) {
      setWithdrawError('Por favor ingresá el nombre y apellido del Titular de la cuenta.');
      return;
    }

    const destinoResumen = `Titular: ${withdrawTitular.trim()} | CVU: ${cleanCvu} | Alias: ${withdrawAlias.trim()}`;
    const updated = withdrawPaseadorBalance(withdrawAmountInput, 'cbu', destinoResumen);
    setWallet(updated);
    setWithdrawAmountInput(0);
    setWithdrawSuccessMsg(`¡Retiro procesado con éxito! Se transfirieron ${formatPesos(withdrawAmountInput)} a la cuenta de ${withdrawTitular.trim()} (Alias: ${withdrawAlias.trim()}, CVU: ${cleanCvu}).`);
    setTimeout(() => {
      setWithdrawSuccessMsg('');
      setIsWithdrawModalOpen(false);
    }, 3200);
  };

  return (
    <div id="perfil-paseador-pantalla" className="space-y-6">
      {/* Header del Perfil con Selector de las 3 Categorías */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative shrink-0">
              {user?.fotoPerfil ? (
                <img
                  src={user.fotoPerfil}
                  alt={user.nombre}
                  referrerPolicy="no-referrer"
                  className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-400 shadow-md"
                />
              ) : (
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black text-2xl border-2 border-emerald-400 shadow-md">
                  {user?.nombre ? user.nombre.charAt(0) : 'P'}
                </div>
              )}
              <div 
                className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-white p-1 rounded-lg border-2 border-slate-900 shadow"
                title="Paseador Certificado"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  {user ? `${user.nombre} ${user.apellido}` : 'Paseador Walkie'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider">
                  Verificado con DNI
                </span>
              </div>
              <p className="text-emerald-400 font-mono text-xs mt-0.5">
                @{user?.nombreUsuario || 'paseador_carlospaz'}
              </p>
              <p className="text-slate-300 text-xs mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{user?.zonaOperacion || 'Valle de Punilla (Radio 10 km)'}</span>
              </p>
            </div>
          </div>

          {/* Saldo Rápido */}
          <div className="bg-slate-800/80 border border-slate-700/80 p-4 sm:p-5 rounded-2xl flex items-center justify-between md:flex-col md:items-end gap-3 shrink-0">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Saldo Disponible
              </span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono block">
                {formatPesos(saldoDisponibleActual)}
              </span>
            </div>

            <button
              type="button"
              id="btn-retirar-dinero-header"
              onClick={() => {
                setWithdrawAmountInput(saldoDisponibleActual);
                setIsWithdrawModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              Retirar dinero
            </button>
          </div>
        </div>

        {/* Barra selectora de Categorías Principales */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveCategory('todas')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                  activeCategory === 'todas'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                Ver Todo
              </button>

              <button
                type="button"
                id="cat-btn-datos-personales"
                onClick={() => setActiveCategory('datos_personales')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeCategory === 'datos_personales'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <User className="w-3.5 h-3.5 text-emerald-400" />
                1. Información Personal y Cobertura
              </button>

              <button
                type="button"
                id="cat-btn-billetera-resenas"
                onClick={() => setActiveCategory('billetera_resenas')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeCategory === 'billetera_resenas'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                2. Billetera y Saldo Neto
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. CATEGORÍA: DATO/INFORMACIÓN PERSONAL                  */}
      {/* ======================================================== */}
      {(activeCategory === 'todas' || activeCategory === 'datos_personales') && (
        <section id="categoria-informacion-personal" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  1. Datos e Información Personal
                </h3>
                <p className="text-xs text-slate-500">
                  Ficha de identidad, verificación de seguridad y radio de servicio.
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verificado
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Nombre y Apellido */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" /> Nombre Completo
              </span>
              <p className="text-sm font-black text-slate-900">
                {user ? `${user.nombre} ${user.apellido}` : 'Carlos Alberto Gómez'}
              </p>
              <p className="text-[11px] text-slate-500">
                Identificador: @{user?.nombreUsuario || 'paseador_carlospaz'}
              </p>
            </div>

            {/* Teléfono / WhatsApp */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" /> Teléfono / WhatsApp
              </span>
              <p className="text-sm font-black text-slate-900">
                {user?.telefono || '+54 9 3541 55-8921'}
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold">
                Línea directa para reportes de paseo
              </p>
            </div>

            {/* DNI / Verificación */}
            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-1">
              <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> DNI y Certificación
              </span>
              <p className="text-sm font-black text-slate-900">
                DNI / Identidad Verificada
              </p>
              <p className="text-[11px] text-emerald-800 font-medium">
                Antecedentes validados por Walkie Punilla
              </p>
            </div>

            {/* Zona de Cobertura */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1 sm:col-span-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Zona de Cobertura GPS
              </span>
              <p className="text-sm font-black text-slate-900">
                {user?.zonaOperacion || 'Villa Carlos Paz y Valle de Punilla'}
              </p>
              <p className="text-[11px] text-slate-500">
                Radio operativo: 10 km • San Roque, Bialet Massé, Villa Parque Síquiman y Carlos Paz
              </p>
            </div>

            {/* Experiencia y Presentación */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1 sm:col-span-2 lg:col-span-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Experiencia Laboral
              </span>
              <p className="text-sm font-black text-slate-900">
                {user?.experienciaAnios || '3+ años'} con perros
              </p>
              <p className="text-[11px] text-slate-500">
                Manejo de temperamentos y primeros auxilios caninos
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 2. CATEGORÍA: BILLETERA Y SALDO NETO                     */}
      {/* ======================================================== */}
      {(activeCategory === 'todas' || activeCategory === 'billetera_resenas') && (
        <section id="categoria-billetera-resenas" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8">
          {/* Encabezado de la Categoría */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  2. Billetera y Saldo Neto
                </h3>
                <p className="text-xs text-slate-500">
                  Saldo disponible a cobrar, retiros a cuentas bancarias / billeteras virtuales y calificaciones.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black">
                Calificación: {averageRating} ★
              </span>
            </div>
          </div>

          {/* SUB-SECCIÓN A: BILLETERA DEL PASEADOR */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Finanzas y Billetera Digital
              </h4>
              <span className="text-[11px] text-slate-400 font-bold">
                Liquidaciones quincenales automáticas o retiros inmediatos
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tarjeta de Saldo Disponible con Botón Retirar Dinero */}
              <div className="p-5 rounded-2xl bg-emerald-950 text-white space-y-4 shadow-sm md:col-span-2 flex flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
                      Saldo Disponible para Retirar
                    </span>
                    <h5 className="text-3xl sm:text-4xl font-black text-white font-mono mt-1">
                      {formatPesos(saldoDisponibleActual)}
                    </h5>
                    <p className="text-xs text-emerald-200/80 mt-1">
                      Fondos acumulados por servicios concluidos y validados con PIN de devolución.
                    </p>
                  </div>

                  <button
                    type="button"
                    id="btn-retirar-dinero-billetera"
                    onClick={() => {
                      setWithdrawAmountInput(saldoDisponibleActual);
                      setIsWithdrawModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow transition-all cursor-pointer shrink-0"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Retirar dinero
                  </button>
                </div>

                <div className="pt-3 border-t border-emerald-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-200">
                  <span>CBU/CVU Vinculado: •••• 8921</span>
                  <span className="font-bold text-emerald-400">Sin comisiones por transferencia</span>
                </div>
              </div>

              {/* Estado de Multas y Penalizaciones */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Historial de Multas y Deducciones
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-black text-slate-900 font-mono">$0 ARS</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Excelente
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    No registrás penalizaciones por demoras o cancelaciones imprevistas en el Valle de Punilla.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 font-medium">
                  ✓ Puntualidad perfecta en retiros y entregas con PIN.
                </div>
              </div>
            </div>
          </div>

          {/* SUB-SECCIÓN B: RESEÑAS Y CALIFICACIONES */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  Reseñas y Calificaciones de los Clientes ({reviewsList.length})
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comentarios y puntuaciones otorgadas por los dueños tras la entrega de la mascota.
                </p>
              </div>

              {/* Filtros de Estrellas */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFilterRating('todos')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    filterRating === 'todos'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setFilterRating(5)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                    filterRating === 5
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  <Star className="w-3 h-3 fill-current" /> 5 Estrellas
                </button>
                <button
                  type="button"
                  onClick={() => setFilterRating(4)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                    filterRating === 4
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  <Star className="w-3 h-3 fill-current" /> 4 Estrellas
                </button>
              </div>
            </div>

            {/* Listado de Opiniones */}
            {filteredReviews.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 space-y-2">
                <Star className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">No hay calificaciones con ese filtro</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredReviews.map((rev, revIdx) => (
                  <div
                    key={`pas-rev-${rev.id || 'r'}-${revIdx}`}
                    className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-emerald-300 hover:bg-white transition-all space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={rev.clienteFoto}
                          alt={rev.clienteNombre}
                          className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-xs"
                        />
                        <div>
                          <h5 className="text-xs font-black text-slate-900">
                            {rev.clienteNombre}
                          </h5>
                          <span className="text-[10px] text-slate-500 block">
                            Dueño de <strong>{rev.perroNombre}</strong> ({rev.perroRaza})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < rev.calificacion
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {rev.comentario && rev.comentario.trim().length > 0 ? (
                      <p className="text-xs text-slate-700 leading-relaxed italic">
                        "{rev.comentario}"
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        (Calificación de {rev.calificacion} estrellas sin comentario escrito)
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-200/60 font-medium">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                        Plan {rev.paseoPlan}
                      </span>
                      <span>📅 {rev.fecha}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* MODAL INTERACTIVO: RETIRAR DINERO */}
      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div key="modal-withdraw-backdrop" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 relative"
            >
              <button
                type="button"
                onClick={() => setIsWithdrawModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-black mb-2">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  Retirar Dinero a tu Cuenta
                </h3>
                <p className="text-xs text-slate-500">
                  Transferencia directa sin costo adicional a cualquier CBU, CVU o Alias de Argentina.
                </p>
              </div>

              {withdrawSuccessMsg ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="text-xs font-bold text-emerald-900">
                    {withdrawSuccessMsg}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleProcessWithdraw} className="space-y-4">
                  {/* Error Alert */}
                  {withdrawError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{withdrawError}</span>
                    </div>
                  )}

                  {/* Saldo Disponible */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Disponible para retirar:</span>
                    <span className="text-base font-black text-emerald-700 font-mono">
                      {formatPesos(saldoDisponibleActual)}
                    </span>
                  </div>

                  {/* Datos de Cobro Obligatorios */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>Titular de la cuenta *</span>
                        <span className="text-[10px] text-slate-400">Como figura en el banco</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={withdrawTitular}
                        onChange={(e) => setWithdrawTitular(e.target.value)}
                        placeholder="Nombre y Apellido del Titular"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">
                          CVU / CBU (22 dígitos) *
                        </label>
                        <span className={`text-[10px] font-mono font-bold ${
                          withdrawCvu.replace(/\D/g, '').length === 22 ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                          {withdrawCvu.replace(/\D/g, '').length}/22 dígitos
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={22}
                        value={withdrawCvu}
                        onChange={(e) => setWithdrawCvu(e.target.value.replace(/\D/g, '').slice(0, 22))}
                        placeholder="0000003100010000000000"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        Alias CBU/CVU *
                      </label>
                      <input
                        type="text"
                        required
                        value={withdrawAlias}
                        onChange={(e) => setWithdrawAlias(e.target.value)}
                        placeholder="ej: nombre.apellido.mp"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Monto a retirar */}
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">
                        Monto a transferir (ARS):
                      </label>
                      <button
                        type="button"
                        onClick={() => setWithdrawAmountInput(saldoDisponibleActual)}
                        className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer"
                      >
                        Retirar todo ({formatPesos(saldoDisponibleActual)})
                      </button>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400 font-mono">$</span>
                      <input
                        type="number"
                        required
                        min={1}
                        max={saldoDisponibleActual}
                        value={withdrawAmountInput || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setWithdrawAmountInput(val);
                        }}
                        placeholder="1"
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Mínimo: $1</span>
                      <span>Máximo permitido: {formatPesos(saldoDisponibleActual)}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={saldoDisponibleActual < 1 || withdrawAmountInput < 1 || withdrawAmountInput > saldoDisponibleActual}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                    >
                      Confirmar y Retirar {formatPesos(withdrawAmountInput || 0)}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PaseadorCuentaResenas;
