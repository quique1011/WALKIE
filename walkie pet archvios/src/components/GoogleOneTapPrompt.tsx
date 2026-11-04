import React, { useEffect } from 'react';
import { 
  GoogleUserProfile, 
  decodeGoogleJwt, 
  GOOGLE_CLIENT_ID
} from '../utils/googleAuth';

interface GoogleOneTapPromptProps {
  isLoggedIn: boolean;
  onGoogleSuccess: (user: GoogleUserProfile) => void;
}

export const GoogleOneTapPrompt: React.FC<GoogleOneTapPromptProps> = ({
  isLoggedIn,
  onGoogleSuccess
}) => {

  useEffect(() => {
    if (isLoggedIn) {
      return;
    }

    const dismissed = sessionStorage.getItem('walkie_onetap_dismissed') === 'true' || 
                      sessionStorage.getItem('walkie_auth_prompt_dismissed') === 'true';
    if (dismissed) {
      return;
    }

    // ⏱️ Respetar los 30 segundos de exploración libre antes de sugerir acceso oficial con Google
    const timer = setTimeout(() => {
      const stillDismissed = sessionStorage.getItem('walkie_onetap_dismissed') === 'true' || 
                             sessionStorage.getItem('walkie_auth_prompt_dismissed') === 'true';
      if (stillDismissed) return;

      // Initialize official Google Identity Services One Tap prompt
      const gClientId = GOOGLE_CLIENT_ID;
      const isEmbeddedIframe = typeof window !== 'undefined' && window.self !== window.top;
      let canUseFedCm = false;
      try {
        if (typeof document !== 'undefined' && (document as any).featurePolicy) {
          canUseFedCm = (document as any).featurePolicy.allowsFeature('identity-credentials-get') === true;
        }
      } catch {
        canUseFedCm = false;
      }

      // Only invoke native GIS prompt when not blocked by iframe permissions policy
      const canInvokeNativePrompt = !isEmbeddedIframe || canUseFedCm;

      if (typeof window !== 'undefined' && window.google?.accounts?.id && gClientId && canInvokeNativePrompt) {
        try {
          window.google.accounts.id.initialize({
            client_id: gClientId,
            callback: (response: any) => {
              if (response.credential) {
                const decoded = decodeGoogleJwt(response.credential);
                if (decoded) {
                  onGoogleSuccess(decoded);
                }
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
            use_fedcm_for_prompt: canUseFedCm
          });
          window.google.accounts.id.prompt((notification: any) => {
            if (notification && notification.isNotDisplayed()) {
              console.log('Google One Tap suppressed by browser/session:', notification.getNotDisplayedReason());
            }
          });
        } catch (e) {
          console.warn('GIS One Tap prompt init error:', e);
        }
      }
    }, 30000); // ⏱️ 30 segundos continuos de navegación libre

    return () => clearTimeout(timer);
  }, [isLoggedIn, onGoogleSuccess]);

  // Only native Google Identity Services One Tap prompt is used; no custom simulated UI is rendered
  return null;
};
