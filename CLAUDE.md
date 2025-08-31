# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Observatório de Inovação Social - Rio de Janeiro** is a frontend-only web platform for mapping and showcasing social innovation initiatives in Rio de Janeiro. Built with vanilla HTML, CSS, and JavaScript without external frameworks (except Leaflet for maps).

**Live Site**: https://observatorioisrj.netlify.app/  
**Repository**: https://github.com/umaugusto/observatorio-inovacao-social  
**Deployment**: Netlify (automatic deployment from main/master branch)

## Development Commands

```bash
# Start development server (recommended):
npm run dev              # Uses http-server on port 8080
# Alternative methods:
npx http-server -p 8080 -o
python -m http.server 8080
php -S localhost:8080

# Netlify local development:
npm run netlify          # Test with Netlify functions locally
npm run dev:netlify      # Alternative netlify dev command

# Git workflow for changes:
git add .
git commit -m "describe changes"
git push                 # Automatically deploys to Netlify

# No build process required - direct file editing
# No test suite - manual testing only  
# No linting configured - follow existing code style
```

## Architecture

### Core Singleton Managers
- **DataManager** (`js/DataManager.js`): Handles all data operations, localStorage persistence, observer notifications, and contact message management
- **AuthManager** (`js/AuthManager.js`): Manages authentication, sessions, role-based permissions, and demo mode protection
- **HeaderManager** (`js/HeaderManager.js`): Centralized header management with dynamic navigation and authentication state updates
- **RegistrationManager** (`js/RegistrationManager.js`): Handles multi-step user registration flow with Auth0 integration
- **ObservatorioApp** (`js/main.js`): Main application controller that orchestrates all functionality

### Data Flow
1. **Database Mode**: Attempts to load from Supabase via `/casos-api` function first
2. **Fallback Mode**: Falls back to localStorage or `data/casos.json` for local development
3. DataManager automatically detects environment (production vs localhost)
4. DataManager notifies observers of changes via Observer pattern
5. UI components update reactively based on data changes
6. All CRUD operations go through DataManager for consistency

### Hybrid Architecture
The system uses a **hybrid client-server approach**:
- **Production**: Database-backed via Netlify functions + Supabase
- **Development**: localStorage + JSON files for offline work
- **Intelligent Fallback**: Gracefully handles API failures by using local data

### Authentication System
- **Primary**: Auth0 integration with Google OAuth and email/password authentication
- **Registration Flow**: Multi-step process via RegistrationManager with department/role selection
- **User Storage**: Supabase database with automatic user sync via Netlify functions
- **Callback Handling**: Auth0 callback processing with error handling and user creation
- **Session Management**: 24-hour timeout with "remember me" option for persistent sessions
- **Role-based Access**: Dynamic UI visibility and permissions controlled by AuthManager
- **User Roles**: `visitante` (default), `aluno_extensao`, `pesquisador`, `admin`, `coordenador`
- **Fallback**: Mock authentication for local development

### Demo Account Security System
- **Demo Mode Protection**: All demo accounts (`isDemo: true`) are prevented from making permanent changes
- **Visual Notifications**: Demo users see orange banner warnings and operation-blocked notifications
- **Safe Operations**: Demo users can browse, search, and view all data but cannot create/edit/delete
- **Memory-only Changes**: Demo account operations use in-memory cache instead of localStorage persistence
- **Built-in Demo Accounts**: 
  - `aluno@ufrj.br` / `123456` (Student)
  - `admin@ufrj.br` / `admin123` (Admin)
  - `pesquisador@ufrj.br` / `pesq123` (Researcher)  
  - `coordenador@ufrj.br` / `coord123` (Coordinator)

## Key Implementation Details

### Data Persistence
- **Primary**: Browser localStorage
- **Demo Mode**: Memory-only cache (no persistence)
- **Fallback**: JSON files in `/data` directory
- **Production**: Supabase database via Netlify functions
- **Reset data**: `DataManager.getInstance().resetData()` in browser console
- **Safe operations**: Use `DataManager.safeSetItem()` which respects demo mode

### Dynamic Path Resolution
- Use relative paths that adjust based on current page location:
```javascript
const basePath = window.location.pathname.includes('/pages/') ? '../' : './';
```

### Case Study Model Structure
```javascript
{
  id: string | number,  // UUID from database or numeric for local development
  titulo: string,
  categoria: string,  // Must match predefined categories
  regiao: string,
  descricaoResumo: string,
  descricaoCompleta: string,
  organizacao: string,
  beneficiarios: number,
  status: "Em andamento" | "Concluído" | "Pausado",
  aprovado: boolean,  // Controls public visibility
  imagemUrl: string,  // Optional image URL
  tags: string[],     // Keywords for search
  impactos: string[], // List of impact statements
  metodologia: string,
  desafios: string,
  // ... other fields
}
```

### Categories
Fixed categories: "Educação", "Saúde", "Meio Ambiente", "Inclusão Social", "Tecnologia Social", "Economia Solidária"

## Common Development Tasks

