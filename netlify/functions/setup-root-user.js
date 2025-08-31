const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Root user data
        const rootUserData = {
            email: 'antonio.aas@ufrj.br',
            name: 'Antonio Augusto Silva',
            role: 'pesquisador',
            is_admin: true,
            is_root: true,
            approved: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Hash the password
        const hashedPassword = await bcrypt.hash('@chk.4uGU570;123', 10);
        rootUserData.password_hash = hashedPassword;

        // Check if root user already exists
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('*')
            .eq('email', rootUserData.email)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw new Error(`Error checking existing user: ${checkError.message}`);
        }

        let result;
        if (existingUser) {
            // Update existing user
            const { data, error } = await supabase
                .from('users')
                .update({
                    name: rootUserData.name,
                    role: rootUserData.role,
                    is_admin: rootUserData.is_admin,
                    is_root: rootUserData.is_root,
                    approved: rootUserData.approved,
                    password_hash: rootUserData.password_hash,
                    updated_at: rootUserData.updated_at
                })
                .eq('email', rootUserData.email)
                .select()
                .single();

            if (error) throw new Error(`Error updating root user: ${error.message}`);
            result = { action: 'updated', user: data };
        } else {
            // Create new user
            const { data, error } = await supabase
                .from('users')
                .insert([rootUserData])
                .select()
                .single();

            if (error) throw new Error(`Error creating root user: ${error.message}`);
            result = { action: 'created', user: data };
        }

        console.log(`✅ Root user ${result.action}:`, result.user.email);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                message: `Root user ${result.action} successfully`,
                user: {
                    email: result.user.email,
                    name: result.user.name,
                    role: result.user.role,
                    isAdmin: result.user.is_admin,
                    isRoot: result.user.is_root
                }
            })
        };

    } catch (error) {
        console.error('❌ Error setting up root user:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};