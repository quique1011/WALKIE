export type UserRole = 'inicio' | 'cliente' | 'paseador';

export type RoleTab = 'main' | 'perfil' | 'nosotros_faq' | 'meta_solidaria';

export type PaseadorSubTab = 'gestion_mapa' | 'calendario_agenda' | 'paseos_realizados' | 'cuenta_resenas' | 'mapa_solicitudes' | 'agenda_mensual';

export type PlanType = 'Común' | 'Bronce' | 'Plata' | 'Oro';

export type EtapaPaseo = 
  | 'ETAPA_1_EN_CAMINO_RETIRO'
  | 'ETAPA_2_LLEGA_RETIRO'
  | 'ETAPA_3_PASEO_EN_CURSO'
  | 'ETAPA_4_LLEGA_DEVOLUCION'
  | 'ETAPA_5_CONFIRMACION_CLIENTE_ENTREGA'
  | 'ETAPA_6_MOSTRAR_PIN_DEVOLUCION'
  | 'ETAPA_7_PASEO_FINALIZADO';

export function getEtapaPaseo(solicitud: SolicitudPaseo): EtapaPaseo {
  if (solicitud.etapaPaseo) {
    return solicitud.etapaPaseo;
  }
  if (solicitud.estado === 'completada' || solicitud.etapaSeguimiento === 'finalizado') {
    return 'ETAPA_7_PASEO_FINALIZADO';
  }
  if (solicitud.estado === 'en_curso' || solicitud.estado === 'en_emergencia') {
    if (solicitud.confirmacionRetornoCliente === 'confirmado_si') {
      return 'ETAPA_6_MOSTRAR_PIN_DEVOLUCION';
    }
    if (
      solicitud.etapaSeguimiento === 'en_domicilio_retorno' ||
      solicitud.avisoLlegadaRetorno ||
      solicitud.temporizadorFinalizado ||
      solicitud.tiempoRestanteSegundos === 0
    ) {
      return 'ETAPA_5_CONFIRMACION_CLIENTE_ENTREGA';
    }
    return 'ETAPA_3_PASEO_EN_CURSO';
  }
  if (solicitud.estado === 'en_camino') {
    if (solicitud.etapaSeguimiento === 'en_domicilio' || solicitud.avisoLlegadaRetiro) {
      return 'ETAPA_2_LLEGA_RETIRO';
    }
    return 'ETAPA_1_EN_CAMINO_RETIRO';
  }
  return 'ETAPA_1_EN_CAMINO_RETIRO';
}

export type TemperamentType = 'Tranquilo' | 'Reactivo' | 'Sociable' | 'Nervioso' | 'Agresivo' | 'Dominante' | 'Juguetón';

export type WeightCategory = 'Pequeño' | 'Mediano' | 'Grande';

export interface DogProfile {
  id: string;
  name: string;
  age: number | string;
  breed: string;
  trustedVet: string;
  vetLocalidad?: string;
  pickupLocation: string;
  illnesses: string;
  enfermedades?: string;
  observaciones?: string;
  temperament: TemperamentType;
  compatibility: string;
  emergencyPhonePrimary: string;
  emergencyPhoneSecondary: string;
  weightCategory: WeightCategory;
  photoUrl: string;
  planActivo?: PlanType;
  calificacionPromedio?: number;
  totalPaseosCompletados?: number;
  historialCalificaciones?: Array<{
    calificacion: number;
    comentario?: string;
    fecha: string;
    plan?: string;
    paseadorNombre?: string;
  }>;
}

export interface WeekBooking {
  weekIndex: number;
  weekLabel: string;
  startDateStr?: string; // YYYY-MM-DD (Lunes)
  endDateStr?: string;   // YYYY-MM-DD (Domingo)
  selectedDays: string[];
  selectedDatesList?: string[]; // Array of YYYY-MM-DD strings for selected days
  preferredTime: string;
  extraTimeMinutes: number;
  tipoCorrea?: TipoCorrea;
}

export type TipoCorrea = 'propia' | 'walkie';

export interface PostulacionPaseador {
  id: string;
  paseadorId: string;
  paseadorNombre: string;
  paseadorFoto: string;
  paseadorTelefono: string;
  paseadorCalificacion: number;
  paseadorBiografia?: string;
  fechaPostulacion: string;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
}

