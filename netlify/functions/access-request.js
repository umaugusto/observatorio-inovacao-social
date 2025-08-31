const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event, context) => {
  console.log('🚀 Function access-request started');
  
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
    const method = event.httpMethod;
    
    switch (method) {
      case 'POST':
        return await handleCreateAccessRequest(event, headers);
      case 'GET':
        return await handleGetAccessRequests(event, headers);
      case 'PUT':
        return await handleUpdateAccessRequest(event, headers);
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

  } catch (error) {
    console.error('❌ Error in access-request:', error);
    
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

async function handleCreateAccessRequest(event, headers) {
  const { name, email, password, role, justification } = JSON.parse(event.body);
  
  console.log('📝 Creating access request for:', email);

  // Validações
  if (!name || !email || !password || !role || !justification) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Todos os campos são obrigatórios' })
    };
  }

  if (password.length < 6) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'A senha deve ter pelo menos 6 caracteres' })
    };
  }

  // Verificar se já existe uma solicitação pendente para este email
  const { data: existingRequest } = await supabase
    .from('access_requests')
    .select('id, status')
    .eq('email', email)
    .eq('status', 'pending')
    .single();

  if (existingRequest) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({ error: 'Já existe uma solicitação pendente para este email' })
    };
  }

  // Verificar se já existe um usuário com este email
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({ error: 'Já existe um usuário cadastrado com este email' })
    };
  }

  // Hash da senha
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

  // Criar solicitação
  const { data, error } = await supabase
    .from('access_requests')
    .insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash: hashedPassword,
      role: role,
      justification: justification.trim(),
      status: 'pending',
      requested_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    throw new Error('Erro ao salvar solicitação');
  }

  console.log('✅ Access request created:', data.id);

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      message: 'Solicitação criada com sucesso',
      requestId: data.id
    })
  };
}

async function handleGetAccessRequests(event, headers) {
  // Buscar todas as solicitações pendentes
  const { data, error } = await supabase
    .from('access_requests')
    .select('*')
    .order('requested_at', { ascending: false });

  if (error) throw error;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(data || [])
  };
}

async function handleUpdateAccessRequest(event, headers) {
  const { requestId, action, approvedBy, reason } = JSON.parse(event.body);
  
  if (!requestId || !action || !approvedBy) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'requestId, action e approvedBy são obrigatórios' })
    };
  }

  if (action === 'approve') {
    return await approveAccessRequest(requestId, approvedBy, headers);
  } else if (action === 'reject') {
    return await rejectAccessRequest(requestId, approvedBy, reason, headers);
  } else {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Action deve ser approve ou reject' })
    };
  }
}

async function approveAccessRequest(requestId, approvedBy, headers) {
  console.log('✅ Approving access request:', requestId);

  // Buscar a solicitação
  const { data: request, error: fetchError } = await supabase
    .from('access_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Solicitação não encontrada' })
    };
  }

  if (request.status !== 'pending') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Solicitação já foi processada' })
    };
  }

  try {
    // 1. Criar usuário na tabela users
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        email: request.email,
        name: request.name,
        role: request.role,
        is_admin: ['extensionista', 'pesquisador'].includes(request.role),
        is_root: false,
        approved: true,
        email_verified: false,
        created_at: new Date().toISOString(),
        created_by: approvedBy,
        // Dados temporários para Auth0 sync posterior
        auth0_id: `temp-${request.id}`,
        password_hash: request.password_hash
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user:', userError);
      throw userError;
    }

    // 2. Atualizar solicitação como aprovada
    const { error: updateError } = await supabase
      .from('access_requests')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        user_id: newUser.id
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating request:', updateError);
      throw updateError;
    }

    console.log('✅ User approved and created:', newUser.email);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Usuário aprovado com sucesso',
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role
        }
      })
    };

  } catch (error) {
    console.error('Error in approval process:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro no processo de aprovação' })
    };
  }
}

async function rejectAccessRequest(requestId, rejectedBy, reason, headers) {
  console.log('❌ Rejecting access request:', requestId);

  const { data, error } = await supabase
    .from('access_requests')
    .update({
      status: 'rejected',
      rejected_by: rejectedBy,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    console.error('Error rejecting request:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro ao rejeitar solicitação' })
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Solicitação rejeitada com sucesso'
    })
  };
}