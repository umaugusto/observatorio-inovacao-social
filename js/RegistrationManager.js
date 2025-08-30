// New Registration Manager - Fluxo facilitado de criação de conta
class RegistrationManager {
    constructor() {
        this.currentStep = 1;
        this.registrationData = {
            method: null,           // 'google' ou 'email'
            email: null,
            userType: null,         // 'visitante', 'extensionista', 'pesquisador'
            institutionalEmail: null,
            password: null,
            isUFRJEmail: false,
            socialData: null
        };

        this.auth0Client = null;
        this.authManager = null;
        this.init();
    }

    async init() {
        console.log('🔐 New RegistrationManager iniciado');
        
        // Inicializar Auth0 e AuthManager
        this.auth0Client = Auth0Client?.getInstance();
        this.authManager = AuthManager?.getInstance();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Verificar se veio do Auth0 callback
        this.checkSocialReturn();
    }

    setupEventListeners() {
        // Etapa 1 - Google Signup
        const googleBtn = document.getElementById('google-signup');
        if (googleBtn) {
            googleBtn.addEventListener('click', () => this.handleGoogleSignup());
        }

        // Etapa 1 - Email form
        const emailForm = document.getElementById('email-form');
        if (emailForm) {
            emailForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEmailContinue();
            });
        }

        // Email input validation
        const emailInput = document.getElementById('user-email');
        if (emailInput) {
            emailInput.addEventListener('input', () => this.validateEmailInput());
            emailInput.addEventListener('blur', () => this.validateEmailInput());
        }

        // Etapa 2 - Seleção de tipo de usuário
        document.querySelectorAll('.user-type-card').forEach(card => {
            card.addEventListener('click', () => {
                const type = card.dataset.type;
                this.selectUserType(type);
            });
        });

        // Etapa 2 - Continue button
        const continueTypeBtn = document.getElementById('btn-continue-type');
        if (continueTypeBtn) {
            continueTypeBtn.addEventListener('click', () => this.handleTypeContinue());
        }

        // Etapa 3 - UFRJ form
        const ufrjForm = document.getElementById('ufrj-form');
        if (ufrjForm) {
            ufrjForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUFRJValidation();
            });
        }

        // Etapa 4 - Password form
        const passwordForm = document.getElementById('password-form');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAccountCreation();
            });
        }

        // Password toggle
        const passwordToggle = document.getElementById('password-toggle');
        if (passwordToggle) {
            passwordToggle.addEventListener('click', () => this.togglePassword());
        }

        // Password strength
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', () => this.updatePasswordStrength());
        }

        // Back buttons
        document.getElementById('btn-back-2')?.addEventListener('click', () => this.goToStep(1));
        document.getElementById('btn-back-3')?.addEventListener('click', () => this.goToStep(2));
    }

    async handleGoogleSignup() {
        const btn = document.getElementById('google-signup');
        if (!btn) {
            console.error('Google signup button not found');
            return;
        }
        
        const originalHTML = btn.innerHTML;
        
        try {
            btn.disabled = true;
            btn.style.opacity = '0.7';
            btn.innerHTML = '⏳ Conectando com Google...';
            
            console.log('🚀 Iniciando Google signup');
            
            this.registrationData.method = 'google';
            
            // Save registration state
            sessionStorage.setItem('registration_flow', JSON.stringify({
                flow: 'registration',
                method: 'google'
            }));
            
            // Check if Auth0Client is available
            if (!this.auth0Client) {
                throw new Error('Auth0 não disponível');
            }
            
            // Start Auth0 social login with Google
            await this.auth0Client.loginWithSocial('google');
            
            // If we reach here without redirect, something went wrong
            console.warn('⚠️ Google signup completed but no redirect happened');
            
        } catch (error) {
            console.error('❌ Google signup failed:', error);
            
            let errorMsg = 'Erro ao conectar com Google.';
            if (error.message && error.message.includes('Auth0')) {
                errorMsg += ' Serviço de autenticação não está disponível.';
            } else {
                errorMsg += ' Verifique sua conexão e tente novamente.';
            }
            
            this.showNotification(errorMsg, 'error');
            
            // Reset button
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.innerHTML = originalHTML;
        }
    }

    handleEmailContinue() {
        const email = document.getElementById('user-email').value.trim();
        
        if (!this.isValidEmail(email)) {
            this.showFieldError('user-email', 'Por favor, insira um email válido');
            return;
        }

        this.registrationData.method = 'email';
        this.registrationData.email = email;
        this.registrationData.isUFRJEmail = email.toLowerCase().includes('@ufrj.br');
        
        this.goToStep(2);
    }

    validateEmailInput() {
        const emailInput = document.getElementById('user-email');
        const validation = document.getElementById('email-validation');
        const email = emailInput.value.trim();
        
        if (!email) {
            validation.className = 'email-validation';
            return;
        }

        if (!this.isValidEmail(email)) {
            validation.className = 'email-validation';
            return;
        }

        const isUFRJ = email.toLowerCase().includes('@ufrj.br');
        
        if (isUFRJ) {
            validation.className = 'email-validation ufrj';
            validation.innerHTML = '✅ Email institucional UFRJ detectado - Recomendamos perfil Extensionista ou Pesquisador';
        } else {
            validation.className = 'email-validation regular';
            validation.innerHTML = 'ℹ️ Email válido - Pode ser usado para qualquer tipo de perfil';
        }
    }

    selectUserType(type) {
        this.registrationData.userType = type;
        
        // Atualizar UI
        document.querySelectorAll('.user-type-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('selected');
        
        // Habilitar botão continuar
        const continueBtn = document.getElementById('btn-continue-type');
        if (continueBtn) {
            continueBtn.disabled = false;
        }
    }

    handleTypeContinue() {
        if (!this.registrationData.userType) {
            this.showNotification('Por favor, selecione um tipo de perfil', 'error');
            return;
        }

        const type = this.registrationData.userType;
        
        // Se for extensionista/pesquisador e não tem email UFRJ, pedir email institucional
        if ((type === 'extensionista' || type === 'pesquisador') && !this.registrationData.isUFRJEmail) {
            // Atualizar texto do perfil selecionado
            const profileText = document.getElementById('selected-profile-text');
            if (profileText) {
                profileText.textContent = type;
            }
            this.goToStep('3-ufrj');
        } else {
            // Ir direto para criação de senha
            this.goToStep('4-password');
        }
    }

    handleUFRJValidation() {
        const ufrjEmail = document.getElementById('ufrj-email').value.trim();
        
        if (!ufrjEmail || !ufrjEmail.toLowerCase().includes('@ufrj.br')) {
            this.showFieldError('ufrj-email', 'Por favor, insira um email válido da UFRJ (@ufrj.br)');
            return;
        }

        this.registrationData.institutionalEmail = ufrjEmail;
        this.goToStep('4-password');
    }

    async handleAccountCreation() {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('password-confirm').value;
        
        // Validações
        if (password.length < 6) {
            this.showFieldError('password', 'A senha deve ter pelo menos 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            this.showFieldError('password-confirm', 'As senhas não coincidem');
            return;
        }

        this.registrationData.password = password;
        
        // Mostrar loading
        this.showLoading(true);
        
        try {
            await this.createUserAccount();
        } catch (error) {
            console.error('Account creation failed:', error);
            this.showNotification('Erro ao criar conta: ' + error.message, 'error');
            this.showLoading(false);
        }
    }

    async createUserAccount() {
        const userData = {
            email: this.registrationData.email,
            password: this.registrationData.password,
            user_type: this.registrationData.userType,
            method: this.registrationData.method,
            institutional_email: this.registrationData.institutionalEmail,
            created_at: new Date().toISOString(),
            email_verified: false // Para implementar verificação de email
        };

        // Se for método social, incluir dados do Auth0
        if (this.registrationData.method === 'google' && this.registrationData.socialData) {
            userData.auth0_id = this.registrationData.socialData.sub;
            userData.name = this.registrationData.socialData.name;
            userData.picture = this.registrationData.socialData.picture;
            userData.email_verified = this.registrationData.socialData.email_verified;
        }

        // Tentar criar conta via API
        const result = await this.callRegistrationAPI(userData);
        
        if (result.success) {
            // Mostrar tela de sucesso
            document.getElementById('confirmation-email').textContent = userData.email;
            this.showLoading(false);
            this.goToStep('success');
            
            // Se não precisar de verificação de email, fazer login automático
            if (userData.email_verified) {
                setTimeout(() => {
                    this.performAutoLogin(userData);
                }, 2000);
            }
        } else {
            throw new Error(result.message || 'Erro desconhecido ao criar conta');
        }
    }

    async callRegistrationAPI(userData) {
        try {
            // Verificar ambiente
            const isLocal = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1' || 
                          window.location.port === '8080';
            
            if (isLocal) {
                // Simular API em desenvolvimento local
                console.log('🏠 Simulando criação de conta local:', userData);
                
                // Simular delay da API
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                return {
                    success: true,
                    user: {
                        id: Date.now(),
                        ...userData,
                        role: userData.user_type,
                        is_admin: userData.user_type === 'coordenador'
                    }
                };
            }
            
            // API real para produção
            const response = await fetch('/.netlify/functions/user-registration', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userData })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error('Registration API error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async performAutoLogin(userData) {
        try {
            if (this.authManager) {
                await this.authManager.login(userData.email, userData.password, true);
                
                // Redirecionar para home
                setTimeout(() => {
                    window.location.href = '../index.html';
                }, 1000);
            }
        } catch (error) {
            console.error('Auto login failed:', error);
            // Usuário pode fazer login manualmente
        }
    }

    async checkSocialReturn() {
        const registrationFlow = sessionStorage.getItem('registration_flow');
        
        if (registrationFlow) {
            try {
                const flowData = JSON.parse(registrationFlow);
                
                if (flowData.flow === 'registration' && flowData.method === 'google') {
                    // Verificar se há dados do usuário do Auth0
                    const auth0User = await this.auth0Client?.getUser();
                    
                    if (auth0User) {
                        this.registrationData.method = 'google';
                        this.registrationData.email = auth0User.email;
                        this.registrationData.socialData = auth0User;
                        this.registrationData.isUFRJEmail = auth0User.email.toLowerCase().includes('@ufrj.br');
                        
                        // Ir para seleção de tipo de perfil
                        this.goToStep(2);
                        
                        // Limpar dados da sessão
                        sessionStorage.removeItem('registration_flow');
                    }
                }
            } catch (error) {
                console.error('Error checking social return:', error);
            }
        }
    }

    goToStep(step) {
        // Esconder todas as etapas
        document.querySelectorAll('.step-content').forEach(content => {
            content.classList.remove('active');
        });

        // Mostrar etapa desejada
        const stepElement = document.getElementById(`step-${step}`);
        if (stepElement) {
            stepElement.classList.add('active');
            this.currentStep = step;
        }
    }

    togglePassword() {
        const passwordInput = document.getElementById('password');
        const toggleBtn = document.getElementById('password-toggle');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
            `;
        } else {
            passwordInput.type = 'password';
            toggleBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            `;
        }
    }

    updatePasswordStrength() {
        const password = document.getElementById('password').value;
        const strengthBar = document.getElementById('strength-bar');
        const strengthText = document.getElementById('strength-text');
        
        if (!password) {
            strengthBar.style.width = '0%';
            strengthText.textContent = '';
            return;
        }

        let strength = 0;
        let feedback = [];

        // Critérios de força
        if (password.length >= 6) strength += 20;
        if (password.length >= 8) strength += 10;
        if (/[a-z]/.test(password)) strength += 15;
        if (/[A-Z]/.test(password)) strength += 15;
        if (/[0-9]/.test(password)) strength += 15;
        if (/[^\\w\\s]/.test(password)) strength += 25;

        // Atualizar barra visual
        strengthBar.style.width = strength + '%';
        
        if (strength < 40) {
            strengthBar.style.backgroundColor = '#e74c3c';
            strengthText.textContent = 'Senha fraca';
            strengthText.style.color = '#e74c3c';
        } else if (strength < 70) {
            strengthBar.style.backgroundColor = '#f39c12';
            strengthText.textContent = 'Senha média';
            strengthText.style.color = '#f39c12';
        } else {
            strengthBar.style.backgroundColor = '#27ae60';
            strengthText.textContent = 'Senha forte';
            strengthText.style.color = '#27ae60';
        }
    }

    showLoading(show) {
        const loadingSpinner = document.getElementById('loading-spinner');
        const currentStep = document.querySelector('.step-content.active');
        
        if (show) {
            if (currentStep) currentStep.style.display = 'none';
            if (loadingSpinner) loadingSpinner.style.display = 'block';
        } else {
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (currentStep) currentStep.style.display = 'block';
        }
    }

    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.add('error');
            
            // Mostrar mensagem de erro
            const errorMsg = field.parentNode.querySelector('.error-message');
            if (errorMsg) {
                errorMsg.textContent = message;
                errorMsg.style.display = 'block';
            }
        }
    }

    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.remove('error');
            
            const errorMsg = field.parentNode.querySelector('.error-message');
            if (errorMsg) {
                errorMsg.style.display = 'none';
            }
        }
    }

    showNotification(message, type = 'info') {
        // Integrar com sistema de notificações do app se disponível
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, type);
        } else {
            // Fallback para alert
            alert(message);
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
        return emailRegex.test(email);
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.registrationManager = new RegistrationManager();
});