export interface SolicitudCancelacionNotif {
  id: string;
  diaId?: string;
  solicitudId: string;
  fechaStr: string;
  diaNombre: string;
  perroNombre: string;
  clienteNombre: string;
  paseadorId?: string;
  compensacion: number;
  motivo: string;
  horasAnticipacion?: number;
  canceladoEn: string;
  leido?: boolean;
}

export interface SolicitudDiaItem {
  id: string;
  solicitudId: string;
  diaNombre: string;       // Ej: 'Lunes', 'Miércoles'
  diaCorto: string;        // Ej: 'Lun', 'Mié'
  fechaStr: string;        // Ej: '2026-09-21'
  fechaCorta: string;      // Ej: '21/09'
  horario: string;         // Ej: '17:00 hs'
  montoNeto: number;       // Ej: 2400 (o 2900 con correa)
  montoTotalCliente: number;// Ej: 3000 (o 4000)
  estado: 'disponible' | 'asignado' | 'en_camino' | 'en_curso' | 'completado' | 'cancelado';
  canceladoPor?: 'cliente' | 'paseador';
  fechaCancelacion?: string;
  penalidadAplicada?: number; // 2000 si <= 48hs
  compensacionPaseador?: number; // 2000 si <= 48hs
  motivoCancelacion?: string;
  paseadorId?: string;
  paseador_id?: string;
  paseadorNombre?: string;
  paseadorFoto?: string;
  paseadorTelefono?: string;
  semanaNumero?: number;
  tipoCorrea?: TipoCorrea;
  isCorreaWalkie?: boolean;
}

export interface SolicitudPaseo {
  id: string;
  tipoPlan: PlanType;
  montoTotal: number;
  montoNetoPaseador: number;
  duracionMinutos: number;
  incluyeGps: boolean;
  incluyeFotos: boolean;
  semanasCantidad: number;
  descuentoPorcentaje: number;
  semanas: WeekBooking[];
  diasSeleccionados: string[];
  diasDesglose?: SolicitudDiaItem[];
  notificacionesCancelacion?: SolicitudCancelacionNotif[];
  tipoCorrea?: TipoCorrea;
  recargoTiempoExtra?: number;
  recargoCorrea?: number;
  precioBaseServicio?: number;
  paseadorId?: string;
  paseador_id?: string;
  paseadorNombre?: string;
  paseadorFoto?: string;
  paseadorTelefono?: string;
  postulaciones?: PostulacionPaseador[];
  postulantePendiente?: PostulacionPaseador | null;
  modoSeleccion: 'automatico' | 'manual';
  perro: DogProfile;
  estado: 'pendiente' | 'aceptada' | 'en_camino' | 'en_curso' | 'completada' | 'rechazada' | 'cancelada' | 'sin_solicitud' | 'en_emergencia';
  fechaCreacion: string;
  fechaProgramada?: string;
  fechasProgramadas?: string[];
  horarioPaseo?: string;
  urgencia?: 'estandar' | 'moderada' | 'alta';
  turno?: 'mañana' | 'tarde';
  clienteId: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteFoto?: string;
  cuentaActiva?: boolean;
  ubicacion: {
    lat: number;
    lng: number;
    direccion: string;
  };
  
  // Códigos de Seguridad de 4 Dígitos:
  codigoInicio: string; // Código 1: Dictado por cliente al iniciar paseo
  codigoFin: string;    // Código 2: Dictado por cliente al finalizar paseo para liberar pago
  pinSeguridad?: string;

  // Etapas Explícitas del Paseo (Etapas 1 a 7):
  etapaPaseo?: EtapaPaseo;

  // Etapas del Seguimiento en Vivo (Estilo Uber):
  etapaSeguimiento?: 'esperando' | 'yendo_a_retirar' | 'en_domicilio' | 'paseo_activo' | 'en_domicilio_retorno' | 'finalizado' | 'en_emergencia';
  paseadorCoords?: { lat: number; lng: number };
  distanciaKmPaseador?: number;
  tiempoEstimadoMinutos?: number;

