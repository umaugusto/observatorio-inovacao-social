// ProfileManager - Gerenciador de perfil do usuário
class ProfileManager {
    constructor() {
        this.authManager = null;
        this.dataManager = null;
        this.currentUser = null;
        this.init();
    }

    static getInstance() {
        if (!ProfileManager.instance) {
            ProfileManager.instance = new ProfileManager();
        }
        return ProfileManager.instance;
    }

    async init() {
        console.log('🔧 ProfileManager iniciado');
        
        // Obter instâncias dos managers
        this.authManager = AuthManager?.getInstance();
        this.dataManager = DataManager?.getInstance();
        
        // Verificar autenticação
        if (!this.authManager || !this.authManager.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        
        this.currentUser = this.authManager.getCurrentUser();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Carregar dados do perfil
        await this.loadProfileData();
        
        // Setup navegação por tabs
        this.setupTabs();
    }

    setupEventListeners() {
        // Formulário de perfil
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProfileUpdate();
            });
        }

        // Formulário de senha
        const passwordForm = document.getElementById('password-form');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePasswordChange();
            });
        }

        // Upload de avatar
        const avatarUpload = document.getElementById('avatar-upload-input');
        if (avatarUpload) {
            avatarUpload.addEventListener('change', (e) => this.handleAvatarUpload(e));
        }

        // Toggle switches para notificações
        document.querySelectorAll('.toggle-switch').forEach(toggle => {
            toggle.addEventListener('click', (e) => this.handleNotificationToggle(e));
        });

        // Botões de ação
        const deleteAccountBtn = document.getElementById('delete-account-btn');
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => this.handleDeleteAccount());
        }

        const exportDataBtn = document.getElementById('export-data-btn');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => this.handleExportData());
        }

        // Password toggles
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => this.togglePasswordVisibility(e));
        });
    }

    setupTabs() {
        const tabs = document.querySelectorAll('.nav-tab');
        const panes = document.querySelectorAll('.tab-pane');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active pane
                panes.forEach(pane => pane.classList.remove('active'));
                const targetPane = document.getElementById(`tab-${targetTab}`);
                if (targetPane) {
                    targetPane.classList.add('active');
                }
            });
        });
    }

    async loadProfileData() {
        try {
            console.log('📥 Carregando dados do perfil...');
            
            // Atualizar cabeçalho do perfil
            this.updateProfileHeader();
            
            // Carregar dados do formulário
            this.loadFormData();
            
            // Verificar status de verificação de email
            this.updateEmailVerificationStatus();
            
            // Carregar configurações de notificação
            this.loadNotificationSettings();
            
        } catch (error) {
            console.error('❌ Erro ao carregar perfil:', error);
            this.showNotification('Erro ao carregar dados do perfil', 'error');
        }
    }

    updateProfileHeader() {
        const user = this.currentUser;
        
        // Nome
        const profileName = document.getElementById('profile-name');
        if (profileName) {
            profileName.textContent = user.name || user.email?.split('@')[0] || 'Usuário';
        }
        
        // Tipo de perfil
        const profileType = document.getElementById('profile-type');
        if (profileType) {
            const typeLabels = {
                'visitante': '👁️ Visitante',
                'extensionista': '🎓 Extensionista',
                'pesquisador': '🔬 Pesquisador',
                'admin': '👑 Administrador',
                'coordenador': '📋 Coordenador'
            };
            profileType.textContent = typeLabels[user.role] || user.role || 'Usuário';
        }
        
        // Avatar
        this.loadUserAvatar();
    }

    loadUserAvatar() {
        const avatar = document.getElementById('profile-avatar');
        const placeholder = document.getElementById('profile-avatar-placeholder');
        
        if (this.currentUser.avatar) {
            avatar.src = this.currentUser.avatar;
            avatar.style.display = 'block';
            placeholder.style.display = 'none';
        } else {
            avatar.style.display = 'none';
            placeholder.style.display = 'flex';
            
            // Usar primeira letra do nome como placeholder
            const name = this.currentUser.name || this.currentUser.email;
            placeholder.textContent = name ? name.charAt(0).toUpperCase() : '👤';
        }
    }

    loadFormData() {
        const user = this.currentUser;
        
        // Campos básicos
        this.setFieldValue('name', user.name);
        this.setFieldValue('email', user.email);
        this.setFieldValue('phone', user.phone);
        this.setFieldValue('institution', user.institution);
        this.setFieldValue('bio', user.bio);
        this.setFieldValue('department', user.department);
        this.setFieldValue('position', user.position);
    }

    setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field && value) {
            field.value = value;
        }
    }

    updateEmailVerificationStatus() {
        const statusContainer = document.getElementById('email-verification-status');
        if (!statusContainer) return;
        
        const isVerified = this.currentUser.email_verified;
        
        if (isVerified) {
            statusContainer.innerHTML = `
                <div class="alert alert-success">
                    <strong>✅ Email verificado</strong><br>
                    Seu email foi confirmado com sucesso.
                </div>
            `;
        } else {
            statusContainer.innerHTML = `
                <div class="alert alert-warning">
                    <strong>⚠️ Email não verificado</strong><br>
                    Verifique seu email para acessar todas as funcionalidades.
                    <br><br>
                    <button class="btn-primary" id="resend-verification">📤 Reenviar Email</button>
                </div>
            `;
            
            // Setup resend button
            const resendBtn = document.getElementById('resend-verification');
            if (resendBtn) {
                resendBtn.addEventListener('click', () => this.resendEmailVerification());
            }
        }
    }

    loadNotificationSettings() {
        const settings = this.getNotificationSettings();
        
        document.querySelectorAll('.toggle-switch').forEach(toggle => {
            const setting = toggle.dataset.setting;
            const isActive = settings[setting] !== false; // Default true
            
            toggle.classList.toggle('active', isActive);
        });
    }

    getNotificationSettings() {
        const saved = localStorage.getItem(`notifications_${this.currentUser.email}`);
        return saved ? JSON.parse(saved) : {
            'new-cases': true,
            'case-comments': true,
            'newsletter': true,
            'system-updates': true
        };
    }

    async handleProfileUpdate() {
        try {
            this.showLoading(true);
            
            // Coletar dados do formulário
            const formData = {
                name: document.getElementById('name').value.trim(),
                phone: document.getElementById('phone').value.trim(),
                institution: document.getElementById('institution').value.trim(),
                bio: document.getElementById('bio').value.trim(),
                department: document.getElementById('department').value.trim(),
                position: document.getElementById('position').value.trim()
            };
            
            // Validar nome (obrigatório)
            if (!formData.name) {
                throw new Error('Nome é obrigatório');
            }
            
            // Atualizar dados do usuário
            const updatedUser = { ...this.currentUser, ...formData };
            
            // Salvar no localStorage (ou enviar para API)
            await this.saveUserProfile(updatedUser);
            
            // Atualizar instância atual
            this.currentUser = updatedUser;
            
            // Atualizar header
            this.updateProfileHeader();
            
            // Atualizar AuthManager
            if (this.authManager) {
                this.authManager.updateCurrentUser(updatedUser);
            }
            
            this.showLoading(false);
            this.showNotification('Perfil atualizado com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao atualizar perfil:', error);
            this.showLoading(false);
            this.showNotification(error.message || 'Erro ao atualizar perfil', 'error');
        }
    }

    async saveUserProfile(userData) {
        // Salvar no localStorage
        localStorage.setItem('current_user', JSON.stringify(userData));
        
        // TODO: Se tiver API, enviar para servidor
        // const response = await fetch('/api/profile', {
        //     method: 'PUT',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(userData)
        // });
    }

    async handlePasswordChange() {
        try {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // Validações
            if (!currentPassword || !newPassword || !confirmPassword) {
                throw new Error('Todos os campos de senha são obrigatórios');
            }
            
            if (newPassword !== confirmPassword) {
                throw new Error('A nova senha e a confirmação não coincidem');
            }
            
            if (newPassword.length < 8) {
                throw new Error('A nova senha deve ter pelo menos 8 caracteres');
            }
            
            if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/.test(newPassword)) {
                throw new Error('A nova senha deve conter maiúsculas, minúsculas e números');
            }
            
            this.showLoading(true);
            
            // TODO: Implementar mudança de senha via Auth0
            // Por enquanto, simular sucesso
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Limpar campos
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
            
            this.showLoading(false);
            this.showNotification('Senha alterada com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao alterar senha:', error);
            this.showLoading(false);
            this.showNotification(error.message || 'Erro ao alterar senha', 'error');
        }
    }

    async handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validar arquivo
        if (!file.type.startsWith('image/')) {
            this.showNotification('Selecione apenas arquivos de imagem', 'error');
            return;
        }
        
        if (file.size > 2 * 1024 * 1024) { // 2MB
            this.showNotification('A imagem deve ter no máximo 2MB', 'error');
            return;
        }
        
        try {
            this.showLoading(true);
            
            // Converter para base64
            const base64 = await this.fileToBase64(file);
            
            // Atualizar usuário
            this.currentUser.avatar = base64;
            await this.saveUserProfile(this.currentUser);
            
            // Atualizar UI
            this.loadUserAvatar();
            
            this.showLoading(false);
            this.showNotification('Foto de perfil atualizada!', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao fazer upload da imagem:', error);
            this.showLoading(false);
            this.showNotification('Erro ao fazer upload da imagem', 'error');
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    handleNotificationToggle(event) {
        const toggle = event.currentTarget;
        const setting = toggle.dataset.setting;
        
        toggle.classList.toggle('active');
        const isActive = toggle.classList.contains('active');
        
        // Salvar configuração
        const settings = this.getNotificationSettings();
        settings[setting] = isActive;
        
        localStorage.setItem(`notifications_${this.currentUser.email}`, JSON.stringify(settings));
        
        this.showNotification(
            `Notificações ${isActive ? 'ativadas' : 'desativadas'} para esta categoria`, 
            'success'
        );
    }

    async resendEmailVerification() {
        try {
            const btn = document.getElementById('resend-verification');
            const originalText = btn.textContent;
            
            btn.disabled = true;
            btn.textContent = 'Enviando...';
            
            // Chamar função de reenvio
            const response = await fetch('/.netlify/functions/auth0-resend-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: this.currentUser.email })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Email de verificação reenviado!', 'success');
            } else {
                throw new Error(result.message || 'Erro ao reenviar email');
            }
            
        } catch (error) {
            console.error('❌ Erro ao reenviar email:', error);
            this.showNotification('Erro ao reenviar email de verificação', 'error');
        } finally {
            const btn = document.getElementById('resend-verification');
            if (btn) {
                btn.disabled = false;
                btn.textContent = '📤 Reenviar Email';
            }
        }
    }

    async handleDeleteAccount() {
        const confirmation = prompt(
            'Esta ação não pode ser desfeita. Digite "EXCLUIR" para confirmar:'
        );
        
        if (confirmation !== 'EXCLUIR') {
            return;
        }
        
        const secondConfirmation = confirm(
            'Tem certeza absoluta? Todos os seus dados serão perdidos permanentemente.'
        );
        
        if (!secondConfirmation) {
            return;
        }
        
        try {
            this.showLoading(true);
            
            // TODO: Implementar exclusão de conta
            // Por enquanto, apenas fazer logout
            this.showNotification('Funcionalidade em desenvolvimento', 'info');
            
            this.showLoading(false);
            
        } catch (error) {
            console.error('❌ Erro ao excluir conta:', error);
            this.showLoading(false);
            this.showNotification('Erro ao excluir conta', 'error');
        }
    }

    handleExportData() {
        try {
            const userData = {
                profile: this.currentUser,
                notifications: this.getNotificationSettings(),
                exportDate: new Date().toISOString()
            };
            
            const dataStr = JSON.stringify(userData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `dados-perfil-${this.currentUser.email}-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            this.showNotification('Dados exportados com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao exportar dados:', error);
            this.showNotification('Erro ao exportar dados', 'error');
        }
    }

    togglePasswordVisibility(event) {
        const button = event.currentTarget;
        const passwordField = button.parentElement.querySelector('input');
        
        if (passwordField.type === 'password') {
            passwordField.type = 'text';
            button.textContent = '🙈';
        } else {
            passwordField.type = 'password';
            button.textContent = '👁️';
        }
    }

    showLoading(show) {
        const loadingSpinner = document.getElementById('loading-spinner');
        if (loadingSpinner) {
            loadingSpinner.style.display = show ? 'block' : 'none';
        }
    }

    showNotification(message, type = 'info') {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `alert alert-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `${icons[type] || 'ℹ️'} ${message}`;
        
        document.body.appendChild(notification);
        
        // Remover após 5 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.parentElement.removeChild(notification);
                }
            }, 300);
        }, 5000);
        
        // Adicionar estilos de animação se não existirem
        this.addAnimationStyles();
    }

    addAnimationStyles() {
        if (document.getElementById('notification-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.profileManager = new ProfileManager();
});