import { PlanType, TipoCorrea } from '../types';

export interface MercadoPagoPreferenceData {
  planType: PlanType;
  totalAmount: number;
  weeksCount: number;
  totalWalks: number;
  dogId: string;
  dogName: string;
  userEmail?: string;
  userName?: string;
  userId?: string;
  tipoCorrea?: TipoCorrea;
}

export interface MercadoPagoCheckoutResult {
  success: boolean;
  isSimulation: boolean;
  preferenceId?: string;
  initPoint?: string;
  sandboxInitPoint?: string;
  liveInitPoint?: string;
  mode?: 'sandbox' | 'live' | 'simulation';
  error?: string;
}

// Credenciales oficiales de prueba (Sandbox) provistas por el usuario
export const DEFAULT_MP_PUBLIC_KEY = 'APP_USR-c1c5f637-0a83-462a-99fc-69db5e589d04';
export const DEFAULT_MP_ACCESS_TOKEN = 'APP_USR-8947506784539424-102623-b918d07dcadc6455b1edc154cabd8e91-3796774466';

// Clave ficticia usada únicamente en tests unitarios aislados
export const DUMMY_MP_ACCESS_TOKEN = 'TEST-0000000000000000-0000000000000000-000000';

/**
 * Obtiene la Public Key de Mercado Pago configurada (Sandbox o Producción).
 */
export function getMercadoPagoPublicKey(): string {
  const envKey =
    (import.meta as any)?.env?.NEXT_PUBLIC_MP_PUBLIC_KEY ||
    (import.meta as any)?.env?.VITE_MP_PUBLIC_KEY ||
    (import.meta as any)?.env?.MP_PUBLIC_KEY;

  if (envKey && typeof envKey === 'string' && envKey.trim().length > 0) {
    return envKey.trim();
  }
  return DEFAULT_MP_PUBLIC_KEY;
}

/**
 * Obtiene el token de acceso de Mercado Pago configurado en las variables de entorno
 * o utiliza las credenciales Sandbox oficiales provistas.
 */
export function getMercadoPagoAccessToken(): string {
  const envToken =
    (import.meta as any)?.env?.MP_ACCESS_TOKEN ||
    (import.meta as any)?.env?.VITE_MP_ACCESS_TOKEN ||
    (import.meta as any)?.env?.MERCADOPAGO_ACCESS_TOKEN ||
    (import.meta as any)?.env?.VITE_PAYMENT_GATEWAY_API_KEY ||
    (import.meta as any)?.env?.PAYMENT_GATEWAY_API_KEY;

  if (envToken && typeof envToken === 'string' && envToken.trim().length > 0) {
    return envToken.trim();
  }
  return DEFAULT_MP_ACCESS_TOKEN;
}

/**
 * Verifica si el token configurado es el de pruebas ficticio sin conexión
 */
export function isDummyAccessToken(token: string): boolean {
  return !token || token === DUMMY_MP_ACCESS_TOKEN || token.startsWith('TEST-000000');
}

/**
 * Crea la preferencia de pago de Mercado Pago Checkout Pro.
 * 1. Primero intenta invocar el proxy seguro del servidor `/api/mercadopago/create-preference`
 *    (evita bloqueos de CORS del navegador y resguarda tokens).
 * 2. En caso de fallback, consulta directamente el endpoint REST de Mercado Pago.
 * 3. En Sandbox retorna tanto `sandbox_init_point` como `init_point`, priorizando el enlace sandbox para pruebas.
 */
