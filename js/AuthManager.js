// AuthManager - Sistema centralizado de autenticação
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.observers = new Set();
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 horas
        this.init();
    }

    static getInstance() {
        if (!AuthManager.instance) {
            AuthManager.instance = new AuthManager();
        }
        return AuthManager.instance;
    }

    init() {
        this.loadCurrentUser();
        this.setupSessionCheck();
    }

    // Carregar usuário atual do localStorage
    loadCurrentUser() {
        try {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                const user = JSON.parse(userData);
                
                // Verificar se a sessão ainda é válida
                if (this.isSessionValid(user)) {
                    this.currentUser = user;
                    this.notifyObservers('userLoggedIn', user);
                } else {
                    this.logout(false); // Logout silencioso
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            this.logout(false);
        }
    }

    // Verificar se a sessão ainda é válida
    isSessionValid(user) {
        if (!user.loginTime) return false;
        
        const loginTime = new Date(user.loginTime);
        const now = new Date();
        const elapsed = now - loginTime;
        
        // Se "lembrar-me" estiver ativo, sessão não expira
        if (user.remember) return true;
        
        // Caso contrário, verificar se passou do timeout
        return elapsed < this.sessionTimeout;
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
                isAdmin: false
            },
            {
                id: 2,
                name: 'Prof. Ana Costa',
                email: 'admin@ufrj.br',
                role: 'pesquisador',
                department: 'Extensão UFRJ',
                isAdmin: true
            },
            {
                id: 3,
                name: 'Dr. Carlos Mendes',
                email: 'pesquisador@ufrj.br',
                role: 'pesquisador',
                department: 'Instituto de Pesquisa Social',
                isAdmin: false
            },
            {
                id: 4,
                name: 'Maria Santos',
                email: 'coordenador@ufrj.br',
                role: 'pesquisador',
                department: 'Coordenação de Extensão',
                isAdmin: true
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
        
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('rememberLogin');
        
        if (wasLoggedIn) {
            this.notifyObservers('userLoggedOut', { showNotification, message });
        }
        
        // Redirecionar se estiver em página restrita
        this.checkRestrictedPage();
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

    // Limpeza
    destroy() {
        this.observers.clear();
        AuthManager.instance = null;
    }
}

// Export para uso global
window.AuthManager = AuthManager;