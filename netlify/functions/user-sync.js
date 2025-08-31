const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event, context) => {
  console.log('🚀 Function user-sync started');
  
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    const { user, auth0Data } = JSON.parse(event.body);
    
    console.log('📝 Processing user:', user.email);

    // Verificar se o usuário já existe
    let { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('auth0_id', user.sub)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }

    let userData;

    if (existingUser) {
      console.log('👤 Existing user found, updating login time');
      
      // Atualizar último login
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
      console.log('➕ New user, creating in database');
      
      // Determinar se é usuário root baseado no email
      const isRoot = user.email === 'antonio.aas@ufrj.br';
      
      // Criar novo usuário
      const { data, error } = await supabase
        .from('users')
        .insert({
          auth0_id: user.sub,
          email: user.email,
          name: user.name || user.nickname,
          role: isRoot ? 'pesquisador' : 'visitante',
          is_admin: isRoot,
          is_root: isRoot,
          approved: isRoot, // Root é automaticamente aprovado
          email_verified: user.email_verified || false,
          picture: user.picture,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
          user_metadata: user.user_metadata || {},
          app_metadata: user.app_metadata || {}
        })
        .select()
        .single();

      if (error) throw error;
      userData = data;

      if (isRoot) {
        console.log('👑 Root user created successfully');
      }
    }

    // Converter snake_case para camelCase para o frontend
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
      lastLogin: userData.last_login,
      userMetadata: userData.user_metadata,
      appMetadata: userData.app_metadata
    };

    console.log('✅ User sync completed:', frontendUser.email);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(frontendUser)
    };

  } catch (error) {
    console.error('❌ Error in user-sync:', error);
    
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