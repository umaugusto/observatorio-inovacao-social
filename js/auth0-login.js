// Minimal Auth0 WebAuth login: ignore local form fields and redirect to Universal Login
(function() {
  async function loadConfig() {
    try {
      const res = await fetch('/.netlify/functions/config', { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (e) {}
    return {
      AUTH0_DOMAIN: 'dev-cvjwhtcjyx8zmows.us.auth0.com',
      AUTH0_CLIENT_ID: 'pIcBfUTnGTh7Du1trOtnYKJU4pH5zMUW'
    };
  }

  function stripHandlers(el) {
    if (!el) return null;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    return clone;
  }

  document.addEventListener('DOMContentLoaded', async function() {
    // Ensure SDK is present
    if (typeof auth0 === 'undefined' || !auth0.WebAuth) {
      console.error('Auth0 WebAuth SDK not loaded');
      return;
    }

    const cfg = await loadConfig();
    const web = new auth0.WebAuth({
      domain: cfg.AUTH0_DOMAIN,
      clientID: cfg.AUTH0_CLIENT_ID,
      redirectUri: window.location.origin + '/pages/callback.html',
      responseType: 'token id_token',
      scope: 'openid profile email'
    });

    const form = stripHandlers(document.getElementById('login-form'));
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        web.authorize();
      });
    }
    const btn = stripHandlers(document.getElementById('login-btn'));
    if (btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        web.authorize();
      });
    }
  });
})();

