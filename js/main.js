// Observatório de Inovação Social - JavaScript Principal
class ObservatorioApp {
    constructor() {
        this.dataManager = null;
        this.authManager = null;
        this.observers = new Set();
        this.init();
        this.setupEventListeners();
        this.setupScrollEffects();
        this.setupMobileMenu();
    }

    async init() {
        console.log('🎨 Designário - Observatório de Inovação Social iniciado');
        
        // Inicializar managers
        this.dataManager = DataManager.getInstance();
        this.authManager = AuthManager.getInstance();
        
        // Configurar observadores
        this.setupObservers();
        
        // Aguardar carregamento dos dados
        await this.loadCasos();
        this.setupFilters();
        this.setupCategoryCards();
        
        // Garantir que os casos em destaque sejam renderizados após dados carregados
        setTimeout(() => {
            this.setupFeaturedCases();
            this.syncAllDataDisplays(); // Sincronizar todos os displays de dados
        }, 500);
        
        this.setupQuickFilters();
        this.setupHorizontalMethodology();
        this.authManager.updateUI();
    }
    
    // Método para sincronizar todos os displays de dados
    syncAllDataDisplays() {
        console.log('Sincronizando todos os displays de dados com localStorage...');
        const casos = this.dataManager.getCasos();
        console.log('Total de casos no localStorage:', casos.length);
        console.log('Casos aprovados:', casos.filter(c => c.aprovado).length);
        
        // Atualizar contadores de categorias
        this.updateCategoryCounts();
        
        // Atualizar estatísticas
        this.updateStats();
        
        // Atualizar casos em destaque
        if (document.getElementById('featuredCasesBento')) {
            this.renderFeaturedCases();
        }
        
        console.log('Sincronização completa!');
    }

    setupObservers() {
        // Observar mudanças de autenticação
        this.authManager.addObserver({
            onAuthChange: (event, data) => {
                this.handleAuthChange(event, data);
            }
        });

        // Observar mudanças de dados
        this.dataManager.addObserver({
            onDataChange: (event, data) => {
                this.handleDataChange(event, data);
            }
        });
    }

    handleAuthChange(event, data) {
        switch (event) {
            case 'userLoggedIn':
                console.log('Usuário logado:', data.name);
                break;
            case 'userLoggedOut':
                if (data.showNotification) {
                    this.showNotification(data.message, 'success');
                }
                break;
        }
    }

    handleDataChange(event, data) {
        switch (event) {
            case 'dataLoaded':
            case 'casoAdded':
            case 'casoUpdated':
            case 'casoDeleted':
                console.log('Dados mudaram, atualizando displays:', event);
                this.refreshCasosDisplay();
                this.updateCategoryCounts();
                this.renderFeaturedCases();
                break;
        }
    }

    // Gerenciamento de dados dos casos
    async loadCasos() {
        try {
            const casos = this.dataManager.getCasos();
            this.renderCasos(casos);
            this.updateStats();
        } catch (error) {
            console.error('Erro ao carregar casos:', error);
            this.showNotification('Erro ao carregar dados', 'error');
        }
    }

    refreshCasosDisplay() {
        const casos = this.dataManager.getCasos();
        this.renderCasos(casos);
        this.updateStats();
        // Atualizar casos em destaque também
        if (document.getElementById('featuredCasesBento')) {
            this.renderFeaturedCases();
        }
    }

    // Método removido - dados agora são gerenciados pelo DataManager

