const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: 'Method not allowed' })
    };
  }

  try {
    const { userData } = JSON.parse(event.body || '{}');
    if (!userData || !userData.email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: 'Email is required' })
      };
    }

    const email = String(userData.email).toLowerCase().trim();
    const name = (userData.name || '').toString().trim() || email.split('@')[0];
    const role = (userData.user_type || 'visitante').toString();
    const is_admin = role === 'pesquisador';

    // Build insert payload restricted to commonly available columns
    const payload = {
      email,
      name,
      role,
      is_admin,
      updated_at: new Date().toISOString(),
    };

    // Optional fields if table supports them (will be ignored by Supabase if missing via filtered insert)
    if (userData.institutional_email) payload.institutional_email = userData.institutional_email;

    // Upsert by unique email
    const { data, error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'email' })
      .select()
      .single();

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, message: error.message })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, user: data })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: err.message || 'Internal error' })
    };
  }
};

