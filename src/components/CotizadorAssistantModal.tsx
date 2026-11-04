import React, { useState } from 'react';
import { PlanType, TipoCorrea } from '../types';
import { PLANES_PASEO, DESCUENTOS_SEMANAS } from '../data/initialData';
import { formatPesos } from '../utils/geo';
import { 
  Calculator, Sparkles, Copy, Check, Send, 
  Clock, Shield, Tag, MessageSquare, AlertCircle, 
  HelpCircle, RefreshCw, Dog, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CotizadorAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyQuote?: (config: {
    planType: PlanType;
    weeksCount: number;
    extraMinutes: number;
    tipoCorrea: TipoCorrea;
  }) => void;
  initialPlan?: PlanType | null;
  initialWeeks?: number;
  initialExtraMinutes?: number;
  initialTipoCorrea?: TipoCorrea;
  dogName?: string;
}

export const CotizadorAssistantModal: React.FC<CotizadorAssistantModalProps> = ({
  isOpen,
  onClose,
  onApplyQuote,
  initialPlan = 'Bronce',
  initialWeeks = 1,
  initialExtraMinutes = 0,
  initialTipoCorrea = 'propia',
  dogName = 'tu perro'
}) => {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(initialPlan || 'Bronce');
  const [weeksCount, setWeeksCount] = useState<number>(initialWeeks || 1);
  const [extraMinutes, setExtraMinutes] = useState<number>(initialExtraMinutes || 0);
  const [tipoCorrea, setTipoCorrea] = useState<TipoCorrea>(initialTipoCorrea || 'propia');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const planInfo = PLANES_PASEO.find(p => p.tipo === selectedPlan) || PLANES_PASEO[1];
  const walksPerWeek = planInfo.paseosPorSemana;
  const totalWalks = weeksCount * walksPerWeek;

  // 1. Base Price
  const precioBaseTotal = totalWalks * planInfo.precioUnitario;

  // 2. Extra Time Surcharge: $1.300 per 15 min fraction per walk
  const extraFractions = extraMinutes > 0 ? extraMinutes / 15 : 0;
  const extraTimePerWalk = extraFractions * 1300;
  const recargoTiempoExtraTotal = totalWalks * extraTimePerWalk;

  // 3. Equipment / Leash Surcharge: $1.000 per day if Walkie, $0 if client's own leash
  const recargoCorreaPorDia = tipoCorrea === 'walkie' ? 1000 : 0;
  const recargoCorreaTotal = totalWalks * recargoCorreaPorDia;

  // 4. Discount for continuous weeks
  const discountRate = DESCUENTOS_SEMANAS[weeksCount as keyof typeof DESCUENTOS_SEMANAS] || 0;
  const subtotalSinDescuento = precioBaseTotal + recargoTiempoExtraTotal + recargoCorreaTotal;
  const descuentoMonto = Math.round(subtotalSinDescuento * (discountRate / 100));

  // 5. Final Total Price
  const precioTotalFinal = subtotalSinDescuento - descuentoMonto;

  // Formatted Quotation Message
  const generateQuotationText = () => {
    const lines: string[] = [];
    lines.push(`🐾 *COTIZACIÓN OFICIAL WALKIE - SERVICIO DE PASEOS* 🐾`);
    lines.push(`🐕 Mascota: ${dogName}`);
    lines.push(`📋 Plan seleccionado: Plan ${selectedPlan} (${walksPerWeek} paseos por semana)`);
    lines.push(`📅 Duración del plan: ${weeksCount} ${weeksCount === 1 ? 'semana' : 'semanas'} (${totalWalks} paseos en total)`);
    lines.push(`--------------------------------------------`);
    lines.push(`• *Precio base del servicio:* ${formatPesos(precioBaseTotal)} (${totalWalks} paseos a ${formatPesos(planInfo.precioUnitario)} c/u)`);
    
    if (extraMinutes > 0) {
      lines.push(`• *Tiempo extra (${extraMinutes} min):* $${(extraFractions * 1300).toLocaleString('es-AR')} extra por paseo (Total tiempo extra: ${formatPesos(recargoTiempoExtraTotal)})`);
    } else {
      lines.push(`• *Tiempo extra:* Sin tiempo extra ($0) - Duración estándar 45 min.`);
    }

    if (tipoCorrea === 'walkie') {
      lines.push(`• *Recargo por correa de Walkie:* $1.000 por día (Total equipamiento: ${formatPesos(recargoCorreaTotal)})`);
    } else {
      lines.push(`• *Recargo por correa de Walkie:* $0 (El cliente utiliza su propia correa)`);
    }

    if (discountRate > 0) {
      lines.push(`• *Descuento por continuidad (${weeksCount} semanas):* -${formatPesos(descuentoMonto)} (-${discountRate}%)`);
    }

    lines.push(`--------------------------------------------`);
    lines.push(`💰 *PRECIO TOTAL FINAL:* ${formatPesos(precioTotalFinal)}`);
    lines.push(`🛡️ Incluye: Paseador certificado, monitoreo GPS en vivo por WhatsApp, fotos del recorrido y seguro de paseo.`);

    return lines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateQuotationText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleApply = () => {
    if (onApplyQuote) {
      onApplyQuote({
        planType: selectedPlan,
        weeksCount,
        extraMinutes,
        tipoCorrea
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[92vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> Asistente de Cotizaciones
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Cotizador Oficial de Paseos Walkie
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {/* Configuration Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Plan Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <span>1. Plan de Paseo:</span>
            </label>
            <select
              value={selectedPlan || 'Bronce'}
              onChange={(e) => setSelectedPlan(e.target.value as PlanType)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              {PLANES_PASEO.map(p => (
                <option key={p.tipo} value={p.tipo}>
                  {p.nombre} ({p.paseosPorSemana} {p.paseosPorSemana === 1 ? 'paseo/sem' : 'paseos/sem'}): {formatPesos(p.precioUnitario)} c/u
                </option>
              ))}
            </select>
          </div>

          {/* Weeks Count */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <span>2. Cantidad de Semanas:</span>
            </label>
            <select
              value={weeksCount || 1}
              onChange={(e) => setWeeksCount(Number(e.target.value) || 1)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value={1}>1 Semana (Tarifa Base)</option>
              <option value={2}>2 Semanas (-3% Descuento)</option>
              <option value={3}>3 Semanas (-5% Descuento)</option>
              <option value={4}>4 Semanas / Mensual (-10% Descuento)</option>
            </select>
          </div>

          {/* Extra Time Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                3. Tiempo Extra:
              </span>
              <span className="text-[11px] text-emerald-700 font-bold">$1.300 / 15 min</span>
            </label>
            <select
              value={extraMinutes ?? 0}
              onChange={(e) => setExtraMinutes(Number(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value={0}>Duración estándar (45 min) - Sin extra ($0)</option>
              <option value={15}>+15 min extra: $1.300 extra</option>
              <option value={30}>+30 min extra: $2.600 extra</option>
              <option value={45}>+45 min extra: $3.900 extra</option>
            </select>
          </div>

          {/* Leash / Equipamiento */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                4. Equipamiento / Correa:
              </span>
              <span className="text-[11px] text-emerald-700 font-bold">$1.000 / día (Walkie)</span>
            </label>
            <select
              value={tipoCorrea || 'propia'}
              onChange={(e) => setTipoCorrea((e.target.value as TipoCorrea) || 'propia')}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="propia">Correa propia del cliente (Recargo $0)</option>
              <option value="walkie">Correa provista por Walkie ($1.000 por día)</option>
            </select>
          </div>
        </div>

        {/* Live Calculation Breakdown Box */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 space-y-4 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-black tracking-wider uppercase text-emerald-400">
              Desglose Detallado de la Cotización
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Total: {totalWalks} paseos
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* 1. Base Price */}
            <div className="flex items-center justify-between text-slate-300">
              <span>Precio base del servicio:</span>
              <span className="font-mono font-bold text-white">{formatPesos(precioBaseTotal)}</span>
            </div>

            {/* 2. Extra Time */}
            <div className="flex items-center justify-between">
              <span className={extraMinutes > 0 ? 'text-amber-300 font-semibold' : 'text-slate-400'}>
                {extraMinutes > 0 
                  ? `Tiempo extra (${extraMinutes} min): $${(extraFractions * 1300).toLocaleString('es-AR')} extra por paseo:`
                  : 'Tiempo extra:'}
              </span>
              <span className={`font-mono font-bold ${extraMinutes > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                {extraMinutes > 0 ? `+${formatPesos(recargoTiempoExtraTotal)}` : '$0'}
              </span>
            </div>

            {/* 3. Leash */}
            <div className="flex items-center justify-between">
              <span className={tipoCorrea === 'walkie' ? 'text-emerald-300 font-semibold' : 'text-slate-400'}>
                {tipoCorrea === 'walkie' 
                  ? 'Recargo por correa de Walkie ($1.000 por día):' 
                  : 'Recargo por correa de Walkie (Correa propia):'}
              </span>
              <span className={`font-mono font-bold ${tipoCorrea === 'walkie' ? 'text-emerald-300' : 'text-slate-400'}`}>
                {tipoCorrea === 'walkie' ? `+${formatPesos(recargoCorreaTotal)}` : '$0'}
              </span>
            </div>

            {/* 4. Discount */}
            {discountRate > 0 && (
              <div className="flex items-center justify-between text-emerald-400">
                <span>Descuento por continuidad ({weeksCount} semanas - {discountRate}%):</span>
                <span className="font-mono font-bold">-{formatPesos(descuentoMonto)}</span>
              </div>
            )}

            {/* 5. Final Total */}
            <div className="border-t border-slate-700 pt-3 flex items-center justify-between text-sm sm:text-base">
              <span className="font-black text-white">Precio Total Final:</span>
              <span className="font-black font-mono text-emerald-400 text-xl sm:text-2xl">
                {formatPesos(precioTotalFinal)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">¡Texto de cotización copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-600" />
                <span>Copiar Cotización para WhatsApp</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Cerrar
            </button>

            {onApplyQuote && (
              <button
                type="button"
                onClick={handleApply}
                className="py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aplicar a mi Reserva</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
