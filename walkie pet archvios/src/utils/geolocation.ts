import { reverseGeocode } from './geo';

/**
 * Configuración óptima de geolocalización GPS de máxima precisión:
 * - enableHighAccuracy: true (fuerza uso de GPS por hardware y redes de alta precisión)
 * - timeout: 15000 (15 segundos para dar tiempo real a obtener señal en móviles y equipos de escritorio)
 * - maximumAge: 0 (para forzar la lectura del punto actual en vivo y no usar caché viejo)
 */
export const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0
};

/**
 * Coordenada inicial por defecto (Centro urbano / Córdoba / Punilla)
 * para fallback inmediato y silencioso sin bloquear la app ni emitir alertas intrusivas.
 */
export const DEFAULT_FALLBACK_LOCATION = {
  lat: -31.4201,
  lng: -64.4992,
  address: 'Av. San Martín 450, Villa Carlos Paz, Punilla, Córdoba'
};

export interface AccuratePositionResult {
  lat: number;
  lng: number;
  address: string;
  isFallback: boolean;
  error?: string;
}

/**
 * Obtiene la posición GPS con máxima precisión y control de errores.
 * Si falla, se deniega o expira el tiempo (15s), asigna automáticamente
 * la coordenada de respaldo sin bloquear la app.
 */
export async function getAccurateCurrentPosition(): Promise<AccuratePositionResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return {
      ...DEFAULT_FALLBACK_LOCATION,
      isFallback: true,
      error: 'Geolocalización no soportada por el navegador'
    };
  }

  return new Promise((resolve) => {
    let resolved = false;

    // Timer de seguridad por si el navegador cuelga la llamada
    const safetyTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({
          ...DEFAULT_FALLBACK_LOCATION,
          isFallback: true,
          error: 'Tiempo de espera agotado (timeout)'
        });
      }
    }, 15500);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(safetyTimer);

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          const address = await reverseGeocode(lng, lat);
          resolve({
            lat,
            lng,
            address: address || `Ubicación GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            isFallback: false
          });
        } catch {
          resolve({
            lat,
            lng,
            address: `Ubicación GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            isFallback: false
          });
        }
      },
      (err) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(safetyTimer);

        // Control de errores silencioso: sin alertas en pantalla
        console.warn('Geolocalización no disponible, activando ubicación por defecto:', err.message);
        resolve({
          ...DEFAULT_FALLBACK_LOCATION,
          isFallback: true,
          error: err.message
        });
      },
      GEOLOCATION_OPTIONS
    );
  });
}
