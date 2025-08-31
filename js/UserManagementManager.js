// UserManagementManager - Gerenciamento de usuários do sistema
class UserManagementManager {
    constructor() {
        this.authManager = null;
        this.users = [];
        this.accessRequests = [];
        this.init();
    }

    static getInstance() {
        if (!UserManagementManager.instance) {
            UserManagementManager.instance = new UserManagementManager();
        }
        return UserManagementManager.instance;
    }

    init() {
        this.authManager = AuthManager.getInstance();
        this.loadData();
        this.setupEventListeners();
    }

    async loadData() {
        try {
            // Carregar lista de usuários e solicitações via API
            if (this.authManager.isAdmin() || this.authManager.isRoot()) {
                await this.loadUsers();
                await this.loadAccessRequests();
            }
        } catch (error) {
            console.error('Erro ao carregar dados de usuários:', error);
        }
    }

    async loadUsers() {
        try {
            const response = await fetch('/.netlify/functions/user-management/users', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            
            if (response.ok) {
                this.users = await response.json();
            } else {
                console.warn('Erro ao carregar usuários, usando dados locais');
                this.users = [];
            }
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            this.users = [];
        }
    }

    async loadAccessRequests() {
        try {
            const response = await fetch('/.netlify/functions/access-request', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            
            if (response.ok) {
                this.accessRequests = await response.json();
            } else {
                console.warn('Erro ao carregar solicitações, usando dados locais');
                this.accessRequests = [];
            }
        } catch (error) {
            console.error('Erro ao carregar solicitações:', error);
            this.accessRequests = [];
        }
    }

    setupEventListeners() {
        // Event listeners serão configurados quando a UI for renderizada
    }

    // Renderizar interface de gerenciamento de usuários
    renderUserManagementInterface() {
        if (!this.authManager.isAdmin() && !this.authManager.isRoot()) {
            return '<div class="error-message">Acesso negado. Apenas administradores podem gerenciar usuários.</div>';
        }

        return `
            <div class="user-management-container">
                <div class="management-tabs">
                    <button class="tab-btn active" data-tab="users">Usuários (${this.users.length})</button>
                    <button class="tab-btn" data-tab="requests">Solicitações (${this.accessRequests.filter(r => r.status === 'pending').length})</button>
                </div>

                <div class="tab-content active" id="users-tab">
                    ${this.renderUsersTable()}
                    ${this.renderAddUserButton()}
                </div>

                <div class="tab-content" id="requests-tab">
                    ${this.renderAccessRequestsTable()}
                </div>
            </div>

            <style>
                .user-management-container {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    overflow: hidden;
                }

                .management-tabs {
                    display: flex;
                    background: var(--background-light);
                    border-bottom: 1px solid var(--border-light);
                }

                .tab-btn {
                    padding: 15px 25px;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    font-weight: 500;
                    color: var(--text-light);
                    transition: all 0.3s ease;
                }

                .tab-btn.active,
                .tab-btn:hover {
                    background: white;
                    color: var(--primary-color);
                    border-bottom: 2px solid var(--primary-color);
                }

                .tab-content {
                    display: none;
                    padding: 25px;
                }

                .tab-content.active {
                    display: block;
                }

                .users-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }

                .users-table th,
                .users-table td {
                    text-align: left;
                    padding: 12px;
                    border-bottom: 1px solid var(--border-light);
                }

                .users-table th {
                    background: var(--background-light);
                    font-weight: 600;
                    color: var(--text-dark);
                }

                .user-status {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 500;
                }

                .status-active {
                    background: #e8f5e8;
                    color: #2e7d32;
                }

                .status-inactive {
                    background: #ffebee;
                    color: #c62828;
                }

                .user-actions {
                    display: flex;
                    gap: 8px;
                }

                .btn-icon {
                    background: none;
                    border: 1px solid var(--border-light);
                    padding: 6px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s ease;
                }

                .btn-icon:hover {
                    background: var(--background-light);
                }

                .btn-add-user {
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.3s ease;
                }

                .btn-add-user:hover {
                    background: var(--primary-dark);
                }

                .request-card {
                    background: var(--background-light);
                    border: 1px solid var(--border-light);
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 15px;
                }

                .request-header {
                    display: flex;
                    justify-content: between;
                    align-items: center;
                    margin-bottom: 10px;
                }

                .request-name {
                    font-weight: 600;
                    color: var(--text-dark);
                }

                .request-email {
                    color: var(--text-light);
                    font-size: 14px;
                }

                .request-status {
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 500;
                }

                .status-pending {
                    background: #fff3cd;
                    color: #856404;
                }

                .request-actions {
                    margin-top: 15px;
                    display: flex;
                    gap: 10px;
                }

                .btn-approve {
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }

                .btn-reject {
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
            </style>
        `;
    }

    renderUsersTable() {
        if (this.users.length === 0) {
            return '<div class="empty-state">Nenhum usuário encontrado.</div>';
        }

        const rows = this.users.map(user => `
            <tr>
                <td>
                    <div>
                        <div class="user-name">${this.escapeHtml(user.name)}</div>
                        <div class="user-email" style="font-size: 12px; color: var(--text-light);">
                            ${this.escapeHtml(user.email)}
                        </div>
                    </div>
                </td>
                <td>${this.getRoleDisplayName(user.role)}</td>
                <td>
                    <span class="user-status ${user.active ? 'status-active' : 'status-inactive'}">
                        ${user.active ? 'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td>
                    <span class="user-status ${user.isAdmin ? 'status-admin' : ''}">
                        ${user.isRoot ? 'Root' : (user.isAdmin ? 'Admin' : 'Usuário')}
                    </span>
                </td>
                <td>
                    <div class="user-actions">
                        ${!user.isRoot ? `
                            <button class="btn-icon" onclick="userManagement.editUser('${user.id}')" title="Editar">
                                ✏️
                            </button>
                            <button class="btn-icon" onclick="userManagement.resetPassword('${user.id}')" title="Resetar Senha">
                                🔑
                            </button>
                            <button class="btn-icon" onclick="userManagement.toggleUserStatus('${user.id}')" title="${user.active ? 'Desativar' : 'Ativar'}">
                                ${user.active ? '🚫' : '✅'}
                            </button>
                            <button class="btn-icon" onclick="userManagement.deleteUser('${user.id}')" title="Remover" style="color: #dc3545;">
                                🗑️
                            </button>
                        ` : `
                            <span style="font-size: 12px; color: var(--text-light);">Usuário protegido</span>
                        `}
                    </div>
                </td>
            </tr>
        `).join('');

        return `
            <table class="users-table">
                <thead>
                    <tr>
                        <th>Nome / E-mail</th>
                        <th>Perfil</th>
                        <th>Status</th>
                        <th>Tipo</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    renderAddUserButton() {
        return `
            <button class="btn-add-user" onclick="userManagement.showAddUserModal()">
                + Adicionar Usuário
            </button>
        `;
    }

    renderAccessRequestsTable() {
        const pendingRequests = this.accessRequests.filter(r => r.status === 'pending');
        
        if (pendingRequests.length === 0) {
            return '<div class="empty-state">Nenhuma solicitação pendente.</div>';
        }

        return pendingRequests.map(request => `
            <div class="request-card">
                <div class="request-header">
                    <div>
                        <div class="request-name">${this.escapeHtml(request.name)}</div>
                        <div class="request-email">${this.escapeHtml(request.email)}</div>
                    </div>
                    <span class="request-status status-pending">Pendente</span>
                </div>
                
                <div style="margin: 10px 0;">
                    <strong>Perfil solicitado:</strong> ${this.getRoleDisplayName(request.role)}<br>
                    <strong>Data:</strong> ${new Date(request.requestedAt).toLocaleDateString('pt-BR')}<br>
                    <strong>Justificativa:</strong><br>
                    <div style="background: white; padding: 10px; border-radius: 4px; margin-top: 5px; font-style: italic;">
                        "${this.escapeHtml(request.justification)}"
                    </div>
                </div>

                <div class="request-actions">
                    <button class="btn-approve" onclick="userManagement.approveRequest('${request.id}')">
                        Aprovar
                    </button>
                    <button class="btn-reject" onclick="userManagement.rejectRequest('${request.id}')">
                        Rejeitar
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Métodos de ação
    showAddUserModal() {
        const modal = this.createModal('Adicionar Usuário', `
            <form id="add-user-form">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Nome completo</label>
                    <input type="text" id="new-user-name" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">E-mail</label>
                    <input type="email" id="new-user-email" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Senha temporária</label>
                    <input type="text" id="new-user-password" value="${this.generatePassword()}" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tipo de perfil</label>
                    <select id="new-user-role" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="">Selecione...</option>
                        <option value="visitante">Visitante</option>
                        <option value="extensionista">Extensionista</option>
                        <option value="pesquisador">Pesquisador</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="new-user-admin">
                        <span>Usuário Administrador</span>
                    </label>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button type="submit" style="background: var(--primary-color); color: white;">Adicionar</button>
                </div>
            </form>
        `);

        document.getElementById('add-user-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addUser();
        });
    }

    addUser() {
        const name = document.getElementById('new-user-name').value;
        const email = document.getElementById('new-user-email').value;
        const password = document.getElementById('new-user-password').value;
        const role = document.getElementById('new-user-role').value;
        const isAdmin = document.getElementById('new-user-admin').checked;

        try {
            this.authManager.addUser({
                name,
                email,
                password,
                role,
                isAdmin
            });

            this.loadData();
            this.refreshInterface();
            
            document.querySelector('.modal').remove();
            this.showNotification('Usuário adicionado com sucesso!', 'success');
        } catch (error) {
            this.showNotification('Erro ao adicionar usuário: ' + error.message, 'error');
        }
    }

    async approveRequest(requestId) {
        const request = this.accessRequests.find(r => r.id === requestId);
        if (!request) {
            this.showNotification('Solicitação não encontrada.', 'error');
            return;
        }

        if (!confirm(`Aprovar solicitação de ${request.name} (${request.email}) como ${request.role}?`)) {
            return;
        }

        try {
            const response = await fetch('/.netlify/functions/access-request', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    requestId: requestId,
                    action: 'approve',
                    approvedBy: this.authManager.getCurrentUser().id
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao aprovar solicitação');
            }

            await this.loadData();
            this.refreshInterface();
            this.showNotification('Solicitação aprovada! Usuário criado com sucesso.', 'success');
        } catch (error) {
            console.error('Erro ao aprovar solicitação:', error);
            this.showNotification('Erro ao aprovar solicitação: ' + error.message, 'error');
        }
    }

    async rejectRequest(requestId) {
        const request = this.accessRequests.find(r => r.id === requestId);
        if (!request) {
            this.showNotification('Solicitação não encontrada.', 'error');
            return;
        }

        const reason = prompt('Motivo da rejeição (opcional):') || '';

        if (!confirm(`Rejeitar solicitação de ${request.name} (${request.email})?`)) {
            return;
        }

        try {
            const response = await fetch('/.netlify/functions/access-request', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    requestId: requestId,
                    action: 'reject',
                    approvedBy: this.authManager.getCurrentUser().id,
                    reason: reason
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao rejeitar solicitação');
            }

            await this.loadData();
            this.refreshInterface();
            this.showNotification('Solicitação rejeitada.', 'success');
        } catch (error) {
            console.error('Erro ao rejeitar solicitação:', error);
            this.showNotification('Erro ao rejeitar solicitação: ' + error.message, 'error');
        }
    }

    resetPassword(userId) {
        const newPassword = prompt('Digite a nova senha temporária:');
        if (!newPassword) return;

        try {
            this.authManager.resetUserPassword(userId, newPassword);
            this.showNotification('Senha resetada com sucesso! O usuário deverá alterá-la no próximo login.', 'success');
        } catch (error) {
            this.showNotification('Erro ao resetar senha: ' + error.message, 'error');
        }
    }

    toggleUserStatus(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const action = user.active ? 'desativar' : 'ativar';
        if (!confirm(`Tem certeza que deseja ${action} este usuário?`)) return;

        try {
            this.authManager.updateUser(userId, { active: !user.active });
            this.loadData();
            this.refreshInterface();
            this.showNotification(`Usuário ${user.active ? 'desativado' : 'ativado'} com sucesso!`, 'success');
        } catch (error) {
            this.showNotification('Erro ao alterar status: ' + error.message, 'error');
        }
    }

    deleteUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        if (!confirm(`Tem certeza que deseja remover permanentemente o usuário "${user.name}"?`)) return;

        try {
            this.authManager.removeUser(userId);
            this.loadData();
            this.refreshInterface();
            this.showNotification('Usuário removido com sucesso!', 'success');
        } catch (error) {
            this.showNotification('Erro ao remover usuário: ' + error.message, 'error');
        }
    }

    // Métodos utilitários
    getRoleDisplayName(role) {
        const roleNames = {
            'visitante': 'Visitante',
            'extensionista': 'Extensionista',
            'pesquisador': 'Pesquisador'
        };
        return roleNames[role] || role;
    }

    generatePassword() {
        return Math.random().toString(36).slice(-8);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal';
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
                border-radius: 8px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            ">
                <h3 style="margin-top: 0; color: var(--primary-color);">${title}</h3>
                ${content}
            </div>
        `;
        
        document.body.appendChild(modal);
        return modal;
    }

    refreshInterface() {
        const container = document.getElementById('user-management-content');
        if (container) {
            container.innerHTML = this.renderUserManagementInterface();
            this.setupTabSwitching();
        }
    }

    setupTabSwitching() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                
                // Update button states
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update content visibility
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(tabName + '-tab').classList.add('active');
            });
        });
    }

    showNotification(message, type = 'info') {
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// Export para uso global
window.UserManagementManager = UserManagementManager;