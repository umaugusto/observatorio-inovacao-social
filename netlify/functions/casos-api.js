const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// casos-api: GET mock list (for compatibility) and POST to create real cases
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
      // Keep a minimal GET response so the app can load without DB
      const mockCasos = [
        {
          id: '1',
          titulo: 'Horta Comunitária da Providência',
          categoria: 'Meio Ambiente',
          regiao: 'Centro',
          descricao_resumo: 'Transformação de área degradada em espaço produtivo',
          organizacao: 'Coletivo Verde Urbano',
          beneficiarios: 150,
          aprovado: true,
          labels: ['real'],
          created_at: new Date().toISOString(),
        },
      ];
      return { statusCode: 200, headers, body: JSON.stringify({ casos: mockCasos }) };
    }

    if (event.httpMethod === 'POST') {
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
        imagem_url: c.imagemUrl,
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
