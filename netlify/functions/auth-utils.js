const { createRemoteJWKSet, jwtVerify } = require('jose');

const domain = process.env.AUTH0_DOMAIN;
const audience = process.env.AUTH0_AUDIENCE; // opcional

let jwks;
function getJwks() {
  if (!jwks) {
    if (!domain) throw new Error('AUTH0_DOMAIN not configured');
    const url = new URL(`https://${domain}/.well-known/jwks.json`);
    jwks = createRemoteJWKSet(url);
  }
  return jwks;
}

async function verifyAuth0Token(token) {
  if (!token) throw new Error('Missing token');
  const JWKS = getJwks();
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

