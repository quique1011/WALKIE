import React, { useState } from 'react';
import { SolicitudPaseo, ReviewItem, PaseadorPublico } from '../types';
import { Star, CheckCircle2, Dog, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RatingPaseoModalProps {
  solicitud: SolicitudPaseo;
  onSubmitRating: (review: ReviewItem) => void;
}

export const RatingPaseoModal: React.FC<RatingPaseoModalProps> = ({
  solicitud,
  onSubmitRating
}) => {
  // REGLA 2: OBLIGATORIO seleccionar entre 1 y 5 estrellas. Inicia en 0 (sin selección)
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  
  // REGLA 2: Comentario / Reseña en texto es OPCIONAL
  const [comentario, setComentario] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const starLabels: Record<number, string> = {
    1: '1 Estrella · Malo / Mejorable',
    2: '2 Estrellas · Regular / Con detalles',
    3: '3 Estrellas · Bueno / Paseo correcto',
    4: '4 Estrellas · Muy Bueno / Gran atención',
    5: '5 Estrellas · ¡Excelente servicio!'
  };

  const currentDisplayRating = hoverRating !== null ? hoverRating : rating;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) return;

    setIsSubmitting(true);

    const targetWalkerId = solicitud.paseadorId || solicitud.paseador_id || 'pas-1';
    const targetWalkerName = solicitud.paseadorNombre || 'Paseador Walkie';

    const review: ReviewItem = {
      id: `review-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      paseadorId: targetWalkerId,
      clienteNombre: solicitud.clienteNombre || 'Cliente Walkie',
      clienteFoto: solicitud.clienteFoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      perroNombre: solicitud.perro?.name || 'Mascota',
      perroRaza: solicitud.perro?.breed || 'Perro',
      calificacion: rating,
      fecha: new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }),
      comentario: comentario.trim(), // OPCIONAL: si está vacío se envía vacío
      paseoPlan: solicitud.tipoPlan || 'Común'
    };

    try {
      // 1. Guardar en lista de reseñas visibles
      const existingReviews: ReviewItem[] = JSON.parse(localStorage.getItem('walkie_reviews_list') || '[]');
      const updatedReviews = [review, ...existingReviews];
      localStorage.setItem('walkie_reviews_list', JSON.stringify(updatedReviews));

      // 2. Marcar solicitud como evaluada para no volver a desplegar
      const reviewedIds: string[] = JSON.parse(localStorage.getItem('walkie_reviewed_solicitudes') || '[]');
      if (!reviewedIds.includes(solicitud.id)) {
        reviewedIds.push(solicitud.id);
        localStorage.setItem('walkie_reviewed_solicitudes', JSON.stringify(reviewedIds));
      }

      // 3. Recalcular y actualizar rating promedio del Paseador
      const walkerReviews = updatedReviews.filter(r => !r.paseadorId || r.paseadorId === targetWalkerId);
      const newAverageRating = walkerReviews.length > 0
        ? Number((walkerReviews.reduce((acc, r) => acc + r.calificacion, 0) / walkerReviews.length).toFixed(1))
        : rating;

      const walkersStr = localStorage.getItem('walkie_registered_walkers');
      if (walkersStr) {
        try {
          const walkers: PaseadorPublico[] = JSON.parse(walkersStr);
          const walkerIdx = walkers.findIndex(w => w.id === targetWalkerId);
          if (walkerIdx !== -1) {
            walkers[walkerIdx].calificacion = newAverageRating;
            walkers[walkerIdx].totalPaseos = (walkers[walkerIdx].totalPaseos || 0) + 1;
            localStorage.setItem('walkie_registered_walkers', JSON.stringify(walkers));
          }
        } catch (err) {
          console.error('Error actualizando perfil de paseadores:', err);
        }
      }

      // 4. Disparar evento para actualizar dinámicamente vistas del Paseador sin recargar
      window.dispatchEvent(new CustomEvent('walkie_reviews_change', {
        detail: { review, walkerId: targetWalkerId, newAverageRating }
      }));
    } catch (err) {
      console.error('Error guardando calificación:', err);
    }

    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    onSubmitRating(review);
  };

  return (
    <div 
      id="modal-calificacion-paseo-overlay"
      className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div 
        id="modal-calificacion-paseo-card"
        className="bg-white w-full max-w-[440px] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative text-left"
      >
        {/* Encabezado Obligatorio */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border-b border-slate-100 p-5 sm:p-6 text-left relative">
          <div className="flex items-center gap-2 text-emerald-800 text-[11px] font-black uppercase tracking-wider mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>Evaluación Obligatoria del Servicio</span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
            ¡Paseo finalizado! Calificá a tu paseador
          </h3>

          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            El paseo concluyó con éxito tras la validación del PIN 2. Para completar el servicio, evaluá la atención recibida.
          </p>

          {/* Ficha del Paseo y Paseador */}
          <div className="mt-3.5 bg-white rounded-2xl p-3 flex items-center justify-between border border-emerald-200/80 shadow-2xs text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                <Dog className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="text-left leading-tight">
                <span className="font-bold text-slate-900 block text-xs">
                  {solicitud.perro?.name || 'Tu perro'} ({solicitud.perro?.breed || 'Mascota'})
                </span>
                <span className="text-[11px] text-slate-500">
                  Plan {solicitud.tipoPlan || 'Común'} • 45 min
                </span>
              </div>
            </div>

            <div className="text-right leading-tight border-l border-slate-100 pl-3">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Paseador</span>
              <span className="text-xs font-bold text-slate-900">
                {solicitud.paseadorNombre || 'Paseador Oficial'}
              </span>
            </div>
          </div>
        </div>

        {/* Formulario de Evaluación Obligatoria */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Estrellas 1 a 5 (Obligatorio) */}
          <div className="text-center space-y-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-center gap-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Puntuación del Paseo:
              </label>
              <span className="text-[11px] text-rose-600 font-bold">*Requerido</span>
            </div>

            <div className="flex items-center justify-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= currentDisplayRating;
                return (
                  <button
                    key={star}
                    type="button"
                    id={`btn-star-${star}`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1.5 transition-transform hover:scale-120 active:scale-95 focus:outline-hidden cursor-pointer"
                    title={`${star} estrellas`}
                  >
                    <Star
                      className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                        isFilled
                          ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                          : 'fill-slate-100 text-slate-300 hover:text-amber-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Badge de descripción de estrellas */}
            <div className="min-h-6 flex items-center justify-center">
              {currentDisplayRating > 0 ? (
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100/90 px-3 py-0.5 rounded-full border border-emerald-300">
                  {starLabels[currentDisplayRating]}
                </span>
              ) : (
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Tocá las estrellas para calificar (mínimo 1 estrella)</span>
                </span>
              )}
            </div>
          </div>

          {/* Comentario / Reseña en texto (OPCIONAL) */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <label htmlFor="input-comentario-resena" className="flex items-center gap-1">
                <span>Comentario o experiencia</span>
                <span className="text-slate-400 font-normal text-[11px]">(opcional)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">{comentario.length}/200</span>
            </div>

            <textarea
              id="input-comentario-resena"
              rows={3}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Escribí sobre la puntualidad, cuidado, fotos o trato del paseador (opcional)..."
              className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-hidden resize-none leading-relaxed"
              maxLength={200}
            />
            <p className="text-[10px] text-slate-400 leading-tight">
              Si no deseas escribir nada, puedes enviar solo las estrellas.
            </p>
          </div>

          {/* Información de Garantía y Botón de Envío */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/60">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Tu calificación actualiza el promedio público y queda registrada en el perfil del paseador.</span>
            </div>

            <button
              type="submit"
              id="btn-enviar-calificacion"
              disabled={rating < 1 || isSubmitting}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                rating >= 1 && !isSubmitting
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white cursor-pointer active:scale-98'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-75'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isSubmitting 
                  ? 'Guardando calificación...' 
                  : rating < 1 
                  ? 'Seleccioná las estrellas para enviar' 
                  : 'Enviar Calificación y Concluir'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
