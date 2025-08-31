// Auth0 Client - Configuração de autenticação
class Auth0Client {
    constructor() {
        this.auth0 = null;
        this.initialized = false;
        this.initPromise = null;
        
        // Get Auth0 config from loaded config or use defaults
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const auth0Config = window.AUTH0_CONFIG || {};
        
        this.config = {
            domain: auth0Config.AUTH0_DOMAIN || 'dev-cvjwhtcjyx8zmows.us.auth0.com',
            clientId: auth0Config.AUTH0_CLIENT_ID || 'pIcBfUTnGTh7Du1trOtnYKJU4pH5zMUW',
            redirectUri: window.location.origin + '/pages/callback.html',
            scope: 'openid profile email'
        };
        
        console.log('🔐 Auth0Client Constructor - Initial Config:', { 
            domain: this.config.domain, 
            clientId: this.config.clientId, 
            isDevelopment,
            hasConfig: !!window.AUTH0_CONFIG
        });
        
        // Inicializar de forma assíncrona
        this.initPromise = this.init();
    }

    static getInstance() {
        if (!Auth0Client.instance) {
            Auth0Client.instance = new Auth0Client();
        }
        return Auth0Client.instance;
    }

    async init() {
        // Aguardar configuração estar disponível
        let attempts = 0;
        while ((!window.AUTH0_CONFIG || !window.AUTH0_CONFIG.AUTH0_CLIENT_ID) && attempts < 10) {
            console.log('⏳ Waiting for Auth0 config...', attempts);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        // Atualizar config com valores carregados
        if (window.AUTH0_CONFIG) {
            this.config.domain = window.AUTH0_CONFIG.AUTH0_DOMAIN || this.config.domain;
            this.config.clientId = window.AUTH0_CONFIG.AUTH0_CLIENT_ID || this.config.clientId;
            console.log('🔐 Auth0Client using config:', this.config);
        }
        
        // Verificar se Auth0 SDK está disponível
        if (typeof auth0 !== 'undefined') {
            this.auth0 = new auth0.WebAuth(this.config);
            this.initialized = true;
            console.log('✅ Auth0 WebAuth initialized');
            console.log('   Final config used:', this.config);
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
                this.initialized = true;
                console.log('✅ Auth0 client initialized via dynamic load');
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

    // Garantir que está inicializado
    async ensureInitialized() {
        if (this.initialized) return;
        if (this.initPromise) {
            await this.initPromise;
        }
    }
    
    // Login com email/password
    async loginWithCredentials(email, password, callback) {
        console.log('🔐 Auth0Client.loginWithCredentials called');
        console.log('   Initialized:', this.initialized);
        console.log('   auth0 instance:', !!this.auth0);
        
        // Garantir inicialização
        await this.ensureInitialized();
        
        if (!this.auth0) {
            console.error('❌ Auth0 client not initialized after wait');
            callback(new Error('Auth0 não inicializado'));
            return;
        }

        console.log('🔑 Calling auth0.login with realm');
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