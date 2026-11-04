import { PlanType, PaseadorPublico, SolicitudPaseo, UserCliente, UserPaseador } from '../types';

export const MAPBOX_TOKEN = 
  (import.meta as any)?.env?.VITE_MAPBOX_TOKEN || 
  'pk.eyJ1IjoiZW5yaXF1ZWNpYW5jYSIsImEiOiJjbXNzMmIzcGswMTZpMnpvbHdoaDM0ZGg0In0.fOY_0oZZYX3nPP7PapsLMg';

export const EMAIL_DESTINO = 'enriquecianca4@gmail.com';

export interface PlanData {
  tipo: PlanType;
  nombre: string;
  subtitulo: string;
  precio: number;
  frecuencia: string;
  paseosPorSemana: number;
  precioUnitario: number;
  ahorro?: number;
  destacado?: 'popular' | 'valor' | null;
  etiquetaBadge?: string;
  descripcion: string;
  beneficios: string[];
}

export const PLANES_PASEO: PlanData[] = [
  {
    tipo: 'Común',
    nombre: 'Plan Común',
    subtitulo: 'Paseo Individual',
    precio: 3800,
    frecuencia: '1 paseo puntual / por día',
    paseosPorSemana: 1,
    precioUnitario: 3800,
    destacado: null,
    etiquetaBadge: '$3.800 cada paseo',
    descripcion: '1 paseo puntual ($3.800 por paseo). Ideal para necesidades ocasionales.',
    beneficios: [
      'Duración fija: 45 min activos',
      'Monitoreo GPS en vivo',
      'Fotos del recorrido en tiempo real',
      'Paseador verificado con PIN'
    ]
  },
  {
    tipo: 'Bronce',
    nombre: 'Plan Bronce',
    subtitulo: 'Frecuencia Media',
    precio: 10500,
    frecuencia: '3 paseos semanales',
    paseosPorSemana: 3,
    precioUnitario: 3500,
    destacado: null,
    etiquetaBadge: '$3.500 cada paseo',
    descripcion: '3 paseos semanales ($3.500 por paseo). Rutina balanceada para tu mascota.',
    beneficios: [
      '3 días programables por semana',
      'Duración fija: 45 min activos',
      'Monitoreo GPS en vivo',
      'Fotos del recorrido en tiempo real'
    ]
  },
  {
    tipo: 'Plata',
    nombre: 'Plan Plata',
    subtitulo: 'Frecuencia Alta',
    precio: 16500,
    frecuencia: '5 paseos semanales',
    paseosPorSemana: 5,
    precioUnitario: 3300,
    destacado: 'popular',
    etiquetaBadge: 'MÁS POPULAR',
    descripcion: '5 paseos semanales ($3.300 por paseo). Para mascotas con alta energía de Lunes a Viernes.',
    beneficios: [
      '5 días a la semana a elección',
      'Duración fija: 45 min activos',
      'Monitoreo GPS en vivo',
      'Fotos del recorrido y reporte diario'
    ]
  },
  {
    tipo: 'Oro',
    nombre: 'Plan Oro',
    subtitulo: 'Paseo Diario Completo',
    precio: 21000,
    frecuencia: '7 paseos semanales (diario)',
    paseosPorSemana: 7,
    precioUnitario: 3000,
    destacado: 'valor',
    etiquetaBadge: 'MEJOR VALOR',
    descripcion: '7 paseos semanales ($3.000 por paseo). Cobertura total los 7 días de la semana.',
    beneficios: [
      '7 días a la semana completos',
      'Duración fija: 45 min activos',
      'Monitoreo GPS en vivo',
      'Reporte fotográfico prioritario'
    ]
  }
];

export const DESCUENTOS_SEMANAS: Record<number, number> = {
  1: 0,
  2: 3,  // 3% OFF
  3: 5,  // 5% OFF
  4: 10  // 10% OFF
};

