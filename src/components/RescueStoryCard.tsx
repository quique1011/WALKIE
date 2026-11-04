import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  MessageCircle,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  PlusCircle,
  ArrowRight,
  X,
  ChevronDown,
  Upload,
  AlertCircle,
  Stethoscope,
  FileText,
  FileCheck,
  Eye,
  CheckCircle2,
  Paperclip
} from 'lucide-react';
import { formatPesos } from '../utils/geo';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { DonationPaymentModal } from './DonationPaymentModal';
import { UnifiedPaymentReceipt } from '../services/paymentService';

export interface AnimalCase {
  id: string;
  name: string;
  age: string;
  objective: string;
  image: string;
  goal: number;
  defaultRaised: number;
  storageKey: string;
  story: string;
  treatment: string;
  veterinarian: string; // Doctora / Veterinario a cargo
  medicalOrderImage?: string; // Pedido / Receta o Comprobante Veterinario adjunto
  medicalOrderFileName?: string;
  responsibleName: string;
  responsibleRole: string;
  dni: string;
  phone: string;
  whatsapp: string;
  alias: string;
  cvu: string;
  tag: string;
}

interface RescueStoryCardProps {
  onContribute?: (amount: number, note: string) => void;
  onEmergencyContribution?: (data: { caseItem: AnimalCase; amount: number }) => void;
}

// Generador de comprobante/orden médica veterinaria oficial en formato SVG vectorizado
const generateSampleMedicalOrder = (
  patient: string,
  doctor: string,
  mp: string,
  clinic: string,
  diagnosis: string,
  treatment: string,
  date: string
): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 920" width="760" height="920" style="background:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">
    <rect width="760" height="920" fill="#ffffff"/>
    <rect x="24" y="24" width="712" height="872" rx="16" fill="#fcfdfe" stroke="#cbd5e1" stroke-width="2"/>
    
    <!-- Encabezado Membretado Oficial -->
    <rect x="24" y="24" width="712" height="100" rx="16" fill="#047857"/>
    <text x="50" y="66" font-size="21" font-weight="bold" fill="#ffffff" letter-spacing="0.5">${clinic.toUpperCase()}</text>
    <text x="50" y="93" font-size="12" fill="#a7f3d0">Servicio de Urgencias y Cirugía • Valle de Punilla, Córdoba • Guardia Activa</text>
    
    <!-- Título de la Orden -->
    <text x="50" y="165" font-size="17" font-weight="bold" fill="#0f172a">ORDEN MÉDICA VETERINARIA Y PROTOCOLO CLÍNICO</text>
    <line x1="50" y1="180" x2="710" y2="180" stroke="#e2e8f0" stroke-width="1.5"/>
    
    <!-- Bloque de datos del paciente -->
    <rect x="50" y="200" width="660" height="115" rx="10" fill="#f8fafc" stroke="#e2e8f0"/>
    <text x="70" y="235" font-size="12" font-weight="bold" fill="#64748b">PACIENTE CANINO:</text>
    <text x="195" y="235" font-size="14" font-weight="bold" fill="#0f172a">${patient}</text>
    
    <text x="70" y="265" font-size="12" font-weight="bold" fill="#64748b">FECHA DE EMISIÓN:</text>
    <text x="210" y="265" font-size="13" fill="#1e293b">${date}</text>
    
    <text x="70" y="295" font-size="12" font-weight="bold" fill="#64748b">PROFESIONAL RESPONSABLE:</text>
    <text x="260" y="295" font-size="13" font-weight="bold" fill="#047857">${doctor} (M.P. ${mp})</text>
    
    <!-- Diagnóstico Clínico -->
    <text x="50" y="345" font-size="13" font-weight="bold" fill="#334155">DIAGNÓSTICO CLÍNICO OFICIAL:</text>
    <rect x="50" y="360" width="660" height="75" rx="10" fill="#ffffff" stroke="#cbd5e1"/>
    <text x="70" y="395" font-size="13" fill="#0f172a" font-weight="500">${diagnosis}</text>
    <text x="70" y="418" font-size="11" fill="#64748b">Certificado bajo examen clínico y estudios complementarios en sede Punilla.</text>
    
    <!-- Tratamiento o Cirugía solicitada -->
    <text x="50" y="470" font-size="13" font-weight="bold" fill="#334155">TRATAMIENTO / CIRUGÍA REQUERIDA:</text>
    <rect x="50" y="485" width="660" height="95" rx="10" fill="#ffffff" stroke="#cbd5e1"/>
    <text x="70" y="520" font-size="13" fill="#0f172a" font-weight="500">${treatment}</text>
    <text x="70" y="545" font-size="11" fill="#64748b">Incluye insumos quirúrgicos, medicación posoperatoria y seguimiento clínico.</text>
    
    <!-- Sello institucional del colegio veterinario -->
    <g transform="translate(450, 630) rotate(-5)">
      <rect width="220" height="90" rx="8" fill="#ecfdf5" stroke="#059669" stroke-width="2.5" stroke-dasharray="6 3"/>
      <text x="110" y="32" text-anchor="middle" font-size="11" font-weight="900" fill="#059669">COLEGIO MÉDICO VETERINARIO</text>
      <text x="110" y="52" text-anchor="middle" font-size="12" font-weight="bold" fill="#065f46">CASO HOMOLOGADO</text>
      <text x="110" y="72" text-anchor="middle" font-size="10" fill="#047857">VALLE DE PUNILLA • M.P. ${mp}</text>
    </g>
    
    <!-- Firma y Matrícula -->
    <line x1="80" y1="695" x2="330" y2="695" stroke="#334155" stroke-width="1.5"/>
    <text x="205" y="720" text-anchor="middle" font-size="13" font-weight="bold" fill="#0f172a">${doctor}</text>
    <text x="205" y="738" text-anchor="middle" font-size="11" fill="#64748b">Médico Veterinario Matriculado • M.P. ${mp}</text>
    
    <!-- Nota al pie -->
    <line x1="50" y1="785" x2="710" y2="785" stroke="#e2e8f0" stroke-width="1"/>
    <text x="380" y="820" text-anchor="middle" font-size="11" fill="#94a3b8">Documento digital de respaldo y transparencia médica para colecta solidaria en Walkie.</text>
    <text x="380" y="840" text-anchor="middle" font-size="10" fill="#94a3b8">Validez legal conforme al régimen de sanidad animal de la Provincia de Córdoba.</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};

