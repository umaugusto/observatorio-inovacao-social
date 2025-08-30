// DataManager - Gerenciamento centralizado de dados com integração de banco
class DataManager {
    constructor() {
        this.observers = new Set();
        this.casosCache = null;
        this.statsCache = null;
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutos
        this.lastCacheUpdate = null;
        this.useDatabase = this.isDatabaseAvailable();
        this.init();
    }

    // Verificar se estamos em produção (Netlify) para usar banco de dados
    isDatabaseAvailable() {
        return !(
            window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' || 
            window.location.port === '8080'
        );
    }

    // Verificar se usuário atual está em modo demo
    isDemoMode() {
        const authManager = window.AuthManager?.getInstance();
        return authManager?.isDemoMode() || false;
    }

    // Exibir notificação de operação bloqueada
    showDemoBlockedNotification(operation) {
        const authManager = window.AuthManager?.getInstance();
        if (authManager && authManager.showDemoNotification) {
            authManager.showDemoNotification(
                `❌ ${operation} bloqueada no modo demo. Esta é uma demonstração do sistema.`
            );
        }
    }

    // Salvar no localStorage com proteção de modo demo
    safeSetItem(key, value, cacheProperty = null) {
        if (this.isDemoMode()) {
            console.log(`🎭 Modo demo ativo - ${key} não foi salvo permanentemente`);
            // Atualizar cache em memória se especificado
            if (cacheProperty && this[cacheProperty]) {
                this[cacheProperty] = typeof value === 'string' ? JSON.parse(value) : value;
            }
            return;
        }
        
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }

    static getInstance() {
        if (!DataManager.instance) {
            DataManager.instance = new DataManager();
        }
        return DataManager.instance;
    }

    async init() {
        console.log(`📊 DataManager inicializado - Modo: ${this.useDatabase ? 'Banco de Dados' : 'Local'}`);
        
        if (this.useDatabase) {
            // Carregar dados do banco de dados
            try {
                await this.loadFromDatabase();
            } catch (error) {
                console.error('Erro ao carregar do banco, usando fallback local:', error);
                this.useDatabase = false;
                await this.loadFromLocal();
            }
        } else {
            // Usar dados locais para desenvolvimento
            await this.loadFromLocal();
        }
        
        // Notificar observadores sobre dados carregados
        this.notifyObservers('dataLoaded');
    }

    async loadFromDatabase() {
        console.log('🌐 Carregando dados do banco de dados...');
        
        // Carregar apenas casos - stats function está desabilitada
        const casosResponse = await fetch('/.netlify/functions/casos-api?exclude_test=true');
        
        if (casosResponse.ok) {
            const casosData = await casosResponse.json();
            
            this.casosCache = casosData.casos;
            this.statsCache = null; // Will calculate from local data
            this.lastCacheUpdate = Date.now();
            
            console.log('✅ Dados carregados do banco:', {
                casos: casosData.casos.length
            });
        } else {
            throw new Error('Erro ao carregar dados do banco');
        }
    }

    async loadFromLocal() {
        console.log('💾 Carregando dados do localStorage/JSON...');
        
        // Carregar dados iniciais se não existirem
        if (!localStorage.getItem('casos') || this.isDemoMode()) {
            if (this.isDemoMode()) {
                console.log('🎭 Modo demo - carregando dados padrão sem persistir');
            } else {
                console.log('LocalStorage vazio, carregando dados do arquivo JSON...');
            }
            const defaultData = await this.loadDefaultData();
            this.safeSetItem('casos', defaultData, 'casosCache');
            console.log('Dados carregados:', defaultData.length, 'casos');
        }
        
        // Em modo demo, usar cache em memória; caso contrário, localStorage
        let casos;
        if (this.isDemoMode()) {
            // Cache já foi definido pelo safeSetItem
            casos = this.casosCache;
        } else {
            casos = JSON.parse(localStorage.getItem('casos'));
            this.casosCache = casos;
        }
        
        // Gerar stats baseadas nos dados locais
        this.statsCache = this.generateLocalStats(casos);
        this.lastCacheUpdate = Date.now();
        
        console.log('✅ Dados carregados do local:', casos.length, 'casos');
    }

