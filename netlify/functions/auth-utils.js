const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const domain = process.env.AUTH0_DOMAIN;
const audience = process.env.AUTH0_AUDIENCE; // opcional

// Lazy-initialized JWKS client
let client;
function getClient() {
  if (!client) {
    if (!domain) throw new Error('AUTH0_DOMAIN not configured');
    client = jwksClient({
      jwksUri: `https://${domain}/.well-known/jwks.json`,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 10 * 60 * 1000,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }
  return client;
}

function getKey(header, callback) {
  const c = getClient();
  c.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

function verifyAuth0Token(token) {
  if (!token) return Promise.reject(new Error('Missing token'));
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        issuer: `https://${domain}/`,
        audience: audience || undefined,
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      }
    );
  });
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
