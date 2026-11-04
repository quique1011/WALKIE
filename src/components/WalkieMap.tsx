import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { PaseadorPublico, SolicitudPaseo, UserClientePublico } from '../types';
import { MAPBOX_TOKEN } from '../data/initialData';
import { 
  Navigation, MapPin, CheckCircle2, ShieldCheck, 
  Dog, Star, Check, X, Phone, User, AlertCircle
} from 'lucide-react';
import { calculateDistanceKm, formatPesos, reverseGeocode as geoReverseGeocode } from '../utils/geo';
import { getSolicitudPricingDetails, getOrBuildSolicitudDiasDesglose, getAvailableDaysCount } from '../utils/planCalculations';

if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

// High-definition, resilient map style with fast, unrestricted tile servers
// Ensures 100% reliability and zero 401/403/Failed to fetch style errors
const RELIABLE_MAP_STYLE: mapboxgl.Style = {
  version: 8,
  sources: {
    'carto-voyager': {
      type: 'raster',
      tiles: [
        'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }
  },
  layers: [
    {
      id: 'carto-voyager-layer',
      type: 'raster',
      source: 'carto-voyager',
      minzoom: 0,
      maxzoom: 20
    }
  ]
};

export interface WalkieMapProps {
  mode: 'cliente' | 'paseador';
  centerLat: number;
  centerLng: number;
  onCenterChange?: (lat: number, lng: number, address: string) => void;
  paseadores?: PaseadorPublico[];
  clientes?: UserClientePublico[];
  onSelectPaseador?: (paseador: PaseadorPublico) => void;
  onRequestWalkWithPaseador?: (paseador: PaseadorPublico) => void;
  onInspectPaseador?: (paseador: PaseadorPublico) => void;
  selectedPaseadorId?: string;
  solicitudes?: SolicitudPaseo[];
  onSelectSolicitud?: (solicitud: SolicitudPaseo) => void;
  onAcceptSolicitud?: (solicitud: SolicitudPaseo) => void;
  onAcceptIndividualDay?: (solicitud: SolicitudPaseo, dayId: string) => void;
  onRejectSolicitud?: (solicitud: SolicitudPaseo) => void;
  selectedSolicitudId?: string;
  selectedClienteId?: string;
  onSelectCliente?: (cliente: UserClientePublico) => void;
  isClientAccountActive?: boolean;
  isWalkerAccountActive?: boolean;
  activeTrackingSolicitud?: SolicitudPaseo | null;
  walkerLiveCoords?: { lat: number; lng: number } | null;
  onUserLocationChange?: (lat: number, lng: number, addr: string) => void;
  currentClienteId?: string;
  currentClienteEmail?: string;
  currentPaseadorId?: string;
  currentPaseadorEmail?: string;
  onToast?: (msg: string) => void;
}

// Accurate geodesic GeoJSON circle for exact 10km coverage radius (WGS84 sphere)
function createGeoJSONCircle(center: [number, number], radiusInKm = 10, points = 64) {
  const lon1 = (center[0] * Math.PI) / 180;
  const lat1 = (center[1] * Math.PI) / 180;
  const d = radiusInKm / 6371; // Earth radius in km

  const ret: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const bearing = (i * 2 * Math.PI) / points;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing)
    );
    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
        Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
      );
    ret.push([(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  ret.push(ret[0]);

  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [ret]
    },
    properties: {
      radiusKm: radiusInKm
    }
  };
}

// 11.4 zoom level frames a 20 km diameter circle comfortably on typical screens
const RADAR_ZOOM_LEVEL = 11.4;

const EMPTY_PASEADORES: PaseadorPublico[] = [];
const EMPTY_CLIENTES: UserClientePublico[] = [];
const EMPTY_SOLICITUDES: SolicitudPaseo[] = [];

