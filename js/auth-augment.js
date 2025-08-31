// Runtime augmentations to adapt AuthManager to Auth0 SPA SDK (PKCE)
(function() {
  function withAuthManager(cb) {
    if (window.AuthManager) return cb(window.AuthManager.prototype);
    // If not yet loaded, try again shortly
    const iv = setInterval(() => {
      if (window.AuthManager) {
        clearInterval(iv);
        cb(window.AuthManager.prototype);
      }
    }, 50);
  }

  withAuthManager(function(proto) {
    // Ensure redirect-based login with email hint
    proto.loginRedirect = async function(loginHint) {
      await this.ensureInitialized?.();
      // Try SPA
      if (this.auth0Client) {
        try {
          return await this.auth0Client.login({ login_hint: loginHint });
        } catch (e) {
          // Fallback to WebAuth Universal Login
          if (window.auth0 && window.AUTH0_CONFIG) {
            const web = new auth0.WebAuth({
              domain: window.AUTH0_CONFIG.AUTH0_DOMAIN,
              clientID: window.AUTH0_CONFIG.AUTH0_CLIENT_ID,
              redirectUri: window.location.origin + '/pages/callback.html',
              responseType: 'token id_token',
              scope: 'openid profile email'
            });
            return web.authorize({ login_hint: loginHint });
          }
          throw e;
        }
      }
      // If no client, but WebAuth available
      if (window.auth0 && window.AUTH0_CONFIG) {
        const web = new auth0.WebAuth({
          domain: window.AUTH0_CONFIG.AUTH0_DOMAIN,
          clientID: window.AUTH0_CONFIG.AUTH0_CLIENT_ID,
          redirectUri: window.location.origin + '/pages/callback.html',
          responseType: 'token id_token',
          scope: 'openid profile email'
        });
        return web.authorize({ login_hint: loginHint });
      }
      throw new Error('Auth0 não inicializado');
    };

    // Override credential login to redirect (no local password processing)
    proto.loginWithCredentials = async function(email /*, password */) {
      return this.loginRedirect(email);
    };

    // Override forgot password to use Universal Login reset screen
    proto.forgotPassword = async function(email) {
      if (!this.auth0Client) throw new Error('Auth0 não inicializado');
      return this.auth0Client.forgotPassword(email);
    };
  });
})();