### Add New Case Study
1. Use DataManager: `DataManager.getInstance().addCaso(casoObject)`
2. New cases start with `aprovado: false`
3. Admin approval required for public visibility

### Modify Styling
- Global styles: `css/main.css`
- Component styles: `css/components.css`
- Use CSS custom properties for theming (defined in `:root`)

### Add New Page
1. Create HTML file in `/pages`
2. Include standard header/footer structure
3. Link required JS managers and CSS files
4. Add navigation link in header template

### Debug Data Issues
```javascript
// Check localStorage data
console.log(DataManager.getInstance().getCasos());

// Force reload from JSON file
await DataManager.getInstance().resetData();

// Check authentication state
console.log(AuthManager.getInstance().getCurrentUser());
console.log(AuthManager.getInstance().isAuthenticated());

// Check if user is in demo mode
console.log(AuthManager.getInstance().isDemoMode());

// Check session validity
console.log(AuthManager.getInstance().isSessionValid(AuthManager.getInstance().getCurrentUser()));

// Test demo notifications
AuthManager.getInstance().showDemoNotification('Test demo notification');
AuthManager.getInstance().showDemoBanner();

// Test header update
HeaderManager.getInstance().updateHeader();
```

## Important Conventions

### HTML Structure
- Semantic HTML5 with proper heading hierarchy
- ARIA labels for accessibility
- Data attributes for JavaScript hooks (prefer over classes)

### CSS Methodology
- BEM-like naming for components
- CSS custom properties for design tokens
- Mobile-first responsive design
- Animations use Intersection Observer for performance

### JavaScript Patterns
- ES6+ classes with singleton pattern for stateful modules
- Observer pattern for state management
- Async/await for asynchronous operations
- Event delegation for dynamic content
- 4-space indentation, single quotes, semicolons, strict equality (`===`)
- Keep DOM access and side-effects inside managers; prefer small, focused methods

### File Naming Conventions
- Class modules: PascalCase (e.g., `AuthManager.js`, `DataManager.js`)
- Entry/utility files: lowercase (e.g., `main.js`, `map.js`)
- HTML pages: lowercase with hyphens (e.g., `caso.html`, `test-auth.html`)

### Security Considerations
- **XSS Prevention**: HTML escaping via `escapeHtml()` method
- **CSP**: Content Security Policy configured in netlify.toml
- **Authentication**: Auth0 handles secure OAuth flow
- **Database Security**: Supabase Row Level Security (RLS) policies
- **Demo Account Protection**: All demo accounts blocked from data modifications
- **Environment Variables**: Sensitive configuration stored securely
- **CRUD Validation**: All operations check `isDemoMode()` before execution

## Map Integration

The project uses Leaflet.js for interactive maps:
- Map initialization in `js/map.js`
- Marker clustering for performance
- Category-based color coding
- Popup templates for case details

## Browser Support

Targets modern browsers with ES6+ support:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- No IE11 support

## Testing Approach

Manual testing only - no automated test suite configured yet. Test critical paths:
1. Case CRUD operations
2. Authentication flow
3. Search and filtering
4. Map interactions
5. Responsive design breakpoints

### Future Testing Setup
When introducing automated tests:
- Add Jest unit tests (`*.test.js`) near modules or under `tests/` directory
- Add `"test": "jest"` script to package.json
- Prioritize testing data transforms (e.g., `DataManager` CRUD) and pure helpers
- Mock `localStorage` and network calls in tests

## Netlify Functions

The project uses serverless functions for backend operations:

- **`user-sync.js`**: Syncs Auth0 users with Supabase database during authentication
- **`user-registration.js`**: Handles new user registration with role assignment 
- **`casos-api.js`**: Handles CRUD operations for case studies with proper camelCase/snake_case mapping
- **`auth0-resend-verification.js`**: Resends email verification for Auth0 users
- **`comments-api.js`**: Manages user comments and interactions (if implemented)

Functions are accessible at `/.netlify/functions/{function-name}` and automatically deployed with the site.

## Environment Variables

Required environment variables for production (set in Netlify dashboard):

```bash
# Auth0 Configuration
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id

# Supabase Configuration  
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

For local development with Netlify functions, create `.env` file with these variables.

## Development Best Practices

### Commit Guidelines
- Follow Conventional Commits format: `feat(js): add case filters`, `fix(netlify): handle CORS`
- Keep commits focused and avoid unrelated refactors
- Ensure no secrets are committed to repository

### Pull Request Guidelines  
- Include clear description and linked issues
- Add before/after screenshots for UI changes
- Provide manual test steps (test both dev server and Netlify Dev)
- Keep PRs focused on single features or fixes

### Security Best Practices
- Move API keys to environment variables (never hardcode in `js/` files)
- For external scripts, update `netlify.toml` `Content-Security-Policy` to whitelist domains
- Set secrets in Netlify dashboard: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `AUTH0_*`

## Known Limitations

- **Hybrid architecture**: Client-side localStorage with serverless backend functions
- **Data size limits**: localStorage has ~5-10MB limit for client-side data
- **No SEO**: Client-side rendering only
- **No offline support**: Requires active internet for map tiles and authentication