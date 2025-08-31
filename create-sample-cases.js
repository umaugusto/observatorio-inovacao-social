#!/usr/bin/env node

// Script para criar 2 casos de exemplo no banco de dados
// Uso: node create-sample-cases.js

const casosExemplo = [
  {
    titulo: "Horta Comunitária da Providência",
    categoria: "Meio Ambiente",
    regiao: "Centro",
    organizacao: "Coletivo Verde Urbano",
    status: "Em andamento",
    descricaoResumo: "Transformação de área degradada em espaço produtivo que beneficia 150 famílias com alimentos orgânicos e geração de renda.",
    descricaoCompleta: "O projeto Horta Comunitária da Providência nasceu da necessidade de aproveitar um espaço urbano subutilizado no coração do Centro do Rio. Através da mobilização de moradores locais e apoio de ONGs ambientais, a iniciativa transformou uma área de 500m² anteriormente degradada em um próspero espaço de agricultura urbana. O projeto utiliza técnicas de permacultura e agricultura orgânica, envolvendo diretamente os moradores da comunidade em todas as etapas do processo, desde o planejamento até a colheita.",
    publicoAlvo: "Famílias de baixa renda da comunidade da Providência",
    beneficiarios: 150,
    dataInicio: "2023-03-15",
    responsavelCadastro: "Maria Silva - Extensão UFRJ",
    contato: "contato@verdeurbano.org.br",
    site: "https://verdeurbano.org.br",
    imagemUrl: "https://images.pexels.com/photos/1301856/pexels-photo-1301856.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
    metodologia: "Agricultura urbana participativa utilizando técnicas de permacultura, compostagem de resíduos orgânicos locais e sistema de captação de água da chuva.",
    desafios: "Acesso limitado à água durante períodos de seca, necessidade constante de formação técnica para novos participantes, dificuldades de comercialização dos produtos.",
    impactos: [
      "Produção de 2 toneladas de alimentos orgânicos mensais",
      "Geração de renda complementar para 40 famílias",
      "Capacitação de 80 pessoas em técnicas de cultivo urbano"
    ],
    tags: ["agricultura urbana", "sustentabilidade", "geração de renda", "segurança alimentar"],
    aprovado: true
  },
  {
    titulo: "Biblioteca Móvel Zona Oeste",
    categoria: "Educação", 
    regiao: "Campo Grande",
    organizacao: "Instituto Leitura Para Todos",
    status: "Em andamento",
    descricaoResumo: "Ônibus adaptado que leva literatura e atividades educativas para comunidades com baixo acesso a equipamentos culturais.",
    descricaoCompleta: "A Biblioteca Móvel é uma iniciativa inovadora que quebra barreiras geográficas e sociais no acesso à educação e cultura. Um ônibus especialmente adaptado percorre semanalmente diferentes pontos da Zona Oeste do Rio, oferecendo acesso gratuito a mais de 5.000 títulos, internet gratuita, oficinas de leitura e atividades culturais.",
    publicoAlvo: "Crianças, jovens e adultos em comunidades da Zona Oeste",
    beneficiarios: 800,
    dataInicio: "2022-06-01",
    responsavelCadastro: "João Santos - Extensão UFRJ",
    contato: "biblioteca.movel@leituraparatodos.org",
    site: "",
    imagemUrl: "https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
    metodologia: "Educação itinerante com foco na democratização do acesso ao conhecimento, utilizando pedagogia freireana e metodologias participativas.",
    desafios: "Manutenção constante do veículo, necessidade de expansão do acervo, formação de novos leitores em comunidades com baixo letramento.",
    impactos: [
      "Atendimento a 800 pessoas mensalmente",
      "Empréstimo de 1.200 livros por mês", 
      "Realização de 40 oficinas educativas mensais",
      "Criação de 12 clubes de leitura comunitários"
    ],
    tags: ["educação", "literatura", "inclusão digital", "democratização cultural"],
    aprovado: true
  }
];

const createCaso = async (caso) => {
  try {
    // Usar a API de produção do Netlify
    const response = await fetch('https://observatorioisrj.netlify.app/.netlify/functions/casos-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ caso })
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log(`✅ Caso criado com sucesso: "${caso.titulo}" (ID: ${result.caso?.id})`);
      return result.caso;
    } else {
      console.error(`❌ Erro ao criar caso "${caso.titulo}":`, result.message);
      return null;
    }
  } catch (error) {
    console.error(`💥 Erro de rede ao criar caso "${caso.titulo}":`, error.message);
    return null;
  }
};

const main = async () => {
  console.log('🚀 Criando casos de exemplo no banco de dados...\n');
  
  // Verificar se fetch está disponível (Node.js 18+)
  if (typeof fetch === 'undefined') {
    console.error('❌ Este script requer Node.js 18+ com fetch nativo');
    console.log('💡 Alternativa: npm install node-fetch');
    process.exit(1);
  }
  
  let successCount = 0;
  
  for (const caso of casosExemplo) {
    const result = await createCaso(caso);
    if (result) {
      successCount++;
    }
    
    // Pausa entre criações
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n📊 Resultados:`);
  console.log(`   ✅ Casos criados: ${successCount}`);
  console.log(`   📋 Total tentativas: ${casosExemplo.length}`);
  
  if (successCount > 0) {
    console.log('\n🎉 Casos de exemplo criados com sucesso!');
    console.log('🌐 Verifique em: https://observatorioisrj.netlify.app/');
  }
};

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = { casosExemplo, createCaso };