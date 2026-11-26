import {
  buildSystemPrompt,
  buildTextSystemPrompt,
  buildUserPrompt,
  buildIngredientsSystemPrompt,
  buildEnrichIngredientsPrompt,
  FOOD_ANALYSIS_SCHEMA,
  INGREDIENTS_GENERATION_SCHEMA,
  type PromptLanguage,
  type PromptConsumedToday,
  type PromptUserHealthProfile,
} from './_prompts.js';

export interface ServerRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array | string>;
}

export interface ServerResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(chunk?: string): void;
}

export type EnvRecord = Record<string, string | undefined>;

const AI_TIMEOUT_MS = 30_000;
const AUTH_TIMEOUT_MS = 8_000;
const MAX_BODY_BYTES = 6 * 1024 * 1024;

export function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export async function readJsonBody(req: ServerRequest): Promise<any> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      return req.body ? JSON.parse(req.body) : {};
    }
    return req.body;
  }

  if (!req[Symbol.asyncIterator]) {
    return {};
  }

  const decoder = new TextDecoder('utf-8');
  let raw = '';
  let totalBytes = 0;

  for await (const chunk of req as AsyncIterable<Uint8Array | string>) {
    const strChunk = typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
    totalBytes += strChunk.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw Object.assign(new Error('Image or payload is too large (max 6MB).'), { statusCode: 413 });
    }
    raw += strChunk;
  }
  raw += decoder.decode();

  return raw.trim() ? JSON.parse(raw) : {};
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function verifySupabaseUser(
  req: ServerRequest,
  env: EnvRecord
): Promise<{ id: string; email?: string } | null> {
  const rawAuth = req.headers['authorization'] || req.headers['Authorization'];
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('dummy.supabase.co')) {
    throw Object.assign(new Error('Supabase environment variables are missing on server.'), { statusCode: 500 });
  }

  const authResponse = await fetchWithTimeout(
    `${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`,
    {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: authHeader,
      },
    },
    AUTH_TIMEOUT_MS
  );

  if (!authResponse.ok) {
    return null;
  }

  const user = (await authResponse.json()) as { id?: string; email?: string };
  if (!user?.id) return null;
  return { id: user.id, email: user.email };
}

function parseModelJson(content: string): any {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

async function callGroq(
  action: string,
  payload: any,
  apiKey: string
): Promise<any> {
  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  const startTime = Date.now();
  const language: PromptLanguage = payload?.language === 'id' ? 'id' : 'en';
  let requestBody: Record<string, unknown>;

  if (action === 'analyzeFood') {
    const { imageBase64, userProfile, consumedToday } = payload as {
      imageBase64: string;
      userProfile: PromptUserHealthProfile;
      consumedToday?: PromptConsumedToday;
    };
    const imageUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;
    const fullSystemPrompt = `${buildSystemPrompt(userProfile, consumedToday, language)}\n\nEnsure your response is a valid JSON object matching exactly this JSON schema:\n${JSON.stringify(FOOD_ANALYSIS_SCHEMA, null, 2)}`;

    requestBody = {
      model: 'qwen/qwen3.8-27b',
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        { role: 'system', content: fullSystemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: buildUserPrompt(language) },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    };
  } else if (action === 'analyzeText') {
    const { description, userProfile, consumedToday } = payload as {
      description: string;
      userProfile: PromptUserHealthProfile;
      consumedToday?: PromptConsumedToday;
    };
    const fullSystemPrompt = `${buildTextSystemPrompt(userProfile, consumedToday, language)}\n\nEnsure your response is a valid JSON object matching exactly this JSON schema:\n${JSON.stringify(FOOD_ANALYSIS_SCHEMA, null, 2)}`;

    requestBody = {
      model: 'openai/gpt-oss-120b',
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        { role: 'system', content: fullSystemPrompt },
        {
          role: 'user',
          content:
            language === 'id'
              ? `Analisis deskripsi makanan ini: "${description}". Perkirakan nutrisinya dan periksa keamanan berdasarkan profil kesehatan saya.`
              : `Analyze this food description: "${description}". Estimate nutrition and check for safety concerns based on my health profile.`,
        },
      ],
      response_format: { type: 'json_object' },
    };
  } else if (action === 'generateIngredients') {
    const { userProfile } = payload as { userProfile: PromptUserHealthProfile };
    const fullSystemPrompt = `${buildIngredientsSystemPrompt(userProfile, language)}\n\nEnsure your response is a valid JSON object matching exactly this JSON schema:\n${JSON.stringify(INGREDIENTS_GENERATION_SCHEMA, null, 2)}`;

    requestBody = {
      model: 'openai/gpt-oss-120b',
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        { role: 'system', content: fullSystemPrompt },
        {
          role: 'user',
          content:
            language === 'id'
              ? 'Buat daftar bahan makanan personal berdasarkan profil kesehatan saya.'
              : 'Generate personalized ingredients.',
        },
      ],
      response_format: { type: 'json_object' },
    };
  } else if (action === 'enrichIngredients') {
    const { ingredientNames, userProfile } = payload as {
      ingredientNames: string[];
      userProfile: PromptUserHealthProfile;
    };
    const prompt = buildEnrichIngredientsPrompt(ingredientNames, userProfile, language, true);

    requestBody = {
      model: 'openai/gpt-oss-120b',
      max_tokens: 4096,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    };
  } else {
    throw Object.assign(new Error(`Unsupported action: ${action}`), { statusCode: 400 });
  }

  const response = await fetchWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    },
    AI_TIMEOUT_MS
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw Object.assign(new Error(`Groq API error (${response.status}): ${errText}`), {
      statusCode: response.status,
    });
  }

  const data = (await response.json()) as any;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Invalid response structure from Groq API.');
  }

  const parsed = parseModelJson(content);
  if (action === 'generateIngredients') return parsed.ingredients || [];
  if (action === 'enrichIngredients') return parsed.results || [];
  parsed.processingTimeMs = Date.now() - startTime;
  return parsed;
}

