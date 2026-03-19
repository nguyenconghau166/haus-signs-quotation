/**
 * Shared server for HAUS SIGNS quotation app.
 * - Serves static frontend files
 * - Stores shared pricing settings for all employees
 */

const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

function loadDotEnv() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;

    const raw = fs.readFileSync(envPath, 'utf-8');
    raw.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex <= 0) return;

        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        if (key && process.env[key] === undefined) {
            process.env[key] = value;
        }
    });
}

loadDotEnv();

const HOST = process.env.HOST || '0.0.0.0';
const PORT = parseInt(process.env.PORT || '8080', 10);

const ROOT_DIR = __dirname;
const STORAGE_DIR = path.join(ROOT_DIR, 'storage');
const SETTINGS_FILE = path.join(STORAGE_DIR, 'shared-settings.json');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_TABLE = process.env.SUPABASE_SETTINGS_TABLE || 'shared_settings';
const SETTINGS_ROW_ID = parseInt(process.env.SETTINGS_ROW_ID || '1', 10);
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, data) {
    const body = JSON.stringify(data);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-store'
    });
    res.end(body);
}

function sendText(res, statusCode, text) {
    res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(text);
}

function getSupabaseHeaders(extra = {}) {
    return {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        ...extra
    };
}

function normalizeSharedSettings(parsed) {
    return {
        prices: (parsed && typeof parsed.prices === 'object' && parsed.prices) || {},
        updatedAt: parsed?.updated_at || parsed?.updatedAt || null,
        updatedBy: parsed?.updated_by || parsed?.updatedBy || 'unknown'
    };
}

async function readSharedSettingsFromSupabase() {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`);
    url.searchParams.set('id', `eq.${SETTINGS_ROW_ID}`);
    url.searchParams.set('select', 'prices,updated_at,updated_by');

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: getSupabaseHeaders({ Accept: 'application/json' })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Supabase read failed (${response.status}): ${text}`);
    }

    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) {
        const initial = {
            id: SETTINGS_ROW_ID,
            prices: {},
            updated_at: new Date().toISOString(),
            updated_by: 'system'
        };
        await writeSharedSettingsToSupabase(initial.prices, initial.updated_by, initial.updated_at);
        return normalizeSharedSettings(initial);
    }

    return normalizeSharedSettings(rows[0]);
}

async function writeSharedSettingsToSupabase(prices, updatedBy = 'user', updatedAt = new Date().toISOString()) {
    const payload = [{
        id: SETTINGS_ROW_ID,
        prices,
        updated_at: updatedAt,
        updated_by: updatedBy
    }];

    const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: getSupabaseHeaders({
            Prefer: 'resolution=merge-duplicates,return=representation'
        }),
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Supabase write failed (${response.status}): ${text}`);
    }

    const rows = await response.json();
    const saved = Array.isArray(rows) && rows[0] ? rows[0] : payload[0];
    return normalizeSharedSettings(saved);
}

async function ensureStorage() {
    await fsp.mkdir(STORAGE_DIR, { recursive: true });
    if (!fs.existsSync(SETTINGS_FILE)) {
        const initial = {
            prices: {},
            updatedAt: new Date().toISOString(),
            updatedBy: 'system'
        };
        await fsp.writeFile(SETTINGS_FILE, JSON.stringify(initial, null, 2));
    }
}

async function readSharedSettings() {
    if (USE_SUPABASE) {
        return readSharedSettingsFromSupabase();
    }

    await ensureStorage();
    const raw = await fsp.readFile(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return normalizeSharedSettings(parsed);
}

async function writeSharedSettings(prices, updatedBy = 'user') {
    if (USE_SUPABASE) {
        return writeSharedSettingsToSupabase(prices, updatedBy);
    }

    await ensureStorage();
    const payload = {
        prices,
        updatedAt: new Date().toISOString(),
        updatedBy
    };
    await fsp.writeFile(SETTINGS_FILE, JSON.stringify(payload, null, 2));
    return payload;
}

function collectJsonBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => {
            data += chunk;
            if (data.length > 1024 * 1024) {
                reject(new Error('Payload too large'));
                req.destroy();
            }
        });
        req.on('end', () => {
            try {
                resolve(data ? JSON.parse(data) : {});
            } catch (error) {
                reject(new Error('Invalid JSON body'));
            }
        });
        req.on('error', reject);
    });
}

async function handleSettingsApi(req, res) {
    if (req.method === 'GET') {
        const shared = await readSharedSettings();
        return sendJson(res, 200, shared);
    }

    if (req.method === 'PUT') {
        const body = await collectJsonBody(req);
        if (!body || typeof body !== 'object' || typeof body.prices !== 'object') {
            return sendJson(res, 400, { error: 'Body must include `prices` object.' });
        }

        const updatedBy = req.headers['x-user-name'] || 'employee';
        const saved = await writeSharedSettings(body.prices, String(updatedBy));
        return sendJson(res, 200, saved);
    }

    return sendJson(res, 405, { error: 'Method not allowed' });
}

async function serveStatic(req, res, pathname) {
    const safePath = pathname === '/' ? '/index.html' : pathname;
    const filePath = path.normalize(path.join(ROOT_DIR, safePath));

    if (!filePath.startsWith(ROOT_DIR)) {
        return sendText(res, 403, 'Forbidden');
    }

    try {
        const stat = await fsp.stat(filePath);
        if (stat.isDirectory()) {
            return serveStatic(req, res, path.join(safePath, 'index.html'));
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const data = await fsp.readFile(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    } catch (error) {
        if (error && error.code === 'ENOENT') {
            sendText(res, 404, 'Not Found');
            return;
        }
        console.error('Static file error:', error);
        sendText(res, 500, 'Internal Server Error');
    }
}

const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = decodeURIComponent(url.pathname);

        if (pathname === '/api/settings') {
            return await handleSettingsApi(req, res);
        }

        if (pathname === '/api/health') {
            return sendJson(res, 200, { ok: true, storage: USE_SUPABASE ? 'supabase' : 'local' });
        }

        return await serveStatic(req, res, pathname);
    } catch (error) {
        console.error('Server error:', error);
        sendText(res, 500, 'Internal Server Error');
    }
});

server.listen(PORT, HOST, () => {
    console.log(`HAUS SIGNS shared server running at http://localhost:${PORT}`);
    if (USE_SUPABASE) {
        console.log(`Shared settings backend: Supabase (${SUPABASE_TABLE}, row id ${SETTINGS_ROW_ID})`);
    } else {
        console.log(`Shared settings backend: local file (${SETTINGS_FILE})`);
        console.log('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to use Supabase.');
    }
});