export const TEXTO_TERMINOS_CLIENTE = `Para Contratantes (Dueños)
WALKIE actúa estrictamente como un nexo tecnológico entre los propietarios de las mascotas y los paseadores de la zona.
Sistema de GPS Activo: El paseador compartirá su ubicación en tiempo real vía WhatsApp durante el recorrido. La plataforma no se responsabiliza por caídas de señal de las empresas de telefonía móvil, problemas de red o errores de GPS ajenos al servicio debido a la geografía serrana.
Exención de Responsabilidad: Ante imprevistos de fuerza mayor en la vía pública (accidentes ajenos, peleas con perros sueltos de la calle o escapes), la plataforma queda exenta de responsabilidad civil o económica, aunque cada paseador cuidará al animal con máximo respeto.
El propietario asegura que la mascota cuenta con sus vacunas obligatorias al día y NO posee conductas agresivas. Ante cualquier ataque del animal hacia el paseador u otros perros, el dueño se hará cargo de los gastos médicos correspondientes.
Clima: Los paseos se suspenden y reprograman ante tormentas eléctricas fuertes o alertas de calor extremo para proteger la salud de las mascotas.`;

export const TEXTO_TERMINOS_PASEADOR = `Para Trabajadores (Paseadores)
El paseador trabaja de forma independiente bajo la coordinación organizativa de WALKIE.
Sistema de Pago por Paseo Realizado: Los ingresos se calculan de manera estricta por cada paseo efectivamente realizado, y no por el valor total de los planes mensuales de los clientes. El paseador recibirá el 80% neto de cada paseo que complete.
Reparto de Disponibilidad: En caso de que un cliente contrate un plan de varios días (Plan Plata u Oro) y un paseador no disponga de la totalidad de esos días libres, Walki se reserva el derecho de asignar los días restantes a otro paseador de la misma localidad. Cada trabajador cobrará de manera individual y exacta la cantidad de paseos que haya realizado por su propia cuenta, dividiéndose la remuneración de forma justa.
Uso Obligatorio de Herramientas: Es condición obligatoria para mantener activa la cuenta de trabajador compartir la Ubicación en Tiempo Real de WhatsApp y enviar reportes fotográficos durante cada recorrido. El incumplimiento de esto dará la baja automática del paseador.
Verificación de Identidad: La cuenta no será activada hasta que los datos del DNI y Currículum sean validados manualmente por la administración de Walki.`;

export const FAQ_ITEMS = [
  {
    pregunta: '¿Cómo opera Walkie en el Valle de Punilla?',
    respuesta: 'Conectamos a dueños y paseadores certificados en localidades como Villa Carlos Paz, Cosquín, La Falda, Bialet Massé y alrededores dentro de un radio activo de 10 km adaptado a la geografía serrana.'
  },
  {
    pregunta: '¿Cómo sé que mi perro está seguro durante el recorrido?',
    respuesta: 'Cada paseo cuenta con seguimiento GPS en tiempo real compartido por WhatsApp, fotos del recorrido y validación con PIN de 4 dígitos al retirar y entregar a tu mascota.'
  },
  {
    pregunta: '¿Cuánto duran los paseos?',
    respuesta: 'Todos nuestros servicios tienen una duración fija garantizada de 45 minutos de caminata activa y recreativa.'
  },
  {
    pregunta: '¿Cómo funcionan los pagos y qué porcentaje recibe el paseador?',
    respuesta: 'El pago se realiza vía Mercado Pago o Efectivo. El paseador recibe el 80% neto de cada paseo efectivamente realizado.'
  },
  {
    pregunta: '¿Qué requisitos hay para ser paseador?',
    respuesta: 'Ser mayor de 18 años, presentar DNI frente y dorso, certificado de antecedentes penales, currículum y validar experiencia previa con animales.'
  }
];

export const DOG_SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1561037404-61cd46aa615b?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=400&q=80'
];

export const WALKER_SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80'
];

export interface LocalidadPunilla {
  id: string;
  nombre: string;
  departamento: string;
  lat: number;
  lng: number;
}

