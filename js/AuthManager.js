// AuthManager - Sistema centralizado de autenticação (integrado com Auth0)
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.observers = new Set();
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 horas
        this.auth0Client = null;
        this.init();
    }

    static getInstance() {
        if (!AuthManager.instance) {
            AuthManager.instance = new AuthManager();
        }
        return AuthManager.instance;
    }

    async init() {
        // Inicializar Auth0 Client se disponível
        if (typeof Auth0Client !== 'undefined') {
            this.auth0Client = Auth0Client.getInstance();
        }
        
        this.loadCurrentUser();
        this.setupSessionCheck();
    }

    // Carregar usuário atual do localStorage
    loadCurrentUser() {
        try {
            // Tentar carregar de currentUser (mock) ou current_user (Auth0)
            let userData = localStorage.getItem('current_user') || localStorage.getItem('currentUser');
            
            if (userData) {
                const user = JSON.parse(userData);
                
                // Verificar se a sessão ainda é válida
                if (this.isSessionValid(user)) {
                    this.currentUser = user;
                    this.notifyObservers('userLoggedIn', user);
                    // Mostrar banner demo se necessário
                    if (user.isDemo) {
                        setTimeout(() => this.showDemoBanner(), 1000);
                    }
                } else {
                    this.logout(false); // Logout silencioso
                }
            } else if (this.auth0Client && this.auth0Client.isAuthenticated()) {
                // Se temos Auth0 mas não temos usuário local, tentar recuperar
                this.loadUserFromAuth0();
            }
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            this.logout(false);
        }
    }

    // Carregar usuário do Auth0 se autenticado
    async loadUserFromAuth0() {
        try {
            if (!this.auth0Client) return;
            
            const auth0User = this.auth0Client.getUser();
            if (auth0User) {
                // Verificar se estamos em ambiente local
                const isLocal = window.location.hostname === 'localhost' || 
                              window.location.hostname === '127.0.0.1' || 
                              window.location.port === '8080';
                const forceFunctions = (localStorage.getItem('use_functions') || '').toLowerCase() === 'true';
                
                if (isLocal && !forceFunctions) {
                    // Em desenvolvimento local, criar usuário mock
                    console.log('🏠 AuthManager: Ambiente local detectado, usando dados mock');
                    this.currentUser = {
                        id: Date.now(),
                        auth0_id: auth0User.sub,
                        email: auth0User.email,
                        name: auth0User.name || auth0User.nickname || auth0User.email?.split('@')[0],
                        role: 'visitante',
                        is_admin: false,
                        auth0_data: auth0User,
                        access_token: this.auth0Client.getAccessToken(),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    localStorage.setItem('current_user', JSON.stringify(this.currentUser));
                    this.notifyObservers('userLoggedIn', this.currentUser);
                    // Atualizar header
                    if (window.app && window.app.updateHeaderForAuth) {
                        window.app.updateHeaderForAuth();
                    }
                    // Mostrar banner demo se necessário
                    if (this.currentUser.isDemo) {
                        setTimeout(() => this.showDemoBanner(), 1000);
                    }
                    return;
                }
                
                // Em produção, sincronizar com Supabase
                const response = await fetch('/.netlify/functions/user-sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user: auth0User })
                });

                if (response.ok) {
                    const { user } = await response.json();
                    this.currentUser = {
                        ...user,
                        auth0_data: auth0User,
                        access_token: this.auth0Client.getAccessToken()
                    };
                    localStorage.setItem('current_user', JSON.stringify(this.currentUser));
                    this.notifyObservers('userLoggedIn', this.currentUser);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar usuário do Auth0:', error);
        }
    }

    // Verificar se a sessão ainda é válida
    isSessionValid(user) {
        if (!user || !user.loginTime) {
            console.log('🔍 Session invalid: no user or loginTime');
            return false;
        }
        
        const loginTime = new Date(user.loginTime);
        const now = new Date();
        const elapsed = now - loginTime;
        
        console.log('🔍 Session check:', {
            user: user.email,
            remember: user.remember,
            elapsed: Math.round(elapsed / 1000 / 60) + ' minutes',
            timeout: Math.round(this.sessionTimeout / 1000 / 60) + ' minutes'
        });
        
        // Se "lembrar-me" estiver ativo, sessão não expira
        if (user.remember === true) {
            console.log('✅ Session valid: remember=true');
            return true;
        }
        
        // Caso contrário, verificar se passou do timeout
        const isValid = elapsed < this.sessionTimeout;
        console.log(isValid ? '✅ Session valid: within timeout' : '❌ Session expired');
        return isValid;
    }

    // Setup do verificador de sessão
    setupSessionCheck() {
        // Verificar sessão a cada 5 minutos
        setInterval(() => {
            if (this.currentUser && !this.isSessionValid(this.currentUser)) {
                this.logout(true, 'Sessão expirada. Faça login novamente.');
            }
        }, 5 * 60 * 1000);
    }

    // Login do usuário
    async login(email, password, remember = false) {
        return new Promise((resolve, reject) => {
            // Simular delay de API
            setTimeout(() => {
                const user = this.validateCredentials(email, password);
                
                if (user) {
                    const sessionData = {
                        ...user,
                        loginTime: new Date().toISOString(),
                        remember: remember,
                        sessionId: this.generateSessionId()
                    };
                    
                    this.currentUser = sessionData;
                    localStorage.setItem('currentUser', JSON.stringify(sessionData));
                    
                    if (remember) {
                        localStorage.setItem('rememberLogin', 'true');
                    } else {
                        localStorage.removeItem('rememberLogin');
                    }
                    
                    this.notifyObservers('userLoggedIn', sessionData);
                    
                    // Mostrar banner demo se necessário
                    if (sessionData.isDemo) {
                        setTimeout(() => this.showDemoBanner(), 1000);
                    }
                    
                    resolve(sessionData);
                } else {
                    reject(new Error('Credenciais inválidas'));
                }
            }, 800);
        });
    }

    // Validar credenciais (mock)
    validateCredentials(email, password) {
        const users = [
            {
                id: 1,
                name: 'João Silva',
                email: 'aluno@ufrj.br',
                role: 'aluno_extensao',
                department: 'Ciências Sociais',
                isAdmin: false,
                isDemo: true
            },
            {
                id: 2,
                name: 'Prof. Ana Costa',
                email: 'admin@ufrj.br',
                role: 'pesquisador',
                department: 'Extensão UFRJ',
                isAdmin: true,
                isDemo: true
            },
            {
                id: 3,
                name: 'Dr. Carlos Mendes',
                email: 'pesquisador@ufrj.br',
                role: 'pesquisador',
                department: 'Instituto de Pesquisa Social',
                isAdmin: false,
                isDemo: true
            },
            {
                id: 4,
                name: 'Maria Santos',
                email: 'coordenador@ufrj.br',
                role: 'pesquisador',
                department: 'Coordenação de Extensão',
                isAdmin: true,
                isDemo: true
            }
        ];

        // Validação simples para demo
        const validPasswords = {
            'aluno@ufrj.br': '123456',
            'admin@ufrj.br': 'admin123',
            'pesquisador@ufrj.br': 'pesq123',
            'coordenador@ufrj.br': 'coord123'
        };

        if (validPasswords[email] === password) {
            return users.find(user => user.email === email);
        }

        return null;
    }

    // Logout do usuário
    logout(showNotification = true, message = 'Logout realizado com sucesso!') {
        const wasLoggedIn = !!this.currentUser;
        const wasSocialLogin = this.isSocialLogin();
        
        this.currentUser = null;
        
        // Limpar localStorage (ambos os formatos)
        localStorage.removeItem('currentUser');
        localStorage.removeItem('current_user');
        localStorage.removeItem('rememberLogin');
        localStorage.removeItem('socialLogin');
        
        // Limpar dados de fluxo de registro
        sessionStorage.removeItem('registration_flow');
        
        // Se temos Auth0 real, fazer logout lá também
        if (this.auth0Client && this.auth0Client.isAuthenticated && this.auth0Client.isAuthenticated()) {
            this.auth0Client.logout(window.location.origin);
            return; // Auth0 vai redirecionar
        }
        
        if (wasLoggedIn) {
            this.notifyObservers('userLoggedOut', { showNotification, message });
        }
        
        // Para login social mock ou login normal, não redirecionar automaticamente
        // Deixar o main.js controlar o redirecionamento
        if (!wasSocialLogin) {
            this.checkRestrictedPage();
        }
    }

    // Verificar se está em página que requer autenticação
    checkRestrictedPage() {
        const restrictedPages = ['admin.html', 'cadastro.html'];
        const currentPage = window.location.pathname.split('/').pop();
        
        if (restrictedPages.includes(currentPage)) {
            if (currentPage === 'cadastro.html') {
                window.location.href = '../index.html';
            } else {
                window.location.href = 'login.html';
            }
        }
    }

    // Verificar se usuário tem permissão
    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        // Se o usuário tem flag de admin, tem todas as permissões
        if (this.currentUser.isAdmin) return true;
        
        const permissions = {
            'pesquisador': [
                'view_all', 'export_data', 'create_reports', 'analytics', 
                'view_dashboard', 'create_case', 'edit_own_case', 'view_approved', 
                'upload_media', 'comment', 'suggest_improvement'
            ],
            'aluno_extensao': [
                'create_case', 'edit_own_case', 'view_approved', 'upload_media',
                'view_dashboard', 'comment', 'suggest_improvement'
            ],
            'visitante': [
                'view_approved', 'suggest_case', 'comment', 'view_public'
            ]
        };
        
        const userPermissions = permissions[this.currentUser.role] || [];
        
        return userPermissions.includes(permission);
    }
    
    // Verificar se usuário é administrador
    isAdmin() {
        return this.currentUser?.isAdmin === true;
    }
    
    // Obter nome do perfil em português
    getRoleName(role) {
        const roleNames = {
            'pesquisador': 'Pesquisador',
            'aluno_extensao': 'Aluno de Extensão',
            'visitante': 'Visitante'
        };
        
        // Se for admin, adicionar sufixo
        if (this.currentUser?.isAdmin && this.currentUser?.role === role) {
            return roleNames[role] + ' (Admin)';
        }
        
        return roleNames[role] || 'Visitante';
    }
    
    // Obter cor do perfil
    getRoleColor(role) {
        const roleColors = {
            'pesquisador': '#1B3A4B',     // Azul escuro
            'aluno_extensao': '#4CAF50',   // Verde
            'visitante': '#9C27B0'        // Roxo
        };
        
        // Se for admin, usar cor especial
        if (this.currentUser?.isAdmin) {
            return '#E85D3B'; // Laranja para admin
        }
        
        return roleColors[role] || '#666';
    }

    // Middleware de autenticação para páginas
    requireAuth(redirectUrl = 'login.html') {
        if (!this.isAuthenticated()) {
            if (redirectUrl.includes('/')) {
                window.location.href = redirectUrl;
            } else {
                window.location.href = `pages/${redirectUrl}`;
            }
            return false;
        }
        return true;
    }

    // Middleware de autorização
    requireRole(role, redirectUrl = '../index.html') {
        if (!this.isAuthenticated() || this.currentUser.role !== role) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }
    
    // Login social (mock implementation)
    async loginWithProvider(provider) {
        return new Promise((resolve, reject) => {
            // Simular delay de OAuth
            setTimeout(() => {
                // Mock de dados do provedor
                const mockSocialUsers = {
                    'google': {
                        id: 'google_' + Date.now(),
                        name: 'Usuário Google',
                        email: 'usuario@gmail.com',
                        role: 'visitante',
                        provider: 'google',
                        isAdmin: false,
                        avatar: 'https://ui-avatars.com/api/?name=Usuario+Google'
                    },
                    'facebook': {
                        id: 'fb_' + Date.now(),
                        name: 'Usuário Facebook',
                        email: 'usuario@facebook.com',
                        role: 'visitante',
                        provider: 'facebook',
                        isAdmin: false,
                        avatar: 'https://ui-avatars.com/api/?name=Usuario+Facebook'
                    },
                    'apple': {
                        id: 'apple_' + Date.now(),
                        name: 'Usuário Apple',
                        email: 'usuario@icloud.com',
                        role: 'visitante',
                        provider: 'apple',
                        isAdmin: false,
                        avatar: 'https://ui-avatars.com/api/?name=Usuario+Apple'
                    }
                };
                
                const user = mockSocialUsers[provider];
                
                if (user) {
                    const sessionData = {
                        ...user,
                        loginTime: new Date().toISOString(),
                        remember: true,
                        sessionId: this.generateSessionId()
                    };
                    
                    this.currentUser = sessionData;
                    localStorage.setItem('currentUser', JSON.stringify(sessionData));
                    localStorage.setItem('socialLogin', provider);
                    
                    this.notifyObservers('userLoggedIn', sessionData);
                    
                    // Mostrar banner demo se necessário (contas sociais são demo por padrão)
                    setTimeout(() => this.showDemoBanner(), 1000);
                    
                    resolve(sessionData);
                } else {
                    reject(new Error('Provedor não suportado'));
                }
            }, 1000);
        });
    }
    
    // Verificar se é login social
    isSocialLogin() {
        return this.currentUser?.provider && ['google', 'facebook', 'apple'].includes(this.currentUser.provider);
    }

    // Getters
    isAuthenticated() {
        return !!this.currentUser && this.isSessionValid(this.currentUser);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getUserRole() {
        return this.currentUser?.role;
    }

    getUserName() {
        return this.currentUser?.name;
    }

    // Sistema de observadores
    addObserver(observer) {
        this.observers.add(observer);
    }

    removeObserver(observer) {
        this.observers.delete(observer);
    }

    notifyObservers(event, data) {
        this.observers.forEach(observer => {
            if (typeof observer.onAuthChange === 'function') {
                observer.onAuthChange(event, data);
            }
        });
    }

    // Utilitários
    generateSessionId() {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    refreshSession() {
        if (this.currentUser) {
            this.currentUser.loginTime = new Date().toISOString();
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        }
    }

    // Atualizar interface do usuário
    updateUI() {
        const user = this.currentUser;
        
        // Elementos que só aparecem para usuários autenticados
        document.querySelectorAll('.auth-required').forEach(element => {
            element.style.display = user ? 'block' : 'none';
        });

        // Elementos que só aparecem para usuários não autenticados
        document.querySelectorAll('.login-required').forEach(element => {
            element.style.display = user ? 'none' : 'block';
        });

        // Atualizar menu de navegação
        this.updateNavigationMenu(user);
    }

    updateNavigationMenu(user) {
        const navActions = document.querySelector('.nav-actions');
        if (!navActions) return;

        // Limpar menu existente
        const existingUserMenu = navActions.querySelector('.user-menu');
        const existingAdminLink = navActions.querySelector('#admin-link');
        
        if (existingUserMenu) existingUserMenu.remove();
        if (existingAdminLink) existingAdminLink.remove();

        if (user) {
            // Esconder link de login
            const loginLink = navActions.querySelector('.login-required');
            if (loginLink) loginLink.style.display = 'none';

            // Criar menu do usuário
            const userMenu = document.createElement('div');
            userMenu.className = 'user-menu';
            userMenu.style.cssText = 'display: flex; align-items: center; gap: 15px;';
            
            // Link para admin se tiver flag de admin
            if (user.isAdmin) {
                const adminLink = document.createElement('a');
                adminLink.id = 'admin-link';
                adminLink.href = this.getAdminUrl();
                adminLink.textContent = 'Painel Admin';
                adminLink.style.cssText = 'color: var(--text-light); text-decoration: none; background: rgba(232, 93, 59, 0.2); padding: 5px 10px; border-radius: 4px;';
                userMenu.appendChild(adminLink);
            }

            // Nome do usuário
            const userName = document.createElement('span');
            userName.textContent = user.name;
            userName.style.color = 'var(--text-light)';
            userMenu.appendChild(userName);

            // Botão de logout
            const logoutBtn = document.createElement('a');
            logoutBtn.href = '#';
            logoutBtn.textContent = 'Sair';
            logoutBtn.style.cssText = 'color: var(--text-light); text-decoration: none;';
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
            userMenu.appendChild(logoutBtn);

            navActions.appendChild(userMenu);
        } else {
            // Mostrar link de login
            const loginLink = navActions.querySelector('.login-required');
            if (loginLink) loginLink.style.display = 'block';
        }
    }

    getAdminUrl() {
        const currentPath = window.location.pathname;
        if (currentPath.includes('/pages/')) {
            return 'admin.html';
        } else {
            return 'pages/admin.html';
        }
    }

    // Verificar se usuário atual está em modo demo
    isDemoMode() {
        return this.currentUser && this.currentUser.isDemo === true;
    }

    // Exibir notificação de modo demo
    showDemoNotification(message = 'Esta é uma demonstração do sistema. Suas alterações não serão salvas permanentemente.') {
        // Criar elemento de notificação se não existir
        let notification = document.getElementById('demo-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'demo-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #ff6b35, #f7931e);
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
                z-index: 10000;
                font-family: 'Inter', sans-serif;
                font-size: 14px;
                font-weight: 500;
                max-width: 300px;
                line-height: 1.4;
                transform: translateX(400px);
                transition: transform 0.3s ease;
                border-left: 4px solid rgba(255, 255, 255, 0.3);
            `;
            
            // Ícone de demo
            const icon = document.createElement('span');
            icon.innerHTML = '🎭 ';
            icon.style.marginRight = '8px';
            
            const textSpan = document.createElement('span');
            textSpan.id = 'demo-notification-text';
            
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '×';
            closeBtn.style.cssText = `
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                font-weight: bold;
                margin-left: 10px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
                opacity: 0.8;
                transition: opacity 0.2s ease;
            `;
            closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
            closeBtn.onmouseout = () => closeBtn.style.opacity = '0.8';
            closeBtn.onclick = () => {
                notification.style.transform = 'translateX(400px)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            };
            
            notification.appendChild(icon);
            notification.appendChild(textSpan);
            notification.appendChild(closeBtn);
            document.body.appendChild(notification);
        }
        
        // Atualizar texto
        const textSpan = notification.querySelector('#demo-notification-text');
        if (textSpan) {
            textSpan.textContent = message;
        }
        
        // Mostrar notificação
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto-hide após 8 segundos
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.style.transform = 'translateX(400px)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 8000);
    }

    // Exibir banner de modo demo permanente
    showDemoBanner() {
        if (!this.isDemoMode()) return;
        
        let banner = document.getElementById('demo-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'demo-banner';
            banner.style.cssText = `
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #ff6b35, #f7931e);
                color: white;
                padding: 12px 20px;
                text-align: center;
                font-family: 'Inter', sans-serif;
                font-size: 14px;
                font-weight: 500;
                z-index: 9999;
                border-top: 2px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
            `;
            banner.innerHTML = `
                <span style="margin-right: 10px;">🎭</span>
                <strong>MODO DEMONSTRAÇÃO</strong> - Você está usando uma conta demo. 
                Suas alterações não serão salvas permanentemente no sistema.
                <button id="demo-banner-close" style="
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    padding: 4px 8px;
                    margin-left: 15px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                ">Fechar</button>
            `;
            
            document.body.appendChild(banner);
            
            // Evento de fechar
            const closeBtn = banner.querySelector('#demo-banner-close');
            closeBtn.onclick = () => {
                banner.style.transform = 'translateY(100%)';
                setTimeout(() => {
                    if (banner.parentNode) {
                        banner.parentNode.removeChild(banner);
                    }
                }, 300);
            };
        }
        
        banner.style.transform = 'translateY(0)';
    }

    // Limpeza
    destroy() {
        this.observers.clear();
        AuthManager.instance = null;
    }
}

// Export para uso global
window.AuthManager = AuthManager;
