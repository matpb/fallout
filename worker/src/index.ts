// fallout-sync Worker. Token-authed character persistence backed by D1.
// See ../README.md for the design.

interface Env {
	DB: D1Database;
	CORS_ORIGINS: string;
}

interface CharacterRow {
	id: string;
	token_hash: string;
	payload: string;
	updated_at: number;
	server_at: number;
	created_at: number;
	deleted_at: number | null;
}

const enc = new TextEncoder();

async function sha256Hex(input: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', enc.encode(input));
	const bytes = new Uint8Array(buf);
	let out = '';
	for (const b of bytes) out += b.toString(16).padStart(2, '0');
	return out;
}

function corsHeaders(origin: string | null, allowed: Set<string>): Headers {
	const h = new Headers();
	// Echo the origin only when it's allow-listed — wildcard would let any site
	// read characters by token if a token ever leaks into a third-party page.
	if (origin && allowed.has(origin)) {
		h.set('Access-Control-Allow-Origin', origin);
		h.set('Vary', 'Origin');
	}
	h.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	h.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
	h.set('Access-Control-Max-Age', '86400');
	return h;
}

function jsonResponse(body: unknown, init: ResponseInit, extra: Headers): Response {
	const headers = new Headers(extra);
	headers.set('Content-Type', 'application/json; charset=utf-8');
	return new Response(JSON.stringify(body), { ...init, headers });
}

function getBearer(req: Request): string | null {
	const auth = req.headers.get('Authorization');
	if (!auth) return null;
	const m = auth.match(/^Bearer\s+(\S+)$/);
	return m ? m[1] : null;
}

interface CreateBody {
	id: string;
	payload: string;
	updatedAt: number;
}

interface UpsertBody {
	payload: string;
	updatedAt: number;
}

function isCreateBody(v: unknown): v is CreateBody {
	if (!v || typeof v !== 'object') return false;
	const o = v as Record<string, unknown>;
	return (
		typeof o.id === 'string' &&
		o.id.length > 0 &&
		o.id.length <= 128 &&
		typeof o.payload === 'string' &&
		o.payload.length > 0 &&
		o.payload.length <= 1_000_000 &&
		typeof o.updatedAt === 'number' &&
		Number.isFinite(o.updatedAt)
	);
}

function isUpsertBody(v: unknown): v is UpsertBody {
	if (!v || typeof v !== 'object') return false;
	const o = v as Record<string, unknown>;
	return (
		typeof o.payload === 'string' &&
		o.payload.length > 0 &&
		o.payload.length <= 1_000_000 &&
		typeof o.updatedAt === 'number' &&
		Number.isFinite(o.updatedAt)
	);
}

async function handleCreate(req: Request, env: Env, cors: Headers): Promise<Response> {
	const token = getBearer(req);
	if (!token) return jsonResponse({ error: 'missing_token' }, { status: 401 }, cors);

	let body: unknown;
	try {
		body = await req.json();
	} catch {
		return jsonResponse({ error: 'bad_json' }, { status: 400 }, cors);
	}
	if (!isCreateBody(body)) {
		return jsonResponse({ error: 'bad_request' }, { status: 400 }, cors);
	}

	const tokenHash = await sha256Hex(token);
	const now = Date.now();

	const existing = await env.DB.prepare(
		'SELECT token_hash, deleted_at FROM characters WHERE id = ?'
	)
		.bind(body.id)
		.first<{ token_hash: string; deleted_at: number | null }>();

	if (existing) {
		// If the row exists and the token matches, treat create as an upsert-from-fresh.
		// Anything else is a conflict (someone else's id, or a soft-deleted record).
		if (existing.token_hash !== tokenHash) {
			return jsonResponse({ error: 'id_taken' }, { status: 409 }, cors);
		}
	}

	await env.DB.prepare(
		`INSERT INTO characters (id, token_hash, payload, updated_at, server_at, created_at, deleted_at)
		 VALUES (?, ?, ?, ?, ?, ?, NULL)
		 ON CONFLICT(id) DO UPDATE SET
		 	payload = excluded.payload,
		 	updated_at = excluded.updated_at,
		 	server_at = excluded.server_at,
		 	deleted_at = NULL`
	)
		.bind(body.id, tokenHash, body.payload, body.updatedAt, now, now)
		.run();

	return jsonResponse({ id: body.id, server_at: now }, { status: 201 }, cors);
}

async function loadOwned(id: string, token: string, env: Env): Promise<CharacterRow | 'not_found' | 'forbidden'> {
	const row = await env.DB.prepare('SELECT * FROM characters WHERE id = ?')
		.bind(id)
		.first<CharacterRow>();
	if (!row) return 'not_found';
	const tokenHash = await sha256Hex(token);
	if (row.token_hash !== tokenHash) return 'forbidden';
	return row;
}

