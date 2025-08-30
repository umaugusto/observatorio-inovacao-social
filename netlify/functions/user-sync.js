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

  try {
    console.log('📥 Event:', { method: event.httpMethod, body: event.body });
    
    // Verificar se é POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const { user } = JSON.parse(event.body);
    console.log('👤 User data received:', { sub: user?.sub, email: user?.email, name: user?.name });

    if (!user || !user.sub) {
      console.error('❌ Invalid user data:', user);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid user data' })
      };
    }

    // Verificar variáveis de ambiente
    console.log('🔧 Environment check:', {
      hasUrl: !!process.env.SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_SERVICE_KEY,
      url: process.env.SUPABASE_URL
    });

    // Criar ou atualizar usuário no Supabase
    console.log('💾 Attempting Supabase upsert...');
    
    // Dados do usuário para inserção/atualização
    const userData = {
      email: user.email,
      name: user.name || user.nickname || user.email?.split('@')[0],
      updated_at: new Date().toISOString()
    };

    // Para usuários Auth0 (login social)
    if (user.sub) {
      userData.auth0_id = user.sub;
    }

    // Configurar tipo de usuário
    if (user.user_type) {
      userData.user_type = user.user_type;
      userData.role = user.user_type;
    } else {
      userData.user_type = 'visitante';
      userData.role = 'visitante';
    }

    // Email institucional para extensionistas e pesquisadores
    if (user.institutional_email) {
      userData.institutional_email = user.institutional_email;
    }

    // Configurar admin baseado no tipo
    userData.is_admin = (userData.user_type === 'pesquisador');

    const { data, error } = await supabase
      .from('users')
      .upsert(userData, {
        onConflict: user.sub ? 'auth0_id' : 'email'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database error', 
          details: error.message,
          code: error.code 
        })
      };
    }

    console.log('✅ User upserted successfully:', data);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ user: data })
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};