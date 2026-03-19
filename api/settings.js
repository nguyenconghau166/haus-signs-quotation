const SETTINGS_PRICES_KEY = 'haussigns_calculator_prices';
const SETTINGS_FORMULAS_KEY = 'haussigns_lightbox_formulas';

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

function normalizeFormulas(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const normalized = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') {
      const formula = value.trim();
      if (formula) {
        normalized[key] = formula;
      }
    }
  }

  return normalized;
}

function parseKvResult(result) {
  if (!result || !result.result) {
    return null;
  }

  return typeof result.result === 'string'
    ? JSON.parse(result.result)
    : result.result;
}

module.exports = async function handler(req, res) {
  const resource = req.query && req.query.resource
    ? String(req.query.resource)
    : 'prices';

  if (req.method === 'GET') {
    try {
      if (resource === 'all') {
        const [pricesResult, formulasResult] = await Promise.all([
          kvRequest(`get/${SETTINGS_PRICES_KEY}`),
          kvRequest(`get/${SETTINGS_FORMULAS_KEY}`),
        ]);

        return sendJson(res, 200, {
          prices: parseKvResult(pricesResult),
          formulas: parseKvResult(formulasResult),
          source: 'kv',
        });
      }

      if (resource === 'formulas') {
        const formulasResult = await kvRequest(`get/${SETTINGS_FORMULAS_KEY}`);
        return sendJson(res, 200, {
          formulas: parseKvResult(formulasResult),
          source: 'kv',
        });
      }

      const pricesResult = await kvRequest(`get/${SETTINGS_PRICES_KEY}`);

      return sendJson(res, 200, {
        prices: parseKvResult(pricesResult),
        source: 'kv',
      });
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
      if (resource === 'formulas') {
        const formulas = normalizeFormulas(body.formulas);

        if (!formulas) {
          return sendJson(res, 400, { error: 'Invalid formulas payload' });
        }

        await kvRequest(`set/${SETTINGS_FORMULAS_KEY}/${encodeURIComponent(JSON.stringify(formulas))}`);

        return sendJson(res, 200, { ok: true });
      }

      const prices = normalizePrices(body.prices);

      if (!prices) {
        return sendJson(res, 400, { error: 'Invalid prices payload' });
      }

      await kvRequest(`set/${SETTINGS_PRICES_KEY}/${encodeURIComponent(JSON.stringify(prices))}`);

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
      if (resource === 'formulas') {
        await kvRequest(`del/${SETTINGS_FORMULAS_KEY}`);
      } else if (resource === 'all') {
        await Promise.all([
          kvRequest(`del/${SETTINGS_PRICES_KEY}`),
          kvRequest(`del/${SETTINGS_FORMULAS_KEY}`),
        ]);
      } else {
        await kvRequest(`del/${SETTINGS_PRICES_KEY}`);
      }

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
