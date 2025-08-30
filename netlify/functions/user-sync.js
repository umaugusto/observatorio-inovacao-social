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
    const { data, error } = await supabase
      .from('users')
      .upsert({
        auth0_id: user.sub,
        email: user.email,
        name: user.name || user.nickname || user.email?.split('@')[0],
        role: 'visitante',
        is_admin: false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'auth0_id'
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