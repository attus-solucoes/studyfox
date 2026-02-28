// ═══════════════════════════════════════════════════════
// STUDYOS — CONFIGURAÇÃO OPENAI API
// (arquivo mantém nome gemini.ts para compatibilidade de imports)
// ═══════════════════════════════════════════════════════

// ─── API Key via .env ───────────────────────────────
export const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

// Backward compat (outros imports usam esse nome)
export const GEMINI_API_KEY = OPENAI_API_KEY;

// ─── Modelos OpenAI ─────────────────────────────────
export const MODELS = {
  graphGeneration: 'gpt-4o-mini',       // Rápido, barato, bom pra grafos
  exerciseGeneration: 'gpt-4o-mini',    // Rápido pra exercícios on-demand
} as const;

// ─── Endpoint ───────────────────────────────────────
export const OPENAI_BASE_URL = 'https://api.openai.com/v1/chat/completions';

// ─── Configuração da API ────────────────────────────
export const API_CONFIG = {
  maxOutputTokens: 8192,
  temperature: 0.7,
  topP: 0.95,

  // Limites de input
  maxInputChars: 15000,
  minInputChars: 80,
  maxFileSizeMB: 10,       // Max pra upload de PDF

  // Tipos aceitos
  supportedMimeTypes: [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ] as string[],
} as const;

// ─── Rate Limiting ──────────────────────────────────
let lastCallTime = 0;
const MIN_INTERVAL_MS = 1500; // OpenAI tem limites mais generosos

export async function rateLimitedFetch(
  url: string,
  options: RequestInit
): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastCallTime;

  if (elapsed < MIN_INTERVAL_MS) {
    const waitTime = MIN_INTERVAL_MS - elapsed;
    console.log(`[StudyOS] Rate limit: aguardando ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastCallTime = Date.now();

  // Retry com backoff para 429
  let retries = 0;
  const maxRetries = 2;

  while (retries <= maxRetries) {
    const response = await fetch(url, options);

    if (response.status === 429 && retries < maxRetries) {
      retries++;
      const backoff = retries * 3000;
      console.warn(`[StudyOS] Rate limit 429, retry ${retries}/${maxRetries} em ${backoff}ms`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      continue;
    }

    return response;
  }

  return fetch(url, options);
}

// ─── Helper: File to Base64 (com data URL prefix) ───
export function fileToBase64DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Retorna COM o prefix: "data:application/pdf;base64,..."
      if (!result) {
        reject(new Error('Falha ao converter arquivo para base64'));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

// Backward compat
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      if (!base64) {
        reject(new Error('Falha ao converter arquivo'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

// ─── Helper: Validar arquivo ────────────────────────
export function validateFile(file: File): { valid: boolean; error?: string } {
  const sizeMB = file.size / (1024 * 1024);

  if (sizeMB > API_CONFIG.maxFileSizeMB) {
    return {
      valid: false,
      error: `Arquivo muito grande (${sizeMB.toFixed(1)}MB). Máximo: ${API_CONFIG.maxFileSizeMB}MB`,
    };
  }

  const ext = file.name.split('.').pop()?.toLowerCase();
  const validExtensions = ['pdf', 'txt', 'docx', 'doc', 'md'];

  if (!validExtensions.includes(ext || '')) {
    return {
      valid: false,
      error: `Formato não suportado (.${ext}). Use: PDF, TXT, DOCX`,
    };
  }

  return { valid: true };
}
