// Auth0 Client (SPA SDK + PKCE)
class Auth0ClientWrapper {
    constructor() {
        this.client = null;
        this.initialized = false;
        this.initPromise = null;

        const auth0Config = window.AUTH0_CONFIG || {};
        this.config = {
            domain: auth0Config.AUTH0_DOMAIN || 'dev-cvjwhtcjyx8zmows.us.auth0.com',
            clientId: auth0Config.AUTH0_CLIENT_ID || 'pIcBfUTnGTh7Du1trOtnYKJU4pH5zMUW',
            redirectUri: window.location.origin + '/pages/callback.html',
            scope: 'openid profile email'
        };

        this.initPromise = this.init();
    }

    static getInstance() {
        if (!Auth0ClientWrapper.instance) {
            Auth0ClientWrapper.instance = new Auth0ClientWrapper();
        }
        return Auth0ClientWrapper.instance;
    }

    async waitForConfig() {
        let attempts = 0;
        while ((!window.AUTH0_CONFIG || !window.AUTH0_CONFIG.AUTH0_CLIENT_ID) && attempts < 20) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        if (window.AUTH0_CONFIG) {
            this.config.domain = window.AUTH0_CONFIG.AUTH0_DOMAIN || this.config.domain;
            this.config.clientId = window.AUTH0_CONFIG.AUTH0_CLIENT_ID || this.config.clientId;
        }
    }

    async loadSpaSdk() {
        if (window.createAuth0Client) return;
        // Try jsDelivr first (UMD build), then fallback to cdn.auth0.com
        const load = (src) => new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Failed to load ' + src));
            document.head.appendChild(s);
        });
        try {
            await load('https://cdn.jsdelivr.net/npm/@auth0/auth0-spa-js@2.1.3/dist/auth0-spa-js.production.js');
        } catch (e) {
            await load('https://cdn.auth0.com/js/auth0-spa-js/2.1/auth0-spa-js.production.js');
        }
        // Poll briefly for global to appear
        let tries = 0;
        while (!window.createAuth0Client && tries < 30) {
            await new Promise(r => setTimeout(r, 100));
            tries++;
        }
        if (!window.createAuth0Client) {
            throw new Error('Auth0 SPA SDK not available after load');
        }
    }

    async init() {
        await this.waitForConfig();
        await this.loadSpaSdk();

        this.client = await window.createAuth0Client({
            domain: this.config.domain,
            clientId: this.config.clientId,
            authorizationParams: {
                redirect_uri: this.config.redirectUri,
                scope: this.config.scope
            },
            cacheLocation: 'localstorage',
            useRefreshTokens: true
        });
        this.initialized = true;
    }

    async ensureInitialized() {
        if (!this.initialized && this.initPromise) {
            await this.initPromise;
        }
    }

    async login(options = {}) {
        await this.ensureInitialized();
        return this.client.loginWithRedirect({
            authorizationParams: {
                login_hint: options.login_hint || undefined,
                screen_hint: options.screen_hint || undefined,
                prompt: options.prompt || undefined
            }
        });
    }

    async handleRedirectCallback() {
        await this.ensureInitialized();
        return this.client.handleRedirectCallback();
    }

    async isAuthenticated() {
        await this.ensureInitialized();
        return this.client.isAuthenticated();
    }

    async getUser() {
        await this.ensureInitialized();
        return this.client.getUser();
    }

    async getIdToken() {
        await this.ensureInitialized();
        const claims = await this.client.getIdTokenClaims();
        return claims ? claims.__raw : null;
    }

    async getAccessToken() {
        await this.ensureInitialized();
        return this.client.getTokenSilently();
    }

    async logout() {
        await this.ensureInitialized();
        return this.client.logout({ logoutParams: { returnTo: window.location.origin } });
    }

    async forgotPassword(login_hint) {
        // Use Universal Login password reset screen
        return this.login({ screen_hint: 'reset_password', login_hint });
    }
}

window.Auth0Client = Auth0ClientWrapper;