// Look up a character by token alone. Used by the /r/<token> recovery URL,
// where the client has only the token and needs the id+payload back. Returns
// 404 indistinguishably for "no such token" and "token matches a deleted row".
async function handleLookup(req: Request, env: Env, cors: Headers): Promise<Response> {
	const token = getBearer(req);
	if (!token) return jsonResponse({ error: 'missing_token' }, { status: 401 }, cors);
	const tokenHash = await sha256Hex(token);
	const row = await env.DB.prepare(
		'SELECT id, payload, updated_at, server_at FROM characters WHERE token_hash = ? AND deleted_at IS NULL LIMIT 1'
	)
		.bind(tokenHash)
		.first<{ id: string; payload: string; updated_at: number; server_at: number }>();
	if (!row) return jsonResponse({ error: 'not_found' }, { status: 404 }, cors);
	return jsonResponse(row, { status: 200 }, cors);
}

async function handleGet(id: string, req: Request, env: Env, cors: Headers): Promise<Response> {
	const token = getBearer(req);
	if (!token) return jsonResponse({ error: 'missing_token' }, { status: 401 }, cors);

	const row = await loadOwned(id, token, env);
	if (row === 'not_found') return jsonResponse({ error: 'not_found' }, { status: 404 }, cors);
	// Match-or-miss: indistinguishable 404 prevents token-existence probing across IDs.
	if (row === 'forbidden') return jsonResponse({ error: 'not_found' }, { status: 404 }, cors);
	if (row.deleted_at !== null) return jsonResponse({ error: 'not_found' }, { status: 404 }, cors);

	return jsonResponse(
		{
			id: row.id,
			payload: row.payload,
			updated_at: row.updated_at,
			server_at: row.server_at
		},
		{ status: 200 },
		cors
	);
}

async function handlePut(id: string, req: Request, env: Env, cors: Headers): Promise<Response> {
	const token = getBearer(req);
	if (!token) return jsonResponse({ error: 'missing_token' }, { status: 401 }, cors);

	let body: unknown;
	try {
		body = await req.json();
	} catch {
		return jsonResponse({ error: 'bad_json' }, { status: 400 }, cors);
	}
	if (!isUpsertBody(body)) {
		return jsonResponse({ error: 'bad_request' }, { status: 400 }, cors);
	}

	const row = await loadOwned(id, token, env);
	if (row === 'not_found') return jsonResponse({ error: 'not_found' }, { status: 404 }, cors);
	if (row === 'forbidden') return jsonResponse({ error: 'not_found' }, { status: 404 }, cors);

	// Conflict if server has a strictly-newer payload — client decides what to do.
	if (row.deleted_at === null && row.updated_at > body.updatedAt) {
		return jsonResponse(
			{
				error: 'conflict',
				server: {
					id: row.id,
					payload: row.payload,
					updated_at: row.updated_at,
					server_at: row.server_at
				}
			},
			{ status: 409 },
			cors
		);
	}

	const now = Date.now();
	await env.DB.prepare(
		`UPDATE characters
		 SET payload = ?, updated_at = ?, server_at = ?, deleted_at = NULL
		 WHERE id = ?`
	)
		.bind(body.payload, body.updatedAt, now, id)
		.run();

	return jsonResponse({ id, server_at: now }, { status: 200 }, cors);
}

async function handleDelete(id: string, req: Request, env: Env, cors: Headers): Promise<Response> {
	const token = getBearer(req);
	if (!token) return jsonResponse({ error: 'missing_token' }, { status: 401 }, cors);

	const row = await loadOwned(id, token, env);
	if (row === 'not_found') return jsonResponse({ error: 'not_found' }, { status: 404 }, cors);
	if (row === 'forbidden') return jsonResponse({ error: 'not_found' }, { status: 404 }, cors);

	const now = Date.now();
	await env.DB.prepare('UPDATE characters SET deleted_at = ?, server_at = ? WHERE id = ?')
		.bind(now, now, id)
		.run();

	return jsonResponse({ id, deleted_at: now }, { status: 200 }, cors);
}

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		const allowed = new Set(
			(env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)
		);
		const cors = corsHeaders(req.headers.get('Origin'), allowed);

		if (req.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: cors });
		}

		const url = new URL(req.url);
		const path = url.pathname.replace(/\/+$/, '');

		if (path === '/healthz') {
			return jsonResponse({ ok: true }, { status: 200 }, cors);
		}

		if (path === '/v1/characters' && req.method === 'POST') {
			return handleCreate(req, env, cors);
		}

		if (path === '/v1/lookup' && req.method === 'GET') {
			return handleLookup(req, env, cors);
		}

		const m = path.match(/^\/v1\/characters\/([A-Za-z0-9_\-]{1,128})$/);
		if (m) {
			const id = m[1];
			if (req.method === 'GET') return handleGet(id, req, env, cors);
			if (req.method === 'PUT') return handlePut(id, req, env, cors);
			if (req.method === 'DELETE') return handleDelete(id, req, env, cors);
			return jsonResponse({ error: 'method_not_allowed' }, { status: 405 }, cors);
		}

		return jsonResponse({ error: 'not_found' }, { status: 404 }, cors);
	}
};
