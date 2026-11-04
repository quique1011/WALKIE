export interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  givenName: string;
  familyName: string;
  picture?: string;
  emailVerified?: boolean;
}

// Global window typing for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: any) => void;
          prompt: (notificationCallback?: (notification: any) => void) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          disableAutoSelect: () => void;
        };
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (response: { access_token?: string; error?: string }) => void;
            error_callback?: (error: any) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

/**
 * Decodes a Google JWT Credential Token (from Google One Tap or GIS)
 */
export function decodeGoogleJwt(token: string): GoogleUserProfile | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload) || {};
    return {
      id: payload?.sub || `g-${Date.now()}`,
      email: payload?.email || '',
      name: payload?.name || '',
      givenName: payload?.given_name || (payload?.name ? payload.name.split(' ')[0] : 'Usuario'),
      familyName: payload?.family_name || (payload?.name ? payload.name.split(' ').slice(1).join(' ') : ''),
      picture: payload?.picture || '',
      emailVerified: Boolean(payload?.email_verified)
    };
  } catch (err) {
    console.error('Error decoding Google JWT:', err);
    return null;
  }
}

/**
 * Builds a user handle/username from a Google email address
 */
export function formatUsernameFromEmail(email: string): string {
  const base = email.split('@')[0] || 'usuario';
  const clean = base.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  return clean.startsWith('@') ? clean : `@${clean}`;
}

/**
 * Parse name parts from a full name or email
 */
export function parseNameParts(fullName: string, email: string): { givenName: string; familyName: string } {
  const trimmed = (fullName || '').trim();
  if (trimmed) {
    const parts = trimmed.split(' ');
    const givenName = parts[0] || '';
    const familyName = parts.slice(1).join(' ') || '';
    return { givenName, familyName };
  }
  const prefix = (email || '').split('@')[0] || '';
  const parts = prefix.split(/[._-]/);
  const givenName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Usuario';
  const familyName = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : '';
  return { givenName, familyName };
}

export const GOOGLE_CLIENT_ID =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) ||
  '239444747886-27atr4pt5u4pp2lbe3t8i84t5or1kdso.apps.googleusercontent.com';

/**
 * Limpia el localStorage y sessionStorage de cualquier estado de sesión anterior
 * antes de guardar las nuevas credenciales/perfil del usuario autenticado.
 */
export function cleanPreviousSession(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove = [
      'walkie_cliente_user',
      'walkie_paseador_user',
      'walkie_google_last_account',
      'walkie_last_active_role',
      'walkie_paseador_cuenta_activa',
      'walkie_suspended_account',
      'walkie_cliente_perros_lista',
      'walkie_pending_donation'
    ];

    // Limpiar claves dinámicas de usuario anterior (perros, sesiones)
    const dynamicKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('walkie_cliente_perros_lista_') || k.startsWith('walkie_session_'))) {
        dynamicKeys.push(k);
      }
    }
    dynamicKeys.forEach((k) => {
      try { localStorage.removeItem(k); } catch {}
    });

    keysToRemove.forEach((k) => {
      try { localStorage.removeItem(k); } catch {}
    });

    try {
      sessionStorage.removeItem('walkie_auth_prompt_dismissed');
      sessionStorage.removeItem('walkie_onetap_dismissed');
      sessionStorage.removeItem('walkie_pending_donation');
    } catch {}
  } catch (err) {
    console.warn('Error clearing previous session:', err);
  }
}

/**
 * Returns the detected active Google account from saved authenticated session, if any
 */
export function getDetectedGoogleAccount(): GoogleUserProfile | null {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('walkie_google_last_account');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) return parsed;
      }
    } catch {}
  }
  return null;
}

/**
 * Returns host details to support both localhost:3000 and walkiepet.org
 */
export function getCurrentDomainInfo(): { host: string; hostname: string; isLocalhost: boolean; origin: string } {
  if (typeof window === 'undefined') {
    return { host: 'walkiepet.org', hostname: 'walkiepet.org', isLocalhost: false, origin: 'https://walkiepet.org' };
  }
  const host = window.location.host;
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  return { host, hostname, isLocalhost, origin: window.location.origin };
}

/**
 * Triggers Google Identity Services OAuth 2.0 Token Client with fallback
 */
export function triggerGoogleOAuthLogin(
  onSuccess: (user: GoogleUserProfile) => void,
  onError?: (error: any) => void,
  onFallback?: () => void
): void {
  const clientId = GOOGLE_CLIENT_ID;

  if (typeof window !== 'undefined' && window.google?.accounts?.oauth2 && clientId) {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        prompt: 'select_account',
        callback: async (resp: { access_token?: string; error?: string }) => {
          try {
            if (resp.error) {
              console.warn('GIS Token error:', resp.error);
              if (onError) onError(resp.error);
              else if (onFallback) onFallback();
              return;
            }
            if (resp.access_token) {
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${resp.access_token}` }
                });
                const data = await res.json();
                if (data && data.email) {
                  const user: GoogleUserProfile = {
                    id: data.sub || `g-${Date.now()}`,
                    email: data.email,
                    name: data.name || '',
                    givenName: data.given_name || (data.name ? data.name.split(' ')[0] : ''),
                    familyName: data.family_name || (data.name ? data.name.split(' ').slice(1).join(' ') : ''),
                    picture: data.picture || '',
                    emailVerified: Boolean(data.email_verified)
                  };
                  onSuccess(user);
                  return;
                }
              } catch (fetchErr) {
                console.warn('Failed to fetch Google userinfo:', fetchErr);
                if (onError) onError(fetchErr);
                else if (onFallback) onFallback();
                return;
              }
            }
            if (onFallback) onFallback();
          } catch (e) {
            console.error('Error in GIS callback:', e);
            if (onError) onError(e);
            else if (onFallback) onFallback();
          }
        },
        error_callback: (err: any) => {
          console.warn('Google Identity Services error callback:', err);
          if (onError) onError(err);
          else if (onFallback) onFallback();
        }
      });

      try {
        client.requestAccessToken({ prompt: 'select_account' });
      } catch (reqErr) {
        console.warn('Error calling requestAccessToken:', reqErr);
        if (onError) onError(reqErr);
        else if (onFallback) onFallback();
      }
      return;
    } catch (err) {
      console.warn('Google Identity Services init failed, falling back:', err);
      if (onError) onError(err);
      else if (onFallback) onFallback();
    }
  } else {
    if (onFallback) onFallback();
  }
}
