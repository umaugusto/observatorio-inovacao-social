// Supabase Client - Gerenciamento de banco de dados
class SupabaseClient {
    constructor() {
        this.supabase = null;
        this.config = {
            url: 'https://zylqmvyvztbmokdmycqa.supabase.co',
            anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bHFtdnl2enRibW9rZG15Y3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NDM5ODMsImV4cCI6MjA3MjExOTk4M30.c5jJVJPdAmP0t6lwPtl6bDAlsBhgaIZ_Bddj9kzYdFU'
        };
        this.init();
    }

    static getInstance() {
        if (!SupabaseClient.instance) {
            SupabaseClient.instance = new SupabaseClient();
        }
        return SupabaseClient.instance;
    }

    async init() {
        // Verificar se Supabase SDK está disponível
        if (typeof window.supabase !== 'undefined') {
            this.supabase = window.supabase.createClient(this.config.url, this.config.anonKey);
        } else {
            console.log('Supabase SDK não carregado. Carregando dinamicamente...');
            await this.loadSupabaseSDK();
        }
    }

    async loadSupabaseSDK() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.min.js';
            script.onload = () => {
                this.supabase = window.supabase.createClient(this.config.url, this.config.anonKey);
                console.log('Supabase client initialized');
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Usuários
    async createOrUpdateUser(auth0User) {
        const { data, error } = await this.supabase
            .from('users')
            .upsert({
                auth0_id: auth0User.sub,
                email: auth0User.email,
                name: auth0User.name || auth0User.nickname,
                role: 'visitante',
                is_admin: false
            }, {
                onConflict: 'auth0_id'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getUser(auth0Id) {
        const { data, error } = await this.supabase
            .from('users')
            .select('*')
            .eq('auth0_id', auth0Id)
            .single();

        if (error) throw error;
        return data;
    }

    async updateUser(userId, updates) {
        const { data, error } = await this.supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Casos
    async getCasos(filters = {}) {
        let query = this.supabase
            .from('casos')
            .select(`
                *,
                users!casos_user_id_fkey(name, email, role)
            `);

        // Filtros
        if (filters.aprovado !== undefined) {
            query = query.eq('aprovado', filters.aprovado);
        }

        if (filters.categoria) {
            query = query.eq('categoria', filters.categoria);
        }

        if (filters.regiao) {
            query = query.eq('regiao', filters.regiao);
        }

        if (filters.search) {
            query = query.or(`titulo.ilike.%${filters.search}%,descricao_resumo.ilike.%${filters.search}%`);
        }

        // Ordenação
        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async getCaso(id) {
        const { data, error } = await this.supabase
            .from('casos')
            .select(`
                *,
                users!casos_user_id_fkey(name, email, role)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    async createCaso(caso, userId) {
        const { data, error } = await this.supabase
            .from('casos')
            .insert({
                ...caso,
                user_id: userId,
                aprovado: false
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateCaso(id, updates) {
        const { data, error } = await this.supabase
            .from('casos')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteCaso(id) {
        const { error } = await this.supabase
            .from('casos')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // Comentários
    async getComentarios(casoId, aprovadosOnly = true) {
        let query = this.supabase
            .from('comentarios')
            .select(`
                *,
                users!comentarios_user_id_fkey(name, email, role)
            `)
            .eq('caso_id', casoId);

        if (aprovadosOnly) {
            query = query.eq('aprovado', true);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async addComentario(casoId, texto, userId) {
        const { data, error } = await this.supabase
            .from('comentarios')
            .insert({
                caso_id: casoId,
                user_id: userId,
                texto: texto,
                aprovado: false
            })
            .select(`
                *,
                users!comentarios_user_id_fkey(name, email, role)
            `)
            .single();

        if (error) throw error;
        return data;
    }

    async aprovarComentario(comentarioId) {
        const { data, error } = await this.supabase
            .from('comentarios')
            .update({ aprovado: true })
            .eq('id', comentarioId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteComentario(comentarioId) {
        const { error } = await this.supabase
            .from('comentarios')
            .delete()
            .eq('id', comentarioId);

        if (error) throw error;
    }

    // Sugestões
    async getSugestoes() {
        const { data, error } = await this.supabase
            .from('sugestoes')
            .select(`
                *,
                users!sugestoes_user_id_fkey(name, email, role)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async addSugestao(sugestao, userId) {
        const { data, error } = await this.supabase
            .from('sugestoes')
            .insert({
                ...sugestao,
                user_id: userId,
                status: 'pendente'
            })
            .select(`
                *,
                users!sugestoes_user_id_fkey(name, email, role)
            `)
            .single();

        if (error) throw error;
        return data;
    }

    async updateSugestao(id, updates) {
        const { data, error } = await this.supabase
            .from('sugestoes')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Realtime - Comentários
    subscribeToComentarios(casoId, callback) {
        return this.supabase
            .channel('comentarios')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'comentarios',
                filter: `caso_id=eq.${casoId}`
            }, callback)
            .subscribe();
    }

    // Estatísticas
    async getStats() {
        // Casos
        const { data: casos, error: casosError } = await this.supabase
            .from('casos')
            .select('id, aprovado, beneficiarios, categoria, regiao');

        if (casosError) throw casosError;

        // Comentários
        const { count: comentarios } = await this.supabase
            .from('comentarios')
            .select('id', { count: 'exact' })
            .eq('aprovado', true);

        // Usuários
        const { count: usuarios } = await this.supabase
            .from('users')
            .select('id', { count: 'exact' });

        return {
            totalCasos: casos.length,
            casosAprovados: casos.filter(c => c.aprovado).length,
            casosPendentes: casos.filter(c => !c.aprovado).length,
            beneficiarios: casos.reduce((sum, c) => sum + (c.beneficiarios || 0), 0),
            categorias: [...new Set(casos.map(c => c.categoria))].length,
            regioes: [...new Set(casos.map(c => c.regiao))].length,
            comentarios: comentarios || 0,
            usuarios: usuarios || 0
        };
    }

    // Upload de imagem
    async uploadImage(file, bucket = 'images') {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${bucket}/${fileName}`;

        const { data, error } = await this.supabase.storage
            .from('uploads')
            .upload(filePath, file);

        if (error) throw error;

        // Obter URL pública
        const { data: { publicUrl } } = this.supabase.storage
            .from('uploads')
            .getPublicUrl(filePath);

        return publicUrl;
    }
}

// Export para uso global
window.SupabaseClient = SupabaseClient;