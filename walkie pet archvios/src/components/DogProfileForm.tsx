import React, { useState, useRef, useEffect } from 'react';
import { DogProfile, TemperamentType, WeightCategory } from '../types';
import { 
  PawPrint, Heart, Shield, Phone, MapPin, Stethoscope, 
  CheckCircle2, AlertCircle, Pencil, Edit3, 
  ChevronUp, Sparkles, UserCheck, Dog, Search, Check, Trash2, Camera, Upload, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GarantiaCuidadoCard } from './GarantiaCuidadoCard';
import { compressImageFile } from '../utils/imageCompressor';

interface DogProfileFormProps {
  initialData?: Partial<DogProfile>;
  onSave: (dog: DogProfile) => void;
  onDelete?: (dogId: string) => void;
  defaultPickupAddress?: string;
  defaultPhone?: string;
  onClose?: () => void;
}

const TEMPERAMENTS: { value: TemperamentType; label: string; desc: string; emoji: string }[] = [
  { value: 'Tranquilo', label: 'Tranquilo', desc: 'Pasea relajado, no tira de la correa', emoji: '😌' },
  { value: 'Sociable', label: 'Sociable', desc: 'Amigable con humanos y otros perros', emoji: '🐶' },
  { value: 'Reactivo', label: 'Reactivo', desc: 'Atento a estímulos, requiere paseador firme', emoji: '⚡' },
  { value: 'Nervioso', label: 'Nervioso', desc: 'Tímido o temeroso ante ruidos fuertes', emoji: '🥺' },
  { value: 'Dominante', label: 'Dominante', desc: 'Líder de grupo, pasear con perros sumisos', emoji: '👑' },
  { value: 'Juguetón', label: 'Juguetón', desc: 'Mucha energía, salta y busca interacción', emoji: '🎾' }
];

const WEIGHT_CATEGORIES: { value: WeightCategory; label: string; range: string; icon: string }[] = [
  { value: 'Pequeño', label: 'Pequeño', range: 'Hasta 10 kg', icon: '🐕' },
  { value: 'Mediano', label: 'Mediano', range: '10 a 25 kg', icon: '🐕🦺' },
  { value: 'Grande', label: 'Grande', range: 'Más de 25 kg', icon: '🦮' }
];

