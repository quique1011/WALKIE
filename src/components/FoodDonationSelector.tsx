import React, { useState } from 'react';
import { 
  Utensils, Check, ArrowRight, Heart
} from 'lucide-react';
import { formatPesos } from '../utils/geo';
import { DonationPaymentModal } from './DonationPaymentModal';

interface FoodOption {
  kg: number;
  price: number;
  label: string;
  unitPrice: string;
  badge?: string;
  impactText: string;
}

interface FoodDonationSelectorProps {
  onContribute: (amount: number, note: string) => void;
}

export const FoodDonationSelector: React.FC<FoodDonationSelectorProps> = ({ onContribute }) => {
  const [selectedKg, setSelectedKg] = useState<number>(3);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);

  const options: FoodOption[] = [
    {
      kg: 1,
      price: 4000,
      label: '1 kg de alimento',
      unitPrice: '$4.000 / kg',
      impactText: 'Ración de 1 día para 2 perros rescatados'
    },
    {
      kg: 3,
      price: 12000,
      label: '3 kg de alimento',
      unitPrice: '$4.000 / kg',
      badge: 'Más Elegido',
      impactText: 'Alimento completo para 3 días en refugio'
    },
    {
      kg: 5,
      price: 20000,
      label: '5 kg de alimento',
      unitPrice: '$4.000 / kg',
      impactText: 'Ración nutricional semanal para 1 perro'
    },
    {
      kg: 10,
      price: 38000,
      label: '10 kg de alimento',
      unitPrice: '$3.800 / kg',
      badge: 'Tarifa Mayorista',
      impactText: 'Bolsa comunitaria con descuento por volumen'
    }
  ];

  const selectedOption = options.find(opt => opt.kg === selectedKg) || options[1];

  return (
    <div id="selector-donacion-alimento" className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200/90 shadow-xs space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-semibold tracking-wide uppercase mb-1.5 border border-emerald-200/60">
            <Utensils className="w-3 h-3 text-emerald-600" />
            <span>Compra Mayorista para Refugios</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
            Selector de Donación de Alimento
          </h3>
          <p className="text-slate-600 text-xs sm:text-sm mt-0.5">
            Elegí la cantidad de kilos de alimento balanceado que querés donar a precio directo de distribuidora para los refugios aliados.
          </p>
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Precios mayoristas oficiales • Valle de Punilla
        </div>
      </div>

      {/* Interactive Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {options.map((opt) => {
          const isSelected = selectedKg === opt.kg;
          return (
            <div
              key={opt.kg}
              id={`opcion-alimento-${opt.kg}kg`}
              onClick={() => setSelectedKg(opt.kg)}
              className={`rounded-2xl p-4 sm:p-5 border transition-all duration-200 flex flex-col justify-between cursor-pointer relative group text-left ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-600'
                  : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                    }`}
                  >
                    <Utensils className="w-4 h-4 stroke-[2]" />
                  </div>

                  {opt.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {opt.badge}
                    </span>
                  )}
                </div>

                <div className="text-base sm:text-lg font-bold text-slate-900">
                  {opt.label}
                </div>

                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  {opt.unitPrice}
                </div>

                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  {opt.impactText}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-base sm:text-lg font-black text-slate-900">
                  {formatPesos(opt.price)}
                </span>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-300 text-transparent'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary and Direct Payment Bar */}
      <div className="bg-slate-50 rounded-2xl p-4 sm:p-6 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs uppercase font-bold text-slate-500 tracking-wider">
            Resumen de tu donación:
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold text-slate-900">
              {selectedOption.label}
            </span>
            <span className="text-xs text-slate-500">
              ({selectedOption.impactText})
            </span>
          </div>
          <div className="text-xs text-emerald-800 font-medium">
            Entregado directamente a Alma Animal Punilla, Fundación Garra y Patitas de Perros.
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
          <div className="text-left sm:text-right">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Monto a pagar
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">
              {formatPesos(selectedOption.price)}
            </div>
          </div>

          <button
            type="button"
            id="btn-donar-ahora-alimento"
            onClick={() => setShowPaymentModal(true)}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Heart className="w-4 h-4 fill-white" />
            <span>Donar Alimento</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MODAL CENTRALIZADO UNIFICADO DE PASARELA DE PAGO */}
      {showPaymentModal && (
        <DonationPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          category="food_donation"
          title={`${selectedOption.kg} kg de alimento (${selectedOption.label})`}
          description={selectedOption.impactText}
          amount={selectedOption.price}
          destinationName="Alma Animal Punilla, Garra y Patitas Serranas"
          targetId={`food-${selectedOption.kg}kg`}
          foodKg={selectedOption.kg}
          foodLabel={selectedOption.label}
          onPaymentSuccess={() => {
            onContribute(selectedOption.price, `Donación de ${selectedOption.label}`);
          }}
        />
      )}
    </div>
  );
};
