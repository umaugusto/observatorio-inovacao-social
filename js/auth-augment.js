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
      if (!this.auth0Client) throw new Error('Auth0 não inicializado');
      await this.ensureInitialized?.();
      return this.auth0Client.login({ login_hint: loginHint });
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

