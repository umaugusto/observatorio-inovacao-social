const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const { exclude_test = 'true' } = event.queryStringParameters || {};
        
        // Query base - excluir casos de teste se solicitado
        let baseQuery = supabase.from('casos');
        
        if (exclude_test === 'true') {
            baseQuery = baseQuery.not('labels', 'cs', '[\"teste\"]');
        }

        // Executar múltiplas queries em paralelo
        const [
            totalCasosResult,
            casosAprovadosResult,
            totalBeneficiariosResult,
            categoriesStatsResult,
            regionsStatsResult,
            recentCasosResult
        ] = await Promise.all([
            // Total de casos
            baseQuery.select('id', { count: 'exact' }),
            
            // Casos aprovados
            baseQuery.select('id', { count: 'exact' }).eq('aprovado', true),
            
            // Total de beneficiários (soma)
            baseQuery.select('beneficiarios').eq('aprovado', true),
            
            // Estatísticas por categoria
            baseQuery.select('categoria', { count: 'exact' }).eq('aprovado', true),
            
            // Estatísticas por região
            baseQuery.select('regiao', { count: 'exact' }).eq('aprovado', true),
            
            // Casos recentes (últimos 5 aprovados)
            baseQuery
                .select(`
                    id, titulo, categoria, regiao, beneficiarios, created_at,
                    users!casos_user_id_fkey(name, email)
                `)
                .eq('aprovado', true)
                .order('created_at', { ascending: false })
                .limit(5)
        ]);

        // Processar resultados
        const totalCasos = totalCasosResult.count || 0;
        const casosAprovados = casosAprovadosResult.count || 0;
        
        // Calcular total de beneficiários
        const totalBeneficiarios = totalBeneficiariosResult.data?.reduce((sum, caso) => {
            return sum + (caso.beneficiarios || 0);
        }, 0) || 0;

        // Estatísticas por categoria
        const categoriesMap = {};
        categoriesStatsResult.data?.forEach(row => {
            categoriesMap[row.categoria] = (categoriesMap[row.categoria] || 0) + 1;
        });

        // Estatísticas por região  
        const regionsMap = {};
        regionsStatsResult.data?.forEach(row => {
            regionsMap[row.regiao] = (regionsMap[row.regiao] || 0) + 1;
        });

        // Ordenar categorias e regiões por contagem
        const categoriesStats = Object.entries(categoriesMap)
            .sort(([,a], [,b]) => b - a)
            .map(([categoria, count]) => ({ categoria, count }));

        const regionsStats = Object.entries(regionsMap)
            .sort(([,a], [,b]) => b - a)
            .map(([regiao, count]) => ({ regiao, count }));

        // Calcular métricas adicionais
        const avgBeneficiarios = casosAprovados > 0 ? Math.round(totalBeneficiarios / casosAprovados) : 0;
        const aprovacaoRate = totalCasos > 0 ? Math.round((casosAprovados / totalCasos) * 100) : 0;

        const stats = {
            // Big Numbers para a home
            bigNumbers: {
                totalCasos: casosAprovados, // Mostrar apenas aprovados no público
                totalBeneficiarios,
                totalCategorias: categoriesStats.length,
                totalRegioes: regionsStats.length
            },
            
            // Métricas administrativas
            adminMetrics: {
                totalCasos,
                casosAprovados,
                casosPendentes: totalCasos - casosAprovados,
                aprovacaoRate,
                avgBeneficiarios
            },
            
            // Distribuição por categoria
            categorias: categoriesStats,
            
            // Distribuição por região
            regioes: regionsStats,
            
            // Casos recentes para cards na home
            casosRecentes: recentCasosResult.data || [],
            
            // Metadata
            metadata: {
                lastUpdated: new Date().toISOString(),
                excludeTest: exclude_test === 'true',
                dataSource: 'supabase'
            }
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(stats)
        };

    } catch (error) {
        console.error('❌ Stats API Error:', error);
        
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