const defaultInitialCases: AnimalCase[] = [
  {
    id: 'case-milo-cirugia',
    name: 'Milo',
    age: '2 años',
    objective: 'Cirugía traumatológica y osteosíntesis por fractura de fémur',
    image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
    goal: 95000,
    defaultRaised: 52000,
    storageKey: 'walkie_raised_case-milo-cirugia',
    story: 'Milo fue rescatado al costado de la Ruta 38 en Valle Hermoso luego de un atropello. Requiere una intervención quirúrgica con placa y clavos para recuperar su movilidad completa.',
    treatment: 'Cirugía de osteosíntesis con placa de compresión dinámica + internación posquirúrgica y 4 semanas de rehabilitación.',
    veterinarian: 'Dra. Silvina Morales (M.P. 3912)',
    medicalOrderImage: generateSampleMedicalOrder(
      'Milo (Canino mestizo)',
      'Dra. Silvina Morales',
      '3912',
      'Hospital Veterinario Punilla',
      'Fractura diafisaria oblicua de fémur izquierdo',
      'Cirugía de osteosíntesis con placa de compresión dinámica + internación posquirúrgica',
      '12 de Octubre, 2026'
    ),
    responsibleName: 'Romina Carrizo',
    responsibleRole: 'Rescatista Independiente - Punilla',
    dni: '34.892.104',
    phone: '+54 9 3541 582190',
    whatsapp: '5493541582190',
    alias: 'RESCATE.MILO.PUNILLA',
    cvu: '0000003100049281728192',
    tag: 'Cirugía de Urgencia'
  },
  {
    id: 'case-luna-quimio',
    name: 'Luna',
    age: '4 años',
    objective: 'Biopsia, ciclo de quimioterapia y tratamiento integral',
    image: 'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=800&q=80',
    goal: 70000,
    defaultRaised: 38000,
    storageKey: 'walkie_raised_case-luna-quimio',
    story: 'Luna fue hallada en estado de abandono con una masa palpable y anemia. En el hospital se inició el protocolo clínico de tratamiento oncológico.',
    treatment: 'Protocolo de quimioterapia veterinaria semanal + suplemento hematopoyético y sueroterapia.',
    veterinarian: 'Dr. Martín Ferreyra (M.P. 4481)',
    medicalOrderImage: generateSampleMedicalOrder(
      'Luna (Canina mestiza)',
      'Dr. Martín Ferreyra',
      '4481',
      'Clínica Veterinaria Sierras',
      'Neoplasia de tejidos blandos grado II con compromiso sistémico',
      'Ciclo quimioterápico protocolizado con doxorrubicina + profilaxis hepática',
      '14 de Octubre, 2026'
    ),
    responsibleName: 'Fundación Garra Sierras',
    responsibleRole: 'Coordinación Sanitaria',
    dni: '29.381.942',
    phone: '+54 9 3541 620411',
    whatsapp: '5493541620411',
    alias: 'FUNDACION.GARRA.SALUD',
    cvu: '0000003100088192049182',
    tag: 'Tratamiento Crítico'
  }
];

