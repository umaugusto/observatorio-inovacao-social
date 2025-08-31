#!/usr/bin/env node

// Script simplificado para criar casos sem campo de imagem
const casosSimples = [
  {
    titulo: "Horta Comunitária da Providência",
    categoria: "Meio Ambiente",
    regiao: "Centro",
    organizacao: "Coletivo Verde Urbano",
    status: "Em andamento",
    descricaoResumo: "Transformação de área degradada em espaço produtivo que beneficia 150 famílias com alimentos orgânicos e geração de renda.",
    descricaoCompleta: "O projeto Horta Comunitária da Providência nasceu da necessidade de aproveitar um espaço urbano subutilizado no coração do Centro do Rio. Através da mobilização de moradores locais e apoio de ONGs ambientais, a iniciativa transformou uma área de 500m² anteriormente degradada em um próspero espaço de agricultura urbana.",
    publicoAlvo: "Famílias de baixa renda da comunidade da Providência",
    beneficiarios: 150,
    dataInicio: "2023-03-15",
    responsavelCadastro: "Maria Silva - Extensão UFRJ",
    contato: "contato@verdeurbano.org.br",
    site: "https://verdeurbano.org.br",
    metodologia: "Agricultura urbana participativa utilizando técnicas de permacultura, compostagem de resíduos orgânicos locais e sistema de captação de água da chuva.",
    desafios: "Acesso limitado à água durante períodos de seca, necessidade constante de formação técnica para novos participantes.",
    impactos: ["Produção de 2 toneladas de alimentos orgânicos mensais", "Geração de renda complementar para 40 famílias"],
    tags: ["agricultura urbana", "sustentabilidade", "geração de renda"],
    aprovado: true
  },
  {
    titulo: "Biblioteca Móvel Zona Oeste",
    categoria: "Educação", 
    regiao: "Campo Grande",
    organizacao: "Instituto Leitura Para Todos",
    status: "Em andamento",
    descricaoResumo: "Ônibus adaptado que leva literatura e atividades educativas para comunidades com baixo acesso a equipamentos culturais.",
    descricaoCompleta: "A Biblioteca Móvel é uma iniciativa inovadora que quebra barreiras geográficas e sociais no acesso à educação e cultura. Um ônibus especialmente adaptado percorre semanalmente diferentes pontos da Zona Oeste do Rio.",
    publicoAlvo: "Crianças, jovens e adultos em comunidades da Zona Oeste",
    beneficiarios: 800,
    dataInicio: "2022-06-01",
    responsavelCadastro: "João Santos - Extensão UFRJ",
    contato: "biblioteca.movel@leituraparatodos.org",
    site: "",
    metodologia: "Educação itinerante com foco na democratização do acesso ao conhecimento, utilizando pedagogia freireana.",
    desafios: "Manutenção constante do veículo, necessidade de expansão do acervo, formação de novos leitores.",
    impactos: ["Atendimento a 800 pessoas mensalmente", "Empréstimo de 1.200 livros por mês", "Realização de 40 oficinas educativas mensais"],
    tags: ["educação", "literatura", "inclusão digital"],
    aprovado: true
  }
];

const createCaso = async (caso) => {
  try {
    const response = await fetch('https://observatorioisrj.netlify.app/.netlify/functions/casos-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ caso })
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log(`✅ Caso criado: "${caso.titulo}" (ID: ${result.caso?.id})`);
      return result.caso;
    } else {
      console.error(`❌ Erro ao criar "${caso.titulo}":`, result.message);
      return null;
    }
  } catch (error) {
    console.error(`💥 Erro de rede ao criar "${caso.titulo}":`, error.message);
    return null;
  }
};

const main = async () => {
  console.log('🚀 Criando casos simples no banco de dados...\n');
  
  if (typeof fetch === 'undefined') {
    console.error('❌ Este script requer Node.js 18+ com fetch nativo');
    process.exit(1);
  }
  
  let successCount = 0;
  
  for (const caso of casosSimples) {
    const result = await createCaso(caso);
    if (result) {
      successCount++;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n📊 Resultados:`);
  console.log(`   ✅ Casos criados: ${successCount}`);
  console.log(`   📋 Total tentativas: ${casosSimples.length}`);
  
  if (successCount > 0) {
    console.log('\n🎉 Casos criados com sucesso!');
    console.log('🌐 Verifique em: https://observatorioisrj.netlify.app/');
  }
};

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
}