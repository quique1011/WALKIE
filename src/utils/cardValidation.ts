/**
 * =========================================================================
 * 💳 CARD VALIDATION UTILS - VALIDACIONES ESTRICTAS DE TARJETA WALKIE
 * =========================================================================
 * - Algoritmo de Luhn (Luhn Check) para validez matemática.
 * - Formateo y máscara dinámica de número (16 dígitos en grupos de 4, o 15 para Amex).
 * - Detección automática del emisor (Visa, Mastercard, Amex).
 * - Validación estricta de fecha de vencimiento (MM entre 01-12, no vencida respecto a hoy).
 * - Código de seguridad CVV/CVC (3 dígitos para Visa/Mastercard, 4 para Amex).
 * - Validación de titular (solo letras y espacios, sin números ni caracteres especiales).
 * =========================================================================
 */

export type CardIssuer = 'visa' | 'mastercard' | 'amex' | 'generic';

export interface CardValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Detecta el emisor de la tarjeta según los primeros dígitos ingresados (BIN).
 */
export function detectCardIssuer(cardNumber: string): CardIssuer {
  const clean = cardNumber.replace(/\D/g, '');
  if (!clean) return 'generic';

  // American Express: Comienza con 34 o 37
  if (/^3[47]/.test(clean)) {
    return 'amex';
  }

  // Visa: Comienza con 4
  if (/^4/.test(clean)) {
    return 'visa';
  }

  // Mastercard: 51-55 o rango 2221-2720
  if (/^(5[1-5]|2(2[2-9][1-9]|[3-6]\d{2}|7[0-1]\d|720))/.test(clean)) {
    return 'mastercard';
  }

  return 'generic';
}

/**
 * Aplica el algoritmo matemático de Luhn (Módulo 10).
 * Valida la autenticidad matemática del número de tarjeta bancaria.
 */
export function isValidLuhn(cardNumber: string): boolean {
  const clean = cardNumber.replace(/\D/g, '');
  if (clean.length < 13 || clean.length > 19) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;

  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);
    if (isNaN(digit)) return false;

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

/**
 * Formatea el número de tarjeta en tiempo real con máscara:
 * - Amex: 4-6-5 (ej. 3782 822463 10005)
 * - Visa/Mastercard/Otros: grupos de 4 (ej. 4532 0151 1283 0366)
 */
export function formatCardNumber(value: string, issuer?: CardIssuer): string {
  const clean = value.replace(/\D/g, '');
  const detected = issuer || detectCardIssuer(clean);

  if (detected === 'amex') {
    const limited = clean.slice(0, 15);
    const parts: string[] = [];
    if (limited.length > 0) parts.push(limited.slice(0, 4));
    if (limited.length > 4) parts.push(limited.slice(4, 10));
    if (limited.length > 10) parts.push(limited.slice(10, 15));
    return parts.join(' ');
  }

  // Visa, Mastercard, Generic (16 dígitos estándar)
  const limited = clean.slice(0, 16);
  const parts = limited.match(/.{1,4}/g);
  return parts ? parts.join(' ') : limited;
}

/**
 * Valida el número de tarjeta según emisor, longitud y Algoritmo de Luhn.
 */
export function validateCardNumber(cardNumber: string): CardValidationResult {
  const clean = cardNumber.replace(/\D/g, '');
  const issuer = detectCardIssuer(clean);

  if (!clean) {
    return { isValid: false, error: 'Ingresá el número de tarjeta.' };
  }

  const expectedLength = issuer === 'amex' ? 15 : 16;
  if (clean.length < expectedLength) {
    return { 
      isValid: false, 
      error: `El número debe tener ${expectedLength} dígitos (${clean.length}/${expectedLength}).` 
    };
  }

  if (!isValidLuhn(clean)) {
    return { 
      isValid: false, 
      error: 'Número de tarjeta inválido (falló la comprobación de Luhn).' 
    };
  }

  return { isValid: true };
}

/**
 * Formatea la entrada de fecha de vencimiento al patrón MM/AA.
 */