async function callGemini(
  action: string,
  payload: any,
  apiKey: string
): Promise<any> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
  const startTime = Date.now();
  const language: PromptLanguage = payload?.language === 'id' ? 'id' : 'en';
  let requestBody: Record<string, unknown>;

  if (action === 'analyzeFood') {
    const { imageBase64, userProfile, consumedToday } = payload as {
      imageBase64: string;
      userProfile: PromptUserHealthProfile;
      consumedToday?: PromptConsumedToday;
    };
    const base64Data = imageBase64.includes('base64,')
      ? imageBase64.split('base64,')[1]
      : imageBase64;

    requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: buildUserPrompt(language) },
            { inline_data: { mime_type: 'image/jpeg', data: base64Data } },
          ],
        },
      ],
      system_instruction: { parts: [{ text: buildSystemPrompt(userProfile, consumedToday, language) }] },
      generationConfig: {
        response_mime_type: 'application/json',
        response_schema: FOOD_ANALYSIS_SCHEMA,
      },
    };
  } else if (action === 'analyzeText') {
    const { description, userProfile, consumedToday } = payload as {
      description: string;
      userProfile: PromptUserHealthProfile;
      consumedToday?: PromptConsumedToday;
    };

    requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                language === 'id'
                  ? `Analisis deskripsi makanan ini: "${description}". Perkirakan nutrisinya dan periksa keamanan berdasarkan profil kesehatan saya.`
                  : `Analyze this food description: "${description}". Estimate nutrition and check for safety concerns based on my health profile.`,
            },
          ],
        },
      ],
      system_instruction: { parts: [{ text: buildTextSystemPrompt(userProfile, consumedToday, language) }] },
      generationConfig: {
        response_mime_type: 'application/json',
        response_schema: FOOD_ANALYSIS_SCHEMA,
      },
    };
  } else if (action === 'generateIngredients') {
    const { userProfile } = payload as { userProfile: PromptUserHealthProfile };
    requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                language === 'id'
                  ? 'Buat kamus bahan makanan personal berdasarkan profil kesehatan saya.'
                  : 'Generate my personalized ingredient dictionary based on my health profile.',
            },
          ],
        },
      ],
      system_instruction: { parts: [{ text: buildIngredientsSystemPrompt(userProfile, language) }] },
      generationConfig: {
        response_mime_type: 'application/json',
        response_schema: INGREDIENTS_GENERATION_SCHEMA,
      },
    };
  } else if (action === 'enrichIngredients') {
    const { ingredientNames, userProfile } = payload as {
      ingredientNames: string[];
      userProfile: PromptUserHealthProfile;
    };
    const prompt = buildEnrichIngredientsPrompt(ingredientNames, userProfile, language, false);

    requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    };
  } else {
    throw Object.assign(new Error(`Unsupported action: ${action}`), { statusCode: 400 });
  }

  const response = await fetchWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    },
    AI_TIMEOUT_MS
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw Object.assign(new Error(`Gemini API error (${response.status}): ${errText}`), {
      statusCode: response.status,
    });
  }

  const data = (await response.json()) as any;
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error('Invalid response structure from Gemini API.');
  }

  const parsed = parseModelJson(content);
  if (action === 'generateIngredients') return parsed.ingredients || [];
  if (action === 'enrichIngredients') return Array.isArray(parsed) ? parsed : parsed.results || [];
  parsed.processingTimeMs = Date.now() - startTime;
  return parsed;
}

export async function executeAiAction(action: string, payload: any, env: EnvRecord) {
  const configuredProvider = (env.AI_PROVIDER || env.VITE_AI_PROVIDER || 'fallback').toLowerCase();
  const groqKey = env.GROQ_API_KEY || env.VITE_GROQ_API_KEY;
  const geminiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;

  if (!groqKey && !geminiKey) {
    throw Object.assign(new Error('AI API key is not configured on the server.'), { statusCode: 500 });
  }

  const runOrder: Array<{ name: 'groq' | 'gemini'; key: string }> = [];
  if (configuredProvider === 'gemini') {
    if (geminiKey) runOrder.push({ name: 'gemini', key: geminiKey });
    if (groqKey) runOrder.push({ name: 'groq', key: groqKey });
  } else {
    if (groqKey) runOrder.push({ name: 'groq', key: groqKey });
    if (geminiKey) runOrder.push({ name: 'gemini', key: geminiKey });
  }

  let lastError: any;
  for (const provider of runOrder) {
    try {
      const result =
        provider.name === 'groq'
          ? await callGroq(action, payload, provider.key)
          : await callGemini(action, payload, provider.key);
      return result;
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || '').toLowerCase();
      if (msg === 'not_food' || err?.statusCode === 400) {
        throw err;
      }
      // Continue to fallback provider on transient/upstream failures
    }
  }

  throw lastError || new Error('All configured AI providers failed.');
}
