// Simple casos-api function - minimal version
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
    // For now, return mock data to ensure deployment works
    const mockCasos = [
      {
        id: "1",
        titulo: "Horta Comunitária da Providência",
        categoria: "Meio Ambiente",
        regiao: "Centro",
        descricao_resumo: "Transformação de área degradada em espaço produtivo",
        organizacao: "Coletivo Verde Urbano",
        beneficiarios: 150,
        aprovado: true,
        labels: ["real"],
        created_at: new Date().toISOString()
      },
      {
        id: "2", 
        titulo: "Biblioteca Móvel Zona Oeste",
        categoria: "Educação",
        regiao: "Campo Grande",
        descricao_resumo: "Ônibus adaptado que leva literatura para comunidades",
        organizacao: "Instituto Leitura Para Todos",
        beneficiarios: 800,
        aprovado: true,
        labels: ["real"],
        created_at: new Date().toISOString()
      }
    ];

    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ casos: mockCasos })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'API funcionando - versão simplificada' })
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: err.message })
    };
  }
};