export const LOCALIDADES_PUNILLA: LocalidadPunilla[] = [
  { id: 'villa-giardino', nombre: 'Villa Giardino', departamento: 'Punilla Norte', lat: -31.0500, lng: -64.4833 },
  { id: 'la-cumbre', nombre: 'La Cumbre', departamento: 'Punilla Norte', lat: -30.9833, lng: -64.4917 },
  { id: 'la-falda', nombre: 'La Falda', departamento: 'Punilla Centro', lat: -31.0833, lng: -64.4833 },
  { id: 'los-cocos', nombre: 'Los Cocos', departamento: 'Punilla Norte', lat: -30.9333, lng: -64.5000 },
  { id: 'capilla-del-monte', nombre: 'Capilla del Monte', departamento: 'Punilla Norte', lat: -30.8667, lng: -64.5167 },
  { id: 'valle-hermoso', nombre: 'Valle Hermoso', departamento: 'Punilla Centro', lat: -31.1167, lng: -64.4833 },
  { id: 'huerta-grande', nombre: 'Huerta Grande', departamento: 'Punilla Centro', lat: -31.0667, lng: -64.4833 },
  { id: 'cosquin', nombre: 'Cosquín', departamento: 'Punilla Centro', lat: -31.2444, lng: -64.4656 },
  { id: 'bialet-masse', nombre: 'Bialet Massé', departamento: 'Punilla Sur', lat: -31.3167, lng: -64.4667 },
  { id: 'villa-carlos-paz', nombre: 'Villa Carlos Paz', departamento: 'Punilla Sur', lat: -31.4241, lng: -64.4978 },
  { id: 'cordoba-capital', nombre: 'Córdoba Capital', departamento: 'Capital', lat: -31.4201, lng: -64.1888 }
];

// Paseadores reales registrados en base de datos (inicia 100% limpio, sin bots ni cuentas mock)
export const PASEADORES_INICIALES: PaseadorPublico[] = [];

// Solicitudes reales de paseo (inicialmente vacío, se generan con reservas reales)
export const SOLICITUDES_INICIALES: SolicitudPaseo[] = [];

// Reseñas de paseadores (inicialmente vacío, se generan con valoraciones reales)
export const REVIEWS_PASEADOR_SAMPLE: any[] = [];

export interface VeterinariaInfo {
  id: string;
  nombre: string;
  localidad: string;
  direccion: string;
  telefono: string;
  guardia24hs?: boolean;
}

