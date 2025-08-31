// AuthManager - Sistema centralizado de autenticação local
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.observers = new Set();
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 horas
        this.users = []; // Lista local de usuários
        this.init();
    }

    static getInstance() {
        if (!AuthManager.instance) {
            AuthManager.instance = new AuthManager();
        }
        return AuthManager.instance;
    }

    async init() {
        // Inicializar usuários locais
        this.loadUsers();
        this.loadCurrentUser();
        this.setupSessionCheck();
    }

    // Carregar usuário atual do localStorage
    loadCurrentUser() {
        try {
            let userData = localStorage.getItem('current_user');
            
            if (userData) {
                const user = JSON.parse(userData);
                
                // Verificar se a sessão ainda é válida
                if (this.isSessionValid(user)) {
                    this.currentUser = user;
                    this.notifyObservers('userLoggedIn', user);
                    
                    // Verificar se precisa trocar a senha
                    if (user.mustChangePassword) {
                        this.showPasswordChangeModal();
                    }
                } else {
                    this.logout(false); // Logout silencioso
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            this.logout(false);
        }
    }

    // Carregar usuários do localStorage
    loadUsers() {
        try {
            const usersData = localStorage.getItem('app_users');
            if (usersData) {
                this.users = JSON.parse(usersData);
            } else {
                // Inicializar com usuários root padrão
                this.users = [{
                    id: 'root-001',
                    email: 'root@sistema.com',
                    password: this.hashPassword('root123'), // Hash da senha
                    name: 'Administrador Root',
                    role: 'pesquisador',
                    isAdmin: true,
                    isRoot: true,
                    mustChangePassword: true,
                    createdBy: 'system',
                    createdAt: new Date().toISOString(),
                    lastLogin: null,
                    active: true
                }, {
                    id: 'root-002',
                    email: 'antonio.aas@ufrj.br',
                    password: this.hashPassword('@chk.4uGU570;123'), // Hash da senha
                    name: 'Antonio Augusto Silva',
                    role: 'pesquisador',
                    isAdmin: true,
                    isRoot: true,
                    mustChangePassword: false,
                    createdBy: 'system',
                    createdAt: new Date().toISOString(),
                    lastLogin: null,
                    active: true
                }];
                this.saveUsers();
            }
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            this.users = [];
        }
    }

    // Verificar se a sessão ainda é válida
    isSessionValid(user) {
        if (!user || !user.loginTime) {
            console.log('🔍 Session invalid: no user or loginTime');
            return false;
        }
        
        const loginTime = new Date(user.loginTime);
        const now = new Date();
        const elapsed = now - loginTime;
        
        console.log('🔍 Session check:', {
            user: user.email,
            remember: user.remember,
            elapsed: Math.round(elapsed / 1000 / 60) + ' minutes',
            timeout: Math.round(this.sessionTimeout / 1000 / 60) + ' minutes'
        });
        
        // Se "lembrar-me" estiver ativo, sessão não expira
        if (user.remember === true) {
            console.log('✅ Session valid: remember=true');
            return true;
        }
        
        // Caso contrário, verificar se passou do timeout
        const isValid = elapsed < this.sessionTimeout;
        console.log(isValid ? '✅ Session valid: within timeout' : '❌ Session expired');
        return isValid;
    }

    // Setup do verificador de sessão
    setupSessionCheck() {
        // Verificar sessão a cada 5 minutos
        setInterval(() => {
            if (this.currentUser && !this.isSessionValid(this.currentUser)) {
                this.logout(true, 'Sessão expirada. Faça login novamente.');
            }
        }, 5 * 60 * 1000);
    }

    // Login do usuário
    async login(email, password, remember = false) {
        return new Promise((resolve, reject) => {
            // Simular delay de API
            setTimeout(() => {
                const user = this.validateCredentials(email, password);
                
                if (user) {
                    // Verificar se o usuário está ativo
                    if (!user.active) {
                        reject(new Error('Conta desativada. Entre em contato com o administrador.'));
                        return;
                    }
                    
                    const sessionData = {
                        ...user,
                        loginTime: new Date().toISOString(),
                        remember: remember,
                        sessionId: this.generateSessionId()
                    };
                    
                    // Atualizar último login
                    this.updateUserLastLogin(user.id);
                    
                    this.currentUser = sessionData;
                    localStorage.setItem('current_user', JSON.stringify(sessionData));
                    
                    if (remember) {
                        localStorage.setItem('rememberLogin', 'true');
                    } else {
                        localStorage.removeItem('rememberLogin');
                    }
                    
                    this.notifyObservers('userLoggedIn', sessionData);
                    
                    resolve(sessionData);
                } else {
                    reject(new Error('E-mail ou senha incorretos'));
                }
            }, 800);
        });
    }

    // Validar credenciais
    validateCredentials(email, password) {
        const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (user && this.verifyPassword(password, user.password)) {
            return user;
        }
        
        return null;
    }

    // Logout do usuário
    logout(showNotification = true, message = 'Logout realizado com sucesso!') {
        const wasLoggedIn = !!this.currentUser;
        
        this.currentUser = null;
        
        // Limpar localStorage
        localStorage.removeItem('current_user');
        localStorage.removeItem('rememberLogin');
        
        if (wasLoggedIn) {
            this.notifyObservers('userLoggedOut', { showNotification, message });
        }
        
        this.checkRestrictedPage();
    }

    // Verificar se está em página que requer autenticação
    checkRestrictedPage() {
        const restrictedPages = ['admin.html', 'cadastro.html'];
        const currentPage = window.location.pathname.split('/').pop();
        
        if (restrictedPages.includes(currentPage)) {
            if (currentPage === 'cadastro.html') {
                window.location.href = '../index.html';
            } else {
                window.location.href = 'login.html';
            }
        }
    }

    // Verificar se usuário tem permissão
    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        // Se o usuário tem flag de admin, tem todas as permissões
        if (this.currentUser.isAdmin) return true;
        
        const permissions = {
            'pesquisador': [
                'view_all', 'export_data', 'create_reports', 'analytics', 
                'view_dashboard', 'create_case', 'edit_own_case', 'view_approved', 
                'upload_media', 'comment', 'suggest_improvement'
            ],
            'aluno_extensao': [
                'create_case', 'edit_own_case', 'view_approved', 'upload_media',
                'view_dashboard', 'comment', 'suggest_improvement'
            ],
            'visitante': [
                'view_approved', 'suggest_case', 'comment', 'view_public'
            ]
        };
        
        const userPermissions = permissions[this.currentUser.role] || [];
        
        return userPermissions.includes(permission);
    }
    
    // Verificar se usuário é administrador
    isAdmin() {
        return this.currentUser?.isAdmin === true;
    }
    
    // Verificar se usuário é root
    isRoot() {
        return this.currentUser?.isRoot === true;
    }
    
    // Obter nome do perfil em português
    getRoleName(role) {
        const roleNames = {
            'pesquisador': 'Pesquisador',
            'aluno_extensao': 'Aluno de Extensão',
            'visitante': 'Visitante'
        };
        
        // Se for admin, adicionar sufixo
        if (this.currentUser?.isAdmin && this.currentUser?.role === role) {
            return roleNames[role] + ' (Admin)';
        }
        
        return roleNames[role] || 'Visitante';
    }
    
    // Obter cor do perfil
    getRoleColor(role) {
        const roleColors = {
            'pesquisador': '#1B3A4B',     // Azul escuro
            'aluno_extensao': '#4CAF50',   // Verde
            'visitante': '#9C27B0'        // Roxo
        };
        
        // Se for admin, usar cor especial
        if (this.currentUser?.isAdmin) {
            return '#E85D3B'; // Laranja para admin
        }
        
        return roleColors[role] || '#666';
    }

    // Middleware de autenticação para páginas
    requireAuth(redirectUrl = 'login.html') {
        if (!this.isAuthenticated()) {
            if (redirectUrl.includes('/')) {
                window.location.href = redirectUrl;
            } else {
                window.location.href = `pages/${redirectUrl}`;
            }
            return false;
        }
        return true;
    }

    // Middleware de autorização
    requireRole(role, redirectUrl = '../index.html') {
        if (!this.isAuthenticated() || this.currentUser.role !== role) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }
    
    // Adicionar novo usuário (apenas admins)
    addUser(userData) {
        if (!this.isAdmin() && !this.isRoot()) {
            throw new Error('Apenas administradores podem adicionar usuários');
        }
        
        // Verificar se email já existe
        if (this.users.find(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
            throw new Error('Email já está em uso');
        }
        
        const newUser = {
            id: 'user-' + Date.now(),
            email: userData.email.toLowerCase(),
            password: this.hashPassword(userData.password),
            name: userData.name,
            role: userData.role || 'visitante',
            isAdmin: userData.isAdmin || false,
            isRoot: false, // Apenas root inicial
            mustChangePassword: true, // Sempre forçar mudança de senha
            createdBy: this.currentUser.id,
            createdAt: new Date().toISOString(),
            lastLogin: null,
            active: true
        };
        
        this.users.push(newUser);
        this.saveUsers();
        
        return newUser;
    }
    
    // Atualizar usuário
    updateUser(userId, updates) {
        if (!this.isAdmin() && !this.isRoot()) {
            throw new Error('Apenas administradores podem atualizar usuários');
        }
        
        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            throw new Error('Usuário não encontrado');
        }
        
        // Root não pode ser desativado
        if (this.users[userIndex].isRoot && updates.active === false) {
            throw new Error('Usuário root não pode ser desativado');
        }
        
        this.users[userIndex] = { ...this.users[userIndex], ...updates };
        this.saveUsers();
        
        return this.users[userIndex];
    }
    
    // Remover usuário
    removeUser(userId) {
        if (!this.isAdmin() && !this.isRoot()) {
            throw new Error('Apenas administradores podem remover usuários');
        }
        
        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            throw new Error('Usuário não encontrado');
        }
        
        // Root não pode ser removido
        if (this.users[userIndex].isRoot) {
            throw new Error('Usuário root não pode ser removido');
        }
        
        this.users.splice(userIndex, 1);
        this.saveUsers();
    }

    // Getters
    isAuthenticated() {
        return !!this.currentUser && this.isSessionValid(this.currentUser);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getUserRole() {
        return this.currentUser?.role;
    }

    getUserName() {
        return this.currentUser?.name;
    }

    // Sistema de observadores
    addObserver(observer) {
        this.observers.add(observer);
    }

    removeObserver(observer) {
        this.observers.delete(observer);
    }

    notifyObservers(event, data) {
        this.observers.forEach(observer => {
            if (typeof observer.onAuthChange === 'function') {
                observer.onAuthChange(event, data);
            }
        });
    }

    // Utilitários
    generateSessionId() {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    refreshSession() {
        if (this.currentUser) {
            this.currentUser.loginTime = new Date().toISOString();
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        }
    }

    // Atualizar interface do usuário
    updateUI() {
        const user = this.currentUser;
        
        // Elementos que só aparecem para usuários autenticados
        document.querySelectorAll('.auth-required').forEach(element => {
            element.style.display = user ? 'block' : 'none';
        });

        // Elementos que só aparecem para usuários não autenticados
        document.querySelectorAll('.login-required').forEach(element => {
            element.style.display = user ? 'none' : 'block';
        });

        // Atualizar menu de navegação
        this.updateNavigationMenu(user);
    }

    updateNavigationMenu(user) {
        const navActions = document.querySelector('.nav-actions');
        if (!navActions) return;

        // Limpar menu existente
        const existingUserMenu = navActions.querySelector('.user-menu');
        const existingAdminLink = navActions.querySelector('#admin-link');
        
        if (existingUserMenu) existingUserMenu.remove();
        if (existingAdminLink) existingAdminLink.remove();

        if (user) {
            // Esconder link de login
            const loginLink = navActions.querySelector('.login-required');
            if (loginLink) loginLink.style.display = 'none';

            // Criar menu do usuário
            const userMenu = document.createElement('div');
            userMenu.className = 'user-menu';
            userMenu.style.cssText = 'display: flex; align-items: center; gap: 15px;';
            
            // Link para admin se tiver flag de admin
            if (user.isAdmin) {
                const adminLink = document.createElement('a');
                adminLink.id = 'admin-link';
                adminLink.href = this.getAdminUrl();
                adminLink.textContent = 'Painel Admin';
                adminLink.style.cssText = 'color: var(--text-light); text-decoration: none; background: rgba(232, 93, 59, 0.2); padding: 5px 10px; border-radius: 4px;';
                userMenu.appendChild(adminLink);
            }

            // Nome do usuário
            const userName = document.createElement('span');
            userName.textContent = user.name;
            userName.style.color = 'var(--text-light)';
            userMenu.appendChild(userName);

            // Botão de logout
            const logoutBtn = document.createElement('a');
            logoutBtn.href = '#';
            logoutBtn.textContent = 'Sair';
            logoutBtn.style.cssText = 'color: var(--text-light); text-decoration: none;';
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
            userMenu.appendChild(logoutBtn);

            navActions.appendChild(userMenu);
        } else {
            // Mostrar link de login
            const loginLink = navActions.querySelector('.login-required');
            if (loginLink) loginLink.style.display = 'block';
        }
    }

    getAdminUrl() {
        const currentPath = window.location.pathname;
        if (currentPath.includes('/pages/')) {
            return 'admin.html';
        } else {
            return 'pages/admin.html';
        }
    }

    getProfileUrl() {
        const currentPath = window.location.pathname;
        if (currentPath.includes('/pages/')) {
            return 'perfil.html';
        } else {
            return 'pages/perfil.html';
        }
    }

    // Hash da senha
    hashPassword(password) {
        // Implementação simples de hash (em produção usar bcrypt ou similar)
        let hash = 0;
        if (password.length === 0) return hash.toString();
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Converter para 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
    
    // Verificar senha
    verifyPassword(password, hashedPassword) {
        return this.hashPassword(password) === hashedPassword;
    }
    
    // Salvar usuários no localStorage
    saveUsers() {
        localStorage.setItem('app_users', JSON.stringify(this.users));
    }
    
    // Atualizar último login
    updateUserLastLogin(userId) {
        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            this.users[userIndex].lastLogin = new Date().toISOString();
            this.saveUsers();
        }
    }
    
    // Alterar senha
    changePassword(oldPassword, newPassword) {
        if (!this.currentUser) {
            throw new Error('Usuário não logado');
        }
        
        if (!this.verifyPassword(oldPassword, this.currentUser.password)) {
            throw new Error('Senha atual incorreta');
        }
        
        const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex === -1) {
            throw new Error('Usuário não encontrado');
        }
        
        this.users[userIndex].password = this.hashPassword(newPassword);
        this.users[userIndex].mustChangePassword = false;
        this.saveUsers();
        
        // Atualizar sessão atual
        this.currentUser.mustChangePassword = false;
        localStorage.setItem('current_user', JSON.stringify(this.currentUser));
    }
    
    // Reset senha (apenas admins)
    resetUserPassword(userId, newPassword) {
        if (!this.isAdmin() && !this.isRoot()) {
            throw new Error('Apenas administradores podem resetar senhas');
        }
        
        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            throw new Error('Usuário não encontrado');
        }
        
        this.users[userIndex].password = this.hashPassword(newPassword);
        this.users[userIndex].mustChangePassword = true;
        this.saveUsers();
        
        return this.users[userIndex];
    }
    
    // Listar usuários (apenas admins)
    getUsers() {
        if (!this.isAdmin() && !this.isRoot()) {
            throw new Error('Acesso negado');
        }
        
        return this.users.map(user => ({
            ...user,
            password: undefined // Não retornar senhas
        }));
    }
    
    // Mostrar modal de mudança de senha obrigatória
    showPasswordChangeModal() {
        // Implementar modal de mudança de senha obrigatória
        if (window.app && window.app.showPasswordChangeModal) {
            window.app.showPasswordChangeModal();
        }
    }

    // Solicitar acesso ao sistema
    requestAccess(requestData) {
        // Armazenar solicitação de acesso para revisão dos administradores
        let accessRequests = JSON.parse(localStorage.getItem('access_requests') || '[]');
        
        const request = {
            id: 'req-' + Date.now(),
            name: requestData.name,
            email: requestData.email,
            role: requestData.role,
            justification: requestData.justification,
            requestedAt: new Date().toISOString(),
            status: 'pending'
        };
        
        accessRequests.push(request);
        localStorage.setItem('access_requests', JSON.stringify(accessRequests));
        
        return request;
    }
    
    // Listar solicitações de acesso (apenas admins)
    getAccessRequests() {
        if (!this.isAdmin() && !this.isRoot()) {
            throw new Error('Acesso negado');
        }
        
        return JSON.parse(localStorage.getItem('access_requests') || '[]');
    }
    
    // Aprovar/Rejeitar solicitação de acesso
    processAccessRequest(requestId, action, password = null) {
        if (!this.isAdmin() && !this.isRoot()) {
            throw new Error('Acesso negado');
        }
        
        let accessRequests = JSON.parse(localStorage.getItem('access_requests') || '[]');
        const requestIndex = accessRequests.findIndex(r => r.id === requestId);
        
        if (requestIndex === -1) {
            throw new Error('Solicitação não encontrada');
        }
        
        const request = accessRequests[requestIndex];
        
        if (action === 'approve' && password) {
            // Criar usuário
            const newUser = this.addUser({
                email: request.email,
                name: request.name,
                role: request.role,
                password: password,
                isAdmin: request.role === 'pesquisador'
            });
            
            accessRequests[requestIndex].status = 'approved';
            accessRequests[requestIndex].processedAt = new Date().toISOString();
            accessRequests[requestIndex].processedBy = this.currentUser.id;
            
        } else if (action === 'reject') {
            accessRequests[requestIndex].status = 'rejected';
            accessRequests[requestIndex].processedAt = new Date().toISOString();
            accessRequests[requestIndex].processedBy = this.currentUser.id;
        }
        
        localStorage.setItem('access_requests', JSON.stringify(accessRequests));
        return accessRequests[requestIndex];
    }

    // Atualizar dados do usuário atual
    updateCurrentUser(userData) {
        this.currentUser = { ...this.currentUser, ...userData };
        localStorage.setItem('current_user', JSON.stringify(this.currentUser));
        this.notifyObservers('userUpdated', this.currentUser);
    }

    // Limpeza
    destroy() {
        this.observers.clear();
        AuthManager.instance = null;
    }
}

// Export para uso global
window.AuthManager = AuthManager;
