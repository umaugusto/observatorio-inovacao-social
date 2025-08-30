// Registration Manager - Gerenciamento do fluxo de cadastro
class RegistrationManager {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.registrationData = {
            method: 'email',       // 'social' ou 'email' (padr�o: email)
            email: null,
            userType: null,        // 'visitante', 'extensionista', 'pesquisador'
            institutionalEmail: null,
            auth0Data: null
        };

        this.auth0Client = null;
        this.init();
    }

    async init() {
        console.log('🔐 RegistrationManager iniciado');
        
        // Inicializar Auth0
        this.auth0Client = Auth0Client.getInstance();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Verificar se veio do Auth0 callback
        this.checkAuth0Return();
    }

    setupEventListeners() {
        // Etapa 1 - Seleção do método
        document.querySelectorAll('.method-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectMethod(option.dataset.method);
            });
        });

        // Etapa 2 - Input de email
        const emailInput = document.getElementById('user-email');
        if (emailInput) {
            emailInput.addEventListener('input', () => {
                this.validateEmail();
            });
        }

        // Etapa 3 - Seleção do tipo de usuário
        document.querySelectorAll('.user-type-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectUserType(option.dataset.type);
            });
        });

        // Botões de navegação
        document.getElementById('btn-next-1')?.addEventListener('click', () => this.nextStep());
        document.getElementById('btn-next-2')?.addEventListener('click', () => this.nextStep());
        document.getElementById('btn-next-3')?.addEventListener('click', () => this.nextStep());
        
        document.getElementById('btn-back-2')?.addEventListener('click', () => this.previousStep());
        document.getElementById('btn-back-3')?.addEventListener('click', () => this.previousStep());
        document.getElementById('btn-back-4')?.addEventListener('click', () => this.previousStep());

        // Botão do Google Auth
        document.getElementById('btn-google-auth')?.addEventListener('click', () => { this.registrationData.method = 'social'; this.initiateGoogleAuth(); });

        // Botão de criar conta
        document.getElementById('btn-create-account')?.addEventListener('click', () => {
            this.createAccount();
        });
    }

    selectMethod(method) {
        this.registrationData.method = method;
        
        // Atualizar UI
        document.querySelectorAll('.method-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.querySelector(`[data-method="${method}"]`).classList.add('selected');
        
        // Habilitar botão continuar
        document.getElementById('btn-next-1').disabled = false;
    }

    validateEmail() {
        const emailInput = document.getElementById('user-email');
        const email = emailInput.value.trim();
        const validationDiv = document.getElementById('email-validation');
        
        if (!email) {
            validationDiv.style.display = 'none';
            return;
        }

        const isUFRJ = email.toLowerCase().includes('@ufrj.br');
        
        validationDiv.style.display = 'block';
        if (isUFRJ) {
            validationDiv.innerHTML = '<div style="color: var(--success-color);">✅ Email institucional UFRJ detectado</div>';
            this.registrationData.suggestInstitutional = true;
        } else {
            validationDiv.innerHTML = '<div style="color: var(--info-color);">ℹ️ Email válido para cadastro como visitante</div>';
            this.registrationData.suggestInstitutional = false;
        }

        this.registrationData.email = email;
    }

    selectUserType(type) {
        this.registrationData.userType = type;
        
        // Atualizar UI
        document.querySelectorAll('.user-type-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('selected');
        
        // Mostrar/esconder seção de email institucional
        const institutionalSection = document.getElementById('institutional-email-section');
        if (type === 'extensionista' || type === 'pesquisador') {
            institutionalSection.style.display = 'block';
        } else {
            institutionalSection.style.display = 'none';
        }
        
        // Habilitar botão continuar
        document.getElementById('btn-next-3').disabled = false;
    }

    async checkAuth0Return() {
        // Verificar se há dados do Auth0 no sessionStorage
        const auth0Return = sessionStorage.getItem('auth0_registration_return');
        if (auth0Return) {
            const data = JSON.parse(auth0Return);
            this.registrationData.method = 'social';
            this.registrationData.email = data.email;
            this.registrationData.auth0Data = data;
            
            // Ir para etapa de seleção de tipo de usuário
            this.goToStep(3);
            
            // Remover dados do sessionStorage
            sessionStorage.removeItem('auth0_registration_return');
        }
    }

    async initiateGoogleAuth() {
        try {
            // Salvar estado atual
            sessionStorage.setItem('registration_flow', 'true');
            
            // Iniciar Auth0 login
            this.auth0Client.login();
        } catch (error) {
            console.error('Erro ao iniciar Auth0:', error);
            this.showError('Erro ao conectar com o Google. Tente novamente.');
        }
    }

    nextStep() {
        // Validações antes de avançar
        if (this.currentStep === 1) {
            const email = document.getElementById('user-email')?.value?.trim();
            if (!email || !this.isValidEmail(email)) {
                this.showError('Informe um email v�lido');
                return;
            }
            this.registrationData.email = email;
            this.registrationData.suggestInstitutional = email.toLowerCase().includes('@ufrj.br');
            this.goToStep(3);
            return;
        }

        if (this.currentStep === 2) {
            if (this.registrationData.method === 'email') {
                const email = document.getElementById('user-email').value.trim();
                if (!email || !this.isValidEmail(email)) {
                    this.showError('Informe um email válido');
                    return;
                }
                this.registrationData.email = email;
            }
        }

        if (this.currentStep === 3 && !this.registrationData.userType) {
            this.showError('Selecione um tipo de usuário');
            return;
        }

        if (this.currentStep === 3) {
            const userType = this.registrationData.userType;
            if ((userType === 'extensionista' || userType === 'pesquisador')) {
                const institutionalEmail = document.getElementById('institutional-email')?.value?.trim();
                if (!institutionalEmail || !institutionalEmail.includes('@ufrj.br')) {
                    this.showError('Email institucional da UFRJ é obrigatório para extensionistas e pesquisadores');
                    return;
                }
                this.registrationData.institutionalEmail = institutionalEmail;
            }
        }

        // Se chegou na etapa 4, mostrar dados para confirmação
        if (this.currentStep === 3) {
            this.showConfirmationData();
        }

        this.goToStep(this.currentStep + 1);
    }

    previousStep() {
        this.goToStep(this.currentStep - 1);
    }

    goToStep(step) {
        if (step < 1 || step > this.totalSteps) return;

        // Esconder todas as etapas
        document.querySelectorAll('.step-content').forEach(content => {
            content.classList.remove('active');
        });

        // Mostrar etapa atual
        document.getElementById(`step-${step}`).classList.add('active');

        // Atualizar indicadores
        this.updateStepIndicators(step);

        // Configurar etapa específica
        this.setupStep(step);

        this.currentStep = step;
    }

    setupStep(step) {
        switch (step) {
            case 2:
                if (this.registrationData.method === 'social') {
                    document.getElementById('social-login-section').style.display = 'block';
                    document.getElementById('email-section').style.display = 'none';
                } else {
                    document.getElementById('social-login-section').style.display = 'none';
                    document.getElementById('email-section').style.display = 'block';
                }
                break;

            case 3:
                // Pre-selecionar tipo baseado no email se for UFRJ
                if (this.registrationData.suggestInstitutional && !this.registrationData.userType) {
                    // Mostrar sugestão para extensionista/pesquisador
                    this.showInfo('Email UFRJ detectado. Recomendamos escolher Extensionista ou Pesquisador.');
                }
                break;
        }
    }

    updateStepIndicators(currentStep) {
        for (let i = 1; i <= this.totalSteps; i++) {
            const indicator = document.getElementById(`step-indicator-${i}`);
            if (i < currentStep) {
                indicator.className = 'step completed';
            } else if (i === currentStep) {
                indicator.className = 'step active';
            } else {
                indicator.className = 'step';
            }
        }
    }

    showConfirmationData() {
        const confirmationDiv = document.getElementById('confirmation-data');
        
        let html = '<div class="confirmation-summary">';
        html += `<h3>Resumo dos Dados</h3>`;
        
        if (this.registrationData.method === 'social') {
            html += `<p><strong>Método:</strong> Login Social (Google)</p>`;
        } else {
            html += `<p><strong>Método:</strong> Email</p>`;
        }
        
        html += `<p><strong>Email:</strong> ${this.registrationData.email}</p>`;
        
        const typeLabels = {
            visitante: 'Visitante',
            extensionista: 'Extensionista',
            pesquisador: 'Pesquisador'
        };
        html += `<p><strong>Tipo de Usuário:</strong> ${typeLabels[this.registrationData.userType]}</p>`;
        
        if (this.registrationData.institutionalEmail) {
            html += `<p><strong>Email Institucional:</strong> ${this.registrationData.institutionalEmail}</p>`;
        }
        
        html += '</div>';
        
        confirmationDiv.innerHTML = html;
    }

    async createAccount() {
        const loadingSpinner = document.getElementById('loading-spinner');
        const confirmationButtons = document.getElementById('confirmation-buttons');
        
        // Mostrar loading
        loadingSpinner.style.display = 'block';
        confirmationButtons.style.display = 'none';

        try {
            let userData;

            if (this.registrationData.method === 'social') {
                // Dados do Auth0
                userData = {
                    auth0_id: this.registrationData.auth0Data.sub,
                    email: this.registrationData.email,
                    name: this.registrationData.auth0Data.name,
                    user_type: this.registrationData.userType,
                    institutional_email: this.registrationData.institutionalEmail,
                    method: 'social'
                };
            } else {
                // Cadastro por email (será implementado posteriormente com verificação)
                userData = {
                    email: this.registrationData.email,
                    user_type: this.registrationData.userType,
                    institutional_email: this.registrationData.institutionalEmail,
                    method: 'email'
                };
            }

            // Chamar função de criação de usuário
            const response = await this.syncUserToDatabase(userData);
            
            if (response.success) {
                // Salvar dados do usuário no localStorage
                const finalUserData = {
                    ...response.user,
                    loginTime: new Date().toISOString(),
                    remember: true
                };
                
                localStorage.setItem('current_user', JSON.stringify(finalUserData));
                
                // Redirecionar baseado no tipo de usuário
                const redirectUrl = finalUserData.is_admin ? 'admin.html' : '../index.html';
                
                this.showSuccess('Conta criada com sucesso! Redirecionando...');
                
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 2000);
                
            } else {
                throw new Error(response.message || 'Erro ao criar conta');
            }

        } catch (error) {
            console.error('Erro ao criar conta:', error);
            this.showError('Erro ao criar conta: ' + error.message);
            
            // Esconder loading e mostrar botões novamente
            loadingSpinner.style.display = 'none';
            confirmationButtons.style.display = 'flex';
        }
    }

    async syncUserToDatabase(userData) {
        try {
            // Verificar se estamos em localhost (development)
            const isLocal = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1' || 
                          window.location.port === '8080';
            
            if (isLocal) {
                // Em desenvolvimento local, simular sucesso
                console.log('🏠 Ambiente local detectado, simulando criação de usuário');
                return {
                    success: true,
                    user: {
                        id: Date.now(),
                        email: userData.email,
                        name: userData.name || userData.email.split('@')[0],
                        user_type: userData.user_type,
                        role: userData.user_type,
                        is_admin: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                };
            }
            
            // Em produção, usar a function do Netlify
            const response = await fetch('/.netlify/functions/user-sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    user: userData,
                    registration: true 
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            return {
                success: true,
                user: data.user
            };

        } catch (error) {
            console.error('Erro ao sincronizar usuário:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showError(message) {
        // Implementar notificação de erro
        alert('Erro: ' + message);
    }

    showSuccess(message) {
        // Implementar notificação de sucesso
        alert('Sucesso: ' + message);
    }

    showInfo(message) {
        // Implementar notificação informativa
        console.log('Info: ' + message);
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.registrationManager = new RegistrationManager();
});


