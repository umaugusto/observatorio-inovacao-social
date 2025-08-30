const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Sistema de labels inteligente
const LABEL_TYPES = {
  TEST: 'teste',
  REAL: 'real',
  FEATURED: 'destaque',
  DRAFT: 'rascunho'
};

// Função para gerar labels automaticamente
function generateAutoLabels(caso, user) {
  const labels = [];
  
  // Marcar como teste se for ambiente de desenvolvimento ou user específico
  if (user && (user.email?.includes('test') || user.role === 'teste')) {
    labels.push(LABEL_TYPES.TEST);
  }
  
  // Auto-marcar como rascunho se não estiver aprovado
  if (!caso.aprovado) {
    labels.push(LABEL_TYPES.DRAFT);
  }
  
  // Marcar como destaque se tiver critérios específicos
  if (caso.beneficiarios > 1000 || caso.impacto_score > 8) {
    labels.push(LABEL_TYPES.FEATURED);
  }
  
  return labels;
}

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
          // Listar todos os casos com filtros e labels
          const { aprovado, categoria, regiao, search, labels, exclude_test } = queryStringParameters || {};
          
          let query = supabase
            .from('casos')
            .select(`
              *,
              labels,
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
            query = query.or(`titulo.ilike.%${search}%,descricao_resumo.ilike.%${search}%,organizacao.ilike.%${search}%`);
          }

          // Filtro por labels
          if (labels) {
            const labelArray = labels.split(',');
            query = query.contains('labels', labelArray);
          }
          
          // Excluir casos de teste se solicitado
          if (exclude_test === 'true') {
            query = query.not('labels', 'cs', `["${LABEL_TYPES.TEST}"]`);
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
        
        // Extrair informações do usuário se disponível
        const authHeader = event.headers.authorization;
        let user = null;
        if (authHeader) {
          // TODO: Decodificar token JWT para obter dados do usuário
          // Por enquanto, aceitar dados do usuário no body se disponível
          user = casoData.user || null;
        }
        
        // Gerar labels automáticas
        const autoLabels = generateAutoLabels(casoData, user);
        const finalLabels = [...(casoData.labels || []), ...autoLabels];
        
        const { data: newCaso, error: createError } = await supabase
          .from('casos')
          .insert({
            ...casoData,
            labels: finalLabels,
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
        
        // Se as labels não foram explicitamente fornecidas, regenerar automaticamente
        if (!updateData.labels) {
          const user = updateData.user || null;
          const autoLabels = generateAutoLabels(updateData, user);
          updateData.labels = autoLabels;
        }
        
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