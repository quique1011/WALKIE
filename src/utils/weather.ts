// =========================================================================
// Utilitario de Clima en Tiempo Real para WALKIE con WeatherAPI
// Consulta puntual y dinámica por coordenadas GPS (lat, lon) de la zona activa
// =========================================================================

// API Key provista por el usuario, respaldada en variable de entorno
export const WEATHER_API_KEY =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_WEATHER_API_KEY) ||
  'e4f869c2d10d4793a0d31542262910';


export interface WeatherData {
  temperature: number; // current.temp_c
  condition: string; // current.condition.text
  icon: string; // Emoji representativo
  iconUrl?: string; // current.condition.icon (URL oficial de WeatherAPI)
  rainProbability: number; // Probabilidad de lluvia en %
  precipitation: number; // current.precip_mm (milímetros de lluvia)
  weatherCode: number; // current.condition.code
  locationName: string; // location.name puntual devuelto por WeatherAPI
  regionName: string; // location.region
  country: string; // location.country
  isCloudy: boolean;
  isRainOrStorm: boolean;
  isRaining: boolean;
  isThunderstorm: boolean;
  isHeavyRain: boolean;
  isAlert: boolean; // Solo si hay lluvia fuerte o tormenta eléctrica en la zona
  alertTitle: string;
  alertReason: string;
  alertMessage: string;
  statusBadgeText: string;
  statusBadgeType: 'normal' | 'alerta';
  lastUpdated: string;
  latitude: number;
  longitude: number;
  feelsLikeC?: number;
  humidity?: number;
  windKph?: number;
}

// Ubicación de referencia por defecto (Valle de Punilla / Córdoba)
export const DEFAULT_PUNILLA_WEATHER_LOCATION = {
  lat: -31.0500,
  lng: -64.4833,
  label: 'Villa Giardino, Valle de Punilla'
};

export interface ArgentineCity {
  id: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
}

// Ciudades principales de Argentina para selección rápida en WALKIE
export const CIUDADES_ARGENTINA: ArgentineCity[] = [
  { id: 'punilla', name: 'Villa Giardino (Punilla)', province: 'Córdoba', lat: -31.0500, lng: -64.4833 },
  { id: 'cordoba', name: 'Córdoba Capital', province: 'Córdoba', lat: -31.4201, lng: -64.1888 },
  { id: 'caba', name: 'Buenos Aires (CABA / Retiro)', province: 'CABA', lat: -34.6037, lng: -58.3816 },
  { id: 'rosario', name: 'Rosario', province: 'Santa Fe', lat: -32.9468, lng: -60.6393 },
  { id: 'mendoza', name: 'Mendoza Capital', province: 'Mendoza', lat: -32.8895, lng: -68.8458 },
  { id: 'bariloche', name: 'San Carlos de Bariloche', province: 'Río Negro', lat: -41.1335, lng: -71.3103 },
  { id: 'mardelplata', name: 'Mar del Plata', province: 'Buenos Aires', lat: -38.0055, lng: -57.5562 },
  { id: 'salta', name: 'Salta Capital', province: 'Salta', lat: -24.7821, lng: -65.4232 },
  { id: 'tucuman', name: 'San Miguel de Tucumán', province: 'Tucumán', lat: -26.8083, lng: -65.2176 },
  { id: 'laplata', name: 'La Plata', province: 'Buenos Aires', lat: -34.9215, lng: -57.9545 },
  { id: 'neuquen', name: 'Neuquén', province: 'Neuquén', lat: -38.9516, lng: -68.0591 },
  { id: 'ushuaia', name: 'Ushuaia', province: 'Tierra del Fuego', lat: -54.8019, lng: -68.3030 }
];

/**
 * Determina si la condición meteorológica puntual de esa zona específica
 * califica como "lluvia fuerte" o "tormenta eléctrica" para activar la reprogramación automática de paseos.
 */