    generateLocalStats(casos) {
        const casosAprovados = casos.filter(caso => caso.aprovado);
        const totalBeneficiarios = casosAprovados.reduce((sum, caso) => sum + (caso.beneficiarios || 0), 0);
        const categorias = [...new Set(casosAprovados.map(caso => caso.categoria))].length;
        const regioes = [...new Set(casosAprovados.map(caso => caso.regiao))].length;
        
        return {
            bigNumbers: {
                totalCasos: casosAprovados.length,
                totalBeneficiarios,
                totalCategorias: categorias,
                totalRegioes: regioes
            },
            casosRecentes: casosAprovados
                .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                .slice(0, 5),
            metadata: {
                lastUpdated: new Date().toISOString(),
                dataSource: 'localStorage'
            }
        };
    }

    async loadDefaultData() {
        try {
            // Corrigir o caminho relativo para funcionar corretamente
            const basePath = window.location.pathname.includes('/pages/') ? '../' : './';
            const response = await fetch(basePath + 'data/casos.json');
            if (response.ok) {
                const data = await response.json();
                console.log('Dados carregados do arquivo:', data.length, 'casos');
                // Adicionar labels de teste para dados estáticos
                return data.map(caso => ({
                    ...caso,
                    labels: ['real'], // Marcar dados do JSON como reais
                    created_at: caso.created_at || new Date().toISOString()
                }));
            }
        } catch (error) {
            console.warn('Não foi possível carregar dados do arquivo, usando dados padrão:', error);
        }
        
        // Fallback para dados padrão
        return this.getDefaultCasos();
    }

    getDefaultCasos() {
        return [
            {
                id: 1,
                titulo: 'Horta Comunitária da Providência',
                categoria: 'Meio Ambiente',
                regiao: 'Centro',
                descricaoResumo: 'Transformação de área degradada em espaço produtivo que beneficia 150 famílias com alimentos orgânicos e geração de renda.',
                descricaoCompleta: 'O projeto Horta Comunitária da Providência nasceu da necessidade de aproveitar um espaço urbano subutilizado no coração do Centro do Rio. Através da mobilização de moradores locais e apoio de ONGs ambientais, a iniciativa transformou uma área de 500m² anteriormente degradada em um próspero espaço de agricultura urbana.',
                organizacao: 'Coletivo Verde Urbano',
                publicoAlvo: 'Famílias de baixa renda da comunidade da Providência',
                beneficiarios: 150,
                status: 'Em andamento',
                dataInicio: '2023-03-15',
                dataCadastro: '2024-08-15',
                responsavelCadastro: 'Maria Silva - Extensão UFRJ',
                contato: 'contato@verdeurbano.org.br',
                site: 'https://verdeurbano.org.br',
                impactos: [
                    'Produção de 2 toneladas de alimentos orgânicos mensais',
                    'Geração de renda complementar para 40 famílias',
                    'Capacitação de 80 pessoas em técnicas de cultivo urbano',
                    'Redução de 30% no descarte de resíduos orgânicos na comunidade'
                ],
                metodologia: 'Agricultura urbana participativa utilizando técnicas de permacultura, compostagem de resíduos orgânicos locais e sistema de captação de água da chuva.',
                desafios: 'Acesso limitado à água durante períodos de seca, necessidade constante de formação técnica para novos participantes.',
                tags: ['agricultura urbana', 'sustentabilidade', 'geração de renda', 'segurança alimentar', 'educação ambiental'],
                fotos: [],
                aprovado: true
            },
            {
                id: 2,
                titulo: 'Biblioteca Móvel Zona Oeste',
                categoria: 'Educação',
                regiao: 'Campo Grande',
                descricaoResumo: 'Ônibus adaptado que leva literatura e atividades educativas para comunidades com baixo acesso a equipamentos culturais.',
                descricaoCompleta: 'A Biblioteca Móvel é uma iniciativa inovadora que quebra barreiras geográficas e sociais no acesso à educação e cultura. Um ônibus especialmente adaptado percorre semanalmente diferentes pontos da Zona Oeste do Rio.',
                organizacao: 'Instituto Leitura Para Todos',
                publicoAlvo: 'Crianças, jovens e adultos em comunidades da Zona Oeste',
                beneficiarios: 800,
                status: 'Em andamento',
                dataInicio: '2022-06-01',
                dataCadastro: '2024-08-12',
                responsavelCadastro: 'João Santos - Extensão UFRJ',
                contato: 'biblioteca.movel@leituraparatodos.org',
                site: '',
                impactos: [
                    'Atendimento a 800 pessoas mensalmente',
                    'Empréstimo de 1.200 livros por mês',
                    'Realização de 40 oficinas educativas mensais'
                ],
                metodologia: 'Educação itinerante com foco na democratização do acesso ao conhecimento.',
                desafios: 'Manutenção constante do veículo, necessidade de expansão do acervo.',
                tags: ['educação', 'literatura', 'inclusão digital', 'democratização cultural'],
                fotos: [],
                aprovado: true
            }
        ];
    }

