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
        
        // Verificar se usuário já está logado
        this.authManager = AuthManager?.getInstance();
        if (this.authManager && this.authManager.isAuthenticated()) {
            // Se já está logado, redirecionar para home
            window.location.href = '../index.html';
            return;
        }
        
        // Inicializar Auth0
        this.auth0Client = Auth0Client?.getInstance();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Verificar PRIMEIRO se é retorno do Auth0
        const isSocialReturn = await this.checkSocialReturn();
        
        // Limpar dados APENAS se não for retorno social válido
        if (!isSocialReturn) {
            this.clearPreviousFlowData();
        }
    }

    clearPreviousFlowData() {
        // Limpar dados de fluxos anteriores para evitar conflitos
        sessionStorage.removeItem('registration_flow');
        console.log('🧹 Dados de fluxo anterior limpos');
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

        // Botão continuar email (fallback direto)
        const btnContinueEmail = document.getElementById('btn-continue-email');
        if (btnContinueEmail) {
            btnContinueEmail.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleEmailContinue();
            });
        }

        // Etapa 2 - Details form
        const detailsForm = document.getElementById('details-form');
        if (detailsForm) {
            detailsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleDetailsSubmit();
            });
        }

        // Create account button (Step 3)
        const createBtn = document.getElementById('btn-create-account');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.handleAccountCreation());
        }

        // Real-time validations
        this.setupRealTimeValidations();

        // Password toggles
        const passwordToggle = document.getElementById('password-toggle');
        if (passwordToggle) {
            passwordToggle.addEventListener('click', () => this.togglePassword('password', 'password-toggle'));
        }

        const passwordConfirmToggle = document.getElementById('password-confirm-toggle');
        if (passwordConfirmToggle) {
            passwordConfirmToggle.addEventListener('click', () => this.togglePassword('password-confirm', 'password-confirm-toggle'));
        }

        // User type selection
        const userTypeCards = document.querySelectorAll('.user-type-card');
        userTypeCards.forEach(card => {
            card.addEventListener('click', () => this.selectUserType(card.dataset.type));
        });

        // Back buttons
        document.getElementById('btn-back-2')?.addEventListener('click', () => this.goToStep(1));
        document.getElementById('btn-back-3')?.addEventListener('click', () => this.goToStep(2));

        // Email input - sem validação em tempo real
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
        console.log('🔄 handleEmailContinue() chamado');
        const emailInput = document.getElementById('user-email');
        const email = emailInput ? emailInput.value.trim() : '';
        
        console.log('📧 Email digitado:', email);
        
        if (!this.isValidEmail(email)) {
            console.log('❌ Email inválido');
            this.showFieldError('user-email', 'Por favor, insira um email válido');
            return;
        }

        this.registrationData.method = 'email';
        this.registrationData.email = email;
        this.registrationData.isUFRJEmail = email.toLowerCase().includes('@ufrj.br');
        
        console.log('✅ Email válido, indo para etapa 2');
        
        // Ir para etapa 2 e mostrar o email selecionado
        const displayEmail = document.getElementById('display-email');
        if (displayEmail) {
            displayEmail.value = email;
        }
        this.goToStep(2);
        
        // Aplicar lógica baseada no tipo de email
        this.applyEmailBasedLogic();
    }
    
    handleDetailsSubmit() {
        const name = document.getElementById('user-name').value.trim();
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('password-confirm').value;
        const termsAccepted = document.getElementById('terms-checkbox').checked;
        
        // Validações
        let isValid = true;
        
        if (!name || name.length < 2) {
            this.showFieldError('user-name', 'Nome deve ter pelo menos 2 caracteres');
            isValid = false;
        }

        if (!this.registrationData.userType) {
            this.showFieldError('profile-type-error', 'Selecione um tipo de perfil');
            isValid = false;
        }
        
        if (!this.isPasswordValid(password)) {
            this.showFieldError('password', 'A senha não atende aos requisitos');
            isValid = false;
        }
        
        if (password !== passwordConfirm) {
            this.showFieldError('password-confirm', 'As senhas não coincidem');
            isValid = false;
        }
        
        if (!termsAccepted) {
            this.showFieldError('terms-checkbox', 'Você deve aceitar os termos para continuar');
            isValid = false;
        }
        
        if (!isValid) return;
        
        // Salvar dados
        this.registrationData.name = name;
        this.registrationData.password = password;
        
        // Criar conta diretamente (sem etapa 3)
        this.showLoading(true);
        this.createUserAccount();
    }

    applyEmailBasedLogic() {
        const isUFRJ = this.registrationData.isUFRJEmail;
        const cards = document.querySelectorAll('.user-type-card');
        const messageEl = document.getElementById('email-based-message');
        
        console.log(`📧 Email ${isUFRJ ? 'UFRJ' : 'comum'} detectado:`, this.registrationData.email);
        
        if (isUFRJ) {
            // Email UFRJ: Habilitar extensionista/pesquisador, desabilitar visitante
            cards.forEach(card => {
                const type = card.dataset.type;
                if (type === 'visitante') {
                    card.classList.add('disabled');
                    card.classList.remove('available');
                    card.setAttribute('data-tooltip', 'Perfil não disponível para emails institucionais');
                } else {
                    card.classList.add('available');
                    card.classList.remove('disabled');
                    card.removeAttribute('data-tooltip');
                }
            });
            
            // Pré-selecionar extensionista por padrão
            this.selectUserType('extensionista');
            
            // Mostrar mensagem de orientação
            if (messageEl) {
                messageEl.className = 'alert alert-success';
                messageEl.innerHTML = '✅ Email UFRJ detectado! Você pode escolher entre Extensionista ou Pesquisador.';
                messageEl.style.display = 'block';
            }
            
        } else {
            // Email comum: Habilitar visitante, desabilitar outros
            cards.forEach(card => {
                const type = card.dataset.type;
                if (type === 'visitante') {
                    card.classList.add('available');
                    card.classList.remove('disabled');
                    card.removeAttribute('data-tooltip');
                } else {
                    card.classList.add('disabled');
                    card.classList.remove('available');
                    card.setAttribute('data-tooltip', 'Requer email institucional da UFRJ (@ufrj.br)');
                }
            });
            
            // Pré-selecionar visitante
            this.selectUserType('visitante');
            
            // Mostrar mensagem informativa
            if (messageEl) {
                messageEl.className = 'alert alert-info';
                messageEl.innerHTML = 'ℹ️ Para perfis de Extensionista ou Pesquisador, é necessário um email institucional da UFRJ (@ufrj.br).';
                messageEl.style.display = 'block';
            }
        }
    }

    selectUserType(type) {
        // Remove seleção anterior
        document.querySelectorAll('.user-type-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Seleciona o novo tipo se o card não estiver desabilitado
        const selectedCard = document.querySelector(`[data-type="${type}"]`);
        if (selectedCard && !selectedCard.classList.contains('disabled')) {
            selectedCard.classList.add('selected');
            this.registrationData.userType = type;
            this.clearFieldError('profile-type-error');
            console.log('Tipo de usuário selecionado:', type);
        }
    }

    // Função removida - não é mais necessária com o fluxo simplificado

    // Função removida - validação de email em tempo real não é mais necessária

    setupRealTimeValidations() {
        // Password validation
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', () => this.validatePasswordStrength());
        }

        // Password confirmation
        const passwordConfirm = document.getElementById('password-confirm');
        if (passwordConfirm) {
            passwordConfirm.addEventListener('input', () => this.validatePasswordConfirmation());
        }

        // Name validation
        const nameInput = document.getElementById('user-name');
        if (nameInput) {
            nameInput.addEventListener('blur', () => this.validateNameInput());
        }
    }

    isPasswordValid(password) {
        const requirements = this.checkPasswordRequirements(password);
        return requirements.length && requirements.lowercase && requirements.uppercase && requirements.number;
    }

    async handleAccountCreation() {
        try {
            this.showLoading(true);
            await this.createUserAccount();
        } catch (error) {
            console.error('Account creation failed:', error);
            this.showNotification('Erro ao criar conta: ' + error.message, 'error');
            this.showLoading(false);
        }
    }

    showProfileConfirmation() {
        const email = this.registrationData.email;
        const isUFRJ = this.registrationData.isUFRJEmail;
        const container = document.getElementById('profile-confirmation');
        
        let profileType, profileIcon, profileDescription;
        
        if (isUFRJ) {
            // Para emails UFRJ, mostrar opções entre extensionista e pesquisador
            profileType = 'Extensionista';
            profileIcon = '🎓';
            profileDescription = 'Cadastrar e gerenciar projetos de extensão universitária.';
            this.registrationData.userType = 'extensionista';
            
            container.innerHTML = `
                <div class="profile-card-large">
                    <div class="profile-icon">${profileIcon}</div>
                    <div class="profile-title">${profileType}</div>
                    <div class="profile-description">${profileDescription}</div>
                    <div style="margin-top: 15px; font-size: 14px; color: var(--text-light);">
                        Seu email UFRJ (${email}) permite acesso a funcionalidades avançadas.
                    </div>
                </div>
                
                <div style="margin-top: 20px;">
                    <p style="font-size: 14px; color: var(--text-light); margin-bottom: 10px;">
                        Prefere ser cadastrado como Pesquisador?
                    </p>
                    <button type="button" class="btn-secondary" id="switch-to-researcher" style="font-size: 14px; padding: 8px 16px;">
                        🔬 Alterar para Pesquisador
                    </button>
                </div>
            `;
            
            // Event listener para trocar perfil
            document.getElementById('switch-to-researcher')?.addEventListener('click', () => {
                this.registrationData.userType = 'pesquisador';
                this.showProfileConfirmation(); // Re-render
            });
            
        } else {
            // Para emails comuns, perfil visitante
            profileType = 'Visitante';
            profileIcon = '👁️';
            profileDescription = 'Explorar iniciativas e conhecer projetos de inovação social.';
            this.registrationData.userType = 'visitante';
            
            container.innerHTML = `
                <div class="profile-card-large">
                    <div class="profile-icon">${profileIcon}</div>
                    <div class="profile-title">${profileType}</div>
                    <div class="profile-description">${profileDescription}</div>
                    <div style="margin-top: 15px; font-size: 14px; color: var(--text-light);">
                        Para perfis de Extensionista ou Pesquisador, é necessário email institucional da UFRJ.
                    </div>
                </div>
            `;
        }
        
        // Se mudou para pesquisador, atualizar
        if (this.registrationData.userType === 'pesquisador') {
            container.innerHTML = `
                <div class="profile-card-large">
                    <div class="profile-icon">🔬</div>
                    <div class="profile-title">Pesquisador</div>
                    <div class="profile-description">Cadastrar pesquisas e estudos sobre inovação social.</div>
                    <div style="margin-top: 15px; font-size: 14px; color: var(--text-light);">
                        Seu email UFRJ (${email}) permite acesso a funcionalidades de pesquisa.
                    </div>
                </div>
                
                <div style="margin-top: 20px;">
                    <button type="button" class="btn-secondary" id="switch-to-extensionist" style="font-size: 14px; padding: 8px 16px;">
                        🎓 Alterar para Extensionista
                    </button>
                </div>
            `;
            
            document.getElementById('switch-to-extensionist')?.addEventListener('click', () => {
                this.registrationData.userType = 'extensionista';
                this.showProfileConfirmation();
            });
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
            email_verified: false
        };

        // Se for método social, incluir dados do Auth0
        if (this.registrationData.method === 'google' && this.registrationData.socialData) {
            userData.auth0_id = this.registrationData.socialData.sub;
            userData.name = this.registrationData.socialData.name;
            userData.picture = this.registrationData.socialData.picture;
            userData.email_verified = this.registrationData.socialData.email_verified;
            
            // Para contas sociais, criar direto no banco
            const result = await this.callRegistrationAPI(userData);
            
            if (result.success) {
                this.showLoading(false);
                this.showSocialSuccess();
                
                setTimeout(() => {
                    this.performAutoLogin(userData);
                }, 2000);
            } else {
                throw new Error(result.message || 'Erro ao criar conta');
            }
            return;
        }

        // Para método email, criar credenciais no Auth0 primeiro
        if (this.registrationData.method === 'email') {
            try {
                console.log('🔐 Criando credenciais no Auth0...');
                const metadata = { user_type: this.registrationData.userType };
                
                const signupResult = await this.auth0Client.signup(userData.email, userData.password, metadata);
                console.log('✅ Credenciais criadas no Auth0:', signupResult);
                
                // Aguardar um pouco antes de criar no banco
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Criar registro no banco
                const result = await this.callRegistrationAPI(userData);
                
                if (result.success) {
                    console.log('✅ Usuário criado no banco de dados');
                    
                    // Mostrar tela de sucesso com instruções de verificação
                    document.getElementById('confirmation-email').textContent = userData.email;
                    this.setupEmailQuickAccess(userData.email);
                    this.setupResendButton();
                    this.showLoading(false);
                    this.showEmailVerificationSuccess();
                } else {
                    throw new Error(result.message || 'Erro ao criar registro no banco');
                }
                
            } catch (e) {
                console.error('❌ Erro na criação da conta:', e);
                
                let errorMessage = 'Erro ao criar conta.';
                
                if (e.description) {
                    // Erros específicos do Auth0
                    if (e.description.includes('user already exists')) {
                        errorMessage = 'Já existe uma conta com este email. Tente fazer login.';
                    } else if (e.description.includes('password')) {
                        errorMessage = 'Senha muito fraca. Use pelo menos 8 caracteres.';
                    } else {
                        errorMessage = e.description;
                    }
                } else if (e.message) {
                    errorMessage = e.message;
                }
                
                throw new Error(errorMessage);
            }
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
        
        if (!registrationFlow) {
            return false;
        }

        try {
            const flowData = JSON.parse(registrationFlow);
            
            if (flowData.flow === 'registration' && flowData.method === 'google') {
                console.log('🔄 Verificando retorno do Google Auth0...');
                
                // Verificar se há dados do usuário do Auth0
                const auth0User = await this.auth0Client?.getUser();
                
                if (auth0User) {
                    console.log('✅ Dados do usuário Auth0 encontrados:', auth0User.email);
                    
                    this.registrationData.method = 'google';
                    this.registrationData.email = auth0User.email;
                    this.registrationData.socialData = auth0User;
                    this.registrationData.isUFRJEmail = auth0User.email.toLowerCase().includes('@ufrj.br');
                    
                    // Ir para seleção de tipo de perfil
                    this.goToStep(2);
                    this.applyEmailBasedLogic();
                    
                    // Limpar dados da sessão
                    sessionStorage.removeItem('registration_flow');
                    
                    return true; // Processou retorno social válido
                }
            }
        } catch (error) {
            console.error('❌ Error parsing registration flow:', error);
            // Se houve erro de JSON, limpar dados corrompidos
            sessionStorage.removeItem('registration_flow');
        }
        
        return false; // Não havia retorno social válido
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

    togglePassword(inputId, toggleId) {
        const passwordInput = document.getElementById(inputId);
        const toggleBtn = document.getElementById(toggleId);
        
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

    validateNameInput() {
        const nameInput = document.getElementById('user-name');
        const name = nameInput.value.trim();
        
        if (!name || name.length < 2) {
            this.showFieldError('user-name', 'Nome deve ter pelo menos 2 caracteres');
            return false;
        }
        
        this.clearFieldError('user-name');
        return true;
    }

    validateUserTypeSelection() {
        if (!this.registrationData.userType) {
            this.showFieldError('profile-type-error', 'Selecione um tipo de perfil');
            return false;
        }
        
        this.clearFieldError('profile-type-error');
        return true;
    }

    validateInstitutionalEmail() {
        if (!this.needsInstitutionalEmail()) {
            return true;
        }
        
        const institutionalEmail = document.getElementById('institutional-email').value.trim();
        
        if (!institutionalEmail || !institutionalEmail.toLowerCase().includes('@ufrj.br')) {
            this.showFieldError('institutional-email', 'Email institucional da UFRJ é obrigatório');
            return false;
        }
        
        this.clearFieldError('institutional-email');
        return true;
    }

    validatePasswordStrength() {
        const password = document.getElementById('password').value;
        const requirements = this.checkPasswordRequirements(password);
        
        // Atualizar indicadores visuais
        this.updatePasswordRequirements(requirements);
        this.updatePasswordStrengthBar(requirements);
        
        // Validar se atende aos requisitos mínimos
        const isValid = requirements.length && requirements.lowercase && requirements.uppercase && requirements.number;
        
        if (!isValid) {
            this.showFieldError('password', 'A senha não atende aos requisitos');
            return false;
        }
        
        this.clearFieldError('password');
        return true;
    }

    validatePasswordConfirmation() {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('password-confirm').value;
        
        if (password !== confirmPassword) {
            this.showFieldError('password-confirm', 'As senhas não coincidem');
            return false;
        }
        
        this.clearFieldError('password-confirm');
        return true;
    }

    checkPasswordRequirements(password) {
        return {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            number: /[0-9]/.test(password)
        };
    }

    updatePasswordRequirements(requirements) {
        const requirementElements = document.querySelectorAll('.requirement');
        
        requirementElements.forEach(element => {
            const req = element.dataset.requirement;
            const met = requirements[req];
            
            element.classList.toggle('valid', met);
            element.classList.toggle('invalid', !met);
            
            const icon = element.querySelector('.requirement-icon');
            if (icon) {
                icon.textContent = met ? '✅' : '⚪';
            }
        });
    }

    updatePasswordStrengthBar(requirements) {
        const strengthBar = document.getElementById('strength-bar');
        const strengthText = document.getElementById('strength-text');
        
        if (!strengthBar || !strengthText) return;
        
        const metCount = Object.values(requirements).filter(Boolean).length;
        const strength = (metCount / 4) * 100;
        
        strengthBar.style.width = strength + '%';
        
        if (strength < 50) {
            strengthBar.style.backgroundColor = '#e74c3c';
            strengthText.textContent = 'Senha fraca';
            strengthText.style.color = '#e74c3c';
        } else if (strength < 75) {
            strengthBar.style.backgroundColor = '#f39c12';
            strengthText.textContent = 'Senha média';
            strengthText.style.color = '#f39c12';
        } else if (strength < 100) {
            strengthBar.style.backgroundColor = '#3498db';
            strengthText.textContent = 'Senha boa';
            strengthText.style.color = '#3498db';
        } else {
            strengthBar.style.backgroundColor = '#27ae60';
            strengthText.textContent = 'Senha forte';
            strengthText.style.color = '#27ae60';
        }
    }

    showLoading(show) {
        const loadingSpinner = document.getElementById('loading-spinner');
        const stepContents = document.querySelectorAll('.step-content');
        
        if (show) {
            stepContents.forEach(step => step.style.display = 'none');
            if (loadingSpinner) loadingSpinner.style.display = 'block';
        } else {
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            // Não reexibir etapas antigas - será controlado pelo goToStep
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
        } else {
            // Para elementos que não são campos (como mensagens de erro diretas)
            const errorElement = document.getElementById(fieldId);
            if (errorElement && errorElement.classList.contains('error-message')) {
                errorElement.style.display = 'none';
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

    setupEmailQuickAccess(email) {
        const emailDomain = email.split('@')[1];
        const quickMailLink = document.getElementById('open-mail-link');
        
        if (quickMailLink) {
            // URLs populares de webmail
            const mailUrls = {
                'gmail.com': 'https://mail.google.com',
                'outlook.com': 'https://outlook.live.com',
                'hotmail.com': 'https://outlook.live.com',
                'yahoo.com': 'https://mail.yahoo.com',
                'ufrj.br': 'https://webmail.ufrj.br'
            };
            
            const mailUrl = mailUrls[emailDomain] || 'https://mail.google.com';
            quickMailLink.href = mailUrl;
            quickMailLink.textContent = `Abrir ${emailDomain}`;
        }
    }
    
    setupResendButton() {
        const resendBtn = document.getElementById('btn-resend-email');
        const resendFeedback = document.getElementById('resend-feedback');
        
        if (resendBtn) {
            resendBtn.addEventListener('click', async () => {
                try {
                    resendBtn.disabled = true;
                    resendBtn.textContent = 'Enviando...';
                    resendFeedback.textContent = '';
                    
                    const response = await fetch('/.netlify/functions/auth0-resend-verification', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email: this.registrationData.email })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        resendFeedback.textContent = '✅ Email reenviado com sucesso!';
                        resendFeedback.style.color = '#27ae60';
                    } else {
                        resendFeedback.textContent = '❌ Erro ao reenviar: ' + result.message;
                        resendFeedback.style.color = '#e74c3c';
                    }
                    
                } catch (error) {
                    console.error('Erro ao reenviar email:', error);
                    resendFeedback.textContent = '❌ Erro de conexão. Tente novamente.';
                    resendFeedback.style.color = '#e74c3c';
                } finally {
                    resendBtn.disabled = false;
                    resendBtn.textContent = 'Reenviar email de confirmação';
                    
                    // Limpar feedback após 5 segundos
                    setTimeout(() => {
                        resendFeedback.textContent = '';
                    }, 5000);
                }
            });
        }
        
        // Setup "usar outro email" link
        const useOtherEmailLink = document.getElementById('use-other-email');
        if (useOtherEmailLink) {
            useOtherEmailLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.goToStep(1);
                // Limpar dados para permitir novo email
                this.registrationData.email = null;
                document.getElementById('user-email').value = '';
            });
        }
    }
    
    showEmailVerificationSuccess() {
        const successEmailPending = document.getElementById('success-email-pending');
        const successSocial = document.getElementById('success-social');
        
        if (successEmailPending) successEmailPending.style.display = 'block';
        if (successSocial) successSocial.style.display = 'none';
        
        // Store pending verification data for callback processing
        const pendingData = {
            email: this.registrationData.email,
            name: this.registrationData.name,
            userType: this.registrationData.userType,
            timestamp: new Date().toISOString()
        };
        
        sessionStorage.setItem('pendingEmailVerification', JSON.stringify(pendingData));
        console.log('📧 Stored pending verification for:', this.registrationData.email);
        
        this.showLoading(false);
        document.getElementById('step-success').style.display = 'block';
    }
    
    showSocialSuccess() {
        const successEmailPending = document.getElementById('success-email-pending');
        const successSocial = document.getElementById('success-social');
        
        if (successEmailPending) successEmailPending.style.display = 'none';
        if (successSocial) successSocial.style.display = 'block';
        
        this.showLoading(false);
        document.getElementById('step-success').style.display = 'block';
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.registrationManager = new RegistrationManager();
});
