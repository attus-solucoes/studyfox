// ═══════════════════════════════════════════════════════
// STUDYOS — CONFIGURAÇÃO OPENAI VIA EDGE FUNCTION
// ═══════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';

// ─── Modelos OpenAI ─────────────────────────────────
export const MODELS = {
  graphGeneration: 'gpt-4o-mini',
  exerciseGeneration: 'gpt-4o-mini',
} as const;

// ─── Configuração da API ────────────────────────────
export const API_CONFIG = {
  maxOutputTokens: 16384,
  chapterOutputTokens: 12000,
  structureOutputTokens: 4096,
  temperature: 0.7,
  topP: 0.95,

  maxInputChars: 50000,
  minInputChars: 80,
  maxFileSizeMB: 20,

  multiPassThresholdPages: 15,
  multiPassThresholdChars: 20000,

  supportedMimeTypes: [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ] as string[],
} as const;

// ─── Chamada via Edge Function ──────────────────────
export interface OpenAIRequest {
  messages: any[];
  max_tokens?: number;
  temperature?: number;
  model?: string;
  response_format?: { type: string };
}

export async function callOpenAIProxy(request: OpenAIRequest): Promise<any> {
  const { data, error } = await supabase.functions.invoke('openai-proxy', {
    body: request,
  });

  if (error) {
    console.error('[StudyOS] Edge function error:', error);
    throw new Error(error.message || 'Erro ao chamar IA');
  }

  // The edge function returns the full OpenAI response or an error object
  if (data?.error) {
    const status = data.status || 500;
    if (status === 429) throw new Error('Limite de requisições. Aguarde e tente novamente.');
    if (status === 401) throw new Error('API key OpenAI inválida. Verifique o secret OPENAI_API_KEY.');
    throw new Error(data.error);
  }

  return data;
}

// ─── Helper: File to Base64 (com data URL prefix) ───
export function fileToBase64DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
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