    // CRUD Operations para casos
    getCasos() {
        try {
            // Se tem cache válido, usar cache
            if (this.casosCache && this.isCacheValid()) {
                return this.casosCache;
            }
            
            // Se modo local, usar localStorage
            if (!this.useDatabase) {
                return JSON.parse(localStorage.getItem('casos')) || [];
            }
            
            // Se banco, cache pode estar desatualizado, mas retornar mesmo assim
            return this.casosCache || [];
        } catch (error) {
            console.error('Erro ao carregar casos:', error);
            return this.getDefaultCasos();
        }
    }
    
    // Método assíncrono para garantir dados atualizados do banco
    async getCasosAsync(filters = {}) {
        if (!this.useDatabase) {
            return this.getCasos();
        }
        
        try {
            // Construir query string com filtros
            const params = new URLSearchParams({
                exclude_test: 'true',
                ...filters
            });
            
            const response = await fetch(`/.netlify/functions/casos-api?${params}`);
            
            if (response.ok) {
                const data = await response.json();
                this.casosCache = data.casos;
                this.lastCacheUpdate = Date.now();
                return data.casos;
            }
        } catch (error) {
            console.error('Erro ao buscar casos da API:', error);
        }
        
        // Fallback para cache existente
        return this.casosCache || [];
    }
    
    // Verificar se cache ainda é válido
    isCacheValid() {
        return this.lastCacheUpdate && (Date.now() - this.lastCacheUpdate < this.cacheExpiry);
    }

    getCasoById(id) {
        const casos = this.getCasos();
        return casos.find(caso => caso.id === parseInt(id));
    }

    addCaso(caso) {
        // Bloquear operações para usuários demo
        if (this.isDemoMode()) {
            console.warn('🎭 Modo demo: adição de caso bloqueada para preservar dados');
            this.showDemoBlockedNotification('Adição de caso');
            throw new Error('Operação não permitida para usuários demo. Esta é uma demonstração do sistema.');
        }
        
        const casos = this.getCasos();
        
        // Gerar novo ID
        const maxId = casos.length > 0 ? Math.max(...casos.map(c => c.id)) : 0;
        caso.id = maxId + 1;
        caso.dataCadastro = new Date().toISOString();
        caso.aprovado = false; // Novos casos precisam de aprovação
        
        casos.push(caso);
        this.saveCasos(casos);
        this.notifyObservers('casoAdded', caso);
        
        return caso;
    }

    updateCaso(id, updatedCaso) {
        // Bloquear operações para usuários demo
        if (this.isDemoMode()) {
            console.warn('🎭 Modo demo: edição de caso bloqueada para preservar dados');
            this.showDemoBlockedNotification('Edição de caso');
            throw new Error('Operação não permitida para usuários demo. Esta é uma demonstração do sistema.');
        }
        
        const casos = this.getCasos();
        const index = casos.findIndex(caso => caso.id === parseInt(id));
        
        if (index !== -1) {
            casos[index] = { ...casos[index], ...updatedCaso, id: parseInt(id) };
            this.saveCasos(casos);
            this.notifyObservers('casoUpdated', casos[index]);
            return casos[index];
        }
        
        throw new Error('Caso não encontrado');
    }

