const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
    const id = queryStringParameters?.id;

    switch (httpMethod) {
      case 'GET':
        if (id) {
          // Buscar caso específico
          const { data, error } = await supabase
            .from('casos')
            .select(`
              *,
              users!casos_user_id_fkey(id, name, email, role, is_admin)
            `)
            .eq('id', id)
            .single();

          if (error) throw error;

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ caso: data })
          };
        } else {
          // Listar todos os casos com filtros
          const { aprovado, categoria, regiao, search } = queryStringParameters || {};
          
          let query = supabase
            .from('casos')
            .select(`
              *,
              users!casos_user_id_fkey(id, name, email, role, is_admin)
            `);

          if (aprovado !== undefined) {
            query = query.eq('aprovado', aprovado === 'true');
          }

          if (categoria) {
            query = query.eq('categoria', categoria);
          }

          if (regiao) {
            query = query.eq('regiao', regiao);
          }

          if (search) {
            query = query.or(`titulo.ilike.%${search}%,descricao_resumo.ilike.%${search}%`);
          }

          query = query.order('created_at', { ascending: false });

          const { data, error } = await query;
          if (error) throw error;

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ casos: data || [] })
          };
        }

      case 'POST':
        const casoData = JSON.parse(event.body);
        
        const { data: newCaso, error: createError } = await supabase
          .from('casos')
          .insert({
            ...casoData,
            aprovado: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select(`
            *,
            users!casos_user_id_fkey(id, name, email, role, is_admin)
          `)
          .single();

        if (createError) throw createError;

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ caso: newCaso })
        };

      case 'PUT':
        if (!id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID is required for update' })
          };
        }

        const updateData = JSON.parse(event.body);
        
        const { data: updatedCaso, error: updateError } = await supabase
          .from('casos')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select(`
            *,
            users!casos_user_id_fkey(id, name, email, role, is_admin)
          `)
          .single();

        if (updateError) throw updateError;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ caso: updatedCaso })
        };

      case 'DELETE':
        if (!id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID is required for delete' })
          };
        }

        const { error: deleteError } = await supabase
          .from('casos')
          .delete()
          .eq('id', id);

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