export async function createMercadoPagoPreference(
  data: MercadoPagoPreferenceData
): Promise<MercadoPagoCheckoutResult> {
  const token = getMercadoPagoAccessToken();

  // Si expresamente se configuró el dummy token aislado, simular
  if (isDummyAccessToken(token)) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      success: true,
      isSimulation: true,
      preferenceId: `pref_sim_${Date.now()}`,
      mode: 'simulation'
    };
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://walkiepet.org';
  const itemTitle = `Walkie - Plan ${data.planType} (${data.weeksCount} ${data.weeksCount === 1 ? 'semana' : 'semanas'}, ${data.totalWalks} paseos)`;
  const itemPrice = Math.max(1, Math.round(data.totalAmount));

  // Paso 1: Intentar mediante el endpoint Express seguro del servidor
  try {
    const serverResponse = await fetch('/api/mercadopago/create-preference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: itemTitle,
        unit_price: itemPrice,
        quantity: 1,
        payerEmail: data.userEmail || 'test_user_walkie@testuser.com',
        payerName: data.userName || 'Cliente Walkie',
        metadata: {
          user_email: data.userEmail || '',
          user_id: data.userId || '',
          dog_id: data.dogId || '',
          dog_name: data.dogName || '',
          plan_type: data.planType,
          weeks_count: data.weeksCount,
          total_walks: data.totalWalks,
          tipo_correa: data.tipoCorrea || 'propia'
        },
        backUrls: {
          success: `${origin}/?pago=aprobado&plan=${data.planType}&perro=${encodeURIComponent(data.dogName)}`,
          failure: `${origin}/?pago=fallido`,
          pending: `${origin}/?pago=pendiente`
        }
      })
    });

    if (serverResponse.ok) {
      const serverJson = await serverResponse.json();
      if (serverJson.success) {
        return {
          success: true,
          isSimulation: false,
          preferenceId: serverJson.preferenceId,
          initPoint: serverJson.initPoint || serverJson.sandboxInitPoint || serverJson.liveInitPoint,
          sandboxInitPoint: serverJson.sandboxInitPoint,
          liveInitPoint: serverJson.liveInitPoint,
          mode: serverJson.mode || 'sandbox'
        };
      }
    }
    console.warn('[Mercado Pago Client] Endpoint de servidor no respondió éxito, intentando petición directa...');
  } catch (errServer) {
    console.warn('[Mercado Pago Client] Error al conectar con endpoint local, aplicando fallback directo:', errServer);
  }

  // Paso 2: Fallback directo a https://api.mercadopago.com/checkout/preferences
  try {
    const preferencePayload = {
      items: [
        {
          id: `plan-${data.planType.toLowerCase()}`,
          title: itemTitle,
          description: `Paseos caninos para ${data.dogName}. Correa: ${data.tipoCorrea === 'walkie' ? 'Oficial Walkie' : 'Propia'}.`,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: itemPrice
        }
      ],
      payer: {
        email: data.userEmail || 'test_user_walkie@testuser.com',
        name: data.userName || 'Cliente Walkie'
      },
      back_urls: {
        success: `${origin}/?pago=aprobado&plan=${data.planType}&perro=${encodeURIComponent(data.dogName)}`,
        failure: `${origin}/?pago=fallido`,
        pending: `${origin}/?pago=pendiente`
      },
      auto_return: 'approved',
      statement_descriptor: 'WALKIE PET',
      metadata: {
        user_email: data.userEmail || '',
        user_id: data.userId || '',
        dog_id: data.dogId || '',
        dog_name: data.dogName || '',
        plan_type: data.planType,
        weeks_count: data.weeksCount,
        tipo_correa: data.tipoCorrea || 'propia'
      }
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(preferencePayload)
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      console.warn('Mercado Pago API Direct error:', response.status, errorDetails);
      throw new Error(`Error en Mercado Pago (${response.status}): ${errorDetails}`);
    }

    const resJson = await response.json();
    const sandboxInitPoint = resJson.sandbox_init_point;
    const liveInitPoint = resJson.init_point;
    const initPoint = sandboxInitPoint || liveInitPoint;

    return {
      success: true,
      isSimulation: false,
      preferenceId: resJson.id,
      initPoint,
      sandboxInitPoint,
      liveInitPoint,
      mode: sandboxInitPoint ? 'sandbox' : 'live'
    };
  } catch (err: any) {
    console.error('Fallo final al crear preferencia en Mercado Pago:', err);
    return {
      success: false,
      isSimulation: false,
      error: err?.message || 'No se pudo generar la preferencia de pago en Mercado Pago'
    };
  }
}
