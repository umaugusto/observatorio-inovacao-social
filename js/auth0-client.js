// Auth0 Client - Gerenciamento de autenticação real
class Auth0Client {
    constructor() {
        this.auth0 = null;
        this.config = {
            domain: 'dev-cvjwhtcjyx8zmows.us.auth0.com',
            clientID: 'pIcBfUTnGTh7Du1trOtnYKJU4pH5zMUW',
            redirectUri: this.getRedirectUri(),
            responseType: 'token id_token',
            scope: 'openid profile email',
            audience: 'https://observatorioisrj.netlify.app/api'
        };
        
        console.log('🔧 Auth0Client initialized with config:', {
            domain: this.config.domain,
            clientID: this.config.clientID,
            redirectUri: this.config.redirectUri
        });
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
        const uri = origin + callbackPath;
        
        console.log('🔗 Redirect URI calculated:', uri);
        return uri;
    }

    init() {
        console.log('🚀 Initializing Auth0Client...');
        
        // Verificar se Auth0 SDK está disponível
        if (typeof window.auth0 !== 'undefined') {
            this.auth0 = new window.auth0.WebAuth(this.config);
            console.log('✅ Auth0 SDK loaded from global scope');
        } else {
            console.warn('⚠️ Auth0 SDK não carregado. Carregando dinamicamente...');
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
        console.log(`🔐 Attempting social login with ${provider}`);
        
        try {
            if (!this.auth0) {
                console.log('⏳ Auth0 SDK not ready, loading...');
                await this.loadAuth0SDK();
            }
            
            const connection = this.getConnectionName(provider);
            console.log(`🔗 Using connection: ${connection}`);
            
            const authParams = {
                connection: connection,
                prompt: 'select_account'
            };
            
            console.log('📤 Auth0.authorize params:', authParams);
            
            this.auth0.authorize(authParams);
            
            console.log('✅ Auth0.authorize called successfully');
            
        } catch (error) {
            console.error('❌ Error in loginWithSocial:', error);
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
                password: password
            }, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    // Signup
    async signup(email, password, metadata = {}) {
        if (!this.auth0) await this.loadAuth0SDK();
        
        return new Promise((resolve, reject) => {
            this.auth0.signup({
                connection: 'Username-Password-Authentication',
                email: email,
                password: password,
                user_metadata: metadata
            }, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    // Processar callback após login
    async handleAuthentication() {
        if (!this.auth0) await this.loadAuth0SDK();
        
        return new Promise((resolve, reject) => {
            this.auth0.parseHash((err, authResult) => {
                if (authResult && authResult.accessToken && authResult.idToken) {
                    this.setSession(authResult);
                    resolve(authResult);
                } else if (err) {
                    console.error('Auth0 error:', err);
                    reject(err);
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
                console.error('Failed to renew token:', error);
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