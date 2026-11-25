import {
  executeAiAction,
  readJsonBody,
  sendJson,
  verifySupabaseUser,
  type EnvRecord,
  type ServerRequest,
  type ServerResponse,
} from './_ai-handler';

const getNodeEnv = (): EnvRecord => ((globalThis as any).process?.env ?? {}) as EnvRecord;

export async function handleAiRequest(
  req: ServerRequest,
  res: ServerResponse,
  env: EnvRecord = getNodeEnv()
) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const user = await verifySupabaseUser(req, env);
    if (!user) {
      return sendJson(res, 401, { error: 'Unauthorized: valid session required.' });
    }

    const body = await readJsonBody(req);
    const { action, ...payload } = body || {};

    if (!action || typeof action !== 'string') {
      return sendJson(res, 400, { error: 'Missing AI action.' });
    }

    const data = await executeAiAction(action, payload, env);
    return sendJson(res, 200, { data });
  } catch (err: any) {
    const status = typeof err?.statusCode === 'number' && err.statusCode >= 400 ? err.statusCode : 500;
    return sendJson(res, status, {
      error: err?.message || 'Unexpected AI proxy error.',
    });
  }
}

export default async function handler(req: ServerRequest, res: ServerResponse) {
  return handleAiRequest(req, res, getNodeEnv());
}
