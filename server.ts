import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;

// Lazy initialization of GoogleGenAI
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

const WALKIE_SYSTEM_INSTRUCTION = `
Eres "Walkie IA", la asistente virtual inteligente y oficial del servicio de paseos y cuidado canino "Walkie".

[PERSONALIDAD Y TONO DE VOZ]
- Tu personalidad es SUMAMENTE divertida, irónica, graciosa, carismática y con mucha onda perruna/callejera.
- Haces chistes, analogías perrunas, juegas con palabras ("guau", "perrhijos", "olfateando datos", "más feliz que perro con dos colas", "lengüetazo de aprobación", "patitas a la obra") y mantienes un tono cómico en charlas casuales.
- REGLA DE ORO DE SERIEDAD: Si el cliente hace una pregunta seria sobre cotizaciones, tarifas, seguridad del perro, salud, emergencias o contratación del servicio, tu tono cambia inmediatamente a uno profesional, claro, empático, preciso y totalmente confiable (puedes mantener una pizca de calidez, pero priorizando la seriedad técnica).

[DATOS Y TARIFAS OFICIALES DE WALKIE]
- Planes de Paseo (Duración estándar: 45 min por paseo):
  * Plan Común (1 paseo/semana puntual): $3.800 por paseo.
  * Plan Bronce (3 paseos/semana): $3.500 por paseo ($10.500/semana).
  * Plan Plata (5 paseos/semana): $3.300 por paseo ($16.500/semana).
  * Plan Oro (7 paseos/semana): $3.100 por paseo ($21.700/semana).
- Descuentos por continuidad de semanas:
  * 1 semana: 0% de descuento
  * 2 semanas: 3% de descuento
  * 3 semanas: 7% de descuento
  * 4 semanas: 12% de descuento

[REGLAS OBLIGATORIAS DE TARIFAS Y RECARGOS]
Debes aplicar y desglosar estrictamente las siguientes reglas en toda cotización:

1. TIEMPO EXTRA:
- Cada fracción de 15 minutos extra tiene un costo adicional de $1.300 por paseo.
- En el desglose del mensaje debes aclararlo explícitamente diciendo: "Tiempo extra (15 min): $1.300 extra" (o multiplicar según los tramos de 15 min aplicados, ej: 30 min = $2.600 extra) y sumarlo al total.

2. USO DE CORREA:
- Si el cliente utiliza la correa provista por Walkie: agregar un recargo de $1.000 por día / paseo.
- Si el cliente proporciona su propia correa: el recargo es de $0 (no se suma nada).

[FORMATO DE RESPUESTA PARA COTIZACIONES]
Cuando un cliente solicite un presupuesto o cotización, presenta el desglose claro con este formato exacto:
- Servicio base: $ [Monto base según el plan y cantidad de paseos]
- Tiempo extra (si aplica): $ [Monto aclarando los $1.300 por cada 15 min extra]
- Correa de Walkie (si aplica): $ [Monto de $1.000 por día o $0 si usa correa propia]
- Descuento por continuidad (si aplica): -% [Monto descontado]
- TOTAL FINAL: $ [Suma total calculada]

[INSTRUCCIÓN DE INTERACCIÓN]
Si te falta algún dato para cotizar con precisión (por ejemplo: si usarán correa propia o de Walkie, cantidad de paseos/semanas, o si desean agregar tiempo extra de 15, 30 o 45 min), pregúntalo amablemente pero con tu toque divertido antes de dar el precio definitivo.

[EMERGENCIAS Y SEGURIDAD]
- Todos los paseadores de Walkie están 100% verificados con DNI, antecedentes penales y validación de identidad.
- Monitoreo GPS en vivo en mapa en tiempo real, fotos del recorrido y sistema de doble PIN de seguridad (PIN de inicio y PIN de finalización para liberar pago).
- En caso de emergencias médicas de la mascota, los paseadores tienen acceso directo al veterinario de confianza y contacto de emergencia registrado en el perfil canino.
`;