export const VETERINARIAS_PUNILLA: VeterinariaInfo[] = [
  // Villa Giardino
  { id: 'vet-giardino', nombre: 'Giardino Veterinaria', localidad: 'Villa Giardino', direccion: 'Av. San Martín 340, Villa Giardino', telefono: '+54 9 3548 491230' },
  { id: 'vet-serrana-giardino', nombre: 'Veterinaria Serrana Giardino', localidad: 'Villa Giardino', direccion: 'Av. Los Paraísos 120, Villa Giardino', telefono: '+54 9 3548 498760' },

  // La Cumbre
  { id: 'vet-soledad-martellossi', nombre: 'Consultorio Veterinario Dra. Soledad Martellossi', localidad: 'La Cumbre', direccion: 'Belgrano 230, La Cumbre', telefono: '+54 9 3548 452100' },
  { id: 'vet-la-cumbre', nombre: 'Veterinaria La Cumbre', localidad: 'La Cumbre', direccion: 'Av. San Martín 180, La Cumbre', telefono: '+54 9 3548 451290' },
  { id: 'vet-punilla-norte', nombre: 'Veterinaria Punilla Norte', localidad: 'La Cumbre', direccion: 'Rivadavia 115, La Cumbre', telefono: '+54 9 3548 452990' },

  // La Falda
  { id: 'vet-goio-grebe', nombre: 'Veterinaria Goio Grebe', localidad: 'La Falda', direccion: 'Av. Edén 650, La Falda', telefono: '+54 9 3548 422110' },
  { id: 'vet-la-falda', nombre: 'Veterinaria La Falda', localidad: 'La Falda', direccion: 'Av. Edén 280, La Falda', telefono: '+54 9 3548 421800' },
  { id: 'vet-clivet', nombre: 'Veterinaria Clivet', localidad: 'La Falda', direccion: 'España 180, La Falda', telefono: '+54 9 3548 423980' },

  // Los Cocos
  { id: 'vet-los-cocos', nombre: 'Consultorio Veterinario Los Cocos', localidad: 'Los Cocos', direccion: 'Av. Cecilia Grierson 350, Los Cocos', telefono: '+54 9 3548 458900' },

  // Capilla del Monte
  { id: 'vet-el-chalten', nombre: 'El Chaltén Veterinaria', localidad: 'Capilla del Monte', direccion: 'Diag. Buenos Aires 410, Capilla del Monte', telefono: '+54 9 3548 482340' },
  { id: 'vet-capilla', nombre: 'Consultorio Veterinario Capilla', localidad: 'Capilla del Monte', direccion: 'Hipólito Yrigoyen 310, Capilla del Monte', telefono: '+54 9 3548 481900' },

  // Valle Hermoso
  { id: 'vet-del-valle', nombre: 'Veterinaria Del Valle', localidad: 'Valle Hermoso', direccion: 'Av. Gral. Paz 240, Valle Hermoso', telefono: '+54 9 3548 470550' },
  { id: 'vet-san-roque-vh', nombre: 'Veterinaria San Roque', localidad: 'Valle Hermoso', direccion: 'Av. Sabattini 110, Valle Hermoso', telefono: '+54 9 3548 472100' },

  // Huerta Grande
  { id: 'vet-el-cardal', nombre: 'El Cardal Veterinaria', localidad: 'Huerta Grande', direccion: 'Leandro N. Alem 145, Huerta Grande', telefono: '+54 9 3548 425600' },

  // Cosquín
  { id: 'vet-virginia-martinez', nombre: 'Virginia Martínez Veterinaria', localidad: 'Cosquín', direccion: 'San Martín 670, Cosquín', telefono: '+54 9 3541 454120' },
  { id: 'vet-planeta-zoo', nombre: 'Veterinaria Planeta Zoo', localidad: 'Cosquín', direccion: 'Av. San Martín 920, Cosquín', telefono: '+54 9 3541 451030' },

  // Bialet Massé
  { id: 'vet-san-felipe', nombre: 'Veterinaria San Felipe', localidad: 'Bialet Massé', direccion: 'Ruta 38 esq. Belgrano, Bialet Massé', telefono: '+54 9 3541 442200' },

  // Villa Carlos Paz
  { id: 'vet-vitaliz', nombre: 'VITALIZ Clínica Veterinaria (24hs)', localidad: 'Villa Carlos Paz', direccion: 'Av. San Martín 1420, Villa Carlos Paz', telefono: '+54 9 3541 438100', guardia24hs: true },
  { id: 'vet-mascotas-shop', nombre: 'Veterinaria Mascotas Shop', localidad: 'Villa Carlos Paz', direccion: 'Av. Cárcano 510, Villa Carlos Paz', telefono: '+54 9 3541 432900' },
  { id: 'vet-san-francisco', nombre: 'Clínica Veterinaria San Francisco', localidad: 'Villa Carlos Paz', direccion: 'Asunción 340, Villa Carlos Paz', telefono: '+54 9 3541 426700' },

  // Córdoba Capital
  { id: 'vet-cordoba-central', nombre: 'Hospital Veterinario Central Córdoba', localidad: 'Córdoba Capital', direccion: 'Av. Colón 2100, Córdoba Capital', telefono: '+54 9 351 4801122', guardia24hs: true },
  { id: 'vet-perrunocanes', nombre: 'Perrunocanes (Atención Urgencias)', localidad: 'Córdoba Capital', direccion: 'Av. Rafael Núñez 4200, Córdoba', telefono: '+54 9 351 4829999' }
];

