const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
    // Configurar CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    };

    // Responder preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const { userData } = JSON.parse(event.body);
        
        console.log('📝 Processing user registration:', {
            email: userData.email,
            user_type: userData.user_type,
            method: userData.method
        });

        // Validações
        if (!userData.email || !userData.user_type) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Email e tipo de usuário são obrigatórios'
                })
            };
        }

        // Verificar se usuário já existe
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', userData.email)
            .single();

        if (existingUser) {
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Usuário já cadastrado com este email'
                })
            };
        }

        // Preparar dados do usuário
        const userToInsert = {
            email: userData.email,
            user_type: userData.user_type,
            role: userData.user_type, // Para compatibilidade
            method: userData.method || 'email',
            institutional_email: userData.institutional_email,
            created_at: userData.created_at,
            updated_at: new Date().toISOString(),
            email_verified: userData.email_verified || false,
            is_admin: userData.user_type === 'coordenador'
        };

        // Se for cadastro por email, criptografar senha
        if (userData.method === 'email' && userData.password) {
            const saltRounds = 12;
            userToInsert.password_hash = await bcrypt.hash(userData.password, saltRounds);
        }

        // Se for cadastro social, incluir dados do Auth0
        if (userData.method === 'google' && userData.auth0_id) {
            userToInsert.auth0_id = userData.auth0_id;
            userToInsert.name = userData.name;
            userToInsert.picture = userData.picture;
        } else {
            // Gerar nome baseado no email
            userToInsert.name = userData.email.split('@')[0];
        }

        // Inserir usuário no banco
        const { data: newUser, error } = await supabase
            .from('users')
            .insert([userToInsert])
            .select('*')
            .single();

        if (error) {
            console.error('❌ Supabase error:', error);
            throw new Error('Erro ao criar usuário no banco de dados');
        }

        console.log('✅ User created successfully:', newUser.id);

        // Se precisar de verificação de email, enviar email (implementar later)
        if (!userData.email_verified && userData.method === 'email') {
            // TODO: Implementar envio de email de verificação
            console.log('📧 Email verification would be sent to:', userData.email);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    name: newUser.name,
                    user_type: newUser.user_type,
                    role: newUser.role,
                    is_admin: newUser.is_admin,
                    created_at: newUser.created_at
                }
            })
        };

    } catch (error) {
        console.error('💥 Registration error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: error.message || 'Erro interno do servidor'
            })
        };
    }
};