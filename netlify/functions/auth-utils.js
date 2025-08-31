const domain = process.env.AUTH0_DOMAIN;
const audience = process.env.AUTH0_AUDIENCE; // opcional

let jwksPromise;
async function getJwks() {
  if (!jwksPromise) {
    if (!domain) throw new Error('AUTH0_DOMAIN not configured');
    const { createRemoteJWKSet } = await import('jose');
    const url = new URL(`https://${domain}/.well-known/jwks.json`);
    jwksPromise = createRemoteJWKSet(url);
  }
  return jwksPromise;
}

async function verifyAuth0Token(token) {
  if (!token) throw new Error('Missing token');
  const { jwtVerify } = await import('jose');
  const JWKS = await getJwks();
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://${domain}/`,
    audience: audience || undefined,
  });
  return payload; // contains sub, email, etc.
}

function getBearerToken(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice('Bearer '.length);
}

async function requireAuth(event) {
  const token = getBearerToken(event);
  if (!token) {
    return { ok: false, statusCode: 401, body: { error: 'Unauthorized' } };
  }
  try {
    const payload = await verifyAuth0Token(token);
    return { ok: true, payload };
  } catch (err) {
    return { ok: false, statusCode: 401, body: { error: 'Invalid token', message: err.message } };
  }
}

module.exports = { verifyAuth0Token, requireAuth, getBearerToken };
