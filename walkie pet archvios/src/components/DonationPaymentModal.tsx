import React, { useState, useMemo } from 'react';
import {
  X,
  CreditCard,
  Smartphone,
  Heart,
  ShieldCheck,
  Lock,
  Sparkles,
  AlertCircle,
  Printer,
  Copy,
  Check,
  CheckCircle2,
  Stethoscope,
  Utensils
} from 'lucide-react';
import { formatPesos } from '../utils/geo';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  PaymentService,
  PaymentCategory,
  UnifiedPaymentRequest,
  UnifiedPaymentReceipt,
  IS_PAYMENT_SIMULATED
} from '../services/paymentService';
import {
  detectCardIssuer,
  formatCardNumber,
  formatExpiryInput,
  validateCardNumber,
  validateExpiryDate,
  validateCvv,
  validateCardholderName,
  CardIssuer,
  VALID_TEST_CARDS
} from '../utils/cardValidation';

interface DonationPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: PaymentCategory;
  title: string;
  description?: string;
  amount: number;
  destinationName: string;
  targetId?: string;
  patientName?: string;
  foodKg?: number;
  foodLabel?: string;
  onPaymentSuccess: (receipt: UnifiedPaymentReceipt) => void;
}

export const DonationPaymentModal: React.FC<DonationPaymentModalProps> = ({
  isOpen,
  onClose,
  category,
  title,
  description,
  amount,
  destinationName,
  targetId,
  patientName,
  foodKg,
  foodLabel,
  onPaymentSuccess
}) => {
  const [currentReceipt, setCurrentReceipt] = useState<UnifiedPaymentReceipt | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Método de pago
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mercadopago'>('card');

  // Datos del donante
  const [donorName, setDonorName] = useState<string>('Carlos Rodríguez');
  const [donorEmail, setDonorEmail] = useState<string>('carlos.rodriguez@gmail.com');

  // Datos de tarjeta (con tarjeta de prueba inicial válida por Luhn)
  const [cardNumber, setCardNumber] = useState<string>(VALID_TEST_CARDS.visa.number);
  const [cardHolder, setCardHolder] = useState<string>(VALID_TEST_CARDS.visa.holder);
  const [cardExpiry, setCardExpiry] = useState<string>(VALID_TEST_CARDS.visa.expiry);
  const [cardCvv, setCardCvv] = useState<string>(VALID_TEST_CARDS.visa.cvv);

  // Registro de campos que el usuario ha tocado para evitar mostrar errores prematuros
  const [touched, setTouched] = useState<Record<string, boolean>>({
    cardNumber: false,
    cardHolder: false,
    cardExpiry: false,
    cardCvv: false,
    donorEmail: false
  });

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Detección automática del emisor en tiempo real
  const issuer: CardIssuer = useMemo(() => {
    return detectCardIssuer(cardNumber);
  }, [cardNumber]);

  // Validaciones en tiempo real
  const cardNumberValidation = useMemo(() => {
    return validateCardNumber(cardNumber);
  }, [cardNumber]);

  const expiryValidation = useMemo(() => {
    return validateExpiryDate(cardExpiry);
  }, [cardExpiry]);

  const cvvValidation = useMemo(() => {
    return validateCvv(cardCvv, issuer);
  }, [cardCvv, issuer]);

  const cardHolderValidation = useMemo(() => {
    return validateCardholderName(cardHolder);
  }, [cardHolder]);

  const isEmailValid = useMemo(() => {
    const trimmed = donorEmail.trim();
    return trimmed.length > 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  }, [donorEmail]);

  // Validez global del formulario
  const isFormValid = useMemo(() => {
    if (paymentMethod === 'mercadopago') {
      return donorName.trim().length >= 2 && isEmailValid;
    }
    return (
      cardNumberValidation.isValid &&
      expiryValidation.isValid &&
      cvvValidation.isValid &&
      cardHolderValidation.isValid &&
      isEmailValid
    );
  }, [paymentMethod, cardNumberValidation, expiryValidation, cvvValidation, cardHolderValidation, isEmailValid, donorName]);

  // Handlers con formateo estricto
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
    markTouched('cardNumber');
    setPaymentError(null);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryInput(e.target.value);
    setCardExpiry(formatted);
    markTouched('cardExpiry');
    setPaymentError(null);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maxLen = issuer === 'amex' ? 4 : 3;
    const cleanDigits = e.target.value.replace(/\D/g, '').slice(0, maxLen);
    setCardCvv(cleanDigits);
    markTouched('cardCvv');
    setPaymentError(null);
  };

  const handleCardHolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Restricción: Bloquea números y caracteres especiales a medida que se tipea
    const onlyLetters = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '').toUpperCase();
    setCardHolder(onlyLetters);
    markTouched('cardHolder');
    setPaymentError(null);
  };

  // Carga de tarjeta de prueba verificada por Luhn
  const handleAutoFillTestCard = (type: 'visa' | 'mastercard' | 'amex' = 'visa') => {
    const testCard = VALID_TEST_CARDS[type];
    setPaymentMethod('card');
    setCardNumber(testCard.number);
    setCardHolder(testCard.holder);
    setCardExpiry(testCard.expiry);
    setCardCvv(testCard.cvv);
    setDonorName(testCard.holder);
    setDonorEmail('donante.test@walkie.app');
    setPaymentError(null);
    setTouched({
      cardNumber: true,
      cardHolder: true,
      cardExpiry: true,
      cardCvv: true,
      donorEmail: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    // Marcar todos como tocados para revelar errores si los hay
    setTouched({
      cardNumber: true,
      cardHolder: true,
      cardExpiry: true,
      cardCvv: true,
      donorEmail: true
    });

    if (!isFormValid) {
      setPaymentError('Por favor revisá los campos resaltados en rojo antes de continuar.');
      return;
    }

    setIsProcessing(true);

    try {
      const [expMonth, expYear] = cardExpiry.split('/');
      const request: UnifiedPaymentRequest = {
        category,
        amount,
        title,
        description,
        donorName: donorName?.trim() || cardHolder || 'Donante Solidario Walkie',
        donorEmail: donorEmail?.trim() || 'donante@walkie.app',
        paymentMethod,
        cardDetails: paymentMethod === 'card' ? {
          cardNumber: cardNumber.replace(/\s+/g, ''),
          cardholderName: cardHolder,
          expiryMonth: expMonth?.trim() || '12',
          expiryYear: expYear?.trim() || '28',
          cvv: cardCvv
        } : undefined,
        destinationName,
        targetId,
        patientName,
        kg: foodKg,
        foodOptionLabel: foodLabel
      };

      const receipt = await PaymentService.processPayment(request);
      setCurrentReceipt(receipt);
      onPaymentSuccess(receipt);

      confetti({
        particleCount: 95,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      setPaymentError(err?.message || 'Error al conectar con la pasarela de pagos.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyReceiptId = (code: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    setCurrentReceipt(null);
    setPaymentError(null);
    onClose();
  };

  if (!isOpen) return null;

  const isEmergency = category === 'emergency_case';

  // Renderizado del distintivo de emisor de tarjeta
  const renderIssuerBadge = () => {
    if (issuer === 'visa') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-blue-900 text-white font-black text-[11px] tracking-wider italic shadow-xs flex items-center gap-1">
          VISA
        </span>
      );
    }
    if (issuer === 'mastercard') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs">
          <span className="flex -space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block opacity-90" />
          </span>
          <span>Mastercard</span>
        </span>
      );
    }
    if (issuer === 'amex') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-cyan-700 text-white font-black text-[10px] tracking-wider shadow-xs">
          AMEX
        </span>
      );
    }
    return <CreditCard className="w-4 h-4 text-slate-400" />;
  };

  return (
    <AnimatePresence>
      <div key="modal-donation-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative my-6 text-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Botón cerrar */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>

          {currentReceipt ? (
            /* ======================================================== */
            /* VISTA DE COMPROBANTE OFICIAL DE PAGO EMITIDO             */
            /* ======================================================== */
            <div className="space-y-4 pt-1">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  ¡Aporte Procesado con Éxito!
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Tu contribución fue acreditada inmediatamente en la pasarela unificada de Walkie.
                </p>
              </div>

              {/* Tarjeta de Recibo Digital Oficial */}
              <div 
                id="receipt-print-area" 
                className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 text-xs space-y-3 font-sans shadow-2xs text-left"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Heart className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                    <span>Walkie Solidario Oficial</span>
                  </div>
                  <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    {currentReceipt.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block uppercase font-medium text-[10px]">Comprobante N°</span>
                    <span className="font-mono font-bold text-slate-800">{currentReceipt.orderNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-medium text-[10px]">Cód. Autorización</span>
                    <span className="font-mono font-bold text-emerald-700">{currentReceipt.authorizationCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-medium text-[10px]">Fecha y Hora</span>
                    <span className="text-slate-700 font-medium">{currentReceipt.timestamp}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-medium text-[10px]">Método</span>
                    <span className="text-slate-700 font-medium truncate block">{currentReceipt.paymentMethodTitle}</span>
                  </div>
                </div>

                {currentReceipt.maskedCard && (
                  <div className="bg-white p-2 rounded-xl border border-slate-200/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Tarjeta verificada (Luhn):</span>
                    <span className="font-mono font-bold text-slate-800">{currentReceipt.maskedCard}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Concepto:</span>
                    <span className="font-bold text-slate-900 text-right">{currentReceipt.title}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Destino:</span>
                    <span className="text-slate-700 font-medium text-right truncate max-w-[200px]">
                      {currentReceipt.destinationName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Donante:</span>
                    <span className="text-slate-700 text-right">{currentReceipt.donorName}</span>
                  </div>
                </div>

                {/* Monto Total Destacado */}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">Monto Acreditado:</span>
                  <span className="text-lg font-black text-emerald-700 font-mono">
                    {formatPesos(currentReceipt.amount)}
                  </span>
                </div>

                {currentReceipt.isSimulated && (
                  <div className="text-[10px] text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200 text-center">
                    ⚡ Modo de prueba activo • Pasarela unificada lista para producción.
                  </div>
                )}
              </div>

              {/* Botones de acción del comprobante */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  <span>Imprimir</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyReceiptId(currentReceipt.receiptId)}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>Copiar ID</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Finalizar y Continuar
              </button>
            </div>
          ) : (
            /* ======================================================== */
            /* VISTA DE FORMULARIO DE COBRO CON VALIDACIONES ESTRICTAS  */
            /* ======================================================== */
            <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-left">
              {/* Encabezado */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                    isEmergency 
                      ? 'bg-rose-100 text-rose-700' 
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {isEmergency ? (
                      <Stethoscope className="w-5 h-5" />
                    ) : (
                      <Utensils className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      {isEmergency ? 'Caso de Emergencia Médica' : 'Donación Comunitaria'}
                    </span>
                    <h4 className="text-base font-black text-slate-900 leading-tight">
                      {title}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate max-w-[260px]">
                      {destinationName}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                  {IS_PAYMENT_SIMULATED ? 'Modo Simulación' : 'Pasarela en Vivo'}
                </span>
              </div>

              {/* Selector de Método de Pago */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs ring-1 ring-emerald-600/30'
                      : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-600'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Tarjeta Débito/Crédito</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('mercadopago')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    paymentMethod === 'mercadopago'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs ring-1 ring-emerald-600/30'
                      : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-600'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <span>Mercado Pago</span>
                </button>
              </div>

              {/* Pruebas rápidas: Carga de tarjetas válidas con Luhn */}
              {IS_PAYMENT_SIMULATED && (
                <div className="bg-amber-50/90 p-2.5 rounded-2xl border border-amber-200/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Tarjetas de prueba válidas (Algoritmo de Luhn):
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAutoFillTestCard('visa')}
                      className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] cursor-pointer transition-colors shadow-2xs truncate"
                      title="Cargar Visa válida"
                    >
                      Visa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutoFillTestCard('mastercard')}
                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] cursor-pointer transition-colors shadow-2xs truncate"
                      title="Cargar Mastercard válida"
                    >
                      Mastercard
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutoFillTestCard('amex')}
                      className="px-2 py-1 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-[10px] cursor-pointer transition-colors shadow-2xs truncate"
                      title="Cargar Amex válida"
                    >
                      Amex
                    </button>
                  </div>
                </div>
              )}

              {/* Campos de Contacto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-left">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombre Completo:</label>
                  <input
                    type="text"
                    required
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="Ej: Carlos Rodríguez"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 outline-hidden bg-slate-50/70"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Email para Comprobante:</span>
                    {touched.donorEmail && isEmailValid && (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                  </label>
                  <input
                    type="email"
                    required
                    value={donorEmail}
                    onChange={(e) => {
                      setDonorEmail(e.target.value);
                      markTouched('donorEmail');
                    }}
                    onBlur={() => markTouched('donorEmail')}
                    placeholder="carlos@ejemplo.com"
                    className={`w-full p-2.5 rounded-xl border text-xs focus:ring-1 outline-hidden bg-slate-50/70 transition-colors ${
                      touched.donorEmail && !isEmailValid
                        ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30'
                        : 'border-slate-200 focus:ring-emerald-500'
                    }`}
                  />
                  {touched.donorEmail && !isEmailValid && (
                    <p className="text-[10px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>Ingresá un correo electrónico válido.</span>
                    </p>
                  )}
                </div>
              </div>

              {/* CAMPOS DE TARJETA CON VALIDACIONES ESTRICTAS */}
              {paymentMethod === 'card' && (
                <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-left">
                  {/* 1. Número de Tarjeta con detección de emisor y Luhn */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>Número de Tarjeta:</span>
                        {issuer !== 'generic' && (
                          <span className="text-[10px] text-slate-500 font-normal">
                            ({issuer === 'amex' ? '15 dígitos' : '16 dígitos'})
                          </span>
                        )}
                      </span>
                      {touched.cardNumber && cardNumberValidation.isValid && (
                        <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Luhn Válido</span>
                        </span>
                      )}
                    </label>

                    <div className="relative flex items-center">
                      <input
                        type="text"
                        maxLength={issuer === 'amex' ? 17 : 19}
                        required
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        onBlur={() => markTouched('cardNumber')}
                        placeholder={issuer === 'amex' ? '3782 •••••• •••••' : '4532 •••• •••• ••••'}
                        className={`w-full p-2.5 pr-24 rounded-xl border text-xs font-mono font-bold text-slate-800 bg-white focus:ring-1 outline-hidden transition-colors ${
                          touched.cardNumber && !cardNumberValidation.isValid
                            ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/20'
                            : touched.cardNumber && cardNumberValidation.isValid
                            ? 'border-emerald-400 focus:ring-emerald-500'
                            : 'border-slate-200 focus:ring-emerald-500'
                        }`}
                      />
                      <div className="absolute right-2.5 top-2 flex items-center pointer-events-none">
                        {renderIssuerBadge()}
                      </div>
                    </div>

                    {touched.cardNumber && !cardNumberValidation.isValid && (
                      <p className="text-[10px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{cardNumberValidation.error}</span>
                      </p>
                    )}
                  </div>

                  {/* 2. Titular de la tarjeta (solo letras y espacios) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Titular de la Tarjeta:</span>
                      {touched.cardHolder && cardHolderValidation.isValid && (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </label>
                    <input
                      type="text"
                      required
                      value={cardHolder}
                      onChange={handleCardHolderChange}
                      onBlur={() => markTouched('cardHolder')}
                      placeholder="COMO FIGURA EN EL PLÁSTICO"
                      className={`w-full p-2.5 rounded-xl border text-xs font-mono uppercase text-slate-800 bg-white focus:ring-1 outline-hidden transition-colors ${
                        touched.cardHolder && !cardHolderValidation.isValid
                          ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/20'
                          : touched.cardHolder && cardHolderValidation.isValid
                          ? 'border-emerald-400 focus:ring-emerald-500'
                          : 'border-slate-200 focus:ring-emerald-500'
                      }`}
                    />
                    {touched.cardHolder && !cardHolderValidation.isValid && (
                      <p className="text-[10px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{cardHolderValidation.error}</span>
                      </p>
                    )}
                  </div>

                  {/* 3. Vencimiento (MM/AA) y Código de Seguridad (CVV) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Vencimiento:</span>
                        {touched.cardExpiry && expiryValidation.isValid && (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                      </label>
                      <input
                        type="text"
                        maxLength={5}
                        required
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        onBlur={() => markTouched('cardExpiry')}
                        placeholder="MM/AA"
                        className={`w-full p-2.5 rounded-xl border text-xs font-mono text-center text-slate-800 bg-white focus:ring-1 outline-hidden transition-colors ${
                          touched.cardExpiry && !expiryValidation.isValid
                            ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/20'
                            : touched.cardExpiry && expiryValidation.isValid
                            ? 'border-emerald-400 focus:ring-emerald-500'
                            : 'border-slate-200 focus:ring-emerald-500'
                        }`}
                      />
                      {touched.cardExpiry && !expiryValidation.isValid && (
                        <p className="text-[10px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{expiryValidation.error}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>{issuer === 'amex' ? 'Código CVC (4 díg.):' : 'Código CVV (3 díg.):'}</span>
                        {touched.cardCvv && cvvValidation.isValid && (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                      </label>
                      <input
                        type="password"
                        maxLength={issuer === 'amex' ? 4 : 3}
                        required
                        value={cardCvv}
                        onChange={handleCvvChange}
                        onBlur={() => markTouched('cardCvv')}
                        placeholder={issuer === 'amex' ? '••••' : '•••'}
                        className={`w-full p-2.5 rounded-xl border text-xs font-mono text-center text-slate-800 bg-white focus:ring-1 outline-hidden transition-colors ${
                          touched.cardCvv && !cvvValidation.isValid
                            ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/20'
                            : touched.cardCvv && cvvValidation.isValid
                            ? 'border-emerald-400 focus:ring-emerald-500'
                            : 'border-slate-200 focus:ring-emerald-500'
                        }`}
                      />
                      {touched.cardCvv && !cvvValidation.isValid && (
                        <p className="text-[10px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{cvvValidation.error}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Resumen de cobro */}
              <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-emerald-950 block">Monto a Acreditar:</span>
                  <span className="text-[11px] text-emerald-800 font-medium">
                    {title}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-emerald-800 font-mono">
                    {formatPesos(amount)}
                  </span>
                </div>
              </div>

              {paymentError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Cifrado TLS 1.3 • Validación estricta con Algoritmo de Luhn</span>
              </div>

              {/* Botón de Enviar Pago: Deshabilitado hasta que el formulario sea matemáticamente válido */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={!isFormValid || isProcessing}
                  className={`w-full py-3.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                    isFormValid && !isProcessing
                      ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {isProcessing 
                      ? 'Procesando con pasarela segura...' 
                      : !isFormValid
                      ? 'Completá los datos válidos de la tarjeta'
                      : `Confirmar y Aportar ${formatPesos(amount)}`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
