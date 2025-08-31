const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { user } = JSON.parse(event.body || '{}');
    if (!user || !user.email || !user.sub) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid user payload' }) };
    }

    // Try to find existing user
    let { data: existingUser, error: selErr } = await supabase
      .from('users')
      .select('*')
      .eq('auth0_id', user.sub)
      .single();

    if (selErr && selErr.code !== 'PGRST116') throw selErr;

    let userData;
    if (existingUser) {
      const { data, error } = await supabase
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          name: user.name || user.nickname || existingUser.name
        })
        .eq('id', existingUser.id)
        .select()
        .single();
      if (error) throw error;
      userData = data;
    } else {
      const isRoot = user.email === 'antonio.aas@ufrj.br';
      const insertPayload = {
        auth0_id: user.sub,
        email: user.email,
        name: user.name || user.nickname || (user.email || '').split('@')[0],
        role: isRoot ? 'pesquisador' : 'visitante',
        is_admin: !!isRoot,
        is_root: !!isRoot,
        approved: !!isRoot,
        email_verified: !!user.email_verified,
        picture: user.picture || null,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      };
      const { data, error } = await supabase
        .from('users')
        .insert(insertPayload)
        .select()
        .single();
      if (error) throw error;
      userData = data;
    }

    const frontendUser = {
      id: userData.id,
      auth0Id: userData.auth0_id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      isAdmin: userData.is_admin,
      isRoot: userData.is_root,
      approved: userData.approved,
      emailVerified: userData.email_verified,
      picture: userData.picture,
      createdAt: userData.created_at,
      lastLogin: userData.last_login
    };

    return { statusCode: 200, headers, body: JSON.stringify(frontendUser) };
  } catch (error) {
    console.error('user-sync error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error', message: error.message }) };
  }
};

