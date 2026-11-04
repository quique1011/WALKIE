import { MAPBOX_TOKEN, VETERINARIAS_PUNILLA } from '../data/initialData';

// Haversine formula to compute distance in km between two lat/lng coordinates
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

// Compute total cumulative distance along a drawn polyline
export function calculatePolylineDistanceKm(coords: Array<{ lat: number; lng: number }>): number {
  if (!coords || coords.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const p1 = coords[i - 1];
    const p2 = coords[i];
    const R = 6371;
    const dLat = deg2rad(p2.lat - p1.lat);
    const dLon = deg2rad(p2.lng - p1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(p1.lat)) * Math.cos(deg2rad(p2.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    total += R * c;
  }
  return Math.round(total * 10) / 10;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function formatPesos(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(amount);
}

// Caché en memoria de geocodificación inversa para evitar peticiones repetidas y eliminar lag
const reverseGeocodeCache = new Map<string, string>();

export async function reverseGeocode(lng: number, lat: number): Promise<string> {
  const cacheKey = `${lng.toFixed(4)},${lat.toFixed(4)}`;
  if (reverseGeocodeCache.has(cacheKey)) {
    return reverseGeocodeCache.get(cacheKey)!;
  }

  let resolvedAddress: string | null = null;

  // 1. Try Mapbox Geocoding if available
  if (MAPBOX_TOKEN && typeof fetch !== 'undefined') {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=es&limit=1`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          resolvedAddress = data.features[0].place_name;
        }
      }
    } catch {
      // Continue to fallback
    }
  }

  // 2. Fallback to OpenStreetMap Nominatim
  if (!resolvedAddress) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: { 'Accept-Language': 'es' }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.display_name) {
          const parts = data.display_name.split(',').slice(0, 3).join(',');
          resolvedAddress = parts;
        }
      }
    } catch {
      // Continue to coordinate string
    }
  }

  const finalResult = resolvedAddress || `Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  reverseGeocodeCache.set(cacheKey, finalResult);
  return finalResult;
}

export async function searchAddress(query: string, proximityLng?: number, proximityLat?: number): Promise<Array<{ text: string, place_name: string, center: [number, number] }>> {
  if (!query || query.trim().length < 2) return [];

  // 1. Try Mapbox Geocoding
  if (MAPBOX_TOKEN && typeof fetch !== 'undefined') {
    try {
      let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&language=es&limit=5&country=ar`;
      if (proximityLng && proximityLat) {
        url += `&proximity=${proximityLng},${proximityLat}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          return data.features;
        }
      }
    } catch {
      // Continue to fallback
    }
  }

  // 2. Fallback to OpenStreetMap Nominatim Search
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ar&limit=5`;
    const response = await fetch(url, {
      headers: { 'Accept-Language': 'es' }
    });
    if (response.ok) {
      const items = await response.json();
      if (Array.isArray(items) && items.length > 0) {
        return items.map((item: any) => ({
          text: item.name || item.display_name.split(',')[0],
          place_name: item.display_name,
          center: [parseFloat(item.lon), parseFloat(item.lat)] as [number, number]
        }));
      }
    }
  } catch {
    return [];
  }

  return [];
}

/**
 * Genera el enlace oficial de WhatsApp utilizando el estándar https://wa.me/[NUMERO_INTERNACIONAL]
 */
export function formatWhatsAppLink(phone?: string, text?: string): string {
  if (!phone) return '#';
  // Strip all non-digits
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '#';
  // Normalize Argentine numbers to international format (549 + local)
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  if (!digits.startsWith('54') && digits.length <= 11) {
    digits = `549${digits}`;
  } else if (digits.startsWith('54') && !digits.startsWith('549') && (digits.length === 11 || digits.length === 12)) {
    digits = `549${digits.substring(2)}`;
  }
  const url = `https://wa.me/${digits}`;
  return text ? `${url}?text=${encodeURIComponent(text)}` : url;
}

/**
 * Obtiene la información limpia y real de la veterinaria desde VETERINARIAS_PUNILLA
 * evitando duplicar teléfonos en la dirección.
 */
export function getCleanVeterinariaInfo(trustedVetName?: string) {
  if (!trustedVetName) {
    return {
      nombre: 'Hospital Veterinario de Urgencias Punilla (Guardia 24hs)',
      direccion: 'Av. San Martín 850, Villa Carlos Paz, Punilla',
      telefono: '+54 9 3541 421000'
    };
  }

  const query = trustedVetName.toLowerCase();
  const found = VETERINARIAS_PUNILLA.find(v => 
    query.includes(v.nombre.toLowerCase()) || 
    v.nombre.toLowerCase().includes(query) ||
    v.id === trustedVetName
  );

  if (found) {
    return {
      nombre: found.nombre,
      direccion: found.direccion,
      telefono: found.telefono
    };
  }

  // Si tiene formato "Nombre - Dirección"
  let cleanName = trustedVetName;
  let cleanAddress = 'Av. San Martín 850, Villa Carlos Paz, Punilla';
  if (trustedVetName.includes(' - ')) {
    const parts = trustedVetName.split(' - ');
    cleanName = parts[0].trim();
    if (parts[1] && !parts[1].match(/^[\d\+\s\(\)\-]+$/)) {
      cleanAddress = parts[1].trim();
    }
  }

  return {
    nombre: cleanName,
    direccion: cleanAddress,
    telefono: '+54 9 3541 421000'
  };
}

