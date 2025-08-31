const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const { requireAuth } = require('./auth-utils');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { httpMethod, queryStringParameters } = event;
    const casoId = queryStringParameters?.caso_id;
    const commentId = queryStringParameters?.id;

    switch (httpMethod) {
      case 'GET':
        if (!casoId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'caso_id is required' })
          };
        }

        const aprovadosOnly = queryStringParameters?.aprovados !== 'false';
        
        let query = supabase
          .from('comentarios')
          .select(`
            *,
            users!comentarios_user_id_fkey(id, name, email, role, is_admin)
          `)
          .eq('caso_id', casoId);

        if (aprovadosOnly) {
          query = query.eq('aprovado', true);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ comentarios: data || [] })
        };

      case 'POST':
        {
          const auth = await requireAuth(event);
          if (!auth.ok) {
            return { statusCode: auth.statusCode, headers, body: JSON.stringify(auth.body) };
          }
        const { caso_id, user_id, texto } = JSON.parse(event.body);
        
        if (!caso_id || !user_id || !texto) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'caso_id, user_id, and texto are required' })
          };
        }

        const { data: newComment, error: createError } = await supabase
          .from('comentarios')
          .insert({
            caso_id,
            user_id,
            texto,
            aprovado: false,
            created_at: new Date().toISOString()
          })
          .select(`
            *,
            users!comentarios_user_id_fkey(id, name, email, role, is_admin)
          `)
          .single();

        if (createError) throw createError;

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ comentario: newComment })
        };

      case 'PUT':
        {
          const auth = await requireAuth(event);
          if (!auth.ok) {
            return { statusCode: auth.statusCode, headers, body: JSON.stringify(auth.body) };
          }
        if (!commentId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Comment ID is required for update' })
          };
        }

        const updateData = JSON.parse(event.body);
        
        const { data: updatedComment, error: updateError } = await supabase
          .from('comentarios')
          .update(updateData)
          .eq('id', commentId)
          .select(`
            *,
            users!comentarios_user_id_fkey(id, name, email, role, is_admin)
          `)
          .single();

        if (updateError) throw updateError;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ comentario: updatedComment })
        };

      case 'DELETE':
        {
          const auth = await requireAuth(event);
          if (!auth.ok) {
            return { statusCode: auth.statusCode, headers, body: JSON.stringify(auth.body) };
          }
        if (!commentId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Comment ID is required for delete' })
          };
        }

        const { error: deleteError } = await supabase
          .from('comentarios')
          .delete()
          .eq('id', commentId);

        if (deleteError) throw deleteError;

        return {
          statusCode: 204,
          headers,
          body: ''
        };

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: err.message })
    };
  }
};
