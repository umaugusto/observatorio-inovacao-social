const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('./auth-utils');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event, context) => {
  console.log('🚀 Function user-management started');
  
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
    // Require valid Auth0 token for protected endpoints
    const auth = await requireAuth(event);
    if (!auth.ok) {
      return { statusCode: auth.statusCode, headers, body: JSON.stringify(auth.body) };
    }
    const method = event.httpMethod;
    const path = event.path;
    const body = event.body ? JSON.parse(event.body) : {};

    // Verificar autenticação (simplificado para desenvolvimento)
    // Em produção, validar o token Auth0
    
    switch (method) {
      case 'GET':
        if (path.includes('/users')) {
          return await handleGetUsers(headers);
        } else if (path.includes('/pending')) {
          return await handleGetPendingUsers(headers);
        }
        break;
        
      case 'PUT':
        if (path.includes('/approve')) {
          return await handleApproveUser(headers, body);
        } else if (path.includes('/reject')) {
          return await handleRejectUser(headers, body);
        } else if (path.includes('/update')) {
          return await handleUpdateUser(headers, body);
        }
        break;
        
      case 'DELETE':
        return await handleDeleteUser(headers, body);
        
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

  } catch (error) {
    console.error('❌ Error in user-management:', error);
    
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

async function handleGetUsers(headers) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Converter para camelCase
  const users = data.map(user => ({
    id: user.id,
    auth0Id: user.auth0_id,
    email: user.email,
    name: user.name,
    role: user.role,
    isAdmin: user.is_admin,
    isRoot: user.is_root,
    approved: user.approved,
    emailVerified: user.email_verified,
    picture: user.picture,
    createdAt: user.created_at,
    lastLogin: user.last_login
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(users)
  };
}

async function handleGetPendingUsers(headers) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('approved', false)
    .eq('is_root', false)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Converter para camelCase
  const users = data.map(user => ({
    id: user.id,
    auth0Id: user.auth0_id,
    email: user.email,
    name: user.name,
    role: user.role,
    isAdmin: user.is_admin,
    isRoot: user.is_root,
    approved: user.approved,
    emailVerified: user.email_verified,
    picture: user.picture,
    createdAt: user.created_at,
    lastLogin: user.last_login
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(users)
  };
}

async function handleApproveUser(headers, body) {
  const { userId, role } = body;

  const { data, error } = await supabase
    .from('users')
    .update({
      approved: true,
      role: role || 'visitante',
      is_admin: ['extensionista', 'pesquisador'].includes(role),
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  console.log(`✅ User approved: ${data.email} as ${role}`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      id: data.id,
      auth0Id: data.auth0_id,
      email: data.email,
      name: data.name,
      role: data.role,
      isAdmin: data.is_admin,
      isRoot: data.is_root,
      approved: data.approved,
      emailVerified: data.email_verified,
      picture: data.picture,
      createdAt: data.created_at,
      lastLogin: data.last_login
    })
  };
}

async function handleRejectUser(headers, body) {
  const { userId, reason } = body;

  // Marcar como rejeitado ou deletar
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) throw error;

  console.log(`❌ User rejected and deleted: ${userId}`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'User rejected and removed' })
  };
}

async function handleUpdateUser(headers, body) {
  const { userId, updates } = body;

  // Converter camelCase para snake_case
  const dbUpdates = {};
  if (updates.role) dbUpdates.role = updates.role;
  if (updates.isAdmin !== undefined) dbUpdates.is_admin = updates.isAdmin;
  if (updates.approved !== undefined) dbUpdates.approved = updates.approved;
  if (updates.name) dbUpdates.name = updates.name;
  
  dbUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('users')
    .update(dbUpdates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  console.log(`🔄 User updated: ${data.email}`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      id: data.id,
      auth0Id: data.auth0_id,
      email: data.email,
      name: data.name,
      role: data.role,
      isAdmin: data.is_admin,
      isRoot: data.is_root,
      approved: data.approved,
      emailVerified: data.email_verified,
      picture: data.picture,
      createdAt: data.created_at,
      lastLogin: data.last_login
    })
  };
}

async function handleDeleteUser(headers, body) {
  const { userId } = body;

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)
    .eq('is_root', false); // Não permitir deletar root

  if (error) throw error;

  console.log(`🗑️ User deleted: ${userId}`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'User deleted successfully' })
  };
}
