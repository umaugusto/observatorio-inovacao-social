// HeaderManager.js - Centralized header management for all pages
class HeaderManager {
    constructor() {
        if (HeaderManager.instance) {
            return HeaderManager.instance;
        }
        
        this.authManager = null;
        this.currentPage = this.detectCurrentPage();
        HeaderManager.instance = this;
        this.init();
    }

    static getInstance() {
        if (!HeaderManager.instance) {
            HeaderManager.instance = new HeaderManager();
        }
        return HeaderManager.instance;
    }

    async init() {
        // Wait for AuthManager to be available
        this.waitForAuthManager();
        
        // Initial header update
        setTimeout(() => {
            this.updateHeader();
        }, 100);
    }

    waitForAuthManager() {
        const checkAuthManager = () => {
            if (window.AuthManager) {
                this.authManager = AuthManager.getInstance();
                this.setupAuthObserver();
                this.updateHeader();
            } else {
                setTimeout(checkAuthManager, 100);
            }
        };
        checkAuthManager();
    }

    setupAuthObserver() {
        if (this.authManager) {
            this.authManager.addObserver({
                onAuthChange: (event, data) => {
                    console.log('HeaderManager: Auth state changed:', event);
                    this.updateHeader();
                }
            });
        }
    }

    detectCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('registro.html')) return 'registro';
        if (path.includes('login.html')) return 'login';
        if (path.includes('cadastro.html')) return 'cadastro';
        if (path.includes('casos.html')) return 'casos';
        if (path.includes('caso.html')) return 'caso';
        if (path.includes('admin.html')) return 'admin';
        if (path.includes('categorias.html')) return 'categorias';
        if (path.includes('metodologia.html')) return 'metodologia';
        if (path.includes('sobre.html')) return 'sobre';
        return 'home';
    }

    updateHeader() {
        const navActions = document.querySelector('.nav-actions');
        if (!navActions) {
            console.warn('HeaderManager: nav-actions element not found');
            return;
        }

        const isLoggedIn = this.authManager ? this.authManager.isAuthenticated() : false;
        const currentUser = this.authManager ? this.authManager.getCurrentUser() : null;
        
        // Determine base path for navigation
        const basePath = this.getBasePath();

        if (isLoggedIn && currentUser) {
            // User is logged in
            navActions.innerHTML = this.getLoggedInHTML(currentUser, basePath);
        } else {
            // User is not logged in
            navActions.innerHTML = this.getLoggedOutHTML(basePath);
        }

        console.log(`HeaderManager: Header updated for ${this.currentPage} page (logged in: ${isLoggedIn})`);
    }

    getBasePath() {
        // Determine if we're in a subdirectory (pages/) or root
        return window.location.pathname.includes('/pages/') ? '' : 'pages/';
    }

    getLoggedInHTML(currentUser, basePath) {
        const userName = this.escapeHtml(currentUser.name || currentUser.email || 'Usuário');
        
        // For logged in users, show user greeting, logout, and cadastro button
        return `
            <span class="user-greeting">Olá, ${userName}!</span>
            <a href="#" class="btn-secondary-header" onclick="window.headerManager.logout()">Sair</a>
            <a href="${basePath}cadastro.html" class="btn-header">Cadastrar Caso</a>
        `;
    }

    getLoggedOutHTML(basePath) {
        // For logged out users, show login and create account buttons
        // but adapt based on current page to avoid redundant buttons
        
        let html = '';
        
        // Show "Entrar" button unless we're on login page
        if (this.currentPage !== 'login') {
            html += `<a href="${basePath}login.html" class="btn-secondary-header">Entrar</a>`;
        }
        
        // Show "Criar Conta" button unless we're on registration page
        if (this.currentPage !== 'registro') {
            html += `<a href="${basePath}registro.html" class="btn-header">Criar Conta</a>`;
        }
        
        // If we're on login or registro page and only have one button, add a back button
        if (this.currentPage === 'login' || this.currentPage === 'registro') {
            if (this.currentPage === 'login') {
                html += `<a href="${basePath}registro.html" class="btn-header">Criar Conta</a>`;
            } else {
                html += `<a href="${basePath}login.html" class="btn-header">Fazer Login</a>`;
            }
        }
        
        return html;
    }

    logout() {
        if (this.authManager) {
            this.authManager.logout();
        }
    }

    // HTML escape utility
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', () => {
    window.headerManager = new HeaderManager();
});

// Also initialize immediately if DOM is already ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.headerManager = new HeaderManager();
    });
} else {
    window.headerManager = new HeaderManager();
}