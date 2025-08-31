// Auth0 Client - Configuração de autenticação
class Auth0Client {
    constructor() {
        this.auth0 = null;
        // Get Auth0 config from loaded config or use defaults
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const auth0Config = window.AUTH0_CONFIG || {};
        
        this.config = {
            domain: isDevelopment ? 'dev-placeholder.us.auth0.com' : (auth0Config.AUTH0_DOMAIN || 'alphzilla.us.auth0.com'),
            clientId: isDevelopment ? 'dev-placeholder-client-id' : (auth0Config.AUTH0_CLIENT_ID || 'alphzilla-client-id'),
            redirectUri: window.location.origin + '/pages/callback.html',
            scope: 'openid profile email'
        };
        
        console.log('🔐 Auth0 Config:', { 
            domain: this.config.domain, 
            clientId: this.config.clientId, 
            isDevelopment,
            hasRealClientId: this.config.clientId && this.config.clientId !== 'alphzilla-client-id' && this.config.clientId !== 'dev-placeholder-client-id'
        });
        this.init();
    }

    static getInstance() {
        if (!Auth0Client.instance) {
            Auth0Client.instance = new Auth0Client();
        }
        return Auth0Client.instance;
    }

    async init() {
        // Verificar se Auth0 SDK está disponível
        if (typeof auth0 !== 'undefined') {
            this.auth0 = new auth0.WebAuth(this.config);
        } else {
            console.log('Auth0 SDK não carregado. Carregando dinamicamente...');
            await this.loadAuth0SDK();
        }
    }

    async loadAuth0SDK() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.auth0.com/js/auth0/9.23.0/auth0.min.js';
            script.onload = () => {
                this.auth0 = new auth0.WebAuth(this.config);
                console.log('Auth0 client initialized');
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Login
    login(options = {}) {
        if (!this.auth0) {
            console.error('Auth0 client not initialized');
            return;
        }

        this.auth0.authorize({
            connection: options.connection || 'Username-Password-Authentication',
            ...options
        });
    }

    // Login com Google
    loginWithGoogle() {
        this.login({ connection: 'google-oauth2' });
    }

    // Login com email/password
    loginWithCredentials(email, password, callback) {
        if (!this.auth0) {
            console.error('Auth0 client not initialized');
            return;
        }

        this.auth0.login({
            realm: 'Username-Password-Authentication',
            username: email,
            password: password,
            scope: this.config.scope
        }, callback);
    }

    // Signup
    signup(email, password, userData, callback) {
        if (!this.auth0) {
            console.error('Auth0 client not initialized');
            return;
        }

        this.auth0.signup({
            connection: 'Username-Password-Authentication',
            email: email,
            password: password,
            user_metadata: userData
        }, callback);
    }

    // Parse callback
    parseHash(callback) {
        if (!this.auth0) {
            console.error('Auth0 client not initialized');
            return;
        }

        this.auth0.parseHash(callback);
    }

    // Logout
    logout() {
        if (!this.auth0) {
            console.error('Auth0 client not initialized');
            return;
        }

        this.auth0.logout({
            returnTo: window.location.origin,
            clientID: this.config.clientId
        });
    }

    // Get user info
    getUserInfo(accessToken, callback) {
        if (!this.auth0) {
            console.error('Auth0 client not initialized');
            return;
        }

        this.auth0.client.userInfo(accessToken, callback);
    }

    // Change password
    changePassword(email, callback) {
        if (!this.auth0) {
            console.error('Auth0 client not initialized');
            return;
        }

        this.auth0.changePassword({
            connection: 'Username-Password-Authentication',
            email: email
        }, callback);
    }

    // Resend verification email
    resendVerificationEmail(userId) {
        // Implementar via função Netlify
        return fetch('/.netlify/functions/auth0-resend-verification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId })
        });
    }
}

// Export para uso global
window.Auth0Client = Auth0Client;