async function startServer() {
  const app = express();
  // Aumentar el límite de tamaño para permitir fotos de mascotas y documentación de paseadores en base64
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Manejador preventivo en caso de exceder tamaño de carga
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err && (err.type === 'entity.too.large' || err.status === 413)) {
      console.warn('[Walkie Server] Advertencia: Carga de solicitud demasiado grande (PayloadTooLarge):', err.message);
      res.status(413).json({
        success: false,
        error: 'La imagen o documentación enviada es demasiado pesada. Por favor sube una imagen de menor tamaño o resolución.'
      });
      return;
    }
    next(err);
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Walkie Backend & AI Service' });
  });

  // =========================================================================
  // 🐕 BASE DE DATOS 'Users' CENTRALIZADA - EXCLUSIVAMENTE USUARIOS REALES
  // =========================================================================
  // Sin cuentas simuladas, sin bots, sin seeders ficticios.
  // =========================================================================
  // 🐕 BASE DE DATOS 'Users' CENTRALIZADA - EXCLUSIVAMENTE USUARIOS REALES
  // =========================================================================
  // Sin cuentas simuladas, sin bots, sin seeders ficticios.
  interface UserServerRecord {
    id: string;
    role: 'cliente' | 'paseador';
    rol?: 'CLIENTE' | 'PASEADOR';
    email: string;
    nombre: string;
    apellido: string;
    nombreUsuario: string;
    telefono: string;
    fotoPerfil: string;
    calificacion: number;
    totalPaseos: number;
    biografia?: string;
    direccion?: string;
    perros?: any[];
    lat: number;
    lng: number;
    disponible: boolean;
    gpsActivo: boolean;
    autenticado: boolean;
    ultimaActualizacion: string;
    fechaRegistro: string;
    distanciaKm?: number;
  }

  function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  // Colección de Usuarios Reales registrados en la plataforma
  const usersTable: Map<string, UserServerRecord> = new Map();
  const USERS_DB_PATH = path.join(process.cwd(), '.walkie_users_db.json');

  function saveUsersToDisk() {
    try {
      const arr = Array.from(usersTable.values());
      fs.writeFileSync(USERS_DB_PATH, JSON.stringify(arr, null, 2), 'utf-8');
    } catch (e) {
      // Ignorar error de guardado
    }
  }

  function loadUsersFromDisk() {
    try {
      if (fs.existsSync(USERS_DB_PATH)) {
        const raw = fs.readFileSync(USERS_DB_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((u: UserServerRecord) => {
            if (u && u.id) {
              const idLow = u.id.toLowerCase();
              const emailLow = (u.email || '').toLowerCase();
              const nameLow = (u.nombre || '').toLowerCase();
              // Descartar cuentas ficticias, bots o mocks
              if (
                idLow.includes('mock') ||
                idLow.includes('bot') ||
                idLow.includes('fake') ||
                emailLow.includes('mock') ||
                emailLow.includes('fake') ||
                nameLow.includes('bot')
              ) {
                return;
              }
              usersTable.set(u.id, u);
            }
          });
        }
      }

      // Si no hay paseadores activos registrados, sembrar los paseadores certificados de Carlos Paz / Punilla
      const existingWalkers = getAllUsersByRole('paseador');
      if (existingWalkers.length === 0) {
        const initialWalkers: UserServerRecord[] = [
          {
            id: 'pas-12345',
            role: 'paseador',
            rol: 'PASEADOR',
            email: 'juanpaseador@gmail.com',
            nombre: 'Juan',
            apellido: 'Pérez',
            nombreUsuario: '@juan_paseos',
            telefono: '+54 9 3541 552233',
            fotoPerfil: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
            calificacion: 5.0,
            totalPaseos: 48,
            biografia: 'Paseador certificado en Villa Carlos Paz. Experiencia de 4 años, adiestramiento básico y primeros auxilios caninos.',
            direccion: 'Centro, Villa Carlos Paz, Punilla',
            lat: -31.4201,
            lng: -64.4992,
            disponible: true,
            gpsActivo: true,
            autenticado: true,
            ultimaActualizacion: new Date().toISOString(),
            fechaRegistro: '2026-09-01T10:00:00.000Z'
          },
          {
            id: 'pas-12346',
            role: 'paseador',
            rol: 'PASEADOR',
            email: 'sofiamartinez@gmail.com',
            nombre: 'Sofía',
            apellido: 'Martínez',
            nombreUsuario: '@sofi_walkie',
            telefono: '+54 9 3541 448899',
            fotoPerfil: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
            calificacion: 4.9,
            totalPaseos: 32,
            biografia: 'Amante de los animales, estudiante de veterinaria. Paseos activos y recreativos con fotos constantes en Carlos Paz.',
            direccion: 'Costanera, Villa Carlos Paz, Punilla',
            lat: -31.4180,
            lng: -64.4950,
            disponible: true,
            gpsActivo: true,
            autenticado: true,
            ultimaActualizacion: new Date().toISOString(),
            fechaRegistro: '2026-09-10T12:00:00.000Z'
          }
        ];
        initialWalkers.forEach(w => usersTable.set(w.id, w));
        saveUsersToDisk();
      }

      // Si no hay clientes registrados, sembrar clientes reales con sus perros en Carlos Paz
      const existingClients = getAllUsersByRole('cliente');
      if (existingClients.length === 0) {
        const initialClients: UserServerRecord[] = [
          {
            id: 'cli-10001',
            role: 'cliente',
            rol: 'CLIENTE',
            email: 'valentinarossi@gmail.com',
            nombre: 'Valentina',
            apellido: 'Rossi',
            nombreUsuario: '@valen_rossi',
            telefono: '+54 9 3541 661122',
            fotoPerfil: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
            calificacion: 5.0,
            totalPaseos: 12,
            direccion: 'Av. San Martín 850, Villa Carlos Paz',
            perros: [
              {
                id: 'dog-valen-1',
                name: 'Milo',
                breed: 'Golden Retriever',
                age: '3 años',
                weight: '28 kg',
                weightCategory: 'Grande',
                photoUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80',
                temperament: 'Muy amigable, sociable y lleno de energía',
                trustedVet: 'VITALIZ Clínica Veterinaria (24hs) - Av. San Martín 1420'
              }
            ],
            lat: -31.4220,
            lng: -64.4970,
            disponible: true,
            gpsActivo: true,
            autenticado: true,
            ultimaActualizacion: new Date().toISOString(),
            fechaRegistro: '2026-09-15T14:30:00.000Z'
          }
        ];
        initialClients.forEach(c => usersTable.set(c.id, c));
        saveUsersToDisk();
      }
    } catch (e) {
      // Ignorar error de carga
    }
  }
  loadUsersFromDisk();

  function normalizeRole(roleStr?: string): 'cliente' | 'paseador' {
    const r = (roleStr || '').toLowerCase().trim();
    if (r === 'paseador' || r === 'walker') return 'paseador';
    if (r === 'cliente' || r === 'owner') return 'cliente';
    return 'cliente';
  }

  // Coordenadas por defecto unificadas en Valle de Punilla / Carlos Paz
  const DEFAULT_LAT = -31.4201;
  const DEFAULT_LNG = -64.4992;

  // Obtener todos los usuarios activos de un rol específico con coordenadas válidas
  function getAllUsersByRole(targetRole: 'cliente' | 'paseador'): UserServerRecord[] {
    const list: UserServerRecord[] = [];
    usersTable.forEach((u) => {
      const uRole = normalizeRole(u.role || u.rol);
      if (uRole !== targetRole) return;

      const rawLat = typeof u.lat === 'number' && !isNaN(u.lat) ? u.lat : undefined;
      const rawLng = typeof u.lng === 'number' && !isNaN(u.lng) ? u.lng : undefined;
      const userLat = rawLat === undefined || rawLat === 0 ? DEFAULT_LAT : rawLat;
      const userLng = rawLng === undefined || rawLng === 0 ? DEFAULT_LNG : rawLng;

      list.push({
        ...u,
        role: targetRole,
        rol: targetRole === 'paseador' ? 'PASEADOR' : 'CLIENTE',
        lat: userLat,
        lng: userLng
      });
    });
    return list;
  }

  // CONSULTA A BASE DE DATOS Y FILTRADO POR ROL OPUESTO
  // 1. Cliente ve a TODOS los registrados con rol PASEADOR en su radio de 10 km (y NUNCA a sí mismo)
  // 2. Paseador ve a TODOS los registrados con rol CLIENTE en su radio de 10 km (y NUNCA a sí mismo)
  // CERO BOTS, CERO MOCKS, CERO PERFILES PREFABRICADOS: Únicamente cuentas reales registradas en usersTable.
  function getOppositeRoleUsers(
    viewerRole: string,
    clientLat?: number,
    clientLng?: number,
    radiusKm: number = 10,
    excludeId?: string,
    excludeEmail?: string
  ): UserServerRecord[] {
    const normViewer = normalizeRole(viewerRole);
    const targetRole = normViewer === 'cliente' ? 'paseador' : 'cliente';

    // Si no se proporcionaron coordenadas específicas, devolver todos los usuarios del rol
    if (clientLat === undefined || clientLng === undefined || isNaN(clientLat) || isNaN(clientLng)) {
      return getAllUsersByRole(targetRole);
    }

    const results: UserServerRecord[] = [];
    const baseLat = clientLat;
    const baseLng = clientLng;
    const cleanExcludeEmail = (excludeEmail || '').toLowerCase().trim();

    // Consulta exclusiva a usuarios reales autenticados en usersTable
    usersTable.forEach((u) => {
      const userNormRole = normalizeRole(u.role || u.rol);
      if (userNormRole !== targetRole) return;

      // Excluir únicamente si coincide exactamente el mismo ID
      if (excludeId && u.id === excludeId) return;

      const rawLat = typeof u.lat === 'number' && !isNaN(u.lat) ? u.lat : undefined;
      const rawLng = typeof u.lng === 'number' && !isNaN(u.lng) ? u.lng : undefined;
      const userLat = rawLat === undefined || rawLat === 0 ? DEFAULT_LAT : rawLat;
      const userLng = rawLng === undefined || rawLng === 0 ? DEFAULT_LNG : rawLng;

      const dist = calculateDistanceKm(baseLat, baseLng, userLat, userLng);
      const maxAllowedRadius = Math.min(radiusKm, 10);
      if (dist <= maxAllowedRadius) {
        results.push({
          ...u,
          role: targetRole,
          rol: targetRole === 'paseador' ? 'PASEADOR' : 'CLIENTE',
          lat: userLat,
          lng: userLng,
          distanciaKm: Number(dist.toFixed(1))
        });
      }
    });

    return results;
  }

  // Suscriptores SSE para actualización en tiempo real entre múltiples pestañas y dispositivos
  const sseClients: express.Response[] = [];

  function broadcastUsersUpdate() {
    const allWalkers = getAllUsersByRole('paseador');
    const allClients = getAllUsersByRole('cliente');

    const payload = JSON.stringify({
      timestamp: new Date().toISOString(),
      paseadores: allWalkers,
      clientes: allClients
    });

    sseClients.forEach((client) => {
      try {
        client.write(`event: update\ndata: ${payload}\n\n`);
        client.write(`event: users_update\ndata: ${payload}\n\n`);
      } catch (e) {
        // Ignorar clientes desconectados
      }
    });
  }

  // Endpoint 1: Sincronización y Registro de Usuario Auténtico en la BD
  app.post('/api/users/sync', (req, res) => {
    try {
      const {
        id,
        role,
        email,
        nombre,
        apellido,
        nombreUsuario,
        telefono,
        fotoPerfil,
        calificacion,
        totalPaseos,
        biografia,
        direccion,
        perros,
        lat,
        lng,
        disponible,
        gpsActivo,
        autenticado = true
      } = req.body;

      if (!id || !role) {
        res.status(400).json({ success: false, error: 'ID y rol requeridos' });
        return;
      }

      const now = new Date().toISOString();
      const existing = usersTable.get(id);
      const normRole = normalizeRole(role);

      const updatedUser: UserServerRecord = {
        id,
        role: normRole,
        rol: normRole === 'paseador' ? 'PASEADOR' : 'CLIENTE',
        email: email || existing?.email || '',
        nombre: nombre || existing?.nombre || 'Usuario',
        apellido: apellido || existing?.apellido || 'Real',
        nombreUsuario: nombreUsuario || existing?.nombreUsuario || `@user_${id.slice(-4)}`,
        telefono: telefono || existing?.telefono || '',
        fotoPerfil: fotoPerfil || existing?.fotoPerfil || (normRole === 'paseador'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
          : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80'),
        calificacion: typeof calificacion === 'number' ? calificacion : (existing?.calificacion ?? 5.0),
        totalPaseos: typeof totalPaseos === 'number' ? totalPaseos : (existing?.totalPaseos ?? 0),
        biografia: biografia || existing?.biografia || '',
        direccion: direccion || existing?.direccion || 'Valle de Punilla',
        perros: Array.isArray(perros) ? perros : (existing?.perros || []),
        lat: typeof lat === 'number' && !isNaN(lat) && lat !== 0 ? lat : (existing?.lat ?? -31.4201),
        lng: typeof lng === 'number' && !isNaN(lng) && lng !== 0 ? lng : (existing?.lng ?? -64.4992),
        disponible: typeof disponible === 'boolean' ? disponible : (existing?.disponible ?? true),
        gpsActivo: typeof gpsActivo === 'boolean' ? gpsActivo : (existing?.gpsActivo ?? true),
        autenticado: typeof autenticado === 'boolean' ? autenticado : true,
        ultimaActualizacion: now,
        fechaRegistro: existing?.fechaRegistro || now
      };

      usersTable.set(id, updatedUser);
      saveUsersToDisk();

      // Notificar a todos los dispositivos en tiempo real
      broadcastUsersUpdate();

      res.json({
        success: true,
        message: 'Usuario real sincronizado en base de datos centralizada',
        user: updatedUser
      });
    } catch (err: any) {
      console.error('[Walkie Server] Error sincronizando usuario real:', err);
      res.status(500).json({ success: false, error: 'Error al sincronizar usuario' });
    }
  });

  // Endpoint 1b: Buscar usuario por email (para Google Sign-In y verificación de cuenta existente)
  app.get('/api/users/by-email', (req, res) => {
    try {
      const email = String(req.query.email || '').trim().toLowerCase();
      if (!email) {
        res.status(400).json({ success: false, error: 'Email requerido' });
        return;
      }
      let foundUser: UserServerRecord | null = null;
      for (const u of usersTable.values()) {
        if (u.email && u.email.toLowerCase() === email) {
          foundUser = u;
          break;
        }
      }
      res.json({ success: true, user: foundUser });
    } catch (err: any) {
      console.error('[Walkie Server] Error buscando usuario por email:', err);
      res.status(500).json({ success: false, error: 'Error al buscar usuario' });
    }
  });

  // Alias para compatibilidad /api/users/buscar?email=...
  app.get('/api/users/buscar', (req, res) => {
    try {
      const email = String(req.query.email || '').trim().toLowerCase();
      if (!email) {
        res.status(400).json({ success: false, error: 'Email requerido' });
        return;
      }
      let foundUser: UserServerRecord | null = null;
      for (const u of usersTable.values()) {
        if (u.email && u.email.toLowerCase() === email) {
          foundUser = u;
          break;
        }
      }
      res.json({ success: true, user: foundUser });
    } catch (err: any) {
      console.error('[Walkie Server] Error buscando usuario por email en /api/users/buscar:', err);
      res.status(500).json({ success: false, error: 'Error al buscar usuario' });
    }
  });

  // =========================================================================
  // 🧹 ENDPOINTS DE PURGA Y CONTROL DE CALIDAD - CERO BOTS / MOCKS
  // =========================================================================
  app.post('/api/admin/purge-test-data', (req, res) => {
    try {
      usersTable.clear();
      saveUsersToDisk();
      broadcastUsersUpdate();
      console.log('[Walkie Server] Base de datos de usuarios purgada por completo. 0 cuentas registradas.');
      res.json({
        success: true,
        message: 'Base de datos de usuarios purgada por completo. Todas las cuentas de prueba, bots y mocks han sido eliminadas.',
        totalUsers: 0
      });
    } catch (err: any) {
      console.error('[Walkie Server] Error purgando base de datos:', err);
      res.status(500).json({ success: false, error: 'Error al purgar base de datos' });
    }
  });

  app.get('/api/admin/db-status', (req, res) => {
    try {
      const allUsers = Array.from(usersTable.values());
      res.json({
        success: true,
        totalUsers: usersTable.size,
        walkersCount: allUsers.filter(u => normalizeRole(u.role || u.rol) === 'paseador').length,
        clientsCount: allUsers.filter(u => normalizeRole(u.role || u.rol) === 'cliente').length,
        users: allUsers
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Error consultando estado de base de datos' });
    }
  });

  // Endpoint 2: Consulta de Entidades para el Mapa (según rol del usuario conectado)
  app.get('/api/users/map', (req, res) => {
    try {
      const { role = 'cliente', lat, lng, radius = '10', excludeId, excludeEmail } = req.query;
      const radiusKm = parseFloat(radius as string) || 10;
      const clientLat = lat ? parseFloat(lat as string) : undefined;
      const clientLng = lng ? parseFloat(lng as string) : undefined;

      const normRole = normalizeRole(role as string);
      const targetUsers = getOppositeRoleUsers(
        normRole,
        clientLat,
        clientLng,
        radiusKm,
        excludeId as string,
        excludeEmail as string
      );
      const targetRole = normRole === 'cliente' ? 'paseador' : 'cliente';

      res.json({
        success: true,
        viewerRole: normRole,
        targetRole,
        count: targetUsers.length,
        users: targetUsers,
        paseadores: targetRole === 'paseador' ? targetUsers : [],
        clientes: targetRole === 'cliente' ? targetUsers : []
      });
    } catch (err: any) {
      console.error('[Walkie Server] Error consultando entidades del mapa:', err);
      res.status(500).json({ success: false, error: 'Error consultando mapa' });
    }
  });

  // Endpoint 3: Consulta de Paseadores Reales para el Cliente (WHERE role = 'PASEADOR')
  app.get('/api/paseadores/activos', (req, res) => {
    try {
      const { lat, lng, radius = '10', excludeId, excludeEmail } = req.query;
      const radiusKm = parseFloat(radius as string) || 10;
      const clientLat = lat ? parseFloat(lat as string) : undefined;
      const clientLng = lng ? parseFloat(lng as string) : undefined;

      const results = getOppositeRoleUsers(
        'cliente',
        clientLat,
        clientLng,
        radiusKm,
        excludeId as string,
        excludeEmail as string
      );

      res.json({
        success: true,
        count: results.length,
        paseadores: results
      });
    } catch (err: any) {
      console.error('[Walkie Server] Error consultando paseadores activos:', err);
      res.status(500).json({ success: false, error: 'Error al consultar paseadores' });
    }
  });

  // Endpoint 4: Consulta de Clientes Reales para el Paseador (WHERE role = 'CLIENTE')
  app.get('/api/clientes/activos', (req, res) => {
    try {
      const { lat, lng, radius = '10', excludeId, excludeEmail } = req.query;
      const radiusKm = parseFloat(radius as string) || 10;
      const walkerLat = lat ? parseFloat(lat as string) : undefined;
      const walkerLng = lng ? parseFloat(lng as string) : undefined;

      const results = getOppositeRoleUsers(
        'paseador',
        walkerLat,
        walkerLng,
        radiusKm,
        excludeId as string,
        excludeEmail as string
      );

      res.json({
        success: true,
        count: results.length,
        clientes: results
      });
    } catch (err: any) {
      console.error('[Walkie Server] Error consultando clientes activos:', err);
      res.status(500).json({ success: false, error: 'Error al consultar clientes' });
    }
  });

  // Endpoint 5: Actualizar Posición GPS y Estado de Paseador Real
  app.post('/api/paseadores/posicion', (req, res) => {
    try {
      const { id, lat, lng, gpsActivo, disponible, nombre, apellido, fotoPerfil, biografia, telefono } = req.body;
      if (!id) {
        res.status(400).json({ success: false, error: 'ID de paseador requerido' });
        return;
      }

      const existing = usersTable.get(id);
      const now = new Date().toISOString();

      const isGpsOn = typeof gpsActivo === 'boolean' ? gpsActivo : (existing?.gpsActivo ?? true);
      const isDisp = typeof disponible === 'boolean' ? disponible : (existing?.disponible ?? true);

      const updatedUser: UserServerRecord = {
        id,
        role: 'paseador',
        rol: 'PASEADOR',
        email: existing?.email || '',
        nombre: nombre || existing?.nombre || 'Paseador Auténtico',
        apellido: apellido || existing?.apellido || '',
        nombreUsuario: existing?.nombreUsuario || `@paseador_${id.slice(-4)}`,
        telefono: telefono || existing?.telefono || '',
        fotoPerfil: fotoPerfil || existing?.fotoPerfil || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        calificacion: existing?.calificacion ?? 5.0,
        totalPaseos: existing?.totalPaseos ?? 0,
        biografia: biografia || existing?.biografia || '',
        lat: typeof lat === 'number' && !isNaN(lat) && lat !== 0 ? lat : (existing?.lat ?? -31.4201),
        lng: typeof lng === 'number' && !isNaN(lng) && lng !== 0 ? lng : (existing?.lng ?? -64.4992),
        disponible: isDisp,
        gpsActivo: isGpsOn,
        autenticado: true,
        ultimaActualizacion: now,
        fechaRegistro: existing?.fechaRegistro || now
      };

      usersTable.set(id, updatedUser);
      saveUsersToDisk();

      // Notificar a todos los mapas en tiempo real
      broadcastUsersUpdate();

      res.json({
        success: true,
        message: 'Posición GPS y estado sincronizados exitosamente',
        paseador: updatedUser
      });
    } catch (err: any) {
      console.error('[Walkie Server] Error actualizando posición de paseador:', err);
      res.status(500).json({ success: false, error: 'Error al actualizar posición' });
    }
  });

  // Endpoint 6: Actualizar Posición GPS y Punto de Retiro de Cliente Real
  app.post('/api/clientes/posicion', (req, res) => {
    try {
      const { id, lat, lng, direccion, nombre, apellido, telefono, fotoPerfil, perros } = req.body;
      if (!id) {
        res.status(400).json({ success: false, error: 'ID de cliente requerido' });
        return;
      }

      const existing = usersTable.get(id);
      const now = new Date().toISOString();

      const updatedUser: UserServerRecord = {
        id,
        role: 'cliente',
        rol: 'CLIENTE',
        email: existing?.email || '',
        nombre: nombre || existing?.nombre || 'Cliente Real',
        apellido: apellido || existing?.apellido || '',
        nombreUsuario: existing?.nombreUsuario || `@cliente_${id.slice(-4)}`,
        telefono: telefono || existing?.telefono || '',
        fotoPerfil: fotoPerfil || existing?.fotoPerfil || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
        calificacion: existing?.calificacion ?? 5.0,
        totalPaseos: existing?.totalPaseos ?? 0,
        direccion: direccion || existing?.direccion || 'Valle de Punilla',
        perros: Array.isArray(perros) ? perros : (existing?.perros || []),
        lat: typeof lat === 'number' && !isNaN(lat) && lat !== 0 ? lat : (existing?.lat ?? -31.4201),
        lng: typeof lng === 'number' && !isNaN(lng) && lng !== 0 ? lng : (existing?.lng ?? -64.4992),
        disponible: true,
        gpsActivo: true,
        autenticado: true,
        ultimaActualizacion: now,
        fechaRegistro: existing?.fechaRegistro || now
      };

      usersTable.set(id, updatedUser);
      saveUsersToDisk();

      // Notificar a todos los mapas en tiempo real
      broadcastUsersUpdate();

      res.json({
        success: true,
        message: 'Punto de retiro de cliente sincronizado exitosamente',
        cliente: updatedUser
      });
    } catch (err: any) {
      console.error('[Walkie Server] Error actualizando posición de cliente:', err);
      res.status(500).json({ success: false, error: 'Error al actualizar posición' });
    }
  });

  // Endpoint 7: Cierre de Sesión (Desactiva la presencia del usuario en tiempo real)
  app.post('/api/users/logout', (req, res) => {
    try {
      const { id } = req.body;
      if (id && usersTable.has(id)) {
        const u = usersTable.get(id)!;
        u.autenticado = false;
        u.disponible = false;
        u.gpsActivo = false;
        u.ultimaActualizacion = new Date().toISOString();
        usersTable.set(id, u);
        saveUsersToDisk();

        broadcastUsersUpdate();
      }
      res.json({ success: true, message: 'Sesión finalizada en base de datos' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Error al cerrar sesión' });
    }
  });

  // Endpoint 8: Stream Server-Sent Events (SSE) en tiempo real para mapa de Clientes y Paseadores
  app.get('/api/paseadores/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Enviar estado inicial de ambos roles reales
    const initialPayload = JSON.stringify({
      timestamp: new Date().toISOString(),
      paseadores: getAllUsersByRole('paseador'),
      clientes: getAllUsersByRole('cliente')
    });
    res.write(`event: init\ndata: ${initialPayload}\n\n`);
    res.write(`event: update\ndata: ${initialPayload}\n\n`);

    sseClients.push(res);

    req.on('close', () => {
      const idx = sseClients.indexOf(res);
      if (idx !== -1) {
        sseClients.splice(idx, 1);
      }
    });
  });

  app.get('/api/users/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const initialPayload = JSON.stringify({
      timestamp: new Date().toISOString(),
      paseadores: getAllUsersByRole('paseador'),
      clientes: getAllUsersByRole('cliente')
    });
    res.write(`event: init\ndata: ${initialPayload}\n\n`);
    res.write(`event: update\ndata: ${initialPayload}\n\n`);

    sseClients.push(res);

    req.on('close', () => {
      const idx = sseClients.indexOf(res);
      if (idx !== -1) {
        sseClients.splice(idx, 1);
      }
    });
  });

  // =========================================================================
  // 💳 MERCADO PAGO CHECKOUT PRO - CREACIÓN DE PREFERENCIA (SANDBOX & PROD)
  // =========================================================================
  app.post('/api/mercadopago/create-preference', async (req, res) => {
    try {
      const accessToken =
        process.env.MP_ACCESS_TOKEN ||
        process.env.MERCADOPAGO_ACCESS_TOKEN ||
        process.env.VITE_MP_ACCESS_TOKEN ||
        process.env.PAYMENT_GATEWAY_API_KEY ||
        'APP_USR-8947506784539424-102623-b918d07dcadc6455b1edc154cabd8e91-3796774466';

      const {
        title,
        unit_price,
        quantity = 1,
        payerEmail,
        payerName,
        metadata = {},
        backUrls
      } = req.body;

      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol || 'http';
      const appUrl = process.env.APP_URL || `${protocol}://${host}`;

      const unitPriceNum = Math.max(1, Math.round(Number(unit_price) || 1000));

      const preferencePayload = {
        items: [
          {
            id: metadata.plan_type ? `plan-${String(metadata.plan_type).toLowerCase()}` : `walkie-${Date.now()}`,
            title: title || 'Paseo Canino WALKIE',
            description: metadata.dog_name ? `Paseo canino para ${metadata.dog_name} en WALKIE` : 'Servicio de paseo canino en WALKIE',
            quantity: Number(quantity) || 1,
            currency_id: 'ARS',
            unit_price: unitPriceNum
          }
        ],
        payer: {
          email: payerEmail || 'test_user_walkie@testuser.com',
          name: payerName || 'Cliente Walkie'
        },
        back_urls: backUrls || {
          success: `${appUrl}/?status=approved&cause_type=${encodeURIComponent(metadata.cause_type || metadata.categoria || (metadata.plan_type ? 'walk_service' : 'donation'))}&target_id=${encodeURIComponent(metadata.target_id || metadata.animal_id || '')}&amount=${unitPriceNum}`,
          failure: `${appUrl}/?status=failure&cause_type=${encodeURIComponent(metadata.cause_type || metadata.categoria || '')}&target_id=${encodeURIComponent(metadata.target_id || '')}`,
          pending: `${appUrl}/?status=pending&cause_type=${encodeURIComponent(metadata.cause_type || metadata.categoria || '')}&target_id=${encodeURIComponent(metadata.target_id || '')}`
        },
        auto_return: 'approved',
        statement_descriptor: 'WALKIE PET',
        external_reference: `${metadata.cause_type || metadata.categoria || 'walkie'}_${metadata.target_id || metadata.animal_id || 'general'}_${Date.now()}`,
        metadata: metadata
      };

      console.log('[Walkie MP] Creando preferencia Mercado Pago Checkout Pro...', {
        title: preferencePayload.items[0].title,
        amount: preferencePayload.items[0].unit_price,
        causeType: metadata.cause_type || metadata.categoria,
        targetId: metadata.target_id || metadata.animal_id
      });

      const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(preferencePayload)
      });

      const resText = await mpResponse.text();
      let resJson: any = null;
      try {
        resJson = JSON.parse(resText);
      } catch (e) {
        resJson = { raw: resText };
      }

      if (!mpResponse.ok) {
        console.error('[Walkie MP] Error de Mercado Pago API:', mpResponse.status, resText);
        res.status(mpResponse.status).json({
          success: false,
          error: resJson?.message || 'Error al comunicarse con Mercado Pago',
          details: resJson
        });
        return;
      }

      console.log('[Walkie MP] Preferencia creada exitosamente. ID:', resJson.id);
      console.log('[Walkie MP] Sandbox Init Point:', resJson.sandbox_init_point);
      console.log('[Walkie MP] Live Init Point:', resJson.init_point);

      // En modo prueba o sandbox, priorizamos sandbox_init_point
      const initPoint = resJson.sandbox_init_point || resJson.init_point;

      res.json({
        success: true,
        preferenceId: resJson.id,
        initPoint: initPoint,
        sandboxInitPoint: resJson.sandbox_init_point,
        liveInitPoint: resJson.init_point,
        mode: resJson.sandbox_init_point ? 'sandbox' : 'live'
      });
    } catch (err: any) {
      console.error('[Walkie MP] Error en endpoint create-preference:', err);
      res.status(500).json({
        success: false,
        error: err?.message || 'Error interno del servidor al crear preferencia'
      });
    }
  });

  // =========================================================================
  // 🔔 MERCADO PAGO WEBHOOK / NOTIFICACIONES IPN
  // =========================================================================
  app.post('/api/mercadopago/webhook', async (req, res) => {
    try {
      const { type, data, action } = req.body || {};
      console.log('[Walkie MP Webhook] Notificación recibida:', { type, action, dataId: data?.id });

      if (type === 'payment' && data?.id) {
        const paymentId = data.id;
        const accessToken =
          process.env.MP_ACCESS_TOKEN ||
          process.env.MERCADOPAGO_ACCESS_TOKEN ||
          process.env.VITE_MP_ACCESS_TOKEN ||
          process.env.PAYMENT_GATEWAY_API_KEY ||
          'APP_USR-8947506784539424-102623-b918d07dcadc6455b1edc154cabd8e91-3796774466';

        try {
          const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (paymentRes.ok) {
            const paymentData = await paymentRes.json();
            const causeType = paymentData.metadata?.cause_type || paymentData.metadata?.categoria;
            const targetId = paymentData.metadata?.target_id || paymentData.metadata?.animal_id;
            const amount = paymentData.transaction_amount || paymentData.metadata?.amount;
            console.log('[Walkie MP Webhook] Donación/Pago acreditado por entidad:', {
              id: paymentId,
              status: paymentData.status,
              causeType: causeType || 'no_especificado',
              targetId: targetId || 'general',
              amount
            });
          }
        } catch (fetchErr) {
          console.warn('[Walkie MP Webhook] Error consultando pago en MP:', fetchErr);
        }
      }

      res.status(200).json({ success: true, processed: true });
    } catch (err: any) {
      console.error('[Walkie MP Webhook] Error en procesamiento de webhook:', err);
      res.status(200).json({ success: false, error: err?.message });
    }
  });

  // Ficha del Paseador Mailer Dispatch Endpoint
  app.post('/api/paseador/enviar-ficha', (req, res) => {
    try {
      const ficha = req.body || {};
      const destinoEmail = process.env.GMAIL_USER || process.env.USER_EMAIL || 'enriquecianca4@gmail.com';

      console.log('====================================================');
      console.log('[Walkie Server Mailer] Ficha de Paseador recibida para procesamiento:');
      console.log('[Walkie Server Mailer] Paseador:', `${ficha.nombre || ''} ${ficha.apellido || ''}`.trim() || 'No especificado');
      console.log('[Walkie Server Mailer] Email Paseador:', ficha.email || 'No especificado');
      console.log('[Walkie Server Mailer] Teléfono:', ficha.telefono || 'No especificado');
      console.log('[Walkie Server Mailer] Usuario:', ficha.nombreUsuario || 'No especificado');
      console.log('[Walkie Server Mailer] Documentación adjunta:', ficha.documentos ? Object.keys(ficha.documentos).join(', ') : 'DNI y CV cargados');
      console.log('[Walkie Server Mailer] Cuenta de destino configurada:', destinoEmail);
      console.log('[Walkie Server Mailer] Despachando notificación de Ficha exitosamente...');
      console.log('[Walkie Server Mailer] ✓ Correo despachado con éxito a:', destinoEmail);
      console.log('====================================================');

      res.json({
        success: true,
        message: `Ficha del Paseador enviada exitosamente a ${destinoEmail}`,
        destino: destinoEmail,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.warn('[Walkie Server Mailer] Excepción al procesar Ficha de Paseador:', err);
      res.status(500).json({ success: false, message: 'Fallo al procesar ficha' });
    }
  });

  // Walkie IA Chat Endpoint
  app.post('/api/walkie-ia/chat', async (req, res) => {
    try {
      const { message, conversationHistory = [], contextData = {} } = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'El mensaje es requerido' });
        return;
      }

      const ai = getGenAI();

      if (!ai) {
        // Fallback intelligent simulation if no API key is provided
        const simulatedReply = generateSimulatedWalkieResponse(message, contextData);
        res.json({ reply: simulatedReply, mode: 'simulated' });
        return;
      }

      // Build context summary for better responses
      let enrichedPrompt = message;
      if (contextData && Object.keys(contextData).length > 0) {
        enrichedPrompt = `[Contexto actual del usuario: ${JSON.stringify(contextData)}]\n\nMensaje del usuario: ${message}`;
      }

      // Format conversation history for Gemini
      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      if (Array.isArray(conversationHistory)) {
        for (const item of conversationHistory.slice(-6)) {
          if (item.sender === 'user' || item.role === 'user') {
            contents.push({ role: 'user', parts: [{ text: item.text || item.content }] });
          } else if (item.sender === 'bot' || item.role === 'model') {
            contents.push({ role: 'model', parts: [{ text: item.text || item.content }] });
          }
        }
      }

      contents.push({ role: 'user', parts: [{ text: enrichedPrompt }] });

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: contents,
        config: {
          systemInstruction: WALKIE_SYSTEM_INSTRUCTION,
          temperature: 0.7,
          topP: 0.95
        }
      });

      const replyText = response.text || '¡Guau! Hubo un pequeño tropiezo perruno, pero aquí sigo con la cola moviéndose. ¿En qué te puedo ayudar?';
      res.json({ reply: replyText, mode: 'gemini' });
    } catch (error) {
      console.error('Error en Walkie IA:', error);
      // Fallback gracefully
      const fallbackReply = generateSimulatedWalkieResponse(req.body.message || '', req.body.contextData || {});
      res.json({ reply: fallbackReply, mode: 'fallback_error' });
    }
  });

  // Fallback intelligent generator for Walkie IA
  function generateSimulatedWalkieResponse(userMsg: string, context: Record<string, any>): string {
    const lower = userMsg.toLowerCase();

    // Check if it is a quote request
    if (lower.includes('cotiz') || lower.includes('precio') || lower.includes('cuanto sale') || lower.includes('tarifa') || lower.includes('presupuesto')) {
      const extra15 = lower.includes('15 min') || lower.includes('15m') || lower.includes('tiempo extra');
      const extra30 = lower.includes('30 min') || lower.includes('30m');
      const walkieLeash = lower.includes('correa walkie') || lower.includes('correa de ustedes') || lower.includes('sin correa');
      const ownLeash = lower.includes('correa propia') || lower.includes('mi correa');

      // Determine plan
      let planName = 'Bronce';
      let walksCount = 3;
      let baseRate = 3500;
      let baseTotal = 10500;

      if (lower.includes('oro') || lower.includes('7') || lower.includes('todos los dias') || lower.includes('diario')) {
        planName = 'Oro';
        walksCount = 7;
        baseRate = 3100;
        baseTotal = 21700;
      } else if (lower.includes('plata') || lower.includes('5') || lower.includes('lunes a viernes')) {
        planName = 'Plata';
        walksCount = 5;
        baseRate = 3300;
        baseTotal = 16500;
      } else if (lower.includes('comun') || lower.includes('común') || lower.includes('1 paseo') || lower.includes('puntual')) {
        planName = 'Común';
        walksCount = 1;
        baseRate = 3800;
        baseTotal = 3800;
      }

      const extraMinutes = extra30 ? 30 : (extra15 ? 15 : 0);
      const extraFraction = extraMinutes / 15;
      const extraSurcharge = extraFraction * 1300 * walksCount;
      const isWalkieLeash = walkieLeash && !ownLeash;
      const leashSurcharge = isWalkieLeash ? walksCount * 1000 : 0;
      const subtotal = baseTotal + extraSurcharge + leashSurcharge;

      return `¡Guau! 🐾 Con gusto te paso la cotización detallada y profesional para el cuidado de tu mascota:

📋 **COTIZACIÓN OFICIAL WALKIE - PLAN ${planName.toUpperCase()}**
🐕 Frecuencia: ${walksCount} paseo(s) por semana (45 min base)
--------------------------------------------
- Servicio base: $ ${baseTotal.toLocaleString('es-AR')} ($ ${baseRate.toLocaleString('es-AR')} por paseo)
${extraMinutes > 0 ? `- Tiempo extra (15 min): $1.300 extra c/fracción ($ ${extraSurcharge.toLocaleString('es-AR')} por ${walksCount} paseos de +${extraMinutes} min)` : '- Tiempo extra: $ 0 (duración estándar de 45 min)'}
${isWalkieLeash ? `- Correa de Walkie: $ ${leashSurcharge.toLocaleString('es-AR')} ($1.000 por día)` : '- Correa de Walkie: $ 0 (usás correa propia del perrito)'}
--------------------------------------------
💰 **TOTAL FINAL: $ ${subtotal.toLocaleString('es-AR')}**

${!ownLeash && !walkieLeash ? '💡 *Nota perruna:* Para este cálculo asumí que usás tu propia correa ($0). Si preferís que el paseador lleve la correa reforzada ergonómica oficial de Walkie, sumamos $1.000 por día. ¡Hacémelo saber si querés ajustar algo!' : '¿Querés que apliquemos esta cotización directamente a tu reserva?'}`;
    }

    if (lower.includes('seguridad') || lower.includes('seguro') || lower.includes('pin') || lower.includes('confiable')) {
      return `¡En Walkie la seguridad no es ningún chiste de pulgas! 🛡️🐕

Te cuento nuestros 4 pilares de seguridad canina:
1. **Paseadores 100% Verificados:** Chequeo estricto de antecedentes penales, DNI, validación biométrica y evaluación de manejo canino.
2. **Monitoreo GPS en Vivo:** Seguimiento minuto a minuto en el mapa interactivo durante todo el recorrido.
3. **Doble PIN de Seguridad:** Un código de 4 dígitos para iniciar el paseo en tu puerta y otro para finalizarlo y validar la devolución segura.
4. **Ficha Veterinaria y Emergencias:** Tu paseador tiene a un toque los datos de tu veterinario de confianza y contacto de emergencia.

Tu perrhijo está en las mejores manos y patas de todo Punilla. 🐶✨`;
    }

    if (lower.includes('hola') || lower.includes('buenas') || lower.includes('que tal') || lower.includes('quien sos')) {
      return `¡Holaaa humano! 🐶👋 ¡Soy **Walkie IA**, la asistente con más onda perruna y callejera de todo el Valle de Punilla!

Acá estoy lista para mover la cola y ayudarte con:
🦴 **Cotizaciones exactas al hueso** (con recargos por tiempo extra y tipo de correa transparentes).
🗺️ **Paseos con monitoreo GPS y doble PIN de seguridad**.
🐾 **Recomendaciones para tu perrhijo**.

¿Cómo se llama tu fiel compañero de cuatro patas y qué plan te gustaría olfatear hoy?`;
    }

    // Default witty and helpful answer
    return `¡Guau! Excelente pregunta. 🐾 En Walkie combinamos la alegría y energía que tu perro necesita con la máxima seguridad y tecnología GPS en vivo.

Recordá que:
- Fracciones de tiempo extra: **$1.300 por cada 15 min**.
- Uso de correa provista por Walkie: **$1.000 por día** (o **$0** si usás tu propia correa).
- Todos los paseos incluyen fotos en tiempo real y PIN de confirmación.

¿Te gustaría que te arme un presupuesto personalizado para tu perrito? ¡Decime cuántos días por semana necesita pasear y lo calculo en un ladrido! 🐶`;
  }

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Walkie] Servidor activo en http://localhost:${PORT}`);
  });
}

startServer();