export function evaluateHeavyWeatherAlert(
  conditionText: string,
  conditionCode: number,
  precipMm: number,
  chanceOfRain: number
): {
  isAlert: boolean;
  alertTitle: string;
  alertReason: string;
  isThunderstorm: boolean;
  isHeavyRain: boolean;
} {
  const text = (conditionText || '').toLowerCase().trim();

  // Códigos WeatherAPI de tormenta: 1087, 1273, 1276, 1279, 1282
  const isThunderstormCode = [1087, 1273, 1276, 1279, 1282].includes(conditionCode);
  const isThunderstormText =
    text.includes('tormenta') ||
    text.includes('eléctrica') ||
    text.includes('electrica') ||
    text.includes('trueno') ||
    text.includes('relámpago') ||
    text.includes('relampago');

  const isThunderstorm = isThunderstormCode || isThunderstormText;

  // Códigos WeatherAPI de lluvia fuerte / torrencial: 1192, 1195, 1243, 1246
  const isHeavyRainCode = [1192, 1195, 1243, 1246].includes(conditionCode);
  const isHeavyRainText =
    text.includes('lluvia fuerte') ||
    text.includes('fuerte lluvia') ||
    text.includes('torrencial') ||
    text.includes('chubasco fuerte') ||
    text.includes('chubascos fuertes') ||
    text.includes('tempestad') ||
    text.includes('granizo');

  // Precipitaciones acumuladas superiores a 4.0 mm registradas en la hora actual
  const isHighPrecipitation = precipMm >= 4.0;

  const isHeavyRain = isHeavyRainCode || isHeavyRainText || isHighPrecipitation;

  // La regla de negocio de WALKIE especifica:
  // "Si en esa zona específica la condición indica lluvia fuerte o tormenta eléctrica, activa automáticamente el aviso de reprogramación de paseos solo para esa zona."
  const isAlert = isThunderstorm || isHeavyRain;

  let alertReason = '';
  let alertTitle = '⚠️ Alerta Meteorológica: Reprogramación Activa';

  if (isThunderstorm && isHeavyRain) {
    alertReason = 'Tormenta eléctrica y lluvia fuerte';
    alertTitle = '⚡ Alerta Crítica: Tormenta Eléctrica y Lluvia Fuerte';
  } else if (isThunderstorm) {
    alertReason = 'Tormenta eléctrica';
    alertTitle = '⚡ Alerta: Tormenta Eléctrica en la Zona';
  } else if (isHeavyRain) {
    alertReason = 'Lluvia fuerte';
    alertTitle = '🌧️ Alerta: Lluvia Fuerte en la Zona';
  }

  return {
    isAlert,
    alertTitle,
    alertReason,
    isThunderstorm,
    isHeavyRain
  };
}

/**
 * Obtiene un emoji visual representativo a partir de la condición y código de WeatherAPI.
 */
export function getWeatherEmoji(conditionText: string, code: number): string {
  const text = (conditionText || '').toLowerCase();

  if (text.includes('tormenta') || text.includes('trueno')) return '⛈️';
  if (text.includes('nieve') || text.includes('helada') || text.includes('granizo')) return '🌨️';
  if (text.includes('lluvia fuerte') || text.includes('torrencial')) return '🌧️';
  if (text.includes('lluvia') || text.includes('chubasco') || text.includes('llovizna')) return '🌦️';
  if (text.includes('niebla') || text.includes('neblina')) return '🌫️';
  if (text.includes('parcialmente') || text.includes('intervalos')) return '⛅';
  if (text.includes('nublado') || text.includes('cubierto')) return '☁️';
  if (text.includes('despejado') || text.includes('soleado')) return '☀️';

  // Fallbacks por código
  if ([1000].includes(code)) return '☀️';
  if ([1003, 1006].includes(code)) return '⛅';
  if ([1009].includes(code)) return '☁️';
  if ([1030, 1135, 1147].includes(code)) return '🌫️';
  if ([1063, 1150, 1153, 1180, 1183, 1186, 1189].includes(code)) return '🌦️';
  if ([1192, 1195, 1240, 1243, 1246].includes(code)) return '🌧️';
  if ([1087, 1273, 1276, 1279, 1282].includes(code)) return '⛈️';

  return '🌤️';
}

