// Auth0 Client - Gerenciamento de autenticação real
class Auth0Client {
    constructor() {
        this.auth0 = null;
        this.config = {
            domain: 'dev-cvjwhtcjyx8zmows.us.auth0.com',
            clientID: 'pIcBfUTnGTh7Du1trOtnYKJU4pH5zMUW',
            redirectUri: this.getRedirectUri(),
            responseType: 'token id_token',
            scope: 'openid profile email'
        };
        
        // Config inicializada
        this.init();
    }

    static getInstance() {
        if (!Auth0Client.instance) {
            Auth0Client.instance = new Auth0Client();
        }
        return Auth0Client.instance;
    }

    // Obter URI de redirect correto baseado no ambiente
    getRedirectUri() {
        const origin = window.location.origin;
        const callbackPath = '/pages/callback.html';
        return origin + callbackPath;
    }

    init() {
        if (typeof window.auth0 !== 'undefined') {
            this.auth0 = new window.auth0.WebAuth(this.config);
        } else {
            this.loadAuth0SDK();
        }
    }

    async loadAuth0SDK() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.auth0.com/js/auth0/9.23.0/auth0.min.js';
            script.onload = () => {
                this.auth0 = new window.auth0.WebAuth(this.config);
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Login com provedor social
    async loginWithSocial(provider) {
        try {
            if (!this.auth0) {
                await this.loadAuth0SDK();
            }
            
            const connection = this.getConnectionName(provider);
            
            const authParams = {
                connection: connection,
                prompt: 'select_account'
            };
            
            this.auth0.authorize(authParams);
            
        } catch (error) {
            console.error('Error in loginWithSocial:', error);
            throw error;
        }
    }

    // Login com email/senha
    async loginWithCredentials(email, password) {
        if (!this.auth0) await this.loadAuth0SDK();
        
        return new Promise((resolve, reject) => {
            this.auth0.login({
                realm: 'Username-Password-Authentication',
                username: email,
                password: password,
                scope: this.config.scope,
                responseType: this.config.responseType
            }, (err, result) => {
                if (err) {
                    return reject(err);
                }
                try {
                    // Quando tokens vierem na resposta, salvar sessão
                    if (result && (result.idToken || result.id_token) && (result.accessToken || result.access_token)) {
                        const authResult = {
                            idToken: result.idToken || result.id_token,
                            accessToken: result.accessToken || result.access_token,
                            expiresIn: result.expiresIn || 3600,
                            idTokenPayload: result.idTokenPayload || undefined
                        };
                        this.setSession(authResult);
                    }
                    resolve(result);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    // Signup
    async signup(email, password, metadata = {}) {
        if (!this.auth0) await this.loadAuth0SDK();
        
        return new Promise((resolve, reject) => {
            console.log('🔐 Iniciando signup no Auth0 para:', email);
            
            this.auth0.signup({
                connection: 'Username-Password-Authentication',
                email: email,
                password: password,
                user_metadata: metadata
            }, (err, result) => {
                if (err) {
                    console.error('❌ Erro no signup Auth0:', err);
                    
                    // Melhor tratamento de erros específicos
                    if (err.code === 'user_exists') {
                        err.description = 'Já existe uma conta com este email. Tente fazer login.';
                    } else if (err.code === 'password_strength_error') {
                        err.description = 'Senha muito fraca. Use pelo menos 8 caracteres com maiúsculas, números e símbolos.';
                    } else if (err.description && err.description.includes('Password')) {
                        err.description = 'Senha não atende aos requisitos de segurança. Use pelo menos 8 caracteres.';
                    }
                    
                    reject(err);
                } else {
                    console.log('✅ Signup Auth0 concluído:', result);
                    
                    // Resultado do signup é diferente do login
                    // Normalmente é algo como: { _id: "...", email_verified: false }
                    resolve(result);
                }
            });
        });
    }

    // Processar callback após login
    async handleAuthentication() {
        if (!this.auth0) await this.loadAuth0SDK();
        
        return new Promise((resolve, reject) => {
            console.log('🔄 Auth0 parseHash starting...');
            this.auth0.parseHash((err, authResult) => {
                console.log('📥 parseHash callback - err:', err);
                console.log('📥 parseHash callback - authResult:', authResult);
                
                if (authResult && authResult.accessToken && authResult.idToken) {
                    console.log('✅ Valid auth result, setting session...');
                    this.setSession(authResult);
                    resolve(authResult);
                } else if (err) {
                    console.error('❌ Auth0 parseHash error:', err);
                    reject(err);
                } else {
                    console.warn('⚠️ No authResult and no error');
                    reject(new Error('No authentication result received'));
                }
            });
        });
    }

    // Salvar sessão
    setSession(authResult) {
        const expiresAt = JSON.stringify(
            authResult.expiresIn * 1000 + new Date().getTime()
        );
        
        localStorage.setItem('auth0_access_token', authResult.accessToken);
        localStorage.setItem('auth0_id_token', authResult.idToken);
        localStorage.setItem('auth0_expires_at', expiresAt);
        
        if (authResult.idTokenPayload) {
            localStorage.setItem('auth0_user', JSON.stringify(authResult.idTokenPayload));
        }
    }

    // Logout
    logout(returnTo = window.location.origin) {
        // Limpar tokens locais
        localStorage.removeItem('auth0_access_token');
        localStorage.removeItem('auth0_id_token');
        localStorage.removeItem('auth0_expires_at');
        localStorage.removeItem('auth0_user');
        
        // Logout no Auth0
        if (this.auth0) {
            this.auth0.logout({
                returnTo: returnTo,
                clientID: this.config.clientID
            });
        }
    }

    // Verificar se está autenticado
    isAuthenticated() {
        const expiresAt = JSON.parse(localStorage.getItem('auth0_expires_at') || '0');
        return new Date().getTime() < expiresAt;
    }

    // Obter token de acesso
    getAccessToken() {
        return localStorage.getItem('auth0_access_token');
    }

    // Obter dados do usuário
    getUser() {
        const userStr = localStorage.getItem('auth0_user');
        return userStr ? JSON.parse(userStr) : null;
    }

    // Renovar token
    async renewToken() {
        if (!this.auth0) await this.loadAuth0SDK();
        
        return new Promise((resolve, reject) => {
            this.auth0.checkSession({}, (err, authResult) => {
                if (authResult && authResult.accessToken && authResult.idToken) {
                    this.setSession(authResult);
                    resolve(authResult);
                } else if (err) {
                    reject(err);
                }
            });
        });
    }

    // Obter nome da conexão baseado no provedor
    getConnectionName(provider) {
        const connections = {
            'google': 'google-oauth2',
            'facebook': 'facebook',
            'apple': 'apple',
            'github': 'github',
            'linkedin': 'linkedin',
            'twitter': 'twitter'
        };
        return connections[provider] || provider;
    }

    // Verificar e renovar token se necessário
    async checkAndRenewToken() {
        if (!this.isAuthenticated()) {
            try {
                await this.renewToken();
                return true;
            } catch (error) {
                return false;
            }
        }
        return true;
    }

    // Obter perfil completo do usuário
    async getUserProfile() {
        if (!this.auth0) await this.loadAuth0SDK();
        
        const accessToken = this.getAccessToken();
        if (!accessToken) {
            throw new Error('No access token available');
        }

        return new Promise((resolve, reject) => {
            this.auth0.client.userInfo(accessToken, (err, user) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(user);
                }
            });
        });
    }
}

// Export para uso global
window.Auth0Client = Auth0Client;
