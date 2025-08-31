// AuthManager - Sistema centralizado de autenticação com Auth0 + Supabase
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.observers = new Set();
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 horas
        this.auth0Client = null;
        this.supabaseClient = null;
        this.init();
    }

    static getInstance() {
        if (!AuthManager.instance) {
            AuthManager.instance = new AuthManager();
        }
        return AuthManager.instance;
    }

    async init() {
        // Inicializar clientes
        this.auth0Client = Auth0Client.getInstance();
        this.supabaseClient = SupabaseClient.getInstance();
        
        // Carregar usuário atual
        this.loadCurrentUser();
        this.setupSessionCheck();
    }

    // Carregar usuário atual do localStorage
    loadCurrentUser() {
        try {
            const userData = localStorage.getItem('current_user');
            const accessToken = localStorage.getItem('access_token');
            
            if (userData && accessToken) {
                const user = JSON.parse(userData);
                
                // Verificar se a sessão ainda é válida
                if (this.isSessionValid(user)) {
                    this.currentUser = user;
                    this.notifyObservers('userLoggedIn', user);
                    console.log('🔐 User session restored:', user.email);
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
        if (!user || !user.loginTime) {
            return false;
        }
        
        const loginTime = new Date(user.loginTime);
        const now = new Date();
        const elapsed = now - loginTime;
        
        // Se o token expirou (24 horas)
        return elapsed < this.sessionTimeout;
    }

    // Verificação periódica de sessão
    setupSessionCheck() {
        setInterval(() => {
            if (this.currentUser && !this.isSessionValid(this.currentUser)) {
                console.log('🔐 Session expired, logging out');
                this.logout(false);
            }
        }, 5 * 60 * 1000); // Verificar a cada 5 minutos
    }

    // Login com Auth0
    login(connection = 'Username-Password-Authentication') {
        if (this.auth0Client) {
            this.auth0Client.login({ connection });
        }
    }


    // Login direto com credenciais (para formulário)
    async loginWithCredentials(email, password) {
        console.log('🔐 Attempting login for:', email);
        
        // Usar Auth0 para autenticação em produção
        if (this.auth0Client && this.auth0Client.config.clientId !== 'dev-placeholder-client-id' && this.auth0Client.config.clientId !== 'alphzilla-client-id') {
            return new Promise((resolve, reject) => {
                this.auth0Client.loginWithCredentials(email, password, (err, result) => {
                    if (err) {
                        console.error('Auth0 login error:', err);
                        reject(new Error(err.description || err.error || 'Erro de login'));
                        return;
                    }

                    // Auth0 redirects automatically after successful login
                    console.log('✅ Auth0 login initiated, redirecting...');
                    resolve();
                });
            });
        }
        
        // Fallback local para desenvolvimento: Verificar se é o usuário root hardcoded
        if (email === 'antonio.aas@ufrj.br' && password === '@chk.4uGU570;123') {
            const userData = {
                id: 'root-001',
                email: 'antonio.aas@ufrj.br',
                name: 'Antonio Augusto Silva',
                role: 'pesquisador',
                isAdmin: true,
                isRoot: true,
                approved: true,
                loginTime: new Date().toISOString()
            };
            
            // Salvar no localStorage
            localStorage.setItem('current_user', JSON.stringify(userData));
            localStorage.setItem('access_token', 'mock-token-' + Date.now());
            
            this.currentUser = userData;
            this.notifyObservers('userLoggedIn', userData);
            
            console.log('✅ Development root user login successful');
            return userData;
        }
        
        // Fallback: Auth0 (se configurado)
        if (this.auth0Client && this.auth0Client.config.clientId !== 'dev-placeholder-client-id') {
            return new Promise((resolve, reject) => {
                this.auth0Client.loginWithCredentials(email, password, (err, result) => {
                    if (err) {
                        console.error('Auth0 login error:', err);
                        reject(new Error(err.description || err.error || 'Erro de login'));
                        return;
                    }

                    // Redirecionar para callback que processará o token
                    window.location.href = result.callbackUrl || '/pages/callback.html';
                    resolve();
                });
            });
        }
        
        throw new Error('Credenciais inválidas');
    }

    // Registrar novo usuário
    signup(email, password, userData = {}) {
        return new Promise((resolve, reject) => {
            if (!this.auth0Client) {
                reject(new Error('Auth0 client not initialized'));
                return;
            }

            this.auth0Client.signup(email, password, userData, (err, result) => {
                if (err) {
                    console.error('Auth0 signup error:', err);
                    reject(new Error(err.description || err.error || 'Erro no cadastro'));
                    return;
                }

                console.log('✅ Signup successful:', result);
                resolve(result);
            });
        });
    }

    // Logout
    logout(redirect = true) {
        try {
            // Limpar dados locais
            localStorage.removeItem('current_user');
            localStorage.removeItem('access_token');
            localStorage.removeItem('id_token');
            
            const previousUser = this.currentUser;
            this.currentUser = null;
            
            // Notificar observadores
            this.notifyObservers('userLoggedOut', previousUser);
            
            console.log('🚪 User logged out');
            
            if (redirect && this.auth0Client) {
                this.auth0Client.logout();
            }
        } catch (error) {
            console.error('Erro no logout:', error);
        }
    }

    // Verificação de autenticação
    isAuthenticated() {
        return this.currentUser !== null && this.isSessionValid(this.currentUser);
    }

    // Obter usuário atual
    getCurrentUser() {
        return this.currentUser;
    }

    // Verificar se usuário é admin
    isAdmin() {
        return this.currentUser && (this.currentUser.isAdmin || this.currentUser.isRoot);
    }

    // Verificar se usuário é root
    isRoot() {
        return this.currentUser && this.currentUser.isRoot;
    }

    // Verificar se usuário foi aprovado
    isApproved() {
        return this.currentUser && this.currentUser.approved;
    }

    // Gerenciamento de usuários (apenas admins)
    async getUsers() {
        if (!this.isAdmin()) {
            throw new Error('Acesso negado: apenas administradores');
        }

        try {
            const response = await fetch('/.netlify/functions/user-management/users', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Erro ao buscar usuários');
            }

            return await response.json();
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            throw error;
        }
    }

    async getPendingUsers() {
        if (!this.isAdmin()) {
            throw new Error('Acesso negado: apenas administradores');
        }

        try {
            const response = await fetch('/.netlify/functions/user-management/pending', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Erro ao buscar usuários pendentes');
            }

            return await response.json();
        } catch (error) {
            console.error('Erro ao buscar usuários pendentes:', error);
            throw error;
        }
    }

    async approveUser(userId, role = 'visitante') {
        if (!this.isAdmin()) {
            throw new Error('Acesso negado: apenas administradores');
        }

        try {
            const response = await fetch('/.netlify/functions/user-management/approve', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ userId, role })
            });

            if (!response.ok) {
                throw new Error('Erro ao aprovar usuário');
            }

            return await response.json();
        } catch (error) {
            console.error('Erro ao aprovar usuário:', error);
            throw error;
        }
    }

    async rejectUser(userId, reason = '') {
        if (!this.isAdmin()) {
            throw new Error('Acesso negado: apenas administradores');
        }

        try {
            const response = await fetch('/.netlify/functions/user-management/reject', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ userId, reason })
            });

            if (!response.ok) {
                throw new Error('Erro ao rejeitar usuário');
            }

            return await response.json();
        } catch (error) {
            console.error('Erro ao rejeitar usuário:', error);
            throw error;
        }
    }

    async updateUser(userId, updates) {
        if (!this.isAdmin()) {
            throw new Error('Acesso negado: apenas administradores');
        }

        try {
            const response = await fetch('/.netlify/functions/user-management/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ userId, updates })
            });

            if (!response.ok) {
                throw new Error('Erro ao atualizar usuário');
            }

            return await response.json();
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            throw error;
        }
    }

    async deleteUser(userId) {
        if (!this.isAdmin()) {
            throw new Error('Acesso negado: apenas administradores');
        }

        try {
            const response = await fetch('/.netlify/functions/user-management', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ userId })
            });

            if (!response.ok) {
                throw new Error('Erro ao deletar usuário');
            }

            return await response.json();
        } catch (error) {
            console.error('Erro ao deletar usuário:', error);
            throw error;
        }
    }

    // Esqueci minha senha
    forgotPassword(email) {
        return new Promise((resolve, reject) => {
            if (!this.auth0Client) {
                reject(new Error('Auth0 client not initialized'));
                return;
            }

            this.auth0Client.changePassword(email, (err, result) => {
                if (err) {
                    console.error('Auth0 forgot password error:', err);
                    reject(new Error(err.description || err.error || 'Erro ao enviar reset de senha'));
                    return;
                }

                console.log('✅ Password reset email sent');
                resolve(result);
            });
        });
    }

    // Reenviar email de verificação
    async resendVerificationEmail(userId) {
        try {
            const response = await this.auth0Client.resendVerificationEmail(userId);
            if (!response.ok) {
                throw new Error('Erro ao reenviar email de verificação');
            }
            return await response.json();
        } catch (error) {
            console.error('Erro ao reenviar email:', error);
            throw error;
        }
    }

    // Observer pattern para notificar mudanças de estado
    addObserver(observer) {
        this.observers.add(observer);
    }

    removeObserver(observer) {
        this.observers.delete(observer);
    }

    notifyObservers(event, data) {
        this.observers.forEach(observer => {
            if (observer.onAuthChange && typeof observer.onAuthChange === 'function') {
                observer.onAuthChange(event, data);
            }
        });
    }

    // Utility para escapar HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Disponibilizar globalmente
window.AuthManager = AuthManager;