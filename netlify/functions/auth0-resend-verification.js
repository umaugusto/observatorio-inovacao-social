const https = require('https');

exports.handler = async (event, context) => {
  console.log('🚀 Function auth0-resend-verification started');
  
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { userId } = JSON.parse(event.body);
    
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID is required' })
      };
    }

    console.log('📧 Resending verification email for user:', userId);

    // Auth0 Management API call to resend verification email
    const domain = process.env.AUTH0_DOMAIN;
    const clientId = process.env.AUTH0_CLIENT_ID;
    const clientSecret = process.env.AUTH0_CLIENT_SECRET;

    if (!domain || !clientId || !clientSecret) {
      throw new Error('Auth0 credentials not configured');
    }

    // Get Management API token
    const tokenResponse = await getManagementToken(domain, clientId, clientSecret);
    const accessToken = tokenResponse.access_token;

    // Send verification email
    const result = await resendVerificationEmail(domain, accessToken, userId);

    console.log('✅ Verification email sent successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Verification email sent successfully',
        result 
      })
    };

  } catch (error) {
    console.error('❌ Error in auth0-resend-verification:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};

function getManagementToken(domain, clientId, clientSecret) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}/api/v2/`,
      grant_type: 'client_credentials'
    });

    const options = {
      hostname: domain,
      port: 443,
      path: '/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Auth0 token request failed: ${res.statusCode} ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function resendVerificationEmail(domain, accessToken, userId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      user_id: userId
    });

    const options = {
      hostname: domain,
      port: 443,
      path: '/api/v2/jobs/verification-email',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Verification email request failed: ${res.statusCode} ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}