const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_TABLE = process.env.SUPABASE_SETTINGS_TABLE || 'shared_settings';
const SETTINGS_ROW_ID = Number.parseInt(process.env.SETTINGS_ROW_ID || '1', 10);

function sendJson(res, status, data) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(JSON.stringify(data));
}

function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

function normalizeSettings(row) {
  return {
    prices: (row && typeof row.prices === 'object' && row.prices) || {},
    updatedAt: row?.updated_at || row?.updatedAt || null,
    updatedBy: row?.updated_by || row?.updatedBy || 'unknown'
  };
}

async function readSettings() {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`);
  url.searchParams.set('id', `eq.${SETTINGS_ROW_ID}`);
  url.searchParams.set('select', 'prices,updated_at,updated_by');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: supabaseHeaders({ Accept: 'application/json' })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase read failed (${response.status}): ${text}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    const created = await writeSettings({}, 'system');
    return created;
  }

  return normalizeSettings(rows[0]);
}

async function writeSettings(prices, updatedBy = 'employee') {
  const payload = [{
    id: SETTINGS_ROW_ID,
    prices,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy
  }];

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
    method: 'POST',
    headers: supabaseHeaders({ Prefer: 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase write failed (${response.status}): ${text}`);
  }

  const rows = await response.json();
  const row = Array.isArray(rows) && rows[0] ? rows[0] : payload[0];
  return normalizeSettings(row);
}

module.exports = async (req, res) => {
  try {
    if (!isConfigured()) {
      return sendJson(res, 500, {
        error: 'Supabase is not configured on Vercel env vars.'
      });
    }

    if (req.method === 'GET') {
      const settings = await readSettings();
      return sendJson(res, 200, settings);
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      if (!body || typeof body !== 'object' || typeof body.prices !== 'object') {
        return sendJson(res, 400, { error: 'Body must include `prices` object.' });
      }

      const updatedBy = req.headers['x-user-name'] || 'employee';
      const saved = await writeSettings(body.prices, String(updatedBy));
      return sendJson(res, 200, saved);
    }

    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Internal Server Error' });
  }
};
