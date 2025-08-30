// DataManager - Gerenciamento centralizado de dados
class DataManager {
    constructor() {
        this.observers = new Set();
        this.init();
    }

    static getInstance() {
        if (!DataManager.instance) {
            DataManager.instance = new DataManager();
        }
        return DataManager.instance;
    }

    async init() {
        // Carregar dados iniciais se não existirem
        if (!localStorage.getItem('casos')) {
            console.log('LocalStorage vazio, carregando dados do arquivo JSON...');
            const defaultData = await this.loadDefaultData();
            localStorage.setItem('casos', JSON.stringify(defaultData));
            console.log('Dados salvos no localStorage:', defaultData.length, 'casos');
        } else {
            const casos = JSON.parse(localStorage.getItem('casos'));
            console.log('Dados carregados do localStorage:', casos.length, 'casos');
        }
        
        // Notificar observadores sobre dados carregados
        this.notifyObservers('dataLoaded');
    }

    async loadDefaultData() {
        try {
            // Corrigir o caminho relativo para funcionar corretamente
            const basePath = window.location.pathname.includes('/pages/') ? '../' : './';
            const response = await fetch(basePath + 'data/casos.json');
            if (response.ok) {
                const data = await response.json();
                console.log('Dados carregados do arquivo:', data.length, 'casos');
                return data;
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
            return JSON.parse(localStorage.getItem('casos')) || [];
        } catch (error) {
            console.error('Erro ao carregar casos:', error);
            return this.getDefaultCasos();
        }
    }

    getCasoById(id) {
        const casos = this.getCasos();
        return casos.find(caso => caso.id === parseInt(id));
    }

    addCaso(caso) {
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
        return this.updateCaso(id, { aprovado: true });
    }

    rejectCaso(id) {
        return this.updateCaso(id, { aprovado: false });
    }

    saveCasos(casos) {
        localStorage.setItem('casos', JSON.stringify(casos));
    }
    
    // Método para resetar e recarregar dados do arquivo JSON
    async resetData() {
        console.log('Resetando dados e recarregando do arquivo JSON...');
        localStorage.removeItem('casos');
        const defaultData = await this.loadDefaultData();
        localStorage.setItem('casos', JSON.stringify(defaultData));
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
        const solicitacoes = this.getSolicitacoes();
        solicitacao.id = Date.now();
        solicitacao.data_solicitacao = new Date().toISOString();
        solicitacao.status = 'pendente';
        
        solicitacoes.push(solicitacao);
        localStorage.setItem('solicitacoes', JSON.stringify(solicitacoes));
        this.notifyObservers('solicitacaoAdded', solicitacao);
        
        return solicitacao;
    }

    updateSolicitacao(id, updates) {
        const solicitacoes = this.getSolicitacoes();
        const index = solicitacoes.findIndex(sol => sol.id === id);
        
        if (index !== -1) {
            solicitacoes[index] = { ...solicitacoes[index], ...updates };
            localStorage.setItem('solicitacoes', JSON.stringify(solicitacoes));
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

    // Limpeza de recursos
    destroy() {
        this.observers.clear();
        DataManager.instance = null;
    }
}

// Export para uso global
window.DataManager = DataManager;