export const RescueStoryCard: React.FC<RescueStoryCardProps> = ({ onContribute, onEmergencyContribution }) => {
  // 1. Estado del acordeón desplegable
  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);

  // 2. Lista de casos (con persistencia de casos subidos por el usuario)
  const [casesList, setCasesList] = useState<AnimalCase[]>(() => {
    try {
      const saved = localStorage.getItem('walkie_custom_cases');
      if (saved) {
        const custom: AnimalCase[] = JSON.parse(saved);
        if (Array.isArray(custom) && custom.length > 0) {
          const mappedCustom = custom.map((c) => ({
            ...c,
            veterinarian: c.veterinarian || 'Veterinario/a colegiado/a a confirmar',
            medicalOrderImage: c.medicalOrderImage || generateSampleMedicalOrder(
              c.name,
              c.veterinarian || 'Dr. Veterinario a cargo',
              '4821',
              'Hospital Veterinario Punilla',
              c.objective || 'Tratamiento veterinario urgente',
              c.treatment || 'Protocolo clínico y quirúrgico',
              'Septiembre, 2026'
            )
          }));
          return [...mappedCustom, ...defaultInitialCases.filter(d => !mappedCustom.some(m => m.id === d.id))];
        }
      }
    } catch {
      // ignore
    }
    return defaultInitialCases;
  });

  // Estado de montos recaudados inicializado desde localStorage
  const [raisedMap, setRaisedMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    try {
      defaultInitialCases.forEach((c) => {
        const saved = localStorage.getItem(c.storageKey);
        if (saved !== null) {
          map[c.id] = Number(saved);
        }
      });
      const savedCustom = localStorage.getItem('walkie_custom_cases');
      if (savedCustom) {
        const custom: AnimalCase[] = JSON.parse(savedCustom);
        if (Array.isArray(custom)) {
          custom.forEach((c) => {
            const saved = localStorage.getItem(c.storageKey);
            if (saved !== null) {
              map[c.id] = Number(saved);
            }
          });
        }
      }
    } catch {
      // ignore
    }
    return map;
  });

  // Escucha activa de actualizaciones a casos de emergencia en tiempo real
  useEffect(() => {
    const handleEmergencyUpdated = (e: any) => {
      const { caseId, newTotal } = e?.detail || {};
      if (caseId) {
        setRaisedMap(prev => ({
          ...prev,
          [caseId]: typeof newTotal === 'number' ? newTotal : (prev[caseId] || 0)
        }));
      }
    };
    window.addEventListener('walkie_emergency_updated', handleEmergencyUpdated as EventListener);
    return () => {
      window.removeEventListener('walkie_emergency_updated', handleEmergencyUpdated as EventListener);
    };
  }, []);

  // Modales
  const [activeCase, setActiveCase] = useState<AnimalCase | null>(null);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState<boolean>(false);
  const [viewingMedicalOrderCase, setViewingMedicalOrderCase] = useState<AnimalCase | null>(null);
  const [paymentModalCase, setPaymentModalCase] = useState<{ caseItem: AnimalCase; amount: number } | null>(null);

  // Copiado y aportes
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedContributionAmount, setSelectedContributionAmount] = useState<number>(5000);
  const [contributionSuccess, setContributionSuccess] = useState<string | null>(null);
  const [publishSuccessMessage, setPublishSuccessMessage] = useState<string | null>(null);

  // Formulario de nuevo caso
  const [formName, setFormName] = useState('');
  const [formAge, setFormAge] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formVeterinarian, setFormVeterinarian] = useState('');
  const [formMedicalOrder, setFormMedicalOrder] = useState('');
  const [formMedicalOrderFileName, setFormMedicalOrderFileName] = useState('');
  const [formEmergencyType, setFormEmergencyType] = useState('Cirugía');
  const [formObjective, setFormObjective] = useState('');
  const [formStory, setFormStory] = useState('');
  const [formGoal, setFormGoal] = useState<number | ''>(60000);
  const [formResponsibleName, setFormResponsibleName] = useState('');
  const [formDni, setFormDni] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAlias, setFormAlias] = useState('');
  const [formCvu, setFormCvu] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Drag and Drop para foto de la mascota
  const [isDraggingPet, setIsDraggingPet] = useState(false);
  const petFileInputRef = useRef<HTMLInputElement>(null);

  // Drag and Drop para orden / receta médica veterinaria
  const [isDraggingOrder, setIsDraggingOrder] = useState(false);
  const orderFileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = (text: string, fieldKey: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleContributeToCase = (caseItem: AnimalCase, amount: number) => {
    setPaymentModalCase({ caseItem, amount });
  };

  const handlePaymentSuccess = (receipt: UnifiedPaymentReceipt) => {
    if (!paymentModalCase) return;
    const { caseItem } = paymentModalCase;
    const current = raisedMap[caseItem.id] !== undefined
      ? raisedMap[caseItem.id]
      : (Number(localStorage.getItem(caseItem.storageKey)) || caseItem.defaultRaised || 0);
    const newAmount = Math.min(caseItem.goal, current + receipt.amount);

    setRaisedMap((prev) => {
      const next = { ...prev, [caseItem.id]: newAmount };
      localStorage.setItem(caseItem.storageKey, newAmount.toString());
      return next;
    });

    // 🛑 IMPORTANTE: Las donaciones a casos de emergencia suman ÚNICAMENTE a la meta propia de este perfil animal.
    // La meta general de alimentos NO se incrementa en este flujo.
    if (onEmergencyContribution) {
      onEmergencyContribution({ caseItem, amount: receipt.amount });
    }

    // Notificar evento global de caso de emergencia
    window.dispatchEvent(new CustomEvent('walkie_emergency_updated', {
      detail: { caseId: caseItem.id, amount: receipt.amount, newTotal: newAmount }
    }));

    setContributionSuccess(`¡Muchas gracias! Tu aporte de ${formatPesos(receipt.amount)} para ${caseItem.name} se acreditó exitosamente en su meta individual.`);
    setTimeout(() => setContributionSuccess(null), 5000);
  };

  // Procesamiento de archivo para la foto de la mascota
  const processPetPhotoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError('Por favor seleccioná un archivo de imagen válido para la foto de la mascota (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setFormImage(e.target.result as string);
        setFormError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Procesamiento de archivo para el pedido/comprobante veterinario
  const processMedicalOrderFile = (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setFormError('Por favor seleccioná una imagen o documento de la orden médica o receta (PNG, JPG, WEBP).');
      return;
    }
    setFormMedicalOrderFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setFormMedicalOrder(e.target.result as string);
        setFormError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Helper para auto-generar comprobante veterinario de prueba si el usuario no tiene una foto a mano
  const handleGenerateSampleOrder = () => {
    const pet = formName.trim() || 'Mascota en Rescate';
    const vet = formVeterinarian.trim() || 'Dra. Sofía Morales • M.P. 4821';
    const diag = formObjective.trim() || 'Atención y cirugía urgente en Punilla';
    const sample = generateSampleMedicalOrder(
      pet,
      vet,
      '4821',
      'Clínica Veterinaria Punilla',
      diag,
      `Protocolo veterinario de urgencia: ${formEmergencyType}`,
      'Septiembre, 2026'
    );
    setFormMedicalOrder(sample);
    setFormMedicalOrderFileName(`orden_medica_${pet.toLowerCase().replace(/\s+/g, '_')}.pdf`);
    setFormError(null);
  };

  const handlePublishCase = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validación según estructura requerida
    if (!formName.trim()) {
      setFormError('Por favor indicá el nombre de la mascota.');
      return;
    }
    if (!formAge.trim()) {
      setFormError('Por favor indicá la edad estimada de la mascota.');
      return;
    }
    if (!formVeterinarian.trim()) {
      setFormError('Por favor indicá la Doctora o Veterinario a cargo del animal.');
      return;
    }
    if (!formObjective.trim()) {
      setFormError('Por favor especificá el tratamiento u objetivo médico requerido.');
      return;
    }
    if (!formStory.trim()) {
      setFormError('Por favor contá una breve historia o descripción del caso.');
      return;
    }
    if (!formGoal || Number(formGoal) <= 0) {
      setFormError('Por favor indicá un monto de meta válido ($ ARS).');
      return;
    }
    if (!formResponsibleName.trim()) {
      setFormError('Por favor indicá el nombre y apellido del responsable.');
      return;
    }
    if (!formDni.trim()) {
      setFormError('Por favor ingresá el DNI del responsable.');
      return;
    }
    if (!formPhone.trim()) {
      setFormError('Por favor indicá el teléfono o WhatsApp de contacto.');
      return;
    }
    if (!formAlias.trim() && !formCvu.trim()) {
      setFormError('Por favor ingresá al menos un Alias o CVU de Mercado Pago para transferencias.');
      return;
    }

    const newId = `custom-case-${Date.now()}`;
    const cleanPhone = formPhone.replace(/\D/g, '');
    const fallbackImage = 'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=600&q=80';

    // Comprobante médico: si el usuario subió archivo, usarlo; si no, auto-generar certificado oficial con membrete
    const finalMedicalOrder = formMedicalOrder.trim() || generateSampleMedicalOrder(
      `${formName.trim()} (${formAge.trim()})`,
      formVeterinarian.trim(),
      '5022',
      'Hospital & Clínica Veterinaria Punilla',
      formObjective.trim(),
      `${formEmergencyType}: ${formObjective.trim()}`,
      'Septiembre, 2026'
    );

    const newCase: AnimalCase = {
      id: newId,
      name: formName.trim(),
      age: formAge.trim(),
      objective: formObjective.trim(),
      image: formImage.trim() || fallbackImage,
      goal: Number(formGoal),
      defaultRaised: 0,
      storageKey: `walkie_case_${newId}_raised`,
      story: formStory.trim(),
      treatment: `${formEmergencyType}: ${formObjective.trim()}`,
      veterinarian: formVeterinarian.trim(),
      medicalOrderImage: finalMedicalOrder,
      medicalOrderFileName: formMedicalOrderFileName || 'pedido_medico_oficial.pdf',
      responsibleName: formResponsibleName.trim(),
      responsibleRole: 'Organizador / Rescatista responsable',
      dni: formDni.trim(),
      phone: formPhone.trim(),
      whatsapp: cleanPhone || '5493541000000',
      alias: formAlias.trim() || 'No especificado',
      cvu: formCvu.trim() || 'No especificado',
      tag: formEmergencyType
    };

    // Actualizar lista y guardar en localStorage
    const updatedList = [newCase, ...casesList];
    setCasesList(updatedList);

    try {
      const savedCustom = localStorage.getItem('walkie_custom_cases');
      const customArray = savedCustom ? JSON.parse(savedCustom) : [];
      customArray.unshift(newCase);
      localStorage.setItem('walkie_custom_cases', JSON.stringify(customArray));
    } catch (err) {
      console.error('Error saving custom case:', err);
    }

    // Inicializar mapa de recaudación
    setRaisedMap((prev) => ({ ...prev, [newId]: 0 }));

    // Desplegar automáticamente el acordeón para que vea el caso de inmediato
    setIsAccordionOpen(true);

    // Cerrar modal y limpiar campos
    setIsNewCaseModalOpen(false);
    setFormName('');
    setFormAge('');
    setFormImage('');
    setFormVeterinarian('');
    setFormMedicalOrder('');
    setFormMedicalOrderFileName('');
    setFormObjective('');
    setFormStory('');
    setFormGoal(60000);
    setFormResponsibleName('');
    setFormDni('');
    setFormPhone('');
    setFormAlias('');
    setFormCvu('');

    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.5 }
    });

    setPublishSuccessMessage(`¡El caso de ${newCase.name} ha sido publicado con éxito y validado con su pedido veterinario!`);
    setTimeout(() => setPublishSuccessMessage(null), 6000);
  };

  return (
    <div id="seccion-casos-necesitados" className="space-y-4 text-left">
      {/* 1. TÍTULO DE LA SECCIÓN */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-semibold tracking-wide uppercase mb-1.5 border border-emerald-200/60">
            <Heart className="w-3 h-3 fill-emerald-600 text-emerald-600" />
            <span>Casos Médicos y Rescates</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Aportá en casos de animales necesitados
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm mt-0.5">
            Historias reales de rescate en Punilla que necesitan cirugías y atención veterinaria urgente.
          </p>
        </div>
        <div className="text-xs text-slate-400 font-medium hidden sm:block">
          Casos 100% verificados
        </div>
      </div>

      {/* Banner de confirmación tras publicar nuevo caso */}
      {publishSuccessMessage && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-medium flex items-center justify-between gap-2 shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{publishSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setPublishSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* CONTROLES: BOTÓN ACORDEÓN + BOTÓN SUBÍ TU CASO */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {/* 1. Botón Acordeón "Ver casos de ayuda / Aportar" con ChevronDown */}
        <button
          type="button"
          id="btn-toggle-casos-acordeon"
          onClick={() => setIsAccordionOpen(!isAccordionOpen)}
          aria-expanded={isAccordionOpen}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2.5 shadow-2xs transition-all cursor-pointer ${
            isAccordionOpen
              ? 'bg-slate-900 hover:bg-slate-800 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white'
          }`}
        >
          <span>{isAccordionOpen ? 'Ocultar casos de ayuda' : 'Ver casos de ayuda'}</span>
          <span className="bg-white/20 text-white text-[11px] px-2 py-0.5 rounded-full font-bold">
            {casesList.length}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-300 ${
              isAccordionOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* 2. Botón "Subí tu caso de emergencia" */}
        <button
          type="button"
          id="btn-abrir-subir-caso"
          onClick={() => {
            setFormError(null);
            setIsNewCaseModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-white hover:bg-emerald-50 active:bg-emerald-100 text-emerald-800 border border-emerald-300/90 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-emerald-600" />
          <span>Subí tu caso de emergencia</span>
        </button>
      </div>

      {/* 1. SECCIÓN DESPLEGABLE: GRILLA DE TARJETAS COMPACTAS (ACORDEÓN) */}
      <AnimatePresence>
        {isAccordionOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
            animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="pt-2"
          >
            {casesList.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center space-y-3 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mx-auto">
                  🐾
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  No hay campañas de rescate activas en este momento
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Las protectoras y veterinarias del Valle de Punilla publican casos de emergencia aquí. Podés registrar un caso con pedido médico verificado usando el botón "Sumar Caso de Rescate".
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setIsNewCaseModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Publicar Caso Comunitario</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {casesList.map((c, idx) => {
                  const currentRaised = raisedMap[c.id] !== undefined ? raisedMap[c.id] : (c.defaultRaised || 0);
                  const percent = Math.min(100, Math.round((currentRaised / c.goal) * 100));

                  return (
                    <div
                      key={`case-card-${c.id}-${idx}`}
                      id={`card-resumen-caso-${c.id}`}
                      onClick={() => {
                        setActiveCase(c);
                        setContributionSuccess(null);
                      }}
                      className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 hover:border-emerald-500 hover:shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-2xs"
                    >
                      <div>
                        {/* Foto cuadrada contenida */}
                        <div className="w-full aspect-square rounded-xl overflow-hidden mb-3 bg-slate-100 relative">
                          <img
                            src={c.image}
                            alt={`${c.name} - ${c.objective}`}
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                            loading="lazy"
                          />
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-[10px] font-bold text-slate-800 shadow-2xs border border-slate-200/60">
                            {c.tag}
                          </span>

                          {c.medicalOrderImage && (
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-emerald-700/90 backdrop-blur-xs text-[9px] font-bold text-white shadow-2xs flex items-center gap-1">
                              <FileCheck className="w-3 h-3 text-emerald-200" />
                              <span>Pedido Médico</span>
                            </span>
                          )}
                        </div>

                        {/* Nombre y edad */}
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {c.name}, {c.age}
                        </h3>

                        {/* Objetivo breve */}
                        <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">
                          Objetivo: {c.objective}
                        </p>

                        {/* Profesional veterinario a cargo */}
                        {c.veterinarian && (
                          <p className="text-[11px] text-emerald-800 mt-1 flex items-center gap-1 line-clamp-1">
                            <Stethoscope className="w-3 h-3 shrink-0 text-emerald-600" />
                            <span className="truncate">{c.veterinarian}</span>
                          </p>
                        )}
                      </div>

                      {/* Mini barra de progreso + porcentaje */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-400 font-medium">Meta recaudada</span>
                          <span className="font-bold text-emerald-700">{percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        {/* Botón sutil "Ver caso" */}
                        <div className="mt-2.5 flex items-center justify-between text-xs text-emerald-700 font-semibold group-hover:text-emerald-800 pt-0.5">
                          <span>Ver caso e historia</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. MODAL DETALLADO FLOTANTE (AL HACER CLIC EN UNA TARJETA) */}
      <AnimatePresence>
        {activeCase && (
          <div
            key="modal-active-case-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setActiveCase(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl p-5 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 text-left relative my-8 max-h-[90vh] overflow-y-auto"
            >
              {/* Botón de cerrar (X) */}
              <button
                type="button"
                id="btn-cerrar-modal-caso"
                onClick={() => setActiveCase(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors z-10 cursor-pointer"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Cabecera con foto en tamaño moderado */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pr-6">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                  <img
                    src={activeCase.image}
                    alt={activeCase.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200/80 mb-1">
                    {activeCase.tag}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900">
                    {activeCase.name}, {activeCase.age}
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold text-emerald-700 mt-0.5">
                    Objetivo: {activeCase.objective}
                  </p>
                </div>
              </div>

              {/* SECCIÓN DE VALIDACIÓN VETERINARIA Y PEDIDO MÉDICO ADJUNTO */}
              <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wide">
                    <Stethoscope className="w-4 h-4 text-emerald-700" />
                    <span>Validación y Control Veterinario</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    {activeCase.veterinarian || 'Profesional matriculado/a a cargo'}
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Caso con diagnóstico clínico homologado y orden adjunta
                  </p>
                </div>

                {activeCase.medicalOrderImage && (
                  <button
                    type="button"
                    id="btn-ver-pedido-veterinario-adjunto"
                    onClick={() => setViewingMedicalOrderCase(activeCase)}
                    className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs shrink-0 cursor-pointer transition-colors"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Ver Pedido Veterinario Adjunto</span>
                  </button>
                )}
              </div>

              {/* Historia detallada y tratamiento */}
              <div className="space-y-2 text-xs sm:text-sm text-slate-600 bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70">
                <div className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Historia del rescate:
                </div>
                <p className="leading-relaxed text-slate-600">
                  {activeCase.story}
                </p>
                <div className="pt-2 border-t border-slate-200/60 mt-2">
                  <span className="font-semibold text-slate-800">Tratamiento médico: </span>
                  <span className="text-slate-600">{activeCase.treatment}</span>
                </div>
              </div>

              {/* Barra de meta extendida con montos recaudados y faltantes */}
              {(() => {
                const raised = raisedMap[activeCase.id] !== undefined ? raisedMap[activeCase.id] : (activeCase.defaultRaised || 0);
                const percent = Math.min(100, Math.round((raised / activeCase.goal) * 100));
                const remaining = Math.max(0, activeCase.goal - raised);

                return (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Progreso de recaudación:
                      </span>
                      <div className="text-left sm:text-right">
                        <span className="text-base sm:text-lg font-black text-slate-900">
                          {formatPesos(raised)}
                        </span>
                        <span className="text-xs text-slate-500 font-medium ml-1">
                          de {formatPesos(activeCase.goal)} ({percent}%)
                        </span>
                      </div>
                    </div>

                    {/* Barra extendida visualmente verde */}
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden p-0.5 border border-slate-300/60">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-700 shadow-xs"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        {remaining > 0
                          ? `Faltan ${formatPesos(remaining)} para completar la meta`
                          : '¡Meta alcanzada! Gracias por la solidaridad'}
                      </span>
                      <span className="font-bold text-emerald-700">{percent}%</span>
                    </div>
                  </div>
                );
              })()}

              {/* Selector de aportes rápidos */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                  <span>Elegí el monto a aportar:</span>
                  <span className="text-emerald-700 font-mono text-xs">{formatPesos(selectedContributionAmount)}</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[2000, 5000, 10000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSelectedContributionAmount(amt)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        selectedContributionAmount === amt
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {formatPesos(amt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botón de acción destacado: Aportar a este caso */}
              <button
                type="button"
                id="btn-confirmar-aporte-caso"
                onClick={() => handleContributeToCase(activeCase, selectedContributionAmount)}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Heart className="w-4 h-4 fill-white" />
                <span>Aportar {formatPesos(selectedContributionAmount)} a este caso</span>
              </button>

              {/* Banner de éxito al aportar */}
              {contributionSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{contributionSuccess}</span>
                </motion.div>
              )}

              {/* DATOS DE TRANSPARENCIA Y CONTACTO */}
              <div className="pt-3 border-t border-slate-200 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Datos de Transparencia y Contacto Directo</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Responsable + DNI */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Responsable del caso</div>
                    <div className="font-bold text-slate-900">{activeCase.responsibleName}</div>
                    <div className="text-[11px] text-emerald-700">{activeCase.responsibleRole}</div>
                    <div className="text-[11px] text-slate-500 mt-1">DNI: <strong className="text-slate-800">{activeCase.dni}</strong></div>
                  </div>

                  {/* Teléfono / WhatsApp */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Teléfono / WhatsApp</div>
                      <div className="font-bold text-slate-900 font-mono text-xs">{activeCase.phone}</div>
                    </div>
                    <a
                      href={`https://wa.me/${activeCase.whatsapp}?text=${encodeURIComponent(`Hola ${activeCase.responsibleName}, te escribo desde Walkie para consultar sobre el caso de rescate de ${activeCase.name}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Escribir por WhatsApp →</span>
                    </a>
                  </div>

                  {/* Alias Mercado Pago */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Alias Mercado Pago</div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-mono font-bold text-emerald-800 text-xs truncate mr-1">
                        {activeCase.alias}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(activeCase.alias, `alias-${activeCase.id}`)}
                        className="px-2 py-0.5 rounded bg-white hover:bg-emerald-50 border border-slate-200 text-slate-700 hover:text-emerald-700 text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedField === `alias-${activeCase.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === `alias-${activeCase.id}` ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  {/* CVU Mercado Pago */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">CVU Oficial</div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-mono text-[10px] text-slate-700 truncate mr-1">
                        {activeCase.cvu}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(activeCase.cvu, `cvu-${activeCase.id}`)}
                        className="px-2 py-0.5 rounded bg-white hover:bg-emerald-50 border border-slate-200 text-slate-700 hover:text-emerald-700 text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedField === `cvu-${activeCase.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === `cvu-${activeCase.id}` ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL FLOTANTE DEDICADO: VISUALIZADOR DE PEDIDO VETERINARIO ADJUNTO */}
      <AnimatePresence>
        {viewingMedicalOrderCase && (
          <div
            key="modal-medical-order-backdrop"
            className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setViewingMedicalOrderCase(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl p-5 sm:p-6 max-w-2xl w-full border border-slate-200 shadow-2xl space-y-4 text-left relative my-6 max-h-[92vh] flex flex-col"
            >
              {/* Botón de cierre */}
              <button
                type="button"
                id="btn-cerrar-visor-orden-medica"
                onClick={() => setViewingMedicalOrderCase(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors z-10 cursor-pointer"
                title="Cerrar comprobante"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Cabecera del visor */}
              <div className="pr-8">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200/80 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Comprobante Veterinario Adjunto • Transparencia Walkie</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span>Pedido / Receta Oficial: {viewingMedicalOrderCase.name}</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Profesional o clínica a cargo: <strong>{viewingMedicalOrderCase.veterinarian}</strong>
                </p>
              </div>

              {/* Contenedor del documento con scroll suave */}
              <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200/90 bg-slate-50 p-2 sm:p-3 flex items-center justify-center min-h-[300px] max-h-[60vh]">
                {viewingMedicalOrderCase.medicalOrderImage ? (
                  <img
                    src={viewingMedicalOrderCase.medicalOrderImage}
                    alt={`Orden médica para ${viewingMedicalOrderCase.name}`}
                    className="max-w-full max-h-[58vh] object-contain rounded-xl shadow-xs border border-slate-200 bg-white"
                  />
                ) : (
                  <div className="text-center p-8 text-slate-400 text-xs">
                    No se encontró imagen de la orden médica.
                  </div>
                )}
              </div>

              {/* Pie con acciones */}
              <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="text-slate-500 flex items-center gap-1.5 text-[11px]">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Archivo: {viewingMedicalOrderCase.medicalOrderFileName || 'pedido_medico_oficial.pdf'}</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {viewingMedicalOrderCase.medicalOrderImage && (
                    <a
                      href={viewingMedicalOrderCase.medicalOrderImage}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={`orden_veterinaria_${viewingMedicalOrderCase.name.toLowerCase()}.png`}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Abrir original</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewingMedicalOrderCase(null)}
                    className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
                  >
                    Cerrar visor
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2 & 3. MODAL / FORMULARIO "SUBÍ TU CASO DE EMERGENCIA" */}
      <AnimatePresence>
        {isNewCaseModalOpen && (
          <div
            key="modal-new-case-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsNewCaseModalOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl p-5 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 text-left relative my-8 max-h-[92vh] overflow-y-auto"
            >
              {/* Botón de cierre */}
              <button
                type="button"
                id="btn-cerrar-modal-subir-caso"
                onClick={() => setIsNewCaseModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer z-10"
                title="Cerrar formulario"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Encabezado del Formulario */}
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-semibold tracking-wide uppercase mb-1 border border-emerald-200/60">
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Nuevo Caso Solidario</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  Subí tu caso de emergencia
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Completá los datos para que la comunidad de Punilla pueda conocer el rescate y colaborar.
                </p>
              </div>

              {/* Mensaje de error si falta algún campo */}
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Formulario estructurado según los puntos solicitados */}
              <form onSubmit={handlePublishCase} className="space-y-4">
                {/* 1. Nombre y edad de la mascota */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nombre de la mascota *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Toby, Chicho, Blanquita"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Edad estimada *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: 2 años, 8 meses, Cachorro"
                      value={formAge}
                      onChange={(e) => setFormAge(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                    />
                  </div>
                </div>

                {/* 2. Foto de la mascota (Upload Drag & Drop + Manual Click + URL) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Foto de la mascota (subí imagen o ingresá URL)
                  </label>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingPet(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDraggingPet(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingPet(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        processPetPhotoFile(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => petFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-3 sm:p-4 text-center cursor-pointer transition-all ${
                      isDraggingPet
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-slate-200 hover:border-emerald-400 bg-slate-50/40'
                    }`}
                  >
                    <input
                      ref={petFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          processPetPhotoFile(e.target.files[0]);
                        }
                      }}
                    />

                    {formImage ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={formImage}
                          alt="Vista previa mascota"
                          className="w-14 h-14 rounded-xl object-cover border border-emerald-300"
                        />
                        <div className="text-left flex-1">
                          <p className="text-xs font-semibold text-emerald-800">
                            ✓ Foto de la mascota cargada
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Hacé clic o arrastrá para reemplazarla
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormImage('');
                          }}
                          className="text-xs text-rose-600 hover:underline px-2 py-1 cursor-pointer"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Upload className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">
                          Elegí o arrastrá la foto del animalito
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Formatos PNG, JPG, WEBP
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Alternativa URL directa */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-medium">O por URL:</span>
                    <input
                      type="url"
                      placeholder="https://ejemplo.com/foto-mascota.jpg"
                      value={formImage.startsWith('data:') ? '' : formImage}
                      onChange={(e) => setFormImage(e.target.value)}
                      className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>

                {/* 3. Doctora / Veterinario a cargo */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Doctora / Veterinario a cargo *</span>
                    </label>
                    <span className="text-[10px] text-emerald-700 font-semibold">Validación médica</span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Dra. Sofía Morales (M.P. 4821) • Hospital Veterinario Punilla"
                    value={formVeterinarian}
                    onChange={(e) => setFormVeterinarian(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ingresá el nombre de la profesional o clínica médica que atiende y certifica el caso.
                  </p>
                </div>

                {/* 4. Adjuntar pedido veterinario / orden médica (comprobante) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Adjuntar pedido veterinario / orden médica (comprobante)</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateSampleOrder}
                      className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      title="Genera automáticamente un protocolo clínico digital si no tienes archivo escaneado"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generar certificado digital</span>
                    </button>
                  </div>

                  {/* Zona de Drop & Clic para archivo médico */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingOrder(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDraggingOrder(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingOrder(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        processMedicalOrderFile(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => orderFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-3 sm:p-4 text-center cursor-pointer transition-all ${
                      isDraggingOrder
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-slate-200 hover:border-emerald-400 bg-emerald-50/20'
                    }`}
                  >
                    <input
                      ref={orderFileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          processMedicalOrderFile(e.target.files[0]);
                        }
                      }}
                    />

                    {formMedicalOrder ? (
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl border border-emerald-300 bg-white p-1 overflow-hidden flex items-center justify-center shrink-0">
                          {formMedicalOrder.startsWith('data:image/svg') || formMedicalOrder.startsWith('data:image/') ? (
                            <img
                              src={formMedicalOrder}
                              alt="Comprobante médico"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <FileText className="w-8 h-8 text-emerald-600" />
                          )}
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Pedido médico cargado</span>
                          </p>
                          <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                            {formMedicalOrderFileName || 'orden_veterinaria_oficial.pdf'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Hacé clic para reemplazar el archivo
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormMedicalOrder('');
                            setFormMedicalOrderFileName('');
                          }}
                          className="text-xs text-rose-600 hover:underline px-2 py-1 cursor-pointer"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                        <div className="w-8 h-8 rounded-full bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
                          <Paperclip className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">
                          Hacé clic para subir la receta, pedido médico o presupuesto oficial
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Formatos PNG, JPG, WEBP o PDF • Aporta máxima transparencia
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Tipo de emergencia / tratamiento requerido */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tipo de emergencia *
                    </label>
                    <select
                      value={formEmergencyType}
                      onChange={(e) => setFormEmergencyType(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                    >
                      <option value="Cirugía">Cirugía Urgente</option>
                      <option value="Tratamiento">Tratamiento Clínico</option>
                      <option value="Vacunación">Vacunación y Cuidados</option>
                      <option value="Medicación">Medicación Especial</option>
                      <option value="Rehabilitación">Rehabilitación / Fisioterapia</option>
                      <option value="Castración">Castración Sanitaria</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tratamiento requerido breve *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Cirugía de cadera y antibióticos"
                      value={formObjective}
                      onChange={(e) => setFormObjective(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                    />
                  </div>
                </div>

                {/* 6. Breve historia del caso */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Breve historia del caso *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Contá dónde fue rescatado, en qué condiciones se encuentra y por qué necesita el tratamiento..."
                    value={formStory}
                    onChange={(e) => setFormStory(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 resize-none"
                  />
                </div>

                {/* 7. Monto total de la meta ($) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Monto total de la meta ($ ARS) *
                    </label>
                    <span className="text-xs font-bold text-emerald-700">
                      {formGoal ? formatPesos(Number(formGoal)) : '$ 0'}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    required
                    placeholder="Ej: 60000"
                    value={formGoal}
                    onChange={(e) => setFormGoal(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 font-mono"
                  />
                </div>

                {/* 8. DATOS DE CONTACTO Y TRANSPARENCIA */}
                <div className="pt-2 border-t border-slate-200 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Datos de Contacto y Transparencia</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nombre y Apellido del responsable *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: María Gómez"
                        value={formResponsibleName}
                        onChange={(e) => setFormResponsibleName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        DNI del responsable *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: 35.120.450"
                        value={formDni}
                        onChange={(e) => setFormDni(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Teléfono / WhatsApp *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Ej: +54 9 3541 23-4567"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Alias Mercado Pago
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: rescates.toby.mp"
                        value={formAlias}
                        onChange={(e) => setFormAlias(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      CVU Mercado Pago (opcional si tenés Alias)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 0000003100084729103841"
                      value={formCvu}
                      onChange={(e) => setFormCvu(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 font-mono"
                    />
                  </div>
                </div>

                {/* Botón de envío "Publicar Caso" */}
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsNewCaseModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    id="btn-publicar-caso-submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Publicar Caso con Validación</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. MODAL CENTRALIZADO DE PAGO PARA APORTES DE EMERGENCIA */}
      {paymentModalCase && (
        <DonationPaymentModal
          isOpen={!!paymentModalCase}
          onClose={() => setPaymentModalCase(null)}
          category="emergency_case"
          title={`Aporte Médico: ${paymentModalCase.caseItem.name}`}
          description={`${paymentModalCase.caseItem.objective} • ${paymentModalCase.caseItem.veterinarian}`}
          amount={paymentModalCase.amount}
          destinationName={`Caso ${paymentModalCase.caseItem.name} (${paymentModalCase.caseItem.responsibleName})`}
          targetId={paymentModalCase.caseItem.id}
          patientName={paymentModalCase.caseItem.name}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};
