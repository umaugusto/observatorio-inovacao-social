#!/usr/bin/env node

// Script para migrar dados de casos.json para Supabase
// Uso: node migrate-data.js

const fs = require('fs');
const path = require('path');

// Carregar dados locais
const loadCasosData = () => {
  try {
    const dataPath = path.join(__dirname, 'data', 'casos.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Erro ao carregar casos.json:', error);
    return [];
  }
};

// Converter camelCase para snake_case para o banco
const mapCasoToDatabase = (caso) => ({
  titulo: caso.titulo,
  categoria: caso.categoria,
  regiao: caso.regiao,
  organizacao: caso.organizacao,
  status: caso.status,
  descricao_resumo: caso.descricaoResumo,
  descricao_completa: caso.descricaoCompleta,
  publico_alvo: caso.publicoAlvo,
  beneficiarios: caso.beneficiarios,
  data_inicio: caso.dataInicio,
  contato: caso.contato,
  site: caso.site,
  imagem_url: caso.imagemUrl,
  metodologia: caso.metodologia,
  desafios: caso.desafios,
  responsavel_cadastro: caso.responsavelCadastro,
  tags: caso.tags, // PostgreSQL JSON array
  impactos: caso.impactos, // PostgreSQL JSON array
  aprovado: caso.aprovado === true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

// Função principal para migração via API
const migrateCasos = async () => {
  const casos = loadCasosData();
  console.log(`🚀 Iniciando migração de ${casos.length} casos...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  // Usar a API local para testar
  const baseUrl = process.env.NETLIFY_URL || 'http://localhost:8888';
  const apiUrl = `${baseUrl}/.netlify/functions/casos-api`;
  
  console.log(`📡 Usando API: ${apiUrl}`);
  
  for (const caso of casos) {
    try {
      const payload = { caso };
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log(`✅ Migrado: ${caso.titulo}`);
        successCount++;
      } else {
        console.error(`❌ Erro ao migrar ${caso.titulo}:`, result.message);
        errorCount++;
      }
      
      // Pequena pausa entre requisições para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Erro ao migrar ${caso.titulo}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Migração concluída:`);
  console.log(`   ✅ Sucessos: ${successCount}`);
  console.log(`   ❌ Erros: ${errorCount}`);
  console.log(`   📋 Total: ${casos.length}`);
};

// Executar migração
if (require.main === module) {
  // Verificar se fetch está disponível (Node.js 18+)
  if (typeof fetch === 'undefined') {
    console.error('❌ Este script requer Node.js 18+ com fetch nativo');
    console.log('💡 Alternativa: npm install node-fetch e descomente a linha abaixo');
    // global.fetch = require('node-fetch');
    process.exit(1);
  }
  
  migrateCasos().catch(error => {
    console.error('💥 Erro fatal na migração:', error);
    process.exit(1);
  });
}

module.exports = { loadCasosData, mapCasoToDatabase, migrateCasos };