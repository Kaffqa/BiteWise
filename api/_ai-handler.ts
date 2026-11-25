import {
  buildSystemPrompt,
  buildTextSystemPrompt,
  buildUserPrompt,
  buildIngredientsSystemPrompt,
  FOOD_ANALYSIS_SCHEMA,
  INGREDIENTS_GENERATION_SCHEMA,
} from '../src/lib/providers/prompt-builder';
import type { ConsumedToday, UserHealthProfile } from '../src/types/ai.types';

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
  let requestBody: Record<string, unknown>;

  if (action === 'analyzeFood') {
    const { imageBase64, userProfile, consumedToday } = payload as {
      imageBase64: string;
      userProfile: UserHealthProfile;
      consumedToday?: ConsumedToday;
    };
    const imageUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;
    const fullSystemPrompt = `${buildSystemPrompt(userProfile, consumedToday)}\n\nEnsure your response is a valid JSON object matching exactly this JSON schema:\n${JSON.stringify(FOOD_ANALYSIS_SCHEMA, null, 2)}`;

    requestBody = {
      model: 'qwen/qwen3.8-27b',
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        { role: 'system', content: fullSystemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: buildUserPrompt() },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    };
  } else if (action === 'analyzeText') {
    const { description, userProfile, consumedToday } = payload as {
      description: string;
      userProfile: UserHealthProfile;
      consumedToday?: ConsumedToday;
    };
    const fullSystemPrompt = `${buildTextSystemPrompt(userProfile, consumedToday)}\n\nEnsure your response is a valid JSON object matching exactly this JSON schema:\n${JSON.stringify(FOOD_ANALYSIS_SCHEMA, null, 2)}`;

    requestBody = {
      model: 'openai/gpt-oss-120b',
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        { role: 'system', content: fullSystemPrompt },
        {
          role: 'user',
          content: `Analyze this food description: "${description}". Estimate nutrition and check for safety concerns based on my health profile.`,
        },
      ],
      response_format: { type: 'json_object' },
    };
  } else if (action === 'generateIngredients') {
    const { userProfile } = payload as { userProfile: UserHealthProfile };
    const fullSystemPrompt = `${buildIngredientsSystemPrompt(userProfile)}\n\nEnsure your response is a valid JSON object matching exactly this JSON schema:\n${JSON.stringify(INGREDIENTS_GENERATION_SCHEMA, null, 2)}`;

    requestBody = {
      model: 'openai/gpt-oss-120b',
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        { role: 'system', content: fullSystemPrompt },
        { role: 'user', content: 'Generate personalized ingredients.' },
      ],
      response_format: { type: 'json_object' },
    };
  } else if (action === 'enrichIngredients') {
    const { ingredientNames, userProfile } = payload as {
      ingredientNames: string[];
      userProfile: UserHealthProfile;
    };
    const prompt = `You are a nutrition expert. I have a list of food items or ingredients: ${JSON.stringify(ingredientNames)}.
For each item, provide detailed information.
The user's health profile:
Allergies: ${userProfile.allergies?.join(', ') || 'None'}
Medical Conditions: ${userProfile.medicalConditions?.join(', ') || 'None'}
Active Medications: ${userProfile.medications?.join(', ') || 'None'}

Return a JSON array of objects with the exact following schema for each item:
{
  "ingredientName": "exact name from my list",
  "category": "e.g., Protein, Additive, Vegetable",
  "reason": "Why this is safe/flagged/allergen specifically for this user's profile (max 2 sentences)",
  "description": "Comprehensive educational description explaining what it is and its health effects (2-3 sentences).",
  "commonlyFoundIn": [
    {"icon": "ONE SINGLE EMOJI", "label": "food name"}
  ]
}

Return ONLY the JSON object like this: { "results": [ ...array items... ] }`;

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
  let requestBody: Record<string, unknown>;

  if (action === 'analyzeFood') {
    const { imageBase64, userProfile, consumedToday } = payload as {
      imageBase64: string;
      userProfile: UserHealthProfile;
      consumedToday?: ConsumedToday;
    };
    const base64Data = imageBase64.includes('base64,')
      ? imageBase64.split('base64,')[1]
      : imageBase64;

    requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: buildUserPrompt() },
            { inline_data: { mime_type: 'image/jpeg', data: base64Data } },
          ],
        },
      ],
      system_instruction: { parts: [{ text: buildSystemPrompt(userProfile, consumedToday) }] },
      generationConfig: {
        response_mime_type: 'application/json',
        response_schema: FOOD_ANALYSIS_SCHEMA,
      },
    };
  } else if (action === 'analyzeText') {
    const { description, userProfile, consumedToday } = payload as {
      description: string;
      userProfile: UserHealthProfile;
      consumedToday?: ConsumedToday;
    };

    requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Analyze this food description: "${description}". Estimate nutrition and check for safety concerns based on my health profile.`,
            },
          ],
        },
      ],
      system_instruction: { parts: [{ text: buildTextSystemPrompt(userProfile, consumedToday) }] },
      generationConfig: {
        response_mime_type: 'application/json',
        response_schema: FOOD_ANALYSIS_SCHEMA,
      },
    };
  } else if (action === 'generateIngredients') {
    const { userProfile } = payload as { userProfile: UserHealthProfile };
    requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Generate my personalized ingredient dictionary based on my health profile.' }],
        },
      ],
      system_instruction: { parts: [{ text: buildIngredientsSystemPrompt(userProfile) }] },
      generationConfig: {
        response_mime_type: 'application/json',
        response_schema: INGREDIENTS_GENERATION_SCHEMA,
      },
    };
  } else if (action === 'enrichIngredients') {
    const { ingredientNames, userProfile } = payload as {
      ingredientNames: string[];
      userProfile: UserHealthProfile;
    };
    const prompt = `You are a nutrition expert. I have a list of food items or ingredients: ${JSON.stringify(ingredientNames)}.
For each item, provide detailed information.
The user's health profile:
Allergies: ${userProfile.allergies?.join(', ') || 'None'}
Medical Conditions: ${userProfile.medicalConditions?.join(', ') || 'None'}
Active Medications: ${userProfile.medications?.join(', ') || 'None'}

Return a JSON array of objects with the exact following schema for each item:
{
  "ingredientName": "exact name from my list",
  "category": "e.g., Protein, Additive, Vegetable",
  "reason": "Why this is safe/flagged/allergen specifically for this user's profile (max 2 sentences)",
  "description": "Comprehensive educational description explaining what it is and its health effects (2-3 sentences).",
  "commonlyFoundIn": [
    {"icon": "ONE SINGLE EMOJI", "label": "food name"}
  ]
}

Return ONLY the raw JSON array. Do not use markdown blocks.`;

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