    deleteCaso(id) {
        // Bloquear operações para usuários demo
        if (this.isDemoMode()) {
            console.warn('🎭 Modo demo: exclusão de caso bloqueada para preservar dados');
            this.showDemoBlockedNotification('Exclusão de caso');
            throw new Error('Operação não permitida para usuários demo. Esta é uma demonstração do sistema.');
        }
        
        const casos = this.getCasos();
        const index = casos.findIndex(caso => caso.id === parseInt(id));
        
        if (index !== -1) {
            const deletedCaso = casos.splice(index, 1)[0];
            this.saveCasos(casos);
            this.notifyObservers('casoDeleted', deletedCaso);
            return deletedCaso;
        }
        
        throw new Error('Caso não encontrado');
    }

    approveCaso(id) {
        // Bloquear operações para usuários demo
        if (this.isDemoMode()) {
            console.warn('🎭 Modo demo: aprovação de caso bloqueada para preservar dados');
            this.showDemoBlockedNotification('Aprovação de caso');
            throw new Error('Operação não permitida para usuários demo. Esta é uma demonstração do sistema.');
        }
        return this.updateCaso(id, { aprovado: true });
    }

    rejectCaso(id) {
        // Bloquear operações para usuários demo
        if (this.isDemoMode()) {
            console.warn('🎭 Modo demo: rejeição de caso bloqueada para preservar dados');
            this.showDemoBlockedNotification('Rejeição de caso');
            throw new Error('Operação não permitida para usuários demo. Esta é uma demonstração do sistema.');
        }
        return this.updateCaso(id, { aprovado: false });
    }

    saveCasos(casos) {
        this.safeSetItem('casos', casos, 'casosCache');
    }
    
    // Método para resetar e recarregar dados do arquivo JSON
    async resetData() {
        console.log('Resetando dados e recarregando do arquivo JSON...');
        if (!this.isDemoMode()) {
            localStorage.removeItem('casos');
        }
        const defaultData = await this.loadDefaultData();
        this.safeSetItem('casos', defaultData, 'casosCache');
        console.log('Dados resetados:', defaultData.length, 'casos carregados');
        this.notifyObservers('dataLoaded');
        return defaultData;
    }

    // Operações para solicitações de acesso
    getSolicitacoes() {
        try {
            return JSON.parse(localStorage.getItem('solicitacoes')) || [];
        } catch (error) {
            console.error('Erro ao carregar solicitações:', error);
            return [];
        }
    }

    addSolicitacao(solicitacao) {
        // Bloquear operações para usuários demo
        if (this.isDemoMode()) {
            console.warn('🎭 Modo demo: adição de solicitação bloqueada para preservar dados');
            this.showDemoBlockedNotification('Adição de solicitação');
            throw new Error('Operação não permitida para usuários demo. Esta é uma demonstração do sistema.');
        }
        
        const solicitacoes = this.getSolicitacoes();
        solicitacao.id = Date.now();
        solicitacao.data_solicitacao = new Date().toISOString();
        solicitacao.status = 'pendente';
        
        solicitacoes.push(solicitacao);
        this.safeSetItem('solicitacoes', solicitacoes);
        this.notifyObservers('solicitacaoAdded', solicitacao);
        
        return solicitacao;
    }

    updateSolicitacao(id, updates) {
        // Bloquear operações para usuários demo
        if (this.isDemoMode()) {
            console.warn('🎭 Modo demo: atualização de solicitação bloqueada para preservar dados');
            this.showDemoBlockedNotification('Atualização de solicitação');
            throw new Error('Operação não permitida para usuários demo. Esta é uma demonstração do sistema.');
        }
        
        const solicitacoes = this.getSolicitacoes();
        const index = solicitacoes.findIndex(sol => sol.id === id);
        
        if (index !== -1) {
            solicitacoes[index] = { ...solicitacoes[index], ...updates };
            this.safeSetItem('solicitacoes', solicitacoes);
            this.notifyObservers('solicitacaoUpdated', solicitacoes[index]);
            return solicitacoes[index];
        }
        
        throw new Error('Solicitação não encontrada');
    }

