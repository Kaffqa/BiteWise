import {
  fetchWithTimeout,
  sendJson,
  verifySupabaseUser,
  type EnvRecord,
  type ServerRequest,
  type ServerResponse,
} from './_ai-handler';

const getNodeEnv = (): EnvRecord => ((globalThis as any).process?.env ?? {}) as EnvRecord;

export async function handleAccountRequest(
  req: ServerRequest,
  res: ServerResponse,
  env: EnvRecord = getNodeEnv()
) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const user = await verifySupabaseUser(req, env);
    if (!user) {
      return sendJson(res, 401, { error: 'Unauthorized' });
    }

    const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return sendJson(res, 200, { ok: true, authDeleted: false });
    }

    const delRes = await fetchWithTimeout(
      `${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/users/${user.id}`,
      {
        method: 'DELETE',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
      10_000
    );

    if (!delRes.ok) {
      const errText = await delRes.text().catch(() => delRes.statusText);
      return sendJson(res, 500, { error: `Failed to delete auth user: ${errText}` });
    }

    return sendJson(res, 200, { ok: true, authDeleted: true });
  } catch (err: any) {
    return sendJson(res, 500, { error: err?.message || 'Account deletion failed.' });
  }
}

export default async function handler(req: ServerRequest, res: ServerResponse) {
  return handleAccountRequest(req, res, getNodeEnv());
}
