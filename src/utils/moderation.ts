/**
 * Walkie Content Moderation & Community Safety Filter
 * Checks messages for profanity, insults, harassment, and abusive language.
 */

export const BANNED_PATTERNS = [
  'pelotudo', 'pelotuda', 'pelotudos', 'pelotudas',
  'hdp', 'hijo de puta', 'hija de puta', 'hijos de puta', 'hijas de puta',
  'mierda', 'mierdas',
  'idiota', 'idiotas',
  'estafador', 'estafadora', 'estafadores', 'ladron', 'ladrona', 'chorro', 'chorra', 'garca',
  'forro', 'forra', 'forros', 'forras',
  'concha de tu madre', 'concha de tu hermana', 'la concha', 'conchudo', 'conchuda',
  'puto', 'puta', 'putos', 'putas',
  'imbecil', 'imbeciles', 'imbécil',
  'tarado', 'tarada', 'tarados', 'taradas',
  'estupido', 'estupida', 'estúpido', 'estúpida',
  'culiao', 'culia', 'culiado',
  'chanta', 'sorete', 'soretes', 'malparido', 'malparida',
  'inutil', 'inútil', 'inutiles',
  'basura', 'lacra', 'violador', 'pedofilo', 'pedófilo',
  'mueranse', 'te voy a matar', 'cagate'
];

/**
 * Normalizes text to detect obfuscated profanities (leetspeak, extra symbols, accents)
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/@/g, 'a')
    .replace(/1/g, 'i')
    .replace(/!/g, 'i')
    .replace(/3/g, 'e')
    .replace(/0/g, 'o')
    .replace(/[$]/g, 's')
    .replace(/[^a-z0-9\s]/gi, ' ') // replace symbols with spaces
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ModerationResult {
  isViolation: boolean;
  detectedWord?: string;
  reason?: string;
}

export function evaluateMessageModeration(rawText: string): ModerationResult {
  if (!rawText || typeof rawText !== 'string') {
    return { isViolation: false };
  }

  const normalized = normalizeText(rawText);

  for (const pattern of BANNED_PATTERNS) {
    const patternNorm = normalizeText(pattern);
    // Boundary match or direct phrase containment
    const wordRegex = new RegExp(`(^|\\s)${patternNorm.replace(/\s+/g, '\\s+')}(\\s|$)`, 'i');
    if (wordRegex.test(normalized) || normalized.includes(patternNorm)) {
      return {
        isViolation: true,
        detectedWord: pattern,
        reason: 'Uso de malas palabras, insultos o faltas de respeto detectadas por el filtro automático de seguridad.'
      };
    }
  }

  return { isViolation: false };
}