export const DogProfileForm: React.FC<DogProfileFormProps> = ({
  initialData,
  onSave,
  onDelete,
  defaultPickupAddress = '',
  defaultPhone = '',
  onClose
}) => {
  // Estado de los campos del formulario
  const [photoUrl, setPhotoUrl] = useState<string>(initialData?.photoUrl || '');
  const [name, setName] = useState(initialData?.name || '');
  const [age, setAge] = useState(initialData?.age || '');
  const [breed, setBreed] = useState(initialData?.breed || '');
  const [weightCategory, setWeightCategory] = useState<WeightCategory>(initialData?.weightCategory || 'Mediano');
  const [temperament, setTemperament] = useState<TemperamentType>(initialData?.temperament || 'Sociable');
  const [vetLocalidad, setVetLocalidad] = useState<string>(initialData?.vetLocalidad || 'Valle de Punilla');
  const [trustedVet, setTrustedVet] = useState(initialData?.trustedVet || '');
  const [pickupLocation, setPickupLocation] = useState(initialData?.pickupLocation || defaultPickupAddress);
  const [illnesses, setIllnesses] = useState(initialData?.illnesses || '');
  const [compatibility, setCompatibility] = useState(initialData?.compatibility || '');
  const [emergencyPhonePrimary, setEmergencyPhonePrimary] = useState(initialData?.emergencyPhonePrimary || defaultPhone);
  const [emergencyPhoneSecondary, setEmergencyPhoneSecondary] = useState(initialData?.emergencyPhoneSecondary || '');
  
  // Feedback y validación
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [missingFieldId, setMissingFieldId] = useState<string | null>(null);
  const [validationAlert, setValidationAlert] = useState<string | null>(null);

  // Referencias a los inputs para scroll y foco automático
  const dogFileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const ageInputRef = useRef<HTMLInputElement>(null);
  const breedInputRef = useRef<HTMLInputElement>(null);
  const trustedVetInputRef = useRef<HTMLInputElement>(null);
  const pickupLocationInputRef = useRef<HTMLInputElement>(null);
  const illnessesInputRef = useRef<HTMLInputElement>(null);
  const compatibilityInputRef = useRef<HTMLInputElement>(null);
  const phonePrimaryInputRef = useRef<HTMLInputElement>(null);
  const phoneSecondaryInputRef = useRef<HTMLInputElement>(null);

  // Sync state if initialData changes
  useEffect(() => {
    if (initialData) {
      setPhotoUrl(initialData.photoUrl || '');
      setName(initialData.name || '');
      setAge(initialData.age ? String(initialData.age) : '');
      setBreed(initialData.breed || '');
      setTrustedVet(initialData.trustedVet || '');
      if (initialData.vetLocalidad) {
        setVetLocalidad(initialData.vetLocalidad);
      }
      setPickupLocation(initialData.pickupLocation || defaultPickupAddress);
      setIllnesses(initialData.illnesses || '');
      setTemperament(initialData.temperament || 'Sociable');
      setCompatibility(initialData.compatibility || '');
      setEmergencyPhonePrimary(initialData.emergencyPhonePrimary || defaultPhone);
      setEmergencyPhoneSecondary(initialData.emergencyPhoneSecondary || '');
      setWeightCategory(initialData.weightCategory || 'Mediano');
      setIsCollapsed(false);
    }
  }, [initialData, defaultPickupAddress, defaultPhone]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file, 1200, 0.82);
        if (compressed) {
          setPhotoUrl(compressed);
          setPhotoError(null);
          if (missingFieldId === 'input-foto-perro') {
            setMissingFieldId(null);
            setValidationAlert(null);
          }
        }
      } catch {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setPhotoUrl(event.target.result as string);
            setPhotoError(null);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // 🚨 VALIDACIÓN ESTRICTA: Absolutamente TODOS los campos son obligatorios
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Foto real obligatoria
    if (!photoUrl) {
      setPhotoError('Debés subir una foto real de tu perro (obligatorio).');
      setMissingFieldId('input-foto-perro');
      setValidationAlert('Falta la foto real de tu mascota. Este campo es obligatorio para la seguridad del paseo.');
      dogFileInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 2. Nombre
    if (!name.trim()) {
      setMissingFieldId('input-name');
      setValidationAlert('Falta completar: Nombre del perro.');
      nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      nameInputRef.current?.focus();
      return;
    }

    // 3. Edad
    if (!age.trim()) {
      setMissingFieldId('input-age');
      setValidationAlert('Falta completar: Edad de tu perro (ej. 3 años).');
      ageInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      ageInputRef.current?.focus();
      return;
    }

    // 4. Raza
    if (!breed.trim()) {
      setMissingFieldId('input-breed');
      setValidationAlert('Falta completar: Raza de tu perro (ej. Mestizo, Caniche, Golden).');
      breedInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      breedInputRef.current?.focus();
      return;
    }

    // 5. Categoría de peso
    if (!weightCategory) {
      setMissingFieldId('input-weight');
      setValidationAlert('Falta seleccionar: Categoría de peso corporal.');
      return;
    }

    // 6. Temperamento
    if (!temperament) {
      setMissingFieldId('input-temperament');
      setValidationAlert('Falta seleccionar: Temperamento del perro.');
      return;
    }

    // 7. Lugar de retiro y entrega (Validación directa sin bloqueo de localidad de veterinaria)
    const effectiveTrustedVet = trustedVet.trim() || 'Veterinaria de Guardia Más Cercana (Punilla)';

    // 9. Lugar de retiro y entrega
    if (!pickupLocation.trim()) {
      setMissingFieldId('input-pickup-location');
      setValidationAlert('Falta completar: Lugar de retiro y entrega (dirección exacta).');
      pickupLocationInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      pickupLocationInputRef.current?.focus();
      return;
    }

    // 10. Salud y cuidados especiales (Obligatorio)
    if (!illnesses.trim()) {
      setMissingFieldId('input-illnesses');
      setValidationAlert('Falta completar: Salud y cuidados especiales. Escribe "Ninguna" o "Sano" si no posee condiciones médicas.');
      illnessesInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      illnessesInputRef.current?.focus();
      return;
    }

    // 11. Compatibilidad con otros perros (Obligatorio)
    if (!compatibility.trim()) {
      setMissingFieldId('input-compatibility');
      setValidationAlert('Falta completar: Compatibilidad con otros perros (ej. "Sociable con todos", "Pasear individual").');
      compatibilityInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      compatibilityInputRef.current?.focus();
      return;
    }

    // 12. Teléfono de contacto principal (Obligatorio)
    if (!emergencyPhonePrimary.trim()) {
      setMissingFieldId('input-phone-primary');
      setValidationAlert('Falta completar: Teléfono principal de contacto del dueño.');
      phonePrimaryInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      phonePrimaryInputRef.current?.focus();
      return;
    }

    // 13. Teléfono secundario de respaldo (Obligatorio)
    if (!emergencyPhoneSecondary.trim()) {
      setMissingFieldId('input-phone-secondary');
      setValidationAlert('Falta completar: Teléfono secundario de respaldo para emergencias (familiar o veterinario alternativo).');
      phoneSecondaryInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      phoneSecondaryInputRef.current?.focus();
      return;
    }

    // Limpiar alertas de validación al pasar todos los requerimientos
    setMissingFieldId(null);
    setValidationAlert(null);

    const profile: DogProfile = {
      id: initialData?.id || `dog-${Date.now()}`,
      name: name.trim(),
      age: age.trim(),
      breed: breed.trim(),
      weightCategory,
      temperament,
      vetLocalidad: vetLocalidad.trim(),
      trustedVet: trustedVet.trim() || effectiveTrustedVet,
      pickupLocation: pickupLocation.trim(),
      illnesses: illnesses.trim(),
      compatibility: compatibility.trim(),
      emergencyPhonePrimary: emergencyPhonePrimary.trim(),
      emergencyPhoneSecondary: emergencyPhoneSecondary.trim(),
      photoUrl,
      calificacionPromedio: initialData?.calificacionPromedio,
      totalPaseosCompletados: initialData?.totalPaseosCompletados,
      historialCalificaciones: initialData?.historialCalificaciones,
      planActivo: initialData?.planActivo
    };

    onSave(profile);
    setSavedSuccess(true);
    
    setTimeout(() => {
      setSavedSuccess(false);
      setIsCollapsed(true);
    }, 900);
  };

  // 1. COLLAPSED SUMMARY CARD WITH EDIT PENCIL
  if (isCollapsed && name) {
    const currentTemp = TEMPERAMENTS.find(t => t.value === temperament) || TEMPERAMENTS[1];
    const currentWeight = WEIGHT_CATEGORIES.find(w => w.value === weightCategory) || WEIGHT_CATEGORIES[1];

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        id="card-perfil-perro-resumen"
        className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-emerald-600/30 shadow-md hover:shadow-lg transition-all relative overflow-hidden group"
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 to-teal-700" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={photoUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80'}
                alt={name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm"
              />
              <span className="absolute -bottom-1 -right-1 text-base bg-white rounded-full p-0.5 shadow-2xs border border-slate-200">
                {currentTemp.emoji}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {name}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {breed}
                </span>
                {initialData?.calificacionPromedio && (
                  <span className="inline-flex items-center gap-1 text-xs font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    {initialData.calificacionPromedio.toFixed(1)}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-600 mt-1 font-medium">
                <span>🎂 {age}</span>
                <span>•</span>
                <span>⚖️ {currentWeight.label} ({currentWeight.range})</span>
                <span>•</span>
                <span className="text-emerald-700 font-bold">🩺 {trustedVet.split('-')[0] || 'Veterinaria registrada'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              id="btn-editar-perfil-perro-contraido"
              onClick={() => setIsCollapsed(false)}
              className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-sm flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-emerald-400" />
              <span>Editar Ficha</span>
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // 2. EXPANDED EDITABLE FORM
  return (
    <form
      onSubmit={handleSubmit}
      id="form-perfil-perro-completo"
      className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-md space-y-6 text-left relative"
    >
      {/* Header del formulario */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
            <PawPrint className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
              {initialData?.name ? `Ficha Médica de ${initialData.name}` : 'Crear Perfil de tu Perro'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Todos los campos son obligatorios para garantizar un paseo 100% seguro y monitoreado.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
            title="Cerrar formulario"
          >
            ✕
          </button>
        )}
      </div>

      {/* ⚠️ ALERTA PROMINENTE DE CAMPOS FALTANTES */}
      {validationAlert && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-900 text-xs sm:text-sm font-bold flex items-start gap-2.5 shadow-sm"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-rose-950">Atención: Hay campos obligatorios pendientes</p>
            <p className="mt-0.5 font-medium text-rose-800">{validationAlert}</p>
          </div>
        </motion.div>
      )}

      {/* 📸 SECCIÓN 1: FOTO REAL DE LA MASCOTA (Placeholder Neutro) */}
      <div 
        id="input-foto-perro-box"
        className={`p-4 rounded-2xl border-2 transition-all ${
          missingFieldId === 'input-foto-perro' 
            ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-200' 
            : 'border-slate-200 bg-slate-50/70'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-emerald-600" />
            <span>Foto Real de tu Perro * (Obligatoria)</span>
          </label>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            Requerido
          </span>
        </div>
        <p className="text-xs text-slate-600 mb-3">
          Subí una foto nítida y real de tu perro. Esto permite al paseador identificarlo de inmediato al llegar a tu domicilio.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative shrink-0">
            {photoUrl ? (
              <div className="relative group">
                <img
                  src={photoUrl}
                  alt="Foto del perro"
                  className="w-24 h-24 rounded-2xl object-cover border-3 border-emerald-500 shadow-md"
                />
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center cursor-pointer shadow hover:bg-rose-700"
                  title="Cambiar foto"
                >
                  ✕
                </button>
              </div>
            ) : (
              /* PLACEHOLDER NEUTRO LIMPIO DE CARGA */
              <div 
                onClick={() => dogFileInputRef.current?.click()}
                className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-slate-300 hover:border-emerald-500 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-700 cursor-pointer hover:bg-emerald-50/40 transition-all shadow-2xs group text-center p-2"
              >
                <Upload className="w-6 h-6 group-hover:scale-110 transition-transform mb-1 text-slate-400 group-hover:text-emerald-600" />
                <span className="text-[10px] font-black leading-tight">Cargar Foto Real</span>
              </div>
            )}
          </div>

          <div className="flex-1 w-full space-y-2">
            <input
              ref={dogFileInputRef}
              type="file"
              id="input-foto-perro"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
            />
            {photoError && (
              <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{photoError}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 🐶 SECCIÓN 2: INFORMACIÓN BÁSICA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nombre del Perro *
          </label>
          <input
            ref={nameInputRef}
            id="input-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (missingFieldId === 'input-name') setMissingFieldId(null);
            }}
            placeholder="Ej. Simón"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none transition-all ${
              missingFieldId === 'input-name' 
                ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/50' 
                : 'border-slate-300 focus:ring-2 focus:ring-emerald-500'
            }`}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Edad / Años *
          </label>
          <input
            ref={ageInputRef}
            id="input-age"
            type="text"
            value={age}
            onChange={(e) => {
              setAge(e.target.value);
              if (missingFieldId === 'input-age') setMissingFieldId(null);
            }}
            placeholder="Ej. 3 años"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none transition-all ${
              missingFieldId === 'input-age' 
                ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/50' 
                : 'border-slate-300 focus:ring-2 focus:ring-emerald-500'
            }`}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Raza *
          </label>
          <input
            ref={breedInputRef}
            id="input-breed"
            type="text"
            value={breed}
            onChange={(e) => {
              setBreed(e.target.value);
              if (missingFieldId === 'input-breed') setMissingFieldId(null);
            }}
            placeholder="Ej. Mestizo / Golden / Caniche"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none transition-all ${
              missingFieldId === 'input-breed' 
                ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/50' 
                : 'border-slate-300 focus:ring-2 focus:ring-emerald-500'
            }`}
            required
          />
        </div>
      </div>

      {/* ⚖️ CATEGORÍA DE PESO */}
      <div id="input-weight">
        <label className="block text-xs font-bold text-slate-700 mb-2">
          Categoría de Peso Corporal *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {WEIGHT_CATEGORIES.map((cat) => (
            <label
              key={cat.value}
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                weightCategory === cat.value
                  ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-2xs'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <input
                type="radio"
                name="weightCategory"
                value={cat.value}
                checked={weightCategory === cat.value}
                onChange={() => setWeightCategory(cat.value)}
                className="sr-only"
              />
              <span className="text-2xl">{cat.icon}</span>
              <div>
                <div className="text-sm font-black">{cat.label}</div>
                <div className="text-[11px] text-slate-500">{cat.range}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 🐾 TEMPERAMENTO */}
      <div id="input-temperament">
        <label className="block text-xs font-bold text-slate-700 mb-2">
          Temperamento y Conducta en Paseos *
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {TEMPERAMENTS.map((temp) => (
            <label
              key={temp.value}
              className={`p-2.5 sm:p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                temperament === temp.value
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <input
                type="radio"
                name="temperament"
                value={temp.value}
                checked={temperament === temp.value}
                onChange={() => setTemperament(temp.value)}
                className="sr-only"
              />
              <span className="text-xl shrink-0 mt-0.5">{temp.emoji}</span>
              <div>
                <div className="text-xs font-black">{temp.label}</div>
                <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{temp.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 🩺 SECCIÓN 3: VETERINARIA DE CONFIANZA / CONTACTO DE EMERGENCIA */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-emerald-600 shrink-0" />
          <h4 className="text-sm font-black text-slate-900">
            Veterinaria de Confianza / Contacto de Urgencias
          </h4>
        </div>
        <p className="text-[11px] text-slate-500">
          Podés ingresar el nombre de la clínica o profesional de cabecera de tu mascota y su teléfono de contacto ante cualquier eventualidad.
        </p>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nombre de la Veterinaria y Teléfono
          </label>
          <input
            ref={trustedVetInputRef}
            id="input-trusted-vet"
            type="text"
            value={trustedVet}
            onChange={(e) => {
              setTrustedVet(e.target.value);
              if (missingFieldId === 'input-trusted-vet') setMissingFieldId(null);
            }}
            placeholder="Ej: Clínica San Roque - Av. San Martín 200 (Tel: +54 9 3541 421000)"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* 📍 SECCIÓN 4: LUGAR DE RETIRO Y ENTREGA */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          Lugar de Retiro y Entrega (Dirección exacta) *
        </label>
        <div className="relative">
          <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            ref={pickupLocationInputRef}
            id="input-pickup-location"
            type="text"
            value={pickupLocation}
            onChange={(e) => {
              setPickupLocation(e.target.value);
              if (missingFieldId === 'input-pickup-location') setMissingFieldId(null);
            }}
            placeholder="Ej. Av. San Martín 450, Villa Carlos Paz"
            className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none transition-all ${
              missingFieldId === 'input-pickup-location' 
                ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/50' 
                : 'border-slate-300 focus:ring-2 focus:ring-emerald-500'
            }`}
            required
          />
        </div>
      </div>

      {/* ⚠️ SECCIÓN 5: SALUD, CUIDADOS Y COMPATIBILIDAD (OBLIGATORIOS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Salud, Enfermedades o Cuidados Especiales *
          </label>
          <input
            ref={illnessesInputRef}
            id="input-illnesses"
            type="text"
            value={illnesses}
            onChange={(e) => {
              setIllnesses(e.target.value);
              if (missingFieldId === 'input-illnesses') setMissingFieldId(null);
            }}
            placeholder="Ej. Sano / Ninguna / Displasia leve en cadera"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none transition-all ${
              missingFieldId === 'input-illnesses' 
                ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/50' 
                : 'border-slate-300 focus:ring-2 focus:ring-emerald-500'
            }`}
            required
          />
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Escribe "Ninguna" o "Sano" si no posee condiciones médicas preexistentes.
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Compatibilidad con otros perros *
          </label>
          <input
            ref={compatibilityInputRef}
            id="input-compatibility"
            type="text"
            value={compatibility}
            onChange={(e) => {
              setCompatibility(e.target.value);
              if (missingFieldId === 'input-compatibility') setMissingFieldId(null);
            }}
            placeholder="Ej. Sociable con todos / Preferible paseo individual"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none transition-all ${
              missingFieldId === 'input-compatibility' 
                ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/50' 
                : 'border-slate-300 focus:ring-2 focus:ring-emerald-500'
            }`}
            required
          />
        </div>
      </div>

      {/* 📞 SECCIÓN 6: TELÉFONOS DE CONTACTO Y EMERGENCIA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Teléfono Principal (Dueño) *
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              ref={phonePrimaryInputRef}
              id="input-phone-primary"
              type="tel"
              value={emergencyPhonePrimary}
              onChange={(e) => {
                setEmergencyPhonePrimary(e.target.value);
                if (missingFieldId === 'input-phone-primary') setMissingFieldId(null);
              }}
              placeholder="+54 9 351 111-2233"
              className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm bg-white font-medium focus:outline-none transition-all ${
                missingFieldId === 'input-phone-primary' 
                  ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/50' 
                  : 'border-slate-300 focus:ring-2 focus:ring-emerald-500'
              }`}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Teléfono Secundario (Respaldo Emergencias) *
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              ref={phoneSecondaryInputRef}
              id="input-phone-secondary"
              type="tel"
              value={emergencyPhoneSecondary}
              onChange={(e) => {
                setEmergencyPhoneSecondary(e.target.value);
                if (missingFieldId === 'input-phone-secondary') setMissingFieldId(null);
              }}
              placeholder="+54 9 351 444-5566"
              className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm bg-white font-medium focus:outline-none transition-all ${
                missingFieldId === 'input-phone-secondary' 
                  ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/50' 
                  : 'border-slate-300 focus:ring-2 focus:ring-emerald-500'
              }`}
              required
            />
          </div>
        </div>
      </div>

      {/* Garantía de Cuidado */}
      <div className="pt-1">
        <GarantiaCuidadoCard variant="compact" dogName={name || 'tu mascota'} />
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              type="button"
              id="btn-cancelar-perfil-perro"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
            >
              ✕ Cancelar
            </button>
          )}

          {onDelete && initialData?.id && (
            <button
              type="button"
              id={`btn-form-eliminar-perro-${initialData.id}`}
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5 border border-rose-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar Perro</span>
            </button>
          )}

          {name && (
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <ChevronUp className="w-4 h-4" />
              Contraer formulario
            </button>
          )}
        </div>

        <div className="flex justify-end ml-auto">
          <button
            type="submit"
            id="btn-guardar-perfil-perro"
            className="py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                ¡Ficha Guardada! Retrayendo...
              </>
            ) : (
              <>
                <PawPrint className="w-4 h-4" />
                Confirmar y Guardar Perfil del Perro
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-xl space-y-4 text-left">
            <h4 className="text-base font-bold text-slate-900">¿Eliminar perfil de {name}?</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Esta acción no se puede deshacer. Se borrarán todos los datos y el historial de paseos de esta mascota.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (initialData?.id && onDelete) {
                    onDelete(initialData.id);
                  }
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
