exports.handler = async (event, context) => {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Return public configuration
        const config = {
            AUTH0_DOMAIN: process.env.AUTH0_DOMAIN || 'dev-cvjwhtcjyx8zmows.us.auth0.com',
            AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID || null
        };

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
            },
            body: JSON.stringify(config)
        };

    } catch (error) {
        console.error('❌ Error getting config:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Internal server error'
            })
        };
    }
};