    renderCasos(casos) {
        const container = document.querySelector('.cases-grid');
        if (!container) return;

        // Filtrar apenas casos aprovados para exibição pública
        const casosAprovados = casos.filter(caso => caso.aprovado);

        if (casosAprovados.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                    <div style="font-size: 64px; margin-bottom: 20px; opacity: 0.5;">📄</div>
                    <h3 style="color: var(--text-dark); margin-bottom: 10px;">Nenhum caso encontrado</h3>
                    <p style="color: var(--text-light);">Não há casos aprovados correspondentes aos filtros selecionados.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = casosAprovados.map(caso => {
            const shareBtn = document.createElement('button');
            shareBtn.className = 'btn-ghost btn-small';
            shareBtn.textContent = 'Compartilhar';
            shareBtn.setAttribute('aria-label', `Compartilhar caso ${caso.titulo}`);
            
            return `
                <div class="case-card" data-id="${caso.id}">
                    <span class="case-category-badge badge-${this.getCategorySlug(caso.categoria)}">${caso.categoria}</span>
                    <h3 class="case-title">${this.escapeHtml(caso.titulo)}</h3>
                    <div class="case-meta">
                        <span>📍 ${this.escapeHtml(caso.regiao)}</span>
                        <span>👥 ${caso.beneficiarios} beneficiários</span>
                        <span>📅 ${this.formatDate(caso.dataCadastro)}</span>
                    </div>
                    <p class="case-description">${this.escapeHtml(caso.descricaoResumo)}</p>
                    <div class="case-actions">
                        <a href="pages/caso.html?id=${caso.id}" class="btn-outline btn-small">Ver Detalhes</a>
                        <button class="btn-ghost btn-small share-caso-btn" data-caso-id="${caso.id}" aria-label="Compartilhar caso ${this.escapeHtml(caso.titulo)}">↗️ Compartilhar</button>
                    </div>
                </div>
            `;
        }).join('');

        // Adicionar event listeners para botões de compartilhar
        container.querySelectorAll('.share-caso-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const casoId = parseInt(e.target.dataset.casoId);
                this.shareCaso(casoId);
            });
        });

        // Adiciona animação aos cards
        this.animateCards();
    }

    getCategorySlug(categoria) {
        const slugs = {
            'Educação': 'education',
            'Saúde': 'health',
            'Meio Ambiente': 'environment',
            'Inclusão Social': 'social',
            'Tecnologia Social': 'technology',
            'Economia Solidária': 'economy'
        };
        return slugs[categoria] || 'social';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    updateStats() {
        const stats = this.dataManager.getStats();

        // Atualiza elementos de estatísticas se existirem
        this.updateStatElement('[data-stat="casos"]', stats.casosAprovados);
        this.updateStatElement('[data-stat="regioes"]', stats.regioes);
        this.updateStatElement('[data-stat="beneficiarios"]', stats.beneficiarios);
        this.updateStatElement('[data-stat="organizacoes"]', stats.organizacoes);
    }

    updateStatElement(selector, value) {
        const element = document.querySelector(selector);
        if (element) {
            this.animateNumber(element, value);
        }
    }

    animateNumber(element, targetValue) {
        // Observer para animar apenas quando entrar na viewport
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.startNumberAnimation(element, targetValue);
                    observer.unobserve(element);
                }
            });
        }, {
            threshold: 0.5
        });

        // Armazenar observer para limpeza posterior
        if (!this.numberObservers) {
            this.numberObservers = new Set();
        }
        this.numberObservers.add(observer);

        observer.observe(element);
    }

    startNumberAnimation(element, targetValue) {
        const startValue = 0;
        const duration = 2000;
        const startTime = performance.now();
        const isNumber = typeof targetValue === 'number';
        const finalValue = isNumber ? targetValue : parseInt(targetValue.toString().replace(/\D/g, ''));

        const animate = (currentTime) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            
            const currentValue = Math.floor(startValue + (finalValue - startValue) * this.easeOutQuart(progress));
            
            if (isNumber) {
                element.textContent = currentValue.toLocaleString('pt-BR');
            } else {
                if (targetValue.toString().includes('+')) {
                    element.textContent = currentValue.toLocaleString('pt-BR') + '+';
                } else if (targetValue.toString().includes('k')) {
                    element.textContent = (currentValue / 1000).toFixed(0) + 'k+';
                } else {
                    element.textContent = currentValue.toLocaleString('pt-BR');
                }
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = typeof targetValue === 'number' ? 
                    targetValue.toLocaleString('pt-BR') : targetValue;
            }
        };

        requestAnimationFrame(animate);
    }

    easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    // Sistema de filtros
    setupFilters() {
        const searchInput = document.querySelector('.search-input');
        const filterTags = document.querySelectorAll('.filter-tag');

        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.filterCasos({ search: e.target.value });
            }, 300));
        }

        filterTags.forEach(tag => {
            tag.addEventListener('click', (e) => {
                e.preventDefault();
                tag.classList.toggle('active');
                this.updateActiveFilters();
            });
        });
    }

    filterCasos(filters = {}) {
        // Filtros por tags ativas
        const activeTags = Array.from(document.querySelectorAll('.filter-tag.active'))
            .map(tag => tag.textContent.trim());
        
        const searchFilters = {
            ...filters,
            includeUnapproved: false // Não mostrar casos não aprovados na busca pública
        };

        if (activeTags.length > 0) {
            // Aplicar filtros de categoria
            activeTags.forEach(tag => {
                if (['Educação', 'Saúde', 'Meio Ambiente', 'Inclusão Social', 'Tecnologia Social', 'Economia Solidária'].includes(tag)) {
                    searchFilters.categoria = tag;
                }
            });
        }

        const filteredCasos = this.dataManager.searchCasos(filters.search, searchFilters);
        const totalCasos = this.dataManager.getCasos().filter(c => c.aprovado).length;

        this.renderCasos(filteredCasos);
        this.updateFilterResults(filteredCasos.length, totalCasos);
    }

    updateActiveFilters() {
        this.filterCasos();
    }

    updateFilterResults(filtered, total) {
        let resultsElement = document.querySelector('.filter-results');
        if (!resultsElement) {
            resultsElement = document.createElement('div');
            resultsElement.className = 'filter-results';
            resultsElement.style.cssText = 'text-align: center; margin: 20px 0; font-size: 14px; color: var(--text-light);';
            const casesGrid = document.querySelector('.cases-grid');
            if (casesGrid) {
                casesGrid.parentNode.insertBefore(resultsElement, casesGrid);
            }
        }

        if (filtered === total) {
            resultsElement.textContent = `Exibindo todos os ${total} casos`;
        } else {
            resultsElement.textContent = `Exibindo ${filtered} de ${total} casos`;
        }
    }

    // Efeitos de scroll e animações
    setupScrollEffects() {
        const header = document.querySelector('.header');
        let lastScrollTop = 0;

        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // Header com fundo ao rolar
            if (scrollTop > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }

            // Parallax no hero - DISABLED FOR TESTING
            // const hero = document.querySelector('.hero');
            // if (hero && scrollTop < window.innerHeight) {
            //     hero.style.transform = `translateY(${scrollTop * 0.3}px)`;
            // }

            // Animação de elementos ao entrar na viewport
            this.animateOnScroll();

            lastScrollTop = scrollTop;
        });
    }

    animateOnScroll() {
        const elements = document.querySelectorAll('[data-animate]');
        
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < window.innerHeight - elementVisible) {
                element.classList.add('animated');
            }
        });
    }

    animateCards() {
        const cards = document.querySelectorAll('.case-card');
        
        cards.forEach((card, index) => {
            card.style.animation = 'none';
            card.offsetHeight; // Trigger reflow
            card.style.animation = `fadeInUp 0.6s ease-out ${index * 0.1}s forwards`;
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    // Menu mobile
    setupMobileMenu() {
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const navLinks = document.querySelector('.nav-links');

        if (mobileMenuBtn && navLinks) {
            mobileMenuBtn.addEventListener('click', () => {
                navLinks.classList.toggle('active');
                mobileMenuBtn.classList.toggle('active');
            });

            // Fechar menu ao clicar em link
            navLinks.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    navLinks.classList.remove('active');
                    mobileMenuBtn.classList.remove('active');
                });
            });
        }
    }

    // Configurar cards de categoria clicáveis
    setupCategoryCards() {
        const categoryCards = document.querySelectorAll('[data-category]');
        
        categoryCards.forEach(card => {
            // Adicionar efeito hover
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-5px)';
                card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '';
            });
            
            // Tornar clicável para redirecionar para página de casos
            card.addEventListener('click', () => {
                const categoria = card.getAttribute('data-category');
                
                // Animar clique
                card.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    card.style.transform = '';
                }, 150);
                
                // Redirecionar para página de casos com filtro de categoria
                window.location.href = `pages/casos.html?categoria=${encodeURIComponent(categoria)}`;
            });
        });

        // Atualizar contagem de casos por categoria
        this.updateCategoryCounts();
    }

    // Atualizar contagem real de casos por categoria
    updateCategoryCounts() {
        const casos = this.dataManager.getCasos().filter(caso => caso.aprovado);
        const categoryCounts = {};
        
        // Contar casos por categoria
        casos.forEach(caso => {
            if (categoryCounts[caso.categoria]) {
                categoryCounts[caso.categoria]++;
            } else {
                categoryCounts[caso.categoria] = 1;
            }
        });

        // Atualizar elementos visuais
        const categoryCards = document.querySelectorAll('[data-category]');
        categoryCards.forEach(card => {
            const categoria = card.getAttribute('data-category');
            const countElement = card.querySelector('.category-count');
            const count = categoryCounts[categoria] || 0;
            
            if (countElement) {
                countElement.textContent = `${count} casos`;
            }
        });
    }
    
    filterAndScrollToCases(categoria) {
        // Aplicar filtro de categoria
        const filterTags = document.querySelectorAll('.filter-tag');
        filterTags.forEach(tag => tag.classList.remove('active'));
        
        // Ativar o filtro correto
        const targetFilter = Array.from(filterTags).find(tag => 
            tag.getAttribute('data-value') === categoria
        );
        
        if (targetFilter) {
            targetFilter.classList.add('active');
        }
        
        // Aplicar filtro nos casos
        this.applyFilters();
        
        // Scroll para seção de casos
        const casosSection = document.getElementById('casos');
        if (casosSection) {
            casosSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            
            // Mostrar notificação
            setTimeout(() => {
                this.showNotification(`Mostrando casos de ${categoria}`, 'info');
            }, 500);
        }
    }

    // Sistema de eventos
    setupEventListeners() {
        // Smooth scroll para links internos
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Fechar modal ao clicar fora
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeModal();
            }
        });

        // Tecla ESC para fechar modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    // Utilitários
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Notificações
    showNotification(message, type = 'info', duration = 4000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: var(--border-radius);
            color: white;
            font-weight: 600;
            z-index: 3000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            box-shadow: var(--shadow-lg);
        `;

        // Cores por tipo
        const colors = {
            info: '#3498db',
            success: '#27ae60',
            warning: '#f39c12',
            error: '#e74c3c'
        };
        notification.style.background = colors[type] || colors.info;

        document.body.appendChild(notification);

        // Animar entrada
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Fechar automaticamente
        const autoClose = setTimeout(() => {
            this.closeNotification(notification);
        }, duration);

        // Fechar manualmente
        notification.querySelector('.notification-close').addEventListener('click', () => {
            clearTimeout(autoClose);
            this.closeNotification(notification);
        });
    }

    closeNotification(notification) {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    // Modais
    openModal(content) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                ${content}
                <button class="modal-close" style="position: absolute; top: 15px; right: 20px; background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 10);

        modal.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal();
        });
    }

    closeModal() {
        const modal = document.querySelector('.modal-overlay.active');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }

    // Funcionalidades específicas
    shareCaso(casoId) {
        const caso = this.dataManager.getCasoById(casoId);
        
        if (caso) {
            if (navigator.share) {
                navigator.share({
                    title: caso.titulo,
                    text: caso.descricaoResumo,
                    url: `${window.location.origin}/pages/caso.html?id=${casoId}`
                }).catch(err => {
                    console.log('Erro ao compartilhar:', err);
                });
            } else {
                // Fallback para navegadores sem Web Share API
                const url = `${window.location.origin}/pages/caso.html?id=${casoId}`;
                navigator.clipboard.writeText(url).then(() => {
                    this.showNotification('Link copiado para a área de transferência!', 'success');
                }).catch(err => {
                    this.showNotification('Erro ao copiar link', 'error');
                    console.error('Erro ao copiar para clipboard:', err);
                });
            }
        } else {
            this.showNotification('Caso não encontrado', 'error');
        }
    }

    // Utilitários de segurança
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }
    
    formatNumber(num) {
        if (!num) return '0';
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num.toString();
    }

    // Featured Cases Slider
    setupFeaturedCases() {
        const track = document.getElementById('featuredCasesTrack');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const dotsContainer = document.getElementById('sliderDots');
        
        // Verificar se estamos na página principal (index.html)
        const bentoGrid = document.getElementById('featuredCasesBento');
        if (bentoGrid) {
            console.log('Configurando área de casos em destaque (Bento Grid)...');
            // Aguardar um pouco para garantir que os dados foram carregados
            setTimeout(() => {
                this.renderFeaturedCases();
            }, 100);
        }
        
        // Se houver slider track (design antigo)
        if (track) {
            this.currentSlide = 0;
            this.totalSlides = 0;
            
            if (prevBtn && nextBtn) {
                prevBtn.addEventListener('click', () => this.prevSlide());
                nextBtn.addEventListener('click', () => this.nextSlide());
            }
        }
    }
    
    renderFeaturedCases() {
        const bentoGrid = document.getElementById('featuredCasesBento');
        console.log('Renderizando casos em destaque, elemento encontrado:', !!bentoGrid);
        if (!bentoGrid) {
            console.error('Elemento featuredCasesBento não encontrado!');
            return;
        }
        
        // Priorizar casos de Tecnologia Social e Inovação
        const allCasos = this.dataManager.getCasos();
        console.log('Total de casos disponíveis:', allCasos.length);
        
        const casos = allCasos
            .filter(caso => caso.aprovado)
            .sort((a, b) => {
                // Priorizar categorias de inovação
                const innovationCategories = ['Tecnologia Social', 'Economia Solidária', 'Educação'];
                const aIsInnovation = innovationCategories.includes(a.categoria);
                const bIsInnovation = innovationCategories.includes(b.categoria);
                
                if (aIsInnovation && !bIsInnovation) return -1;
                if (!aIsInnovation && bIsInnovation) return 1;
                
                // Depois ordenar por beneficiários
                return (b.beneficiarios || 0) - (a.beneficiarios || 0);
            })
            .slice(0, 6);
        
        console.log('Casos filtrados para destaque:', casos.length);
        
        bentoGrid.innerHTML = casos.map((caso, index) => `
            <div class="bento-card ${index === 0 ? 'featured' : ''}" onclick="location.href='pages/caso.html?id=${caso.id}'">
                <div class="bento-category-tag">${caso.categoria}</div>
                <div class="bento-card-header">
                    ${this.getCategoryIcon(caso.categoria)}
                </div>
                <div class="bento-card-content">
                    <h3 class="bento-card-title">${this.escapeHtml(caso.titulo)}</h3>
                    <p class="bento-card-description">${this.escapeHtml(caso.descricaoResumo)}</p>
                    <div class="bento-card-stats">
                        <div class="bento-stat">
                            <span class="bento-stat-number">${this.formatNumber(caso.beneficiarios)}</span>
                            <span class="bento-stat-label">Impacto</span>
                        </div>
                        <div class="bento-stat">
                            <span class="bento-stat-number">${caso.regiao}</span>
                            <span class="bento-stat-label">Região</span>
                        </div>
                        <div class="bento-stat">
                            <span class="bento-stat-number">⚡<span class="impact-indicator"></span></span>
                            <span class="bento-stat-label">Inovação</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add hover animations to bento cards
        this.addBentoInteractions();
    }
    
    addBentoInteractions() {
        const bentoCards = document.querySelectorAll('.bento-card');
        
        bentoCards.forEach((card, index) => {
            // Stagger animation entrance
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('animate-in');
            
            // 3D Tilt Effect
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = (y - centerY) / 15;
                const rotateY = (centerX - x) / 15;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
            
            // Click animation
            card.addEventListener('click', () => {
                card.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    card.style.transform = '';
                }, 200);
            });
        });
    }
    
    prevSlide() {
        if (this.currentSlide > 0) {
            this.currentSlide--;
            this.updateSlider();
        }
    }
    
    nextSlide() {
        if (this.currentSlide < this.totalSlides - 1) {
            this.currentSlide++;
            this.updateSlider();
        }
    }
    
    goToSlide(slideIndex) {
        if (slideIndex >= 0 && slideIndex < this.totalSlides) {
            this.currentSlide = slideIndex;
            this.updateSlider();
        }
    }
    
    updateSlider() {
        const track = document.getElementById('featuredCasesTrack');
        const dots = document.querySelectorAll('.slider-dot');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (track) {
            const translateX = -this.currentSlide * 430; // 400px width + 30px gap
            track.style.transform = `translateX(${translateX}px)`;
        }
        
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentSlide);
        });
        
        if (prevBtn) prevBtn.disabled = this.currentSlide === 0;
        if (nextBtn) nextBtn.disabled = this.currentSlide === this.totalSlides - 1;
    }
    
    getCategoryIcon(categoria) {
        const icons = {
            'Educação': '📚',
            'Saúde': '🏥',
            'Meio Ambiente': '🌱',
            'Inclusão Social': '🤝',
            'Tecnologia Social': '💡',
            'Economia Solidária': '💰'
        };
        return icons[categoria] || '📍';
    }
    
    // Quick Filters
    setupQuickFilters() {
        const quickFilters = document.querySelectorAll('.quick-filter');
        const searchInput = document.querySelector('.all-cases-section .search-input');
        
        this.activeQuickFilter = 'recent';
        this.renderCompactCases();
        
        quickFilters.forEach(filter => {
            filter.addEventListener('click', (e) => {
                quickFilters.forEach(f => f.classList.remove('active'));
                e.target.classList.add('active');
                this.activeQuickFilter = e.target.dataset.filter;
                this.renderCompactCases();
            });
        });
        
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.quickSearchTerm = e.target.value;
                this.renderCompactCases();
            }, 300));
        }
    }
    
    renderCompactCases() {
        const container = document.querySelector('.cases-grid-compact');
        const countElement = document.getElementById('casesCount');
        if (!container) return;
        
        let casos = this.dataManager.getCasos().filter(caso => caso.aprovado);
        
        // Apply search filter
        if (this.quickSearchTerm && this.quickSearchTerm.trim()) {
            const searchTerm = this.quickSearchTerm.toLowerCase();
            casos = casos.filter(caso => 
                caso.titulo.toLowerCase().includes(searchTerm) ||
                caso.descricaoResumo.toLowerCase().includes(searchTerm) ||
                caso.categoria.toLowerCase().includes(searchTerm) ||
                caso.organizacao.toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply quick filters
        switch (this.activeQuickFilter) {
            case 'recent':
                casos.sort((a, b) => new Date(b.dataCadastro) - new Date(a.dataCadastro));
                break;
            case 'impact':
                casos.sort((a, b) => (b.beneficiarios || 0) - (a.beneficiarios || 0));
                break;
            case 'active':
                casos = casos.filter(caso => caso.status === 'Em andamento');
                break;
            case 'education':
                casos = casos.filter(caso => caso.categoria === 'Educação');
                break;
            case 'health':
                casos = casos.filter(caso => caso.categoria === 'Saúde');
                break;
            case 'environment':
                casos = casos.filter(caso => caso.categoria === 'Meio Ambiente');
                break;
        }
        
        const displayCases = casos.slice(0, 8);
        
        if (displayCases.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                    <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">📄</div>
                    <h3>Nenhum caso encontrado</h3>
                    <p style="color: var(--text-light);">Tente ajustar os filtros ou busca.</p>
                </div>
            `;
        } else {
            container.innerHTML = displayCases.map(caso => `
                <div class="case-card-compact">
                    <span class="case-category-badge badge-${this.getCategorySlug(caso.categoria)}">${caso.categoria}</span>
                    <h3 class="case-title">${this.escapeHtml(caso.titulo)}</h3>
                    <div class="case-meta">
                        <span>🏢 ${this.escapeHtml(caso.organizacao)}</span>
                        <span>📍 ${this.escapeHtml(caso.regiao)}</span>
                        <span>👥 ${caso.beneficiarios} beneficiários</span>
                    </div>
                    <p class="case-description">${this.escapeHtml(caso.descricaoResumo)}</p>
                    <div class="case-actions">
                        <a href="pages/caso.html?id=${caso.id}" class="btn-outline btn-small">Ver Detalhes</a>
                        <button class="btn-ghost btn-small" onclick="app.shareCaso(${caso.id})">↗️ Compartilhar</button>
                    </div>
                </div>
            `).join('');
        }
        
        if (countElement) {
            countElement.textContent = `Mostrando ${displayCases.length} de ${casos.length} casos`;
        }
    }
    
    // Horizontal Methodology Animation
    setupHorizontalMethodology() {
        const progressLine = document.getElementById('progressLine');
        const steps = document.querySelectorAll('.methodology-step-horizontal');
        
        if (!progressLine || !steps.length) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Animate progress line
                    setTimeout(() => {
                        progressLine.style.width = '100%';
                    }, 500);
                    
                    // Animate steps with delay
                    steps.forEach((step, index) => {
                        setTimeout(() => {
                            step.classList.add('animated');
                        }, 800 + (index * 200));
                    });
                    
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.3
        });
        
        const methodologySection = document.querySelector('.methodology-section-horizontal');
        if (methodologySection) {
            observer.observe(methodologySection);
        }
    }
    
    // Update stats with new elements
    updateStats() {
        const stats = this.dataManager.getStats();

        // Atualiza elementos de estatísticas se existirem (nova seção)
        this.updateStatElement('[data-stat="casos"]', stats.casosAprovados);
        this.updateStatElement('[data-stat="regioes"]', stats.regioes);
        this.updateStatElement('[data-stat="beneficiarios"]', stats.beneficiarios);
        this.updateStatElement('[data-stat="organizacoes"]', stats.organizacoes);
    }

    // Limpeza de recursos
    cleanup() {
        // Limpar observers de números
        if (this.numberObservers) {
            this.numberObservers.forEach(observer => observer.disconnect());
            this.numberObservers.clear();
        }

        // Limpar observers de dados e auth
        if (this.dataManager) {
            this.dataManager.removeObserver(this);
        }
        if (this.authManager) {
            this.authManager.removeObserver(this);
        }
    }
}

// Inicializar aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ObservatorioApp();
});

// CSS adicional via JavaScript para animações
const additionalStyles = `
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.notification {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
}

.notification-close {
    background: none;
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s;
}

.notification-close:hover {
    opacity: 1;
}
`;

// Adicionar estilos ao documento
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);