export function formatExpiryInput(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 4);
  if (clean.length >= 3) {
    return `${clean.slice(0, 2)}/${clean.slice(2, 4)}`;
  }
  return clean;
}

/**
 * Valida estrictamente la fecha de vencimiento:
 * - Mes entre 01 y 12
 * - Fecha igual o posterior al mes/año actual
 */
export function validateExpiryDate(expiry: string): CardValidationResult {
  const trimmed = expiry.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Ingresá la fecha de vencimiento.' };
  }

  if (!/^\d{2}\/\d{2}$/.test(trimmed)) {
    return { isValid: false, error: 'Formato inválido. Debe ser MM/AA.' };
  }

  const [monthStr, yearStr] = trimmed.split('/');
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);

  if (month < 1 || month > 12) {
    return { isValid: false, error: 'El mes de vencimiento debe estar entre 01 y 12.' };
  }

  const now = new Date();
  const currentYearFull = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYearTwoDigits = currentYearFull % 100;
  const fullYear = 2000 + year;

  // Comparación contra fecha actual
  if (year < currentYearTwoDigits || (year === currentYearTwoDigits && month < currentMonth)) {
    return { isValid: false, error: 'La tarjeta está vencida.' };
  }

  // Prevenir años absurdamente lejanos (+20 años)
  if (fullYear > currentYearFull + 20) {
    return { isValid: false, error: 'Año de vencimiento demasiado lejano.' };
  }

  return { isValid: true };
}

/**
 * Valida el código de seguridad (CVV / CVC):
 * - Solo dígitos
 * - 4 dígitos para American Express, 3 dígitos para Visa/Mastercard
 */
export function validateCvv(cvv: string, issuer: CardIssuer = 'generic'): CardValidationResult {
  const clean = cvv.replace(/\D/g, '');
  const requiredLength = issuer === 'amex' ? 4 : 3;

  if (!clean) {
    return { isValid: false, error: 'Ingresá el código de seguridad.' };
  }

  if (clean.length !== requiredLength) {
    return { 
      isValid: false, 
      error: `Debe tener exactamente ${requiredLength} dígitos (${issuer === 'amex' ? 'Amex' : 'Visa/MC'}).` 
    };
  }

  return { isValid: true };
}

/**
 * Valida el nombre del titular:
 * - Únicamente letras del alfabeto (incluyendo tildes y ñ) y espacios.
 * - Sin números ni caracteres especiales.
 * - Mínimo 3 caracteres.
 */
export function validateCardholderName(name: string): CardValidationResult {
  const trimmed = name.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Ingresá el nombre y apellido del titular.' };
  }

  // Permite letras latinas con acentos, diéresis, ñ y espacios
  const onlyLettersRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
  if (!onlyLettersRegex.test(trimmed)) {
    return { 
      isValid: false, 
      error: 'Solo se permiten letras y espacios (sin números ni símbolos).' 
    };
  }

  if (trimmed.length < 3) {
    return { isValid: false, error: 'El nombre debe contener al menos 3 caracteres.' };
  }

  return { isValid: true };
}

/**
 * Tarjetas de prueba válidas (pasan el algoritmo de Luhn al 100%)
 */
export const VALID_TEST_CARDS = {
  visa: {
    number: '4532 0151 1283 0366',
    holder: 'CARLOS RODRIGUEZ',
    expiry: '10/29',
    cvv: '742',
    issuer: 'visa' as CardIssuer,
    label: 'Visa Débito (Válida Luhn)'
  },
  mastercard: {
    number: '5555 5555 5555 4444',
    holder: 'MARIA LAURA GOMEZ',
    expiry: '11/28',
    cvv: '391',
    issuer: 'mastercard' as CardIssuer,
    label: 'Mastercard Crédito (Válida Luhn)'
  },
  amex: {
    number: '3782 822463 10005',
    holder: 'LUCAS BENITEZ',
    expiry: '12/30',
    cvv: '8492',
    issuer: 'amex' as CardIssuer,
    label: 'American Express (Válida Luhn)'
  }
};