    // Sistema de observadores para mudanças de dados
    addObserver(observer) {
        this.observers.add(observer);
    }

    removeObserver(observer) {
        this.observers.delete(observer);
    }

    notifyObservers(event, data) {
        this.observers.forEach(observer => {
            if (typeof observer.onDataChange === 'function') {
                observer.onDataChange(event, data);
            }
        });
    }

    // Utilitários
    getStats() {
        const casos = this.getCasos();
        return {
            totalCasos: casos.length,
            casosAprovados: casos.filter(c => c.aprovado).length,
            casosPendentes: casos.filter(c => !c.aprovado).length,
            regioes: [...new Set(casos.map(c => c.regiao))].length,
            beneficiarios: casos.reduce((total, caso) => total + (caso.beneficiarios || 0), 0),
            organizacoes: [...new Set(casos.map(c => c.organizacao))].length,
            categorias: [...new Set(casos.map(c => c.categoria))].length
        };
    }

    searchCasos(query, filters = {}) {
        let casos = this.getCasos();
        
        // Filtrar apenas casos aprovados para exibição pública
        if (!filters.includeUnapproved) {
            casos = casos.filter(caso => caso.aprovado);
        }
        
        // Filtro por texto
        if (query && query.trim()) {
            const searchTerm = query.toLowerCase();
            casos = casos.filter(caso => 
                caso.titulo.toLowerCase().includes(searchTerm) ||
                caso.descricaoResumo.toLowerCase().includes(searchTerm) ||
                caso.categoria.toLowerCase().includes(searchTerm) ||
                caso.regiao.toLowerCase().includes(searchTerm) ||
                caso.organizacao.toLowerCase().includes(searchTerm) ||
                (caso.tags && caso.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
            );
        }
        
        // Filtros específicos
        if (filters.categoria) {
            casos = casos.filter(caso => caso.categoria === filters.categoria);
        }
        
        if (filters.regiao) {
            casos = casos.filter(caso => caso.regiao === filters.regiao);
        }
        
        if (filters.status) {
            casos = casos.filter(caso => caso.status === filters.status);
        }
        
        return casos;
    }

    // Sistema de Comentários
    getComentarios(casoId) {
        const comentarios = JSON.parse(localStorage.getItem('comentarios') || '[]');
        return comentarios.filter(c => c.casoId === casoId).sort((a, b) => new Date(b.data) - new Date(a.data));
    }
    
    addComentario(casoId, comentario, userId, userName) {
        // Bloquear operações para usuários demo
        if (this.isDemoMode()) {
            console.warn('🎭 Modo demo: adição de comentário bloqueada para preservar dados');
            this.showDemoBlockedNotification('Adição de comentário');
            throw new Error('Operação não permitida para usuários demo. Esta é uma demonstração do sistema.');
        }
        
        const comentarios = JSON.parse(localStorage.getItem('comentarios') || '[]');
        const novoComentario = {
            id: Date.now(),
            casoId: casoId,
            userId: userId,
            userName: userName,
            texto: comentario,
            data: new Date().toISOString(),
            aprovado: false // Comentários precisam de aprovação
        };
        
        comentarios.push(novoComentario);
        this.safeSetItem('comentarios', comentarios);
        
        this.notifyObservers('comentarioAdded', novoComentario);
        return novoComentario;
    }
    
    aprovarComentario(comentarioId) {
        // Bloquear operações para usuários demo
        if (this.isDemoMode()) {
            console.warn('🎭 Modo demo: aprovação de comentário bloqueada para preservar dados');
            this.showDemoBlockedNotification('Aprovação de comentário');
            throw new Error('Operação não permitida para usuários demo. Esta é uma demonstração do sistema.');
        }
        
        const comentarios = JSON.parse(localStorage.getItem('comentarios') || '[]');
        const comentario = comentarios.find(c => c.id === comentarioId);
        
        if (comentario) {
            comentario.aprovado = true;
            this.safeSetItem('comentarios', comentarios);
            this.notifyObservers('comentarioApproved', comentario);
        }
        
        return comentario;
    }
    
    deleteComentario(comentarioId) {
        // Bloquear operações para usuários demo
        if (this.isDemoMode()) {
            console.warn('🎭 Modo demo: exclusão de comentário bloqueada para preservar dados');
            this.showDemoBlockedNotification('Exclusão de comentário');
            throw new Error('Operação não permitida para usuários demo. Esta é uma demonstração do sistema.');
        }
        
        let comentarios = JSON.parse(localStorage.getItem('comentarios') || '[]');
        comentarios = comentarios.filter(c => c.id !== comentarioId);
        this.safeSetItem('comentarios', comentarios);
        
        this.notifyObservers('comentarioDeleted', comentarioId);
    }
    
    // Sistema de Sugestões
    getSugestoes() {
        return JSON.parse(localStorage.getItem('sugestoes') || '[]');
    }
    
    addSugestao(sugestao) {
        // Bloquear operações para usuários demo
        if (this.isDemoMode()) {
            console.warn('🎭 Modo demo: adição de sugestão bloqueada para preservar dados');
            this.showDemoBlockedNotification('Adição de sugestão');
            throw new Error('Operação não permitida para usuários demo. Esta é uma demonstração do sistema.');
        }
        
        const sugestoes = JSON.parse(localStorage.getItem('sugestoes') || '[]');
        const novaSugestao = {
            id: Date.now(),
            ...sugestao,
            dataSugestao: new Date().toISOString(),
            status: 'pendente' // pendente, aprovada, rejeitada
        };
        
        sugestoes.push(novaSugestao);
        this.safeSetItem('sugestoes', sugestoes);
        
        this.notifyObservers('sugestaoAdded', novaSugestao);
        return novaSugestao;
    }
    
    aprovarSugestao(sugestaoId) {
        // Bloquear operações para usuários demo
        if (this.isDemoMode()) {
            console.warn('🎭 Modo demo: aprovação de sugestão bloqueada para preservar dados');
            this.showDemoBlockedNotification('Aprovação de sugestão');
            throw new Error('Operação não permitida para usuários demo. Esta é uma demonstração do sistema.');
        }
        
        const sugestoes = JSON.parse(localStorage.getItem('sugestoes') || '[]');
        const sugestao = sugestoes.find(s => s.id === sugestaoId);
        
        if (sugestao) {
            // Converter sugestão em caso
            const novoCaso = {
                ...sugestao,
                id: Date.now(),
                dataCadastro: new Date().toISOString(),
                aprovado: true,
                responsavelCadastro: 'Sistema - Sugestão Aprovada'
            };
            
            // Remover campos específicos de sugestão
            delete novoCaso.status;
            delete novoCaso.dataSugestao;
            
            // Adicionar como caso
            this.addCaso(novoCaso);
            
            // Atualizar status da sugestão
            sugestao.status = 'aprovada';
            sugestao.casoId = novoCaso.id;
            this.safeSetItem('sugestoes', sugestoes);
            
            this.notifyObservers('sugestaoApproved', sugestao);
        }
        
        return sugestao;
    }
    
    rejeitarSugestao(sugestaoId, motivo) {
        // Bloquear operações para usuários demo
        if (this.isDemoMode()) {
            console.warn('🎭 Modo demo: rejeição de sugestão bloqueada para preservar dados');
            this.showDemoBlockedNotification('Rejeição de sugestão');
            throw new Error('Operação não permitida para usuários demo. Esta é uma demonstração do sistema.');
        }
        
        const sugestoes = JSON.parse(localStorage.getItem('sugestoes') || '[]');
        const sugestao = sugestoes.find(s => s.id === sugestaoId);
        
        if (sugestao) {
            sugestao.status = 'rejeitada';
            sugestao.motivoRejeicao = motivo;
            this.safeSetItem('sugestoes', sugestoes);
            
            this.notifyObservers('sugestaoRejected', sugestao);
        }
        
        return sugestao;
    }
    
    // Limpeza de recursos
    destroy() {
        this.observers.clear();
        DataManager.instance = null;
    }
}

// Export para uso global
window.DataManager = DataManager;