// Caché en memoria para evitar saturar las consultas de WeatherAPI (5 minutos de TTL)
const weatherCache = new Map<string, { data: WeatherData; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Consulta WeatherAPI en tiempo real con las coordenadas GPS exactas (lat, lon) de la zona activa en WALKIE.
 * URL: https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&lang=es
 */
export async function fetchLiveGpsWeather(
  rawLat?: number,
  rawLng?: number,
  forceRefresh = false
): Promise<WeatherData> {
  // Manejo seguro de coordenadas si no vienen dadas o son 0
  const validLat =
    typeof rawLat === 'number' && !isNaN(rawLat) && rawLat !== 0
      ? rawLat
      : DEFAULT_PUNILLA_WEATHER_LOCATION.lat;
  const validLng =
    typeof rawLng === 'number' && !isNaN(rawLng) && rawLng !== 0
      ? rawLng
      : DEFAULT_PUNILLA_WEATHER_LOCATION.lng;

  const roundedLat = Number(validLat.toFixed(4));
  const roundedLng = Number(validLng.toFixed(4));
  const cacheKey = `${roundedLat}_${roundedLng}`;

  // Verificar si hay respuesta válida en caché
  if (!forceRefresh) {
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  try {
    // Consulta exacta a WeatherAPI según especificación del usuario
    const endpoint = `https://api.weatherapi.com/v1/current.json?key=${encodeURIComponent(
      WEATHER_API_KEY
    )}&q=${roundedLat},${roundedLng}&lang=es`;

    const res = await fetch(endpoint, { signal: AbortSignal.timeout(7000) });

    if (!res.ok) {
      throw new Error(`WeatherAPI HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    const location = json.location || {};
    const current = json.current || {};
    const condition = current.condition || {};

    const locationName = location.name || 'Zona Activa';
    const regionName = location.region || '';
    const country = location.country || 'Argentina';

    const tempC = Math.round(Number(current.temp_c ?? 18));
    const conditionText = condition.text || 'Despejado';
    const conditionCode = Number(condition.code ?? 1000);
    const precipMm = Number(current.precip_mm ?? 0);

    // WeatherAPI puede devolver chance_of_rain directamente en current o calcularse
    let chanceOfRain = 0;
    if (typeof current.chance_of_rain === 'number') {
      chanceOfRain = current.chance_of_rain;
    } else if (current.will_it_rain === 1) {
      chanceOfRain = 85;
    } else if (precipMm > 0) {
      chanceOfRain = Math.min(100, Math.round(precipMm * 20 + 30));
    } else if (conditionText.toLowerCase().includes('lluvia') || conditionText.toLowerCase().includes('chubasco')) {
      chanceOfRain = 65;
    }

    // Normalizar URL del icono devuelto por WeatherAPI
    let iconUrl = condition.icon ? String(condition.icon) : undefined;
    if (iconUrl && iconUrl.startsWith('//')) {
      iconUrl = `https:${iconUrl}`;
    }

    const emojiIcon = getWeatherEmoji(conditionText, conditionCode);

    // Evaluar regla estricta de alerta meteorológica: lluvia fuerte o tormenta eléctrica
    const evaluation = evaluateHeavyWeatherAlert(conditionText, conditionCode, precipMm, chanceOfRain);

    const isCloudy =
      conditionText.toLowerCase().includes('nublado') ||
      conditionText.toLowerCase().includes('cubierto') ||
      conditionCode === 1006 ||
      conditionCode === 1009;

    const isRaining =
      precipMm > 0 ||
      conditionText.toLowerCase().includes('lluvia') ||
      conditionText.toLowerCase().includes('llovizna') ||
      conditionText.toLowerCase().includes('chubasco');

    const alertMessage = evaluation.isAlert
      ? `⚠️ Alerta Meteorológica: Reprogramación automática de paseos activa en ${locationName} por ${evaluation.alertReason.toLowerCase()}`
      : `☀️ Clima Apto para Paseo en ${locationName}`;

    const statusBadgeText = evaluation.isAlert
      ? `Reprogramación por ${evaluation.alertReason}`
      : '☀️ Clima Apto';

    const result: WeatherData = {
      temperature: tempC,
      condition: conditionText,
      icon: emojiIcon,
      iconUrl,
      rainProbability: chanceOfRain,
      precipitation: precipMm,
      weatherCode: conditionCode,
      locationName,
      regionName,
      country,
      isCloudy,
      isRainOrStorm: evaluation.isHeavyRain || evaluation.isThunderstorm || isRaining,
      isRaining,
      isThunderstorm: evaluation.isThunderstorm,
      isHeavyRain: evaluation.isHeavyRain,
      isAlert: evaluation.isAlert,
      alertTitle: evaluation.alertTitle,
      alertReason: evaluation.alertReason,
      alertMessage,
      statusBadgeText,
      statusBadgeType: evaluation.isAlert ? 'alerta' : 'normal',
      lastUpdated: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      latitude: roundedLat,
      longitude: roundedLng,
      feelsLikeC: current.feelslike_c !== undefined ? Math.round(Number(current.feelslike_c)) : undefined,
      humidity: current.humidity !== undefined ? Number(current.humidity) : undefined,
      windKph: current.wind_kph !== undefined ? Number(current.wind_kph) : undefined
    };

    weatherCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.warn('[Walkie WeatherAPI] Error al consultar coordenadas:', roundedLat, roundedLng, err);

    // Fallback de contingencia seguro si falla la conexión
    const fallbackResult: WeatherData = {
      temperature: 20,
      condition: 'Mayormente despejado',
      icon: '🌤️',
      iconUrl: undefined,
      rainProbability: 0,
      precipitation: 0,
      weatherCode: 1000,
      locationName: 'Zona Seleccionada',
      regionName: '',
      country: 'Argentina',
      isCloudy: false,
      isRainOrStorm: false,
      isRaining: false,
      isThunderstorm: false,
      isHeavyRain: false,
      isAlert: false,
      alertTitle: '☀️ Clima Apto',
      alertReason: '',
      alertMessage: '☀️ Clima Apto para Paseo',
      statusBadgeText: '☀️ Clima Apto',
      statusBadgeType: 'normal',
      lastUpdated: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      latitude: roundedLat,
      longitude: roundedLng
    };

    return fallbackResult;
  }
}
