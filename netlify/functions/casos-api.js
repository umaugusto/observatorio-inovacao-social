const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// casos-api: GET mock list (for compatibility) and POST to create real cases
const { requireAuth } = require('./auth-utils');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod === 'GET') {
      // Try to fetch real data from Supabase first
      try {
        const { data: casosFromDB, error } = await supabase
          .from('casos')
          .select(`
            id,
            titulo,
            categoria,
            regiao,
            organizacao,
            status,
            descricao_resumo,
            descricao_completa,
            publico_alvo,
            beneficiarios,
            data_inicio,
            contato,
            site,
            image_url,
            metodologia,
            desafios,
            responsavel_cadastro,
            tags,
            impactos,
            aprovado,
            created_at,
            updated_at
          `)
          .eq('aprovado', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        // Map snake_case to camelCase for frontend
        const casos = casosFromDB.map(caso => ({
          id: caso.id,
          titulo: caso.titulo,
          categoria: caso.categoria,
          regiao: caso.regiao,
          organizacao: caso.organizacao,
          status: caso.status,
          descricaoResumo: caso.descricao_resumo,
          descricaoCompleta: caso.descricao_completa,
          publicoAlvo: caso.publico_alvo,
          beneficiarios: caso.beneficiarios,
          dataInicio: caso.data_inicio,
          dataCadastro: caso.created_at,
          contato: caso.contato,
          site: caso.site,
          imagemUrl: caso.image_url,
          metodologia: caso.metodologia,
          desafios: caso.desafios,
          responsavelCadastro: caso.responsavel_cadastro,
          tags: caso.tags,
          impactos: caso.impactos,
          aprovado: caso.aprovado
        }));

        console.log(`Returning ${casos.length} casos from database`);
        return { statusCode: 200, headers, body: JSON.stringify({ casos }) };

      } catch (dbError) {
        console.error('Database fetch failed, falling back to mock data:', dbError);
        
        // Fallback to mock data if database fails
        const mockCasos = [
          {
            id: 1,
            titulo: 'Horta Comunitária da Providência',
            categoria: 'Meio Ambiente',
            regiao: 'Centro',
            descricaoResumo: 'Transformação de área degradada em espaço produtivo',
            organizacao: 'Coletivo Verde Urbano',
            beneficiarios: 150,
            aprovado: true,
            dataCadastro: new Date().toISOString(),
            imagemUrl: 'https://images.pexels.com/photos/1301856/pexels-photo-1301856.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop'
          },
          {
            id: 2,
            titulo: 'Biblioteca Móvel Zona Oeste',
            categoria: 'Educação',
            regiao: 'Campo Grande',
            descricaoResumo: 'Ônibus adaptado que leva literatura e atividades educativas para comunidades',
            organizacao: 'Instituto Leitura Para Todos',
            beneficiarios: 800,
            aprovado: true,
            dataCadastro: new Date().toISOString(),
            imagemUrl: 'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop'
          }
        ];
        return { statusCode: 200, headers, body: JSON.stringify({ casos: mockCasos }) };
      }
    }

    if (event.httpMethod === 'POST') {
      const auth = await requireAuth(event);
      if (!auth.ok) {
        return { statusCode: auth.statusCode, headers, body: JSON.stringify(auth.body) };
      }
      const { caso } = JSON.parse(event.body || '{}');
      if (!caso || !caso.titulo) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, message: 'Dados do caso são obrigatórios' }),
        };
      }

      // Map camelCase to snake_case for DB
      const mapCaso = (c) => ({
        titulo: c.titulo,
        categoria: c.categoria,
        regiao: c.regiao,
        organizacao: c.organizacao,
        status: c.status,
        descricao_resumo: c.descricaoResumo,
        descricao_completa: c.descricaoCompleta,
        publico_alvo: c.publicoAlvo,
        beneficiarios: c.beneficiarios,
        data_inicio: c.dataInicio,
        contato: c.contato,
        site: c.site,
        image_url: c.imagemUrl,
        metodologia: c.metodologia,
        desafios: c.desafios,
        responsavel_cadastro: c.responsavelCadastro,
        tags: c.tags,
        impactos: c.impactos,
        aprovado: c.aprovado === true ? true : false,
        user_id: c.user_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const payload = mapCaso(caso);

      const { data, error } = await supabase
        .from('casos')
        .insert(payload)
        .select()
        .single();

      if (error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, message: error.message, code: error.code }),
        };
      }

      return { statusCode: 201, headers, body: JSON.stringify({ success: true, caso: data }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Method not allowed' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: err.message }) };
  }
};
