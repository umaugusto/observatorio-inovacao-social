# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Observatório de Inovação Social - Rio de Janeiro** is a frontend-only web platform for mapping and showcasing social innovation initiatives in Rio de Janeiro. Built with vanilla HTML, CSS, and JavaScript without external frameworks (except Leaflet for maps).

## Development Commands

```bash
# Start development server (choose one):
npx http-server -p 8080 -o
python -m http.server 8080
php -S localhost:8080

# No build process required - direct file editing
# No test suite - manual testing only
# No linting configured - follow existing code style
```

## Architecture

### Core Singleton Managers
- **DataManager** (`js/DataManager.js`): Handles all data operations, localStorage persistence, and observer notifications
- **AuthManager** (`js/AuthManager.js`): Manages authentication, sessions, and role-based permissions
- **ObservatorioApp** (`js/main.js`): Main application controller that orchestrates all functionality

### Data Flow
1. Data loads from localStorage (persistent) or falls back to `data/casos.json`
2. DataManager notifies observers of changes via Observer pattern
3. UI components update reactively based on data changes
4. All CRUD operations go through DataManager for consistency

### Authentication System
- Mock authentication with two roles: `extensionista` and `admin`
- Session management with automatic timeout (30 minutes)
- Role-based UI visibility controlled by AuthManager

## Key Implementation Details

### Data Persistence
- Primary: Browser localStorage
- Fallback: JSON files in `/data` directory
- Reset data: `DataManager.getInstance().resetData()` in browser console

### Dynamic Path Resolution
- Use relative paths that adjust based on current page location:
```javascript
const basePath = window.location.pathname.includes('/pages/') ? '../' : './';
```

### Case Study Model Structure
```javascript
{
  id: number,
  titulo: string,
  categoria: string,  // Must match predefined categories
  regiao: string,
  descricaoResumo: string,
  descricaoCompleta: string,
  organizacao: string,
  beneficiarios: number,
  status: "Em andamento" | "Concluído" | "Pausado",
  aprovado: boolean,  // Controls public visibility
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
- ES6+ classes with singleton pattern
- Observer pattern for state management
- Async/await for asynchronous operations
- Event delegation for dynamic content

### Security Considerations
- HTML escaping via `escapeHtml()` method for XSS prevention
- Client-side only - no sensitive operations
- Mock authentication for demonstration purposes

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

Manual testing only - no automated test suite. Test critical paths:
1. Case CRUD operations
2. Authentication flow
3. Search and filtering
4. Map interactions
5. Responsive design breakpoints

## Known Limitations

- **No backend**: All data stored client-side in localStorage
- **No real authentication**: Mock system for demonstration
- **Data size limits**: localStorage has ~5-10MB limit
- **No SEO**: Client-side rendering only
- **No offline support**: Requires active internet for map tiles