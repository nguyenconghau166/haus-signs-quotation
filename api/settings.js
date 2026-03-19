const SETTINGS_KEY = 'haussigns_calculator_prices';

function sendJson(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

async function kvRequest(path, options = {}) {
  const baseUrl = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('KV storage is not configured');
  }

  const response = await fetch(`${baseUrl}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`KV request failed: ${response.status} ${body}`);
  }

  return response.json();
}

function parseRequestBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function normalizePrices(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const normalized = {};
  for (const [key, value] of Object.entries(raw)) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) {
      normalized[key] = numberValue;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const result = await kvRequest(`get/${SETTINGS_KEY}`);
      if (!result || !result.result) {
        return sendJson(res, 200, { prices: null, source: 'empty' });
      }

      const parsed = typeof result.result === 'string'
        ? JSON.parse(result.result)
        : result.result;

      return sendJson(res, 200, { prices: parsed, source: 'kv' });
    } catch (error) {
      return sendJson(res, 503, {
        error: 'Cannot load shared settings',
        detail: error.message,
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = parseRequestBody(req);
      const prices = normalizePrices(body.prices);

      if (!prices) {
        return sendJson(res, 400, { error: 'Invalid prices payload' });
      }

      await kvRequest(`set/${SETTINGS_KEY}/${encodeURIComponent(JSON.stringify(prices))}`);

      return sendJson(res, 200, { ok: true });
    } catch (error) {
      return sendJson(res, 503, {
        error: 'Cannot save shared settings',
        detail: error.message,
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await kvRequest(`del/${SETTINGS_KEY}`);
      return sendJson(res, 200, { ok: true });
    } catch (error) {
      return sendJson(res, 503, {
        error: 'Cannot reset shared settings',
        detail: error.message,
      });
    }
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return sendJson(res, 405, { error: 'Method not allowed' });
};