  // Sistema de Seguridad y Verificación de Retiro / Entrega:
  avisoLlegadaRetiro?: boolean;
  confirmacionRetiroCliente?: 'pendiente' | 'confirmado_si' | 'rechazado_no';
  inicioEsperaRetiroTimestamp?: number;
  avisoLlegadaRetorno?: boolean;
  confirmacionRetornoCliente?: 'pendiente' | 'confirmado_si' | 'rechazado_no';
  inicioEsperaRetornoTimestamp?: number; // Marca de tiempo cuando el cliente presiona 'No' (cuenta regresiva 10 min)

  // Protocolo de Emergencia / Imprevisto:
  enEmergencia?: boolean;
  motivoEmergencia?: string;
  datosEmergencia?: {
    fecha: string;
    veterinariaNombre: string;
    veterinariaDireccion: string;
    veterinariaTelefono: string;
    duenoTelefono: string;
    distanciaKm: number;
    lat: number;
    lng: number;
    notificadoDueno: boolean;
  };

  // Temporizador de 45 Minutos:
  tiempoRestanteSegundos?: number; // 2700 seg (45 min)
  temporizadorIniciado?: boolean;
  temporizadorFinalizado?: boolean;

  // Trazo de Recorrido Strava / Dibujo de Ruta (Coordenadas Polilínea Negra):
  recorridoGps?: Array<{ lat: number; lng: number }>;
  distanciaRutaKm?: number; // Distancia calculada dibujada por el cliente (hasta 5.0 km)
  recargoRecorridoExtenso?: number; // Recargo aplicado si distancia > 2.5 km
  precioBasePaseo?: number;
  precioTotalConRecargos?: number;

  fotosRecorrido?: string[];
  horaInicio?: string;
  horaFin?: string;
}

export interface ReviewItem {
  id: string;
  paseadorId?: string;
  clienteNombre: string;
  clienteFoto?: string;
  perroNombre: string;
  perroRaza: string;
  calificacion: number;
  fecha: string;
  comentario: string;
  paseoPlan: PlanType;
}

export interface UserCliente {
  id: string;
  role?: 'cliente';
  email: string;
  nombre: string;
  apellido: string;
  fechaNacimiento?: string;
  nombreUsuario: string;
  telefono: string;
  fotoPerfil?: string;
  direccionPredeterminada?: string;
  terminosAceptados: boolean;
  cuentaActiva?: boolean;
  perros: DogProfile[];
  fechaRegistro?: string;
}

export interface UserPaseador {
  id: string;
  role?: 'paseador';
  email: string;
  fotoPerfil: string;
  nombreUsuario: string;
  nombre: string;
  apellido: string;
  fechaNacimiento?: string;
  telefono: string;
  zonaOperacion?: string;
  experienciaAnios?: string;
  disponibilidadHoraria?: string;
  calificacionPromedio?: number;
  experienciaAnimales?: string;
  documentos?: {
    dniFrente: string;
    dniDorso: string;
    antecedentesPenales: string;
    curriculum: string;
  };
  terminosAceptados: boolean;
  esMayor18?: boolean;
  aprobado?: boolean;
  calificacion?: number;
  totalPaseos: number;
  lat?: number;
  lng?: number;
  disponible?: boolean;
  fechaRegistro?: string;
}

export interface PaseadorPublico {
  id: string;
  email?: string;
  nombre: string;
  apellido: string;
  nombreUsuario: string;
  telefono: string;
  fotoPerfil: string;
  calificacion: number;
  totalPaseos: number;
  biografia: string;
  lat: number;
  lng: number;
  disponible: boolean;
  distanciaKm?: number;
  gpsActivo?: boolean;
  rol?: 'PASEADOR';
  role?: 'paseador' | 'PASEADOR' | 'walker' | 'WALKER';
  ultimaActualizacion?: string;
}

export interface UserClientePublico {
  id: string;
  role?: 'cliente' | 'CLIENTE' | 'owner' | 'OWNER';
  rol?: 'CLIENTE';
  email?: string;
  nombre: string;
  apellido?: string;
  nombreUsuario: string;
  telefono: string;
  fotoPerfil?: string;
  direccion?: string;
  lat: number;
  lng: number;
  perros?: DogProfile[] | Array<{ id: string; name: string; breed?: string; photoUrl?: string }>;
  distanciaKm?: number;
  ultimaActualizacion?: string;
}

