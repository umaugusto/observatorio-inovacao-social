exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Method not allowed' }) };
  }

  try {
    const { email } = JSON.parse(event.body || '{}');
    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Email is required' }) };
    }

    const domain = process.env.AUTH0_DOMAIN; // e.g. dev-xxxx.us.auth0.com
    const clientId = process.env.AUTH0_MGMT_CLIENT_ID || process.env.AUTH0_CLIENT_ID; // prefer dedicated M2M
    const clientSecret = process.env.AUTH0_MGMT_CLIENT_SECRET || process.env.AUTH0_CLIENT_SECRET;

    if (!domain || !clientId || !clientSecret) {
      const missing = [
        !domain && 'AUTH0_DOMAIN',
        !clientId && 'AUTH0_MGMT_CLIENT_ID|AUTH0_CLIENT_ID',
        !clientSecret && 'AUTH0_MGMT_CLIENT_SECRET|AUTH0_CLIENT_SECRET'
      ].filter(Boolean);
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Auth0 env not configured', missing }) };
    }

    // 1) Get Management API token
    const tokenRes = await fetch(`https://${domain}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        audience: `https://${domain}/api/v2/`
      })
    });
    if (!tokenRes.ok) {
      const t = await tokenRes.text();
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Failed to get management token', details: t }) };
    }
    const { access_token } = await tokenRes.json();

    // 2) Find user by email to get user_id
    const userRes = await fetch(`https://${domain}/api/v2/users-by-email?email=${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    if (!userRes.ok) {
      const t = await userRes.text();
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Failed to fetch user', details: t }) };
    }
    const users = await userRes.json();
    const user = Array.isArray(users) ? users.find(u => u && u.user_id) : null;
    if (!user) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, message: 'User not found in Auth0 for this email' }) };
    }

    // 3) Trigger verification email job
    const jobRes = await fetch(`https://${domain}/api/v2/jobs/verification-email`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_id: user.user_id })
    });
    if (!jobRes.ok) {
      const t = await jobRes.text();
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Failed to enqueue verification email', details: t }) };
    }

    const job = await jobRes.json();
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, job }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: err.message || 'Internal error' }) };
  }
};