export const WalkieMap: React.FC<WalkieMapProps> = ({
  mode,
  centerLat,
  centerLng,
  onCenterChange,
  paseadores = EMPTY_PASEADORES,
  clientes = EMPTY_CLIENTES,
  onSelectPaseador,
  onRequestWalkWithPaseador,
  onInspectPaseador,
  selectedPaseadorId,
  solicitudes = EMPTY_SOLICITUDES,
  onSelectSolicitud,
  onAcceptSolicitud,
  onAcceptIndividualDay,
  onRejectSolicitud,
  selectedSolicitudId,
  selectedClienteId,
  onSelectCliente,
  isWalkerAccountActive = true,
  activeTrackingSolicitud,
  walkerLiveCoords,
  onUserLocationChange,
  currentClienteId,
  currentClienteEmail,
  currentPaseadorId,
  currentPaseadorEmail,
  onToast
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  
  // Persistent markers dictionary to prevent DOM recreation & flickering on updates
  const dynamicMarkersMapRef = useRef<Map<string, { marker: mapboxgl.Marker; el: HTMLElement; type: 'walker' | 'solicitud' | 'cliente' }>>(new Map());
  
  const trackingDogMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const trackingWalkerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('Obteniendo dirección...');
  
  // Selected items for firm in-map floating modal cards
  const [activeCardWalker, setActiveCardWalker] = useState<PaseadorPublico | null>(null);
  const [activeCardSolicitud, setActiveCardSolicitud] = useState<SolicitudPaseo | null>(null);
  const [activeCardCliente, setActiveCardCliente] = useState<UserClientePublico | null>(null);

  // Keep track of center coordinates to prevent camera movement loops
  const prevCenterRef = useRef<{ lat: number; lng: number }>({ lat: centerLat, lng: centerLng });
  const prevMarkerConfigRef = useRef<string>('');

  // Stable references for callbacks to avoid re-binding click handlers on map
  const modeRef = useRef(mode);
  const onCenterChangeRef = useRef(onCenterChange);
  const onUserLocationChangeRef = useRef(onUserLocationChange);
  const activeTrackingSolicitudRef = useRef(activeTrackingSolicitud);

  useEffect(() => {
    modeRef.current = mode;
    onCenterChangeRef.current = onCenterChange;
    onUserLocationChangeRef.current = onUserLocationChange;
    activeTrackingSolicitudRef.current = activeTrackingSolicitud;
  }, [mode, onCenterChange, onUserLocationChange, activeTrackingSolicitud]);

  // Reverse geocoding helper
  const reverseGeocode = async (lng: number, lat: number): Promise<string> => {
    try {
      return await geoReverseGeocode(lng, lat);
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  // Sync external selected IDs with in-map card state
  useEffect(() => {
    if (selectedPaseadorId && mode === 'cliente') {
      const found = paseadores.find(p => p.id === selectedPaseadorId);
      if (found) {
        setActiveCardWalker(prev => prev?.id === found.id ? prev : found);
      }
    }
  }, [selectedPaseadorId, paseadores, mode]);

  useEffect(() => {
    if (selectedSolicitudId && mode === 'paseador') {
      const found = solicitudes.find(s => s.id === selectedSolicitudId);
      if (found) {
        setActiveCardSolicitud(prev => prev?.id === found.id ? prev : found);
      }
    }
  }, [selectedSolicitudId, solicitudes, mode]);

  useEffect(() => {
    if (selectedClienteId && mode === 'paseador') {
      const found = clientes.find(c => c.id === selectedClienteId);
      if (found) {
        setActiveCardCliente(prev => prev?.id === found.id ? prev : found);
      }
    }
  }, [selectedClienteId, clientes, mode]);

  // 1. Initialize Map instance once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Configure accessToken directly for mapboxgl
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAPBOX_TOKEN ? 'mapbox://styles/mapbox/streets-v12' : RELIABLE_MAP_STYLE,
      center: [centerLng, centerLat],
      zoom: RADAR_ZOOM_LEVEL,
      attributionControl: false
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    mapRef.current = map;

    // Fallback on error if Mapbox style fails to fetch (e.g. CORS/domain restriction)
    map.on('error', (e) => {
      const err = (e as any)?.error;
      const msg = String(err?.message || (e as any)?.message || '').toLowerCase();
      if (err?.status === 401 || err?.status === 403 || msg.includes('fetch') || msg.includes('access_token') || msg.includes('failed to fetch')) {
        try {
          if (map.getStyle() !== RELIABLE_MAP_STYLE) {
            map.setStyle(RELIABLE_MAP_STYLE);
          }
        } catch {
          // ignore
        }
      }
    });

    // Debounced ResizeObserver using requestAnimationFrame to prevent recursion
    let resizeObserver: ResizeObserver | null = null;
    let resizeRafId: number | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (resizeRafId) cancelAnimationFrame(resizeRafId);
        resizeRafId = requestAnimationFrame(() => {
          if (mapRef.current) {
            mapRef.current.resize();
          }
        });
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    const setupLayersAndEvents = () => {
      if (!mapRef.current) return;
      try {
        setMapLoaded(true);
        map.resize();

        // Add 10km circle source and layers
        const circleGeoJSON = createGeoJSONCircle([centerLng, centerLat], 10);

        if (!map.getSource('radius-10km')) {
          map.addSource('radius-10km', {
            type: 'geojson',
            data: circleGeoJSON
          });
        }

        if (!map.getLayer('radius-10km-fill')) {
          map.addLayer({
            id: 'radius-10km-fill',
            type: 'fill',
            source: 'radius-10km',
            paint: {
              'fill-color': '#10b981',
              'fill-opacity': 0.12
            }
          });
        }

        if (!map.getLayer('radius-10km-line')) {
          map.addLayer({
            id: 'radius-10km-line',
            type: 'line',
            source: 'radius-10km',
            paint: {
              'line-color': '#059669',
              'line-width': 2,
              'line-dasharray': [2, 2]
            }
          });
        }

        // Add Strava Live Route source & layer
        if (!map.getSource('strava-route')) {
          map.addSource('strava-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: []
              }
            }
          });
        }

        if (!map.getLayer('strava-route-line')) {
          map.addLayer({
            id: 'strava-route-line',
            type: 'line',
            source: 'strava-route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#000000',
              'line-width': 4.5,
              'line-opacity': 0.95
            }
          });
        }
      } catch (err) {
        console.warn('Mapbox setup layer error (graceful fallback):', err);
      }
    };

    map.on('load', setupLayersAndEvents);
    map.on('style.load', setupLayersAndEvents);

    // 📍 Selección Manual Directa en el Mapa (Exclusiva para Cliente):
    // Para el paseador, la ubicación es fija y precisa por GPS real para evitar manipulación de zonas.
    map.on('click', async (e) => {
      // Si el usuario tiene rol Paseador, la ubicación es fija y exclusivamente por GPS
      if (modeRef.current === 'paseador') {
        return;
      }

      // No interferir si hay un paseo en curso activo
      if (activeTrackingSolicitudRef.current && (
        activeTrackingSolicitudRef.current.estado === 'en_camino' || 
        activeTrackingSolicitudRef.current.estado === 'en_curso'
      )) {
        return;
      }

      // Ignorar clics en marcadores de paseadores/clientes, popups, o botones de control
      const origTarget = e.originalEvent?.target as HTMLElement | null;
      if (origTarget && origTarget.closest('.mapboxgl-marker, button, a, input, [role="button"], .mapboxgl-popup, .mapboxgl-ctrl, .custom-user-marker')) {
        return;
      }

      const { lng, lat } = e.lngLat;

      // 1. Mueve el pin del usuario de inmediato a la coordenada seleccionada
      if (userMarkerRef.current) {
        userMarkerRef.current.setLngLat([lng, lat]);
      }

      // 2. Actualiza el radio de 10 km instantáneamente
      if (mapRef.current && mapRef.current.getSource('radius-10km')) {
        const source = mapRef.current.getSource('radius-10km') as mapboxgl.GeoJSONSource;
        source.setData(createGeoJSONCircle([lng, lat], 10));
      }

      // 3. Centra suavemente la vista en el nuevo punto
      mapRef.current?.easeTo({
        center: [lng, lat],
        duration: 350
      });

      prevCenterRef.current = { lat, lng };

      // 4. Geocodificación inversa para obtener la dirección real de la calle
      const address = await reverseGeocode(lng, lat);
      setCurrentAddress(address);

      // 5. Notifica al componente padre para sincronizar en tiempo real el estado global
      if (onCenterChangeRef.current) {
        onCenterChangeRef.current(lat, lng, address);
      }
      if (onUserLocationChangeRef.current) {
        onUserLocationChangeRef.current(lat, lng, address);
      }
    });

    return () => {
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
      if (resizeObserver) resizeObserver.disconnect();
      dynamicMarkersMapRef.current.forEach(({ marker }) => marker.remove());
      dynamicMarkersMapRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Handle Strava polyline updates
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const source = mapRef.current.getSource('strava-route') as mapboxgl.GeoJSONSource;
    if (!source) return;

    if (activeTrackingSolicitud && activeTrackingSolicitud.recorridoGps && activeTrackingSolicitud.recorridoGps.length > 1) {
      const coordinates = activeTrackingSolicitud.recorridoGps.map(pt => [pt.lng, pt.lat]);
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates
        }
      });
    } else {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      });
    }
  }, [activeTrackingSolicitud?.recorridoGps, mapLoaded]);

  // 3. Update center user marker and smoothly fly map ONLY if coordinates genuinely changed
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const centerChanged = 
      Math.abs(prevCenterRef.current.lat - centerLat) > 0.0001 || 
      Math.abs(prevCenterRef.current.lng - centerLng) > 0.0001;

    if (centerChanged) {
      prevCenterRef.current = { lat: centerLat, lng: centerLng };
      const targetZoom = (activeTrackingSolicitud && (activeTrackingSolicitud.estado === 'en_camino' || activeTrackingSolicitud.estado === 'en_curso')) ? 15.5 : RADAR_ZOOM_LEVEL;
      mapRef.current.flyTo({
        center: [centerLng, centerLat],
        zoom: targetZoom,
        essential: true
      });

      if (mapRef.current.getSource('radius-10km')) {
        const source = mapRef.current.getSource('radius-10km') as mapboxgl.GeoJSONSource;
        source.setData(createGeoJSONCircle([centerLng, centerLat], 10));
      }

      reverseGeocode(centerLng, centerLat).then(addr => setCurrentAddress(addr));
    }

    // Check if tracking exclusive view is active
    const isExclusiveTracking = activeTrackingSolicitud && (
      activeTrackingSolicitud.estado === 'en_camino' ||
      activeTrackingSolicitud.estado === 'en_curso'
    );

    if (isExclusiveTracking) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      return;
    }

    const markerConfigKey = `${mode}-${isWalkerAccountActive}`;
    const needsRecreation = !userMarkerRef.current || prevMarkerConfigRef.current !== markerConfigKey;

    if (needsRecreation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      prevMarkerConfigRef.current = markerConfigKey;

      const el = document.createElement('div');
      el.className = 'custom-user-marker';

      if (mode === 'cliente') {
        el.innerHTML = `
          <div class="relative group cursor-grab active:cursor-grabbing flex flex-col items-center select-none" title="Arrastrá o hacé clic en el mapa para ajustar tu punto de retiro">
            <div class="relative">
              <div class="absolute -inset-1.5 rounded-full bg-emerald-500/30 animate-ping pointer-events-none"></div>
              <div class="relative z-10 w-8 h-8 sm:w-9 sm:h-9 bg-emerald-600 ring-2 ring-emerald-300/80 rounded-full border border-white shadow-md flex items-center justify-center text-white text-sm">
                📍
              </div>
            </div>
            <div class="mt-1 flex flex-col items-center gap-0.5 pointer-events-none">
              <div class="bg-slate-900/90 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full shadow-2xs whitespace-nowrap">
                Tu punto de retiro
              </div>
            </div>
          </div>
        `;
      } else {
        // Paseador live position: ALSO DRAGGABLE FOR MANUAL LOCATION SELECTION
        const auraHtml = isWalkerAccountActive
          ? `<div class="absolute -inset-1.5 rounded-full bg-emerald-500/30 animate-pulse pointer-events-none"></div>`
          : `<div class="absolute -inset-1 rounded-full bg-slate-400/30 pointer-events-none"></div>`;

        const badgeHtml = isWalkerAccountActive
          ? `<div class="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-2xs border border-emerald-400 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              En Vivo
             </div>`
          : `<div class="bg-slate-700 text-slate-200 text-[9px] font-medium px-2 py-0.5 rounded-full shadow-2xs border border-slate-500">
              En Pausa
             </div>`;

        el.innerHTML = `
          <div class="relative group cursor-default flex flex-col items-center select-none" title="Ubicación GPS oficial en tiempo real (fija y precisa)">
            <div class="relative">
              ${auraHtml}
              <div class="relative z-10 w-8 h-8 sm:w-9 sm:h-9 ${
                isWalkerAccountActive ? 'bg-emerald-600 ring-2 ring-emerald-300' : 'bg-slate-700 ring-2 ring-slate-400/50'
              } rounded-full border border-white shadow-md flex items-center justify-center text-white text-sm">
                🦮
              </div>
            </div>
            <div class="mt-1 whitespace-nowrap flex flex-col items-center gap-0.5 pointer-events-none">
              ${badgeHtml}
            </div>
          </div>
        `;
      }

      // Create marker: draggable for Cliente, STATIC/FIXED by GPS for Paseador
      const isMarkerDraggable = mode === 'cliente';
      const marker = new mapboxgl.Marker({
        element: el,
        draggable: isMarkerDraggable
      })
        .setLngLat([centerLng, centerLat])
        .addTo(mapRef.current);

      marker.on('dragend', async () => {
        const lngLat = marker.getLngLat();
        const address = await reverseGeocode(lngLat.lng, lngLat.lat);
        setCurrentAddress(address);
        prevCenterRef.current = { lat: lngLat.lat, lng: lngLat.lng };
        
        if (onCenterChangeRef.current) {
          onCenterChangeRef.current(lngLat.lat, lngLat.lng, address);
        }
        if (onUserLocationChangeRef.current) {
          onUserLocationChangeRef.current(lngLat.lat, lngLat.lng, address);
        }

        if (mapRef.current && mapRef.current.getSource('radius-10km')) {
          const source = mapRef.current.getSource('radius-10km') as mapboxgl.GeoJSONSource;
          source.setData(createGeoJSONCircle([lngLat.lng, lngLat.lat], 10));
        }
      });

      userMarkerRef.current = marker;
    } else {
      // Marker already exists: instant coordinate update without DOM destruction
      userMarkerRef.current.setLngLat([centerLng, centerLat]);
    }
  }, [mode, centerLat, centerLng, isWalkerAccountActive, mapLoaded, activeTrackingSolicitud]);

  // 4. Markers rendering strictly adhering to rules:
  // - VISTA CLIENTE: ONLY render available Walkers (no dog solicitudes cluttering the view).
  // - VISTA PASEADOR: ONLY render Client solicitudes (with dog photos, NO plan/price text).
  // - Clicking markers NEVER changes map camera or triggers re-centering.
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const currentMarkerKeys = new Set<string>();

    // 🌟 A. EXCLUSIVE LIVE TRACKING
    const isExclusiveTracking = activeTrackingSolicitud && (
      activeTrackingSolicitud.estado === 'en_camino' ||
      activeTrackingSolicitud.estado === 'en_curso'
    );

    if (isExclusiveTracking) {
      dynamicMarkersMapRef.current.forEach(({ marker }) => marker.remove());
      dynamicMarkersMapRef.current.clear();

      const dogCoords: [number, number] = [
        activeTrackingSolicitud.ubicacion.lng,
        activeTrackingSolicitud.ubicacion.lat
      ];

      const walkerCoords: [number, number] = activeTrackingSolicitud.paseadorCoords
        ? [activeTrackingSolicitud.paseadorCoords.lng, activeTrackingSolicitud.paseadorCoords.lat]
        : (walkerLiveCoords ? [walkerLiveCoords.lng, walkerLiveCoords.lat] : [dogCoords[0] + 0.008, dogCoords[1] + 0.006]);

      // Dog marker
      if (!trackingDogMarkerRef.current) {
        const dogEl = document.createElement('div');
        dogEl.className = 'tracking-dog-marker flex flex-col items-center cursor-pointer select-none';
        dogEl.innerHTML = `
          <div class="relative flex flex-col items-center">
            <div class="relative">
              <div class="absolute -inset-2 rounded-full bg-emerald-500/40 animate-ping pointer-events-none"></div>
              <div class="w-13 h-13 rounded-2xl border-3 border-emerald-500 shadow-xl overflow-hidden bg-white ring-4 ring-emerald-300">
                <img src="${activeTrackingSolicitud.perro.photoUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80'}" alt="${activeTrackingSolicitud.perro.name}" class="w-full h-full object-cover" />
              </div>
            </div>
            <div class="mt-1 bg-slate-950 text-white font-black px-2.5 py-0.5 rounded-full shadow text-[10px] flex items-center gap-1 whitespace-nowrap">
              <span>🐾 ${activeTrackingSolicitud.perro.name}</span>
              <span class="text-emerald-400 font-bold">Punto de Retiro</span>
            </div>
          </div>
        `;
        trackingDogMarkerRef.current = new mapboxgl.Marker({ element: dogEl })
          .setLngLat(dogCoords)
          .addTo(mapRef.current);
      } else {
        trackingDogMarkerRef.current.setLngLat(dogCoords);
      }

      // Walker marker
      const walkerImg = activeTrackingSolicitud.paseadorFoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80';
      const walkerName = activeTrackingSolicitud.paseadorNombre || 'Paseador en Vivo';

      if (!trackingWalkerMarkerRef.current) {
        const walkerEl = document.createElement('div');
        walkerEl.className = 'tracking-walker-marker flex flex-col items-center cursor-pointer select-none';
        walkerEl.innerHTML = `
          <div class="relative flex flex-col items-center">
            <div class="relative">
              <div class="absolute -inset-2.5 rounded-full bg-sky-500/40 animate-pulse pointer-events-none"></div>
              <div class="w-13 h-13 rounded-full border-3 border-sky-500 shadow-xl overflow-hidden bg-white ring-4 ring-sky-300">
                <img src="${walkerImg}" alt="${walkerName}" class="w-full h-full object-cover" />
              </div>
            </div>
            <div class="mt-1 bg-sky-950 text-white font-black px-2.5 py-0.5 rounded-full shadow text-[10px] flex items-center gap-1 whitespace-nowrap">
              <span>🦮 ${walkerName.split(' ')[0]}</span>
              <span class="text-sky-300 font-bold">En Vivo</span>
            </div>
          </div>
        `;
        trackingWalkerMarkerRef.current = new mapboxgl.Marker({ element: walkerEl })
          .setLngLat(walkerCoords)
          .addTo(mapRef.current);
      } else {
        trackingWalkerMarkerRef.current.setLngLat(walkerCoords);
      }

      return;
    } else {
      if (trackingDogMarkerRef.current) {
        trackingDogMarkerRef.current.remove();
        trackingDogMarkerRef.current = null;
      }
      if (trackingWalkerMarkerRef.current) {
        trackingWalkerMarkerRef.current.remove();
        trackingWalkerMarkerRef.current = null;
      }
    }

    // 🌟 B. REGULAR OVERVIEW MODE
    if (mode === 'cliente') {
      // VISTA CLIENTE: ÚNICAMENTE renderizar Paseadores registrados (role == 'PASEADOR' o 'WALKER') dentro del radio de 10 km
      // NO debe ver a otros Clientes en su mapa.
      paseadores.forEach((p) => {
        // Descartar entidades bots/mock residuales
        if (p.id.includes('mock') || p.id.includes('fake')) {
          return;
        }

        const isWalkerActive = p.disponible !== false && p.gpsActivo !== false;
        const DEFAULT_LAT = -31.4201;
        const DEFAULT_LNG = -64.4992;
        const markerLat = typeof p.lat === 'number' && !isNaN(p.lat) && p.lat !== 0 ? p.lat : DEFAULT_LAT;
        const markerLng = typeof p.lng === 'number' && !isNaN(p.lng) && p.lng !== 0 ? p.lng : DEFAULT_LNG;

        const dist = calculateDistanceKm(centerLat, centerLng, markerLat, markerLng);

        // Radio de cobertura estricto de 10 km
        if (dist > 10) {
          return;
        }

        const markerKey = `walker-${p.id}`;
        currentMarkerKeys.add(markerKey);
        const isSelected = selectedPaseadorId === p.id || activeCardWalker?.id === p.id;
        const walkerAvatar = (p.fotoPerfil && typeof p.fotoPerfil === 'string' && p.fotoPerfil.trim() !== '')
          ? p.fotoPerfil
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';

        const existing = dynamicMarkersMapRef.current.get(markerKey);

        if (existing) {
          // Update in place without destroying the DOM element
          existing.marker.setLngLat([markerLng, markerLat]);
          const avatarContainer = existing.el.querySelector('.walker-avatar-ring');
          if (avatarContainer) {
            avatarContainer.className = `walker-avatar-ring relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full border ${
              isSelected 
                ? 'border-emerald-500 ring-2 ring-emerald-300 scale-105 shadow-md' 
                : isWalkerActive 
                  ? 'border-white ring-1 ring-emerald-500/50 shadow-xs' 
                  : 'border-slate-300 ring-1 ring-slate-400/50 grayscale-[40%]'
            } shadow-xs overflow-hidden bg-slate-200 transition-transform duration-150`;
          }
          const imgEl = existing.el.querySelector('img');
          if (imgEl && imgEl.getAttribute('src') !== walkerAvatar) {
            imgEl.setAttribute('src', walkerAvatar);
          }
          const distLabel = existing.el.querySelector('.walker-distance-label');
          if (distLabel) {
            distLabel.textContent = `${dist}km`;
          }
          // Sincronizar tarjeta flotante activa si corresponde al mismo paseador
          if (activeCardWalker?.id === p.id) {
            setActiveCardWalker(prev => {
              if (!prev || prev.id !== p.id) return prev;
              if (Math.abs(prev.lat - markerLat) < 0.0001 && Math.abs(prev.lng - markerLng) < 0.0001 && prev.disponible === p.disponible) {
                return prev;
              }
              return { ...p, lat: markerLat, lng: markerLng };
            });
          }
        } else {
          // Create new marker
          const el = document.createElement('div');
          el.className = 'walker-map-marker group cursor-pointer select-none';
          el.id = `marker-walker-${p.id}`;

          const auraHtml = isWalkerActive
            ? `<div class="absolute -inset-1 rounded-full bg-emerald-400/20 blur-[1px] pointer-events-none"></div>`
            : ``;

          const statusBadgeHtml = isWalkerActive
            ? `<span class="bg-emerald-600 text-white px-1.5 py-0.5 rounded-full text-[8px] font-bold flex items-center gap-0.5 border border-emerald-400 shadow-2xs">
                <span class="w-1 h-1 rounded-full bg-white"></span>
                Activo
               </span>`
            : `<span class="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded-full text-[8px] font-medium border border-slate-500">
                Registrado
               </span>`;

          el.innerHTML = `
            <div class="relative flex flex-col items-center">
              <div class="relative">
                ${auraHtml}
                <div class="walker-avatar-ring relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full border ${
                  isSelected 
                    ? 'border-emerald-500 ring-2 ring-emerald-300 scale-105 shadow-md' 
                    : isWalkerActive 
                      ? 'border-white ring-1 ring-emerald-500/50 shadow-xs' 
                      : 'border-slate-300 ring-1 ring-slate-400/50'
                } shadow-xs overflow-hidden bg-slate-200 transition-transform duration-150">
                  <img src="${walkerAvatar}" alt="${p.nombre}" class="w-full h-full object-cover" />
                </div>
              </div>
              <div class="mt-1 flex flex-col items-center gap-0.5 pointer-events-none">
                ${statusBadgeHtml}
                <div class="bg-white/95 backdrop-blur px-1.5 py-0.5 rounded-full border border-slate-200/90 shadow-2xs text-[9px] font-bold text-slate-800 flex items-center gap-1">
                  <span>★ ${p.calificacion || 5.0}</span>
                  <span class="text-slate-300">•</span>
                  <span class="${isWalkerActive ? 'text-emerald-700' : 'text-slate-700'} font-semibold">${p.nombre}</span>
                  <span class="text-slate-300">•</span>
                  <span class="walker-distance-label text-slate-500 font-mono">${dist}km</span>
                </div>
              </div>
            </div>
          `;

          // Isolated click handler: NO MAP CAMERA MOVEMENT!
          const handleMarkerClick = (e: MouseEvent | TouchEvent) => {
            e.stopPropagation();
            e.preventDefault();

            // Set active floating popup card directly on the map
            setActiveCardSolicitud(null);
            setActiveCardCliente(null);
            setActiveCardWalker(p);

            if (onSelectPaseador) {
              onSelectPaseador(p);
            }
          };

          el.addEventListener('click', handleMarkerClick);
          el.addEventListener('mousedown', (e) => e.stopPropagation());
          el.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([markerLng, markerLat])
            .addTo(mapRef.current);

          dynamicMarkersMapRef.current.set(markerKey, { marker, el, type: 'walker' });
        }
      });
    } else {
      // 🌟 MODO PASEADOR:
      // VISTA PASEADOR:
      // 1. Debe ver en el mapa a TODOS los usuarios registrados con rol CLIENTE (role == 'CLIENTE' o 'OWNER') ubicados en un radio de 10 km.
      // 2. NO debe ver a otros Paseadores en su mapa.
      // 3. Renderiza las ubicaciones / puntos de retiro de los Clientes registrados reales.

      clientes.forEach((c) => {
        if (c.id.includes('mock') || c.id.includes('fake')) return;

        const DEFAULT_LAT = -31.4201;
        const DEFAULT_LNG = -64.4992;
        const markerLat = typeof c.lat === 'number' && !isNaN(c.lat) && c.lat !== 0 ? c.lat : DEFAULT_LAT;
        const markerLng = typeof c.lng === 'number' && !isNaN(c.lng) && c.lng !== 0 ? c.lng : DEFAULT_LNG;

        const dist = calculateDistanceKm(centerLat, centerLng, markerLat, markerLng);
        if (dist > 10) return;

        const markerKey = `cliente-${c.id}`;
        currentMarkerKeys.add(markerKey);

        const isSelected = selectedClienteId === c.id || activeCardCliente?.id === c.id;

        const firstDog = Array.isArray(c.perros) && c.perros.length > 0 ? c.perros[0] : null;
        const avatarImg = (firstDog && typeof firstDog === 'object' && 'photoUrl' in firstDog && firstDog.photoUrl)
          ? firstDog.photoUrl
          : (c.fotoPerfil || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80');

        const existing = dynamicMarkersMapRef.current.get(markerKey);

        if (existing) {
          existing.marker.setLngLat([markerLng, markerLat]);
          const ringEl = existing.el.querySelector('.cliente-avatar-ring');
          if (ringEl) {
            ringEl.className = `cliente-avatar-ring relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 ${
              isSelected
                ? 'border-emerald-600 ring-4 ring-emerald-300 scale-110 shadow-xl'
                : 'border-emerald-500 ring-2 ring-emerald-400 shadow-md'
            } overflow-hidden bg-white flex items-center justify-center transition-transform duration-150`;
          }
          const distLabel = existing.el.querySelector('.cliente-distance-label');
          if (distLabel) {
            distLabel.textContent = `${dist}km`;
          }
          if (activeCardCliente?.id === c.id) {
            setActiveCardCliente(prev => {
              if (!prev || prev.id !== c.id) return prev;
              if (Math.abs(prev.lat - markerLat) < 0.0001 && Math.abs(prev.lng - markerLng) < 0.0001) {
                return prev;
              }
              return { ...c, lat: markerLat, lng: markerLng };
            });
          }
        } else {
          const el = document.createElement('div');
          el.className = 'cliente-map-marker group cursor-pointer select-none';
          el.id = `marker-cliente-${c.id}`;

          const auraHtml = `<div class="absolute -inset-1 rounded-full bg-emerald-400/20 blur-[1px] pointer-events-none"></div>`;

          el.innerHTML = `
            <div class="relative flex flex-col items-center">
              <div class="relative">
                ${auraHtml}
                <div class="cliente-avatar-ring relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 ${
                  isSelected
                    ? 'border-emerald-600 ring-4 ring-emerald-300 scale-110 shadow-xl'
                    : 'border-emerald-500 ring-2 ring-emerald-400 shadow-md'
                } overflow-hidden bg-white flex items-center justify-center transition-transform duration-150">
                  <img src="${avatarImg}" alt="${c.nombre}" class="w-full h-full object-cover" />
                </div>
              </div>
              <div class="mt-1 flex flex-col items-center gap-0.5 pointer-events-none">
                <span class="bg-emerald-700 text-white px-1.5 py-0.5 rounded-full text-[8px] font-bold flex items-center gap-0.5 border border-emerald-500 shadow-2xs whitespace-nowrap">
                  <span>📍 Punto de Retiro</span>
                </span>
                <div class="bg-slate-900/90 backdrop-blur text-white px-2 py-0.5 rounded-full shadow-2xs text-[9px] font-semibold flex items-center gap-1 whitespace-nowrap border border-slate-700">
                  <span>👤 ${c.nombre}</span>
                  <span class="text-slate-400">•</span>
                  <span class="cliente-distance-label text-emerald-300 font-mono">${dist}km</span>
                </div>
              </div>
            </div>
          `;

          const handleMarkerClick = (e: MouseEvent | TouchEvent) => {
            e.stopPropagation();
            e.preventDefault();
            setActiveCardWalker(null);
            setActiveCardSolicitud(null);
            setActiveCardCliente(c);
            if (onSelectCliente) {
              onSelectCliente(c);
            }
          };

          el.addEventListener('click', handleMarkerClick);
          el.addEventListener('mousedown', (e) => e.stopPropagation());
          el.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([markerLng, markerLat])
            .addTo(mapRef.current);

          dynamicMarkersMapRef.current.set(markerKey, { marker, el, type: 'cliente' as any });
        }
      });

      // Renderizar solicitudes de servicio en vivo de clientes en el radar de 10 km
      solicitudes.forEach((sol) => {
        const isOwnClientSolicitud = Boolean(
          (currentClienteId && sol.clienteId === currentClienteId) ||
          (currentClienteEmail && sol.clienteTelefono && sol.clienteTelefono === currentClienteEmail) ||
          sol.id.startsWith('sol-own-') || sol.id.startsWith('sol-active-client-')
        );

        const markerLat = sol.ubicacion.lat;
        const markerLng = sol.ubicacion.lng;
        const dist = calculateDistanceKm(centerLat, centerLng, markerLat, markerLng);
        if (dist > 10) return; // Radio estricto de 10 km

        // Si todos los días del plan ya fueron tomados/asignados, ocultar el pin de solicitudes pendientes
        if (sol.estado === 'rechazada' || sol.estado === 'cancelada') return;
        if (sol.estado === 'pendiente' && (sol.montoTotal || 0) > 0 && getAvailableDaysCount(sol) === 0) {
          return;
        }
        // Si ya fue aceptada en su totalidad por otro paseador, no mostrar en radar de ofertas
        if (sol.estado !== 'pendiente' && currentPaseadorId && sol.paseadorId && sol.paseadorId !== currentPaseadorId) {
          return;
        }

        const markerKey = `sol-${sol.id}`;
        currentMarkerKeys.add(markerKey);

        const isSelected = selectedSolicitudId === sol.id || activeCardSolicitud?.id === sol.id;
        const isClientActive = sol.cuentaActiva !== false;

        // CODIFICACIÓN DE COLORES DE URGENCIA EN EL MAPA:
        // * ROJO (#EF4444): Urgencia Alta / Inmediata (Paseo para hoy / Express)
        // * AMARILLO (#F59E0B): Urgencia Moderada (Necesita paseo pronto)
        // * VERDE (#10B981): Urgencia Baja / Programado (Sin apuro)
        const todayStr = new Date().toISOString().split('T')[0];
        const targetDate = sol.fechaProgramada || (sol.fechasProgramadas && sol.fechasProgramadas[0]) || todayStr;
        const diffTime = new Date(targetDate).getTime() - new Date(todayStr).getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let urgencyColor = '#10B981'; // VERDE
        let urgencyBadge = '🟢 Programado';
        let urgencyRing = 'border-emerald-500 ring-2 ring-emerald-400';
        let urgencyAura = '<div class="absolute -inset-1 rounded-full bg-emerald-400/30 pointer-events-none"></div>';

        if (sol.urgencia === 'alta' || diffDays <= 0 || targetDate === todayStr) {
          urgencyColor = '#EF4444'; // ROJO
          urgencyBadge = '🔴 Alta (Hoy)';
          urgencyRing = 'border-red-500 ring-3 ring-red-400';
          urgencyAura = '<div class="absolute -inset-2 rounded-full bg-red-500/40 animate-ping pointer-events-none"></div><div class="absolute -inset-1 rounded-full bg-red-500/50 blur-[2px] pointer-events-none"></div>';
        } else if (sol.urgencia === 'moderada' || diffDays < 4) {
          urgencyColor = '#F59E0B'; // AMARILLO
          urgencyBadge = `🟡 Moderada (${diffDays}d)`;
          urgencyRing = 'border-amber-500 ring-2 ring-amber-400';
          urgencyAura = '<div class="absolute -inset-1.5 rounded-full bg-amber-400/40 animate-pulse pointer-events-none"></div>';
        }

        const existing = dynamicMarkersMapRef.current.get(markerKey);

        if (existing) {
          existing.marker.setLngLat([markerLng, markerLat]);
          const avatarContainer = existing.el.querySelector('.dog-avatar-ring');
          if (avatarContainer) {
            avatarContainer.className = `dog-avatar-ring relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 ${
              isOwnClientSolicitud
                ? 'border-indigo-500 ring-2 ring-indigo-300 scale-105 shadow-md'
                : isSelected 
                  ? 'border-white ring-4 ring-slate-900 scale-110 shadow-xl' 
                  : urgencyRing
            } shadow-md overflow-hidden bg-white flex items-center justify-center transition-transform duration-200`;
          }
          const imgEl = existing.el.querySelector('img');
          if (imgEl && sol.perro.photoUrl && imgEl.getAttribute('src') !== sol.perro.photoUrl) {
            imgEl.setAttribute('src', sol.perro.photoUrl);
          }
        } else {
          const el = document.createElement('div');
          el.className = 'dog-map-marker group cursor-pointer select-none';
          el.id = `marker-dog-${sol.id}`;
          if (isOwnClientSolicitud) {
            el.style.zIndex = '35';
          }

          const auraHtml = isOwnClientSolicitud
            ? `<div class="absolute -inset-2 rounded-full bg-indigo-500/40 animate-pulse pointer-events-none"></div>`
            : urgencyAura;

          // Clean dog marker with dog photo and urgency badge
          const dogPhotoHtml = sol.perro.photoUrl
            ? `<img src="${sol.perro.photoUrl}" alt="${sol.perro.name}" class="w-full h-full object-cover" />`
            : `<div class="w-full h-full bg-amber-100 flex items-center justify-center text-sm">🐶</div>`;

          el.innerHTML = `
            <div class="relative flex flex-col items-center">
              <div class="relative">
                ${auraHtml}
                <div class="dog-avatar-ring relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 ${
                  isOwnClientSolicitud
                    ? 'border-indigo-500 ring-2 ring-indigo-300 scale-105 shadow-md'
                    : isSelected 
                      ? 'border-white ring-4 ring-slate-900 scale-110 shadow-xl' 
                      : urgencyRing
                } shadow-md overflow-hidden bg-white flex items-center justify-center transition-transform duration-150">
                  ${dogPhotoHtml}
                </div>
              </div>
              <div class="mt-1 flex flex-col items-center gap-0.5 pointer-events-none">
                ${isOwnClientSolicitud ? `
                  <span class="bg-indigo-600 text-white px-1.5 py-0.5 rounded-full text-[8px] font-bold flex items-center gap-0.5 border border-indigo-400 shadow-2xs">
                    <span class="w-1 h-1 rounded-full bg-white animate-pulse"></span>
                    Tu Perro
                  </span>
                ` : `
                  <span class="px-1.5 py-0.2 rounded-full text-[8px] font-black text-white shadow-2xs whitespace-nowrap" style="background-color: ${urgencyColor}">
                    ${urgencyBadge}
                  </span>
                `}
                <div class="bg-slate-900/90 backdrop-blur text-white px-2 py-0.5 rounded-full shadow-2xs text-[9px] font-semibold flex items-center gap-1 whitespace-nowrap border ${isOwnClientSolicitud ? 'border-indigo-400' : 'border-slate-700'}">
                  <span>🐾 ${sol.perro.name}</span>
                </div>
              </div>
            </div>
          `;

          // Isolated click handler: NO MAP CAMERA MOVEMENT!
          const handleDogClick = (e: MouseEvent | TouchEvent) => {
            e.stopPropagation();
            e.preventDefault();

            // Set active floating popup card directly on the map
            setActiveCardWalker(null);
            setActiveCardSolicitud(sol);

            if (onSelectSolicitud) {
              onSelectSolicitud(sol);
            }
          };

          el.addEventListener('click', handleDogClick);
          el.addEventListener('mousedown', (e) => e.stopPropagation());
          el.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([markerLng, markerLat])
            .addTo(mapRef.current);

          dynamicMarkersMapRef.current.set(markerKey, { marker, el, type: 'solicitud' });
        }
      });
    }

    // Clean up markers that are no longer in the active dataset
    dynamicMarkersMapRef.current.forEach(({ marker }, key) => {
      if (!currentMarkerKeys.has(key)) {
        marker.remove();
        dynamicMarkersMapRef.current.delete(key);
      }
    });

  }, [
    mode, 
    mapLoaded, 
    centerLat, 
    centerLng, 
    paseadores, 
    clientes,
    solicitudes, 
    selectedPaseadorId, 
    selectedSolicitudId, 
    selectedClienteId,
    activeCardCliente?.id,
    activeCardWalker?.id,
    activeTrackingSolicitud, 
    walkerLiveCoords,
    currentClienteId,
    currentPaseadorId
  ]);

  // Recenter helper button
  const handleRecenter = () => {
    if (mapRef.current) {
      const targetZoom = (activeTrackingSolicitud && (activeTrackingSolicitud.estado === 'en_camino' || activeTrackingSolicitud.estado === 'en_curso')) ? 15.5 : RADAR_ZOOM_LEVEL;
      mapRef.current.flyTo({
        center: [centerLng, centerLat],
        zoom: targetZoom,
        essential: true
      });
    }
  };

  return (
    <div className="relative w-full h-full min-h-[300px] sm:min-h-[360px] rounded-2xl overflow-hidden isolate shadow-inner border border-slate-200/80 z-10">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0 overflow-hidden" />

      {/* Top Map Info Pill */}
      <div className="absolute top-2.5 left-2.5 z-30 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200/80 shadow-xs text-xs max-w-[240px] sm:max-w-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-800 text-[11px]">
            {activeTrackingSolicitud && (activeTrackingSolicitud.estado === 'en_camino' || activeTrackingSolicitud.estado === 'en_curso')
              ? 'GPS en Vivo' 
              : (mode === 'cliente' ? 'Paseadores en tu Zona' : 'Clientes en tu Zona')}
          </span>
        </div>
        <p className="text-[10px] text-slate-500 truncate mt-0.5" title={currentAddress}>
          📍 {currentAddress}
        </p>
        <div className="mt-1 flex items-center gap-1 text-[9px] text-emerald-700 font-medium">
          <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
          <span>Hacé clic o arrastrá el pin para cambiar posición</span>
        </div>
      </div>

      {/* Exact 10km Radar Coverage Badge */}
      <div className="absolute top-2.5 right-12 z-30 hidden sm:flex items-center gap-1 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl border border-emerald-200/80 text-emerald-800 text-[10px] font-semibold shadow-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
        <span>Radar 10 km</span>
      </div>

      {/* Recenter / Geolocation Button */}
      <button
        type="button"
        id="btn-recenter-map"
        onClick={handleRecenter}
        className="absolute bottom-3 right-3 z-30 px-2.5 py-1.5 rounded-xl bg-white/95 hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs font-semibold text-xs flex items-center gap-1 transition-transform active:scale-95 cursor-pointer"
        title="Centrar en mi ubicación"
      >
        <Navigation className="w-3.5 h-3.5 text-emerald-600" />
        <span className="hidden sm:inline text-[11px]">Centrar</span>
      </button>

      {/* ===================================================================== */}
      {/* 🌟 4A. POPUP / MODAL FLOTANTE DE PASEADOR EN EL MAPA (VISTA CLIENTE) 🌟 */}
      {/* ===================================================================== */}
      {activeCardWalker && mode === 'cliente' && (
        <div 
          id="modal-flotante-paseador-mapa"
          className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-xs z-40 bg-white/98 backdrop-blur-md rounded-2xl p-3.5 border border-emerald-300 shadow-xl space-y-2.5 transition-all animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          {/* Close button */}
          <button
            type="button"
            id="btn-cerrar-popup-paseador"
            onClick={() => setActiveCardWalker(null)}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
            title="Cerrar"
          >
            ✕
          </button>

          {/* Walker Photo & Details */}
          <div className="flex items-center gap-3 pr-5">
            <div className="relative shrink-0">
              <img
                src={activeCardWalker.fotoPerfil}
                alt={activeCardWalker.nombre}
                className="w-11 h-11 rounded-xl object-cover border border-emerald-400 shadow-xs"
              />
              <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-0.5 rounded-full shadow-2xs" title="Paseador Certificado">
                <ShieldCheck className="w-3 h-3" />
              </div>
            </div>

            <div className="min-w-0 space-y-0.5">
              <h4 className="text-sm font-bold text-slate-900 truncate">
                {activeCardWalker.nombre} {activeCardWalker.apellido}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                @{activeCardWalker.nombreUsuario} • Certificado
              </p>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/80">
                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                  {activeCardWalker.calificacion.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500">
                  {activeCardWalker.totalPaseos} paseos
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                  {calculateDistanceKm(centerLat, centerLng, activeCardWalker.lat, activeCardWalker.lng)} km
                </span>
              </div>
            </div>
          </div>

          {/* Short Bio */}
          {activeCardWalker.biografia && (
            <p className="text-[11px] text-slate-600 line-clamp-2 leading-snug italic bg-emerald-50/30 p-2 rounded-lg border border-emerald-100/60">
              "{activeCardWalker.biografia}"
            </p>
          )}

          {/* Direct Action Button: "Pedir Paseo" - Compact & refined */}
          <div className="pt-0.5">
            <button
              type="button"
              id="btn-pedir-paseo-contratar-mapa"
              onClick={() => {
                if (onRequestWalkWithPaseador) {
                  onRequestWalkWithPaseador(activeCardWalker);
                } else if (onSelectPaseador) {
                  onSelectPaseador(activeCardWalker);
                }
                setActiveCardWalker(null);
              }}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Dog className="w-3.5 h-3.5" />
              <span>Pedir Paseo</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 🌟 4B. POPUP / MODAL FLOTANTE DE CLIENTE EN EL MAPA (VISTA PASEADOR) 🌟 */}
      {/* ===================================================================== */}
      {activeCardSolicitud && mode === 'paseador' && (
        <div 
          id="modal-flotante-cliente-mapa"
          className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-xs z-40 bg-white/98 backdrop-blur-md rounded-2xl p-3.5 border border-emerald-300 shadow-xl space-y-2.5 transition-all animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          {/* Close button */}
          <button
            type="button"
            id="btn-cerrar-popup-cliente"
            onClick={() => setActiveCardSolicitud(null)}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
            title="Cerrar"
          >
            ✕
          </button>

          {/* Dog Photo, Name & Breed */}
          <div className="flex items-start gap-3 pr-5">
            <div className="w-11 h-11 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-xl shadow-2xs shrink-0 overflow-hidden">
              {activeCardSolicitud.perro.photoUrl ? (
                <img 
                  src={activeCardSolicitud.perro.photoUrl} 
                  alt={activeCardSolicitud.perro.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                '🐶'
              )}
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-sm font-bold text-slate-900">
                  {activeCardSolicitud.perro.name}
                </h4>
                <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded-full">
                  {calculateDistanceKm(centerLat, centerLng, activeCardSolicitud.ubicacion.lat, activeCardSolicitud.ubicacion.lng)} km
                </span>
              </div>

              <p className="text-[11px] text-slate-500 font-medium">
                {activeCardSolicitud.perro.breed} • {activeCardSolicitud.perro.age}
              </p>

              <p className="text-[11px] text-slate-500 font-medium">
                Dueño: <strong className="text-slate-800">{activeCardSolicitud.clienteNombre}</strong>
              </p>
            </div>
          </div>

          {/* Pickup Address */}
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-[11px] flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <p className="font-semibold text-slate-800 truncate" title={activeCardSolicitud.ubicacion.direccion}>
              {activeCardSolicitud.ubicacion.direccion}
            </p>
          </div>

          {/* If the client has sent a REAL active offer with fee */}
          {activeCardSolicitud.estado === 'pendiente' && (activeCardSolicitud.montoTotal || 0) > 0 ? (
            <>
              {/* Real Plan & Price Details */}
              {(() => {
                const pricing = getSolicitudPricingDetails(activeCardSolicitud);
                const diasDesglose = getOrBuildSolicitudDiasDesglose(activeCardSolicitud);
                const availableDays = diasDesglose.filter(d => d.estado === 'disponible');

                return (
                  <div className="space-y-2">
                    <div className="bg-emerald-50/80 border border-emerald-200/90 p-2 rounded-xl space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider block">Plan Solicitado</span>
                          <span className="text-xs font-bold text-emerald-950">{pricing.labelPlanPaseos}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Ganancia por paseo</span>
                          <span className="text-sm font-bold text-emerald-700 font-mono block">
                            {formatPesos(pricing.netoPorPaseo)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Desglose Individual de Días del Plan */}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 px-0.5">
                        <span>Días del plan ({availableDays.length} disp. de {diasDesglose.length}):</span>
                        <span className="text-emerald-700 font-semibold">{pricing.isCorreaWalkie ? 'Correa Walkie incl.' : 'Correa propia'}</span>
                      </div>

                      {diasDesglose.map((dia, diaIdx) => {
                        const isDispo = dia.estado === 'disponible';
                        return (
                          <div
                            key={`map-dia-${dia.id || 'd'}-${diaIdx}`}
                            className={`p-2 rounded-xl border transition-all flex items-center justify-between gap-2 text-xs ${
                              isDispo
                                ? 'bg-white border-emerald-300 hover:border-emerald-400 shadow-2xs'
                                : 'bg-slate-50 border-slate-200 opacity-70'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                                <span className="text-emerald-600">📅</span>
                                <span>{dia.diaNombre} {dia.fechaCorta}</span>
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md">
                                  {dia.horario}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-700 font-mono block mt-0.5">
                                +{formatPesos(dia.montoNeto)} neto
                              </span>
                            </div>

                            {isDispo ? (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  id={`btn-aceptar-dia-${dia.id}`}
                                  onClick={() => {
                                    if (onAcceptIndividualDay) {
                                      onAcceptIndividualDay(activeCardSolicitud, dia.id);
                                    } else if (onAcceptSolicitud) {
                                      onAcceptSolicitud(activeCardSolicitud);
                                    }
                                    if (availableDays.length <= 1) {
                                      setActiveCardSolicitud(null);
                                    }
                                  }}
                                  className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Tomar</span>
                                </button>
                                <button
                                  type="button"
                                  id={`btn-rechazar-dia-mapa-${dia.id}`}
                                  onClick={() => {
                                    if (onRejectSolicitud) {
                                      onRejectSolicitud(activeCardSolicitud);
                                    }
                                    setActiveCardSolicitud(null);
                                  }}
                                  className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                                  title="Rechazar"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-200/80 px-2 py-1 rounded-md flex items-center gap-1 shrink-0">
                                <span>🔒 Asignado</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Actions: "Aceptar Todos" & "Rechazar" */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      {availableDays.length > 1 && (
                        <button
                          type="button"
                          id="btn-aceptar-todos-dias-mapa"
                          onClick={() => {
                            if (onAcceptSolicitud) {
                              onAcceptSolicitud(activeCardSolicitud);
                            }
                            setActiveCardSolicitud(null);
                          }}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Tomar todos ({availableDays.length})</span>
                        </button>
                      )}

                      <button
                        type="button"
                        id="btn-rechazar-trabajo-mapa"
                        onClick={() => {
                          if (onRejectSolicitud) {
                            onRejectSolicitud(activeCardSolicitud);
                          }
                          setActiveCardSolicitud(null);
                        }}
                        className={`py-1.5 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                          availableDays.length <= 1 ? 'w-full' : ''
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Rechazar</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            /* When the client is located on the map but has NOT placed a real paid walk order */
            <div className="space-y-2 pt-0.5 border-t border-slate-100">
              <div className="bg-amber-50/70 border border-amber-200/80 p-2.5 rounded-xl space-y-0.5 text-[11px] text-amber-950">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Sin solicitud activa</span>
                </div>
                <p className="text-[10px] text-amber-800 leading-snug">
                  Este cliente está en tu radio de 10 km, aún sin pedido con fecha o tarifa confirmada.
                </p>
              </div>

              <button
                type="button"
                id="btn-cerrar-info-cliente-sin-solicitud"
                onClick={() => setActiveCardSolicitud(null)}
                className="w-full py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.99] text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 🌟 4C. POPUP / MODAL FLOTANTE DE CLIENTE REGISTRADO (PUNTO DE RETIRO) 🌟 */}
      {/* ===================================================================== */}
      {activeCardCliente && mode === 'paseador' && (
        <div 
          id="modal-flotante-cliente-mapa"
          className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-xs z-40 bg-white/98 backdrop-blur-md rounded-2xl p-3.5 border border-emerald-300 shadow-xl space-y-2.5 transition-all animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          {/* Close button */}
          <button
            type="button"
            id="btn-cerrar-popup-cliente"
            onClick={() => setActiveCardCliente(null)}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
            title="Cerrar"
          >
            ✕
          </button>

          {/* Client Details */}
          <div className="flex items-center gap-3 pr-5">
            <div className="relative shrink-0">
              <img
                src={activeCardCliente.fotoPerfil || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80'}
                alt={activeCardCliente.nombre}
                className="w-11 h-11 rounded-xl object-cover border border-emerald-400 shadow-xs"
              />
              <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-0.5 rounded-full shadow-2xs" title="Cliente Registrado">
                <MapPin className="w-3 h-3" />
              </div>
            </div>

            <div className="min-w-0 space-y-0.5">
              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                📍 Punto de Retiro
              </span>
              <h4 className="text-sm font-bold text-slate-900 truncate">
                {activeCardCliente.nombre} {activeCardCliente.apellido || ''}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                @{activeCardCliente.nombreUsuario}
              </p>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                  {calculateDistanceKm(centerLat, centerLng, activeCardCliente.lat, activeCardCliente.lng)} km
                </span>
                {activeCardCliente.telefono && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    {activeCardCliente.telefono}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Dirección / Punto de Retiro */}
          <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl text-[11px] text-slate-700 space-y-1">
            <div className="flex items-center gap-1 font-bold text-slate-800">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Dirección de Retiro:</span>
            </div>
            <p className="text-[11px] text-slate-600 truncate" title={activeCardCliente.direccion || 'Valle de Punilla'}>
              {activeCardCliente.direccion || 'Valle de Punilla, Córdoba'}
            </p>
          </div>

          {/* Perros / Mascotas asociadas */}
          {Array.isArray(activeCardCliente.perros) && activeCardCliente.perros.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                <span>🐶 Mascotas ({activeCardCliente.perros.length}):</span>
              </p>
              <div className="flex flex-wrap gap-1">
                {activeCardCliente.perros.map((perro: any, pIdx: number) => (
                  <span key={`card-dog-${perro.id || pIdx}`} className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <span>🐾</span>
                    <strong className="font-semibold">{perro.name || 'Mascota'}</strong>
                    {perro.breed && <span className="text-amber-700 text-[9px]">({perro.breed})</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            id="btn-cerrar-info-cliente-retiro"
            onClick={() => setActiveCardCliente(null)}
            className="w-full py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.99] text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
};
