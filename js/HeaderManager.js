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
        // Add dropdown styles
        this.addDropdownStyles();
        
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
        if (path.includes('contato.html')) return 'contato';
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

        // Ensure nav-actions has proper styling even when empty
        navActions.style.display = 'flex';
        navActions.style.alignItems = 'center';
        navActions.style.gap = '12px';

        console.log(`HeaderManager: Header updated for ${this.currentPage} page (logged in: ${isLoggedIn})`);
        console.log(`HeaderManager: Content set to: "${navActions.innerHTML}"`);
    }

    getBasePath() {
        // Determine if we're in a subdirectory (pages/) or root
        return window.location.pathname.includes('/pages/') ? '' : 'pages/';
    }

    getLoggedInHTML(currentUser, basePath) {
        const userName = this.escapeHtml(currentUser.name || currentUser.email || 'Usuário');
        const isAdmin = currentUser.isAdmin || currentUser.isRoot;
        
        // For logged in users, show user greeting, logout, and appropriate buttons
        let html = `<span class="user-greeting">Olá, ${userName}!</span>`;
        
        // Admin button for administrators
        if (isAdmin) {
            html += `<a href="${basePath}admin.html" class="btn-admin-header">Admin</a>`;
        }
        
        html += `<a href="${basePath}cadastro.html" class="btn-header">Cadastrar Caso</a>`;
        html += `<a href="#" class="btn-secondary-header" onclick="window.headerManager.logout()">Sair</a>`;
        
        return html;
    }

    getLoggedOutHTML(basePath) {
        // For logged out users, show login button
        if (this.currentPage === 'login') {
            // Na página de login, não mostrar botão duplicado
            return '';
        } else {
            // Em outras páginas: mostrar apenas "Entrar"
            return `<a href="${basePath}login.html" class="btn-secondary-header">Entrar</a>`;
        }
    }

    logout() {
        if (this.authManager) {
            this.authManager.logout();
        }
    }
    
    toggleLoginDropdown() {
        const dropdown = document.getElementById('loginDropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function closeDropdown(e) {
            if (!e.target.closest('.login-dropdown-container')) {
                dropdown.classList.remove('show');
                document.removeEventListener('click', closeDropdown);
            }
        });
    }
    
    showRequestAccessModal() {
        // Close dropdown first
        const dropdown = document.getElementById('loginDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
        
        if (this.authManager) {
            this.createRequestAccessModal();
        }
    }
    
    createRequestAccessModal() {
        const modal = document.createElement('div');
        modal.id = 'request-access-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 12px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            ">
                <h3 style="margin-top: 0; color: var(--primary-color); font-size: 24px; margin-bottom: 10px;">
                    Solicitar Acesso ao Sistema
                </h3>
                <p style="color: var(--text-light); margin-bottom: 25px; line-height: 1.6;">
                    Preencha o formulário abaixo para solicitar acesso ao sistema.
                    Um administrador revisará sua solicitação em até 48 horas.
                </p>
                
                <form id="header-access-request-form">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-dark);">Nome completo</label>
                        <input type="text" id="header-req-name" required style="width: 100%; padding: 12px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 16px;">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-dark);">E-mail</label>
                        <input type="email" id="header-req-email" required style="width: 100%; padding: 12px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 16px;">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-dark);">Tipo de perfil desejado</label>
                        <select id="header-req-role" required style="width: 100%; padding: 12px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 16px;">
                            <option value="">Selecione...</option>
                            <option value="visitante">Visitante - Consultar informações públicas</option>
                            <option value="extensionista">Extensionista - Cadastrar projetos de extensão</option>
                            <option value="pesquisador">Pesquisador - Acesso avançado para pesquisa</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 25px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-dark);">Justificativa</label>
                        <textarea id="header-req-justification" rows="4" required placeholder="Explique brevemente o motivo da solicitação de acesso, sua afiliação (se houver) e como pretende utilizar o sistema..." style="width: 100%; padding: 12px; border: 1px solid var(--border-light); border-radius: 6px; resize: vertical; font-size: 16px; line-height: 1.5;"></textarea>
                    </div>
                    
                    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 30px;">
                        <button type="button" onclick="this.closest('#request-access-modal').remove()" style="padding: 12px 24px; border: 1px solid var(--border-light); background: white; color: var(--text-dark); border-radius: 6px; cursor: pointer; font-size: 16px; transition: all 0.2s;">
                            Cancelar
                        </button>
                        <button type="submit" style="padding: 12px 24px; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 600; transition: all 0.2s;">
                            Enviar Solicitação
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listener para o formulário
        document.getElementById('header-access-request-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitAccessRequest();
        });
        
        // Focus no primeiro campo
        setTimeout(() => {
            document.getElementById('header-req-name').focus();
        }, 100);
    }
    
    submitAccessRequest() {
        const name = document.getElementById('header-req-name').value;
        const email = document.getElementById('header-req-email').value;
        const role = document.getElementById('header-req-role').value;
        const justification = document.getElementById('header-req-justification').value;
        
        try {
            this.authManager.requestAccess({
                name,
                email,
                role,
                justification
            });
            
            document.getElementById('request-access-modal').remove();
            
            // Show success notification
            this.showNotification(
                'Solicitação enviada com sucesso! Você receberá uma resposta em até 48 horas por e-mail.',
                'success'
            );
            
        } catch (error) {
            console.error('Erro ao enviar solicitação:', error);
            this.showNotification('Erro ao enviar solicitação: ' + error.message, 'error');
        }
    }
    
    showNotification(message, type = 'info') {
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, type);
        } else {
            alert(message);
        }
    }

    // HTML escape utility
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Add CSS for dropdown functionality
    addDropdownStyles() {
        if (document.getElementById('header-dropdown-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'header-dropdown-styles';
        style.textContent = `
            .login-dropdown-container {
                position: relative;
                display: inline-block;
            }
            
            .login-dropdown-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                border: none !important;
                background: var(--primary-color) !important;
                color: white !important;
            }
            
            .login-dropdown-btn:hover {
                background: var(--primary-dark) !important;
            }
            
            .dropdown-arrow {
                font-size: 12px;
                transition: transform 0.2s ease;
            }
            
            .login-dropdown-btn.active .dropdown-arrow {
                transform: rotate(180deg);
            }
            
            .login-dropdown {
                position: absolute;
                top: 100%;
                right: 0;
                background: white;
                border: 1px solid var(--border-light);
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                min-width: 180px;
                z-index: 9999;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: all 0.2s ease;
                margin-top: 5px;
            }
            
            .login-dropdown.show {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
            
            .dropdown-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                color: var(--text-dark);
                text-decoration: none;
                transition: all 0.2s ease;
                border-bottom: 1px solid var(--border-light);
            }
            
            .dropdown-item:last-child {
                border-bottom: none;
            }
            
            .dropdown-item:hover {
                background: var(--background-light);
                color: var(--primary-color);
                text-decoration: none;
            }
            
            .dropdown-icon {
                font-size: 16px;
                opacity: 0.7;
            }
            
            .btn-admin-header {
                background: linear-gradient(135deg, #ff6b35, #f7931e);
                color: white;
                padding: 10px 16px;
                border-radius: 6px;
                text-decoration: none;
                font-weight: 600;
                font-size: 14px;
                transition: all 0.3s ease;
                border: 2px solid transparent;
            }
            
            .btn-admin-header:hover {
                background: linear-gradient(135deg, #e55a2b, #e67e0e);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
                color: white;
                text-decoration: none;
            }
            
            .user-greeting {
                color: var(--text-dark);
                font-weight: 500;
                margin-right: 15px;
            }
        `;
        document.head.appendChild(style);
    }
}

// HeaderManager will be initialized by each page as needed
// Auto-initialization removed to prevent conflicts