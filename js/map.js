// Mapa Interativo do Rio de Janeiro
class RioMap {
    constructor() {
        this.map = null;
        this.markers = [];
        this.markersGroup = null;
        this.dataManager = null;
        
        // Coordenadas aproximadas das regiões do Rio
        this.regionCoords = {
            'Centro': [-22.9068, -43.1729],
            'Zona Norte': [-22.8959, -43.2583],
            'Zona Sul': [-22.9711, -43.1825],
            'Zona Oeste': [-22.9520, -43.3684],
            'Baixada': [-22.7591, -43.4509],
            'Campo Grande': [-22.9056, -43.5547],
            'Copacabana': [-22.9711, -43.1825],
            'Tijuca': [-22.9249, -43.2311],
            'Maré': [-22.8590, -43.2409],
            'São Conrado': [-22.9942, -43.2678],
            'Santa Teresa': [-22.9145, -43.1864]
        };

        // Cores dos marcadores por categoria
        this.categoryColors = {
            'Educação': '#1565c0',
            'Saúde': '#7b1fa2', 
            'Meio Ambiente': '#2e7d32',
            'Inclusão Social': '#ef6c00',
            'Tecnologia Social': '#c2185b',
            'Economia Solidária': '#558b2f'
        };
    }

    init() {
        this.dataManager = DataManager.getInstance();
        this.initMap();
        this.loadMarkers();
        this.setupEventDelegation();
        
        // Observer para atualizar mapa quando dados mudarem
        this.dataManager.addObserver({
            onDataChange: (event, data) => {
                if (event === 'dataLoaded' || event === 'casoAdded' || event === 'casoUpdated' || event === 'casoDeleted') {
                    this.loadMarkers();
                }
            }
        });
    }
    
    setupEventDelegation() {
        // Delegação de eventos para botões de compartilhar nos popups
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('popup-btn-secondary') && e.target.dataset.shareId) {
                e.preventDefault();
                this.shareCaso(parseInt(e.target.dataset.shareId));
            }
        });
    }

    initMap() {
        // Coordenadas do centro do Rio de Janeiro
        const rioCenter = [-22.9068, -43.1729];
        
        // Criar mapa
        this.map = L.map('rio-map', {
            center: rioCenter,
            zoom: 11,
            zoomControl: true,
            scrollWheelZoom: true
        });

        // Adicionar camada de tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
        }).addTo(this.map);

        // Criar grupo de cluster para marcadores
        this.markersGroup = L.markerClusterGroup({
            chunkedLoading: true,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            maxClusterRadius: 50
        }).addTo(this.map);

        // Adicionar controles customizados
        this.addCustomControls();
    }

    addCustomControls() {
        // Controle para voltar ao centro
        const centerControl = L.Control.extend({
            options: {
                position: 'topright'
            },
            onAdd: (map) => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
                container.style.backgroundColor = 'white';
                container.style.width = '40px';
                container.style.height = '40px';
                container.style.cursor = 'pointer';
                container.style.display = 'flex';
                container.style.alignItems = 'center';
                container.style.justifyContent = 'center';
                container.title = 'Voltar ao centro do Rio';
                container.innerHTML = '🎯';
                
                L.DomEvent.on(container, 'click', function() {
                    map.setView([-22.9068, -43.1729], 11);
                    return false;
                });
                
                return container;
            }
        });

        new centerControl().addTo(this.map);
        
        // Controle de filtros
        this.addFilterControls();
    }
    
    addFilterControls() {
        // Capturar o contexto correto
        const self = this;
        
        // Controle de filtros por categoria
        const filterControl = L.Control.extend({
            options: {
                position: 'topright'
            },
            onAdd: (map) => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control map-filter-control');
                container.style.cssText = `
                    background: white;
                    padding: 10px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    font-size: 12px;
                    width: 200px;
                `;
                
                container.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 8px; color: var(--primary-color);">Filtrar por Categoria</div>
                    <label style="display: block; margin-bottom: 4px; cursor: pointer;">
                        <input type="checkbox" data-category="all" checked> Todas
                    </label>
                    <label style="display: block; margin-bottom: 4px; cursor: pointer;">
                        <input type="checkbox" data-category="Educação"> 📚 Educação
                    </label>
                    <label style="display: block; margin-bottom: 4px; cursor: pointer;">
                        <input type="checkbox" data-category="Saúde"> 🏥 Saúde
                    </label>
                    <label style="display: block; margin-bottom: 4px; cursor: pointer;">
                        <input type="checkbox" data-category="Meio Ambiente"> 🌱 Meio Ambiente
                    </label>
                    <label style="display: block; margin-bottom: 4px; cursor: pointer;">
                        <input type="checkbox" data-category="Inclusão Social"> 🤝 Inclusão Social
                    </label>
                    <label style="display: block; margin-bottom: 4px; cursor: pointer;">
                        <input type="checkbox" data-category="Tecnologia Social"> 💡 Tecnologia Social
                    </label>
                    <label style="display: block; margin-bottom: 4px; cursor: pointer;">
                        <input type="checkbox" data-category="Economia Solidária"> 💰 Economia Solidária
                    </label>
                `;
                
                // Adicionar event listeners
                container.addEventListener('change', (e) => {
                    if (e.target.type === 'checkbox') {
                        self.handleFilterChange(e.target);
                    }
                });
                
                // Prevenir propagação de eventos do mapa
                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.disableScrollPropagation(container);
                
                return container;
            }
        });

        new filterControl().addTo(this.map);
        this.activeFilters = new Set(['all']);
    }
    
    handleFilterChange(checkbox) {
        const category = checkbox.dataset.category;
        
        if (category === 'all') {
            // Se "Todas" foi marcada/desmarcada
            const checkboxes = document.querySelectorAll('input[data-category]');
            checkboxes.forEach(cb => {
                cb.checked = checkbox.checked;
            });
            
            if (checkbox.checked) {
                this.activeFilters = new Set(['all']);
            } else {
                this.activeFilters.clear();
            }
        } else {
            // Se uma categoria específica foi marcada/desmarcada
            const allCheckbox = document.querySelector('input[data-category="all"]');
            
            if (checkbox.checked) {
                this.activeFilters.add(category);
                this.activeFilters.delete('all');
                allCheckbox.checked = false;
            } else {
                this.activeFilters.delete(category);
                
                // Se nenhuma categoria estiver selecionada, selecionar "Todas"
                if (this.activeFilters.size === 0) {
                    this.activeFilters.add('all');
                    allCheckbox.checked = true;
                }
            }
        }
        
        this.applyFilters();
    }
    
    applyFilters() {
        // Recarregar marcadores com filtros aplicados
        this.loadMarkers();
    }

    loadMarkers() {
        // Limpar marcadores existentes
        this.markersGroup.clearLayers();
        this.markers = [];

        // Obter casos aprovados
        let casos = this.dataManager.getCasos().filter(caso => caso.aprovado);
        
        // Aplicar filtros se não for "all"
        if (!this.activeFilters.has('all')) {
            casos = casos.filter(caso => this.activeFilters.has(caso.categoria));
        }

        // Criar marcadores para cada caso com coordenadas mais precisas
        casos.forEach(caso => {
            const coords = this.getRegionCoords(caso.regiao);
            if (coords) {
                this.createMarker(caso, coords);
            }
        });
        
        // Atualizar contadores da legenda
        this.updateLegendCounts();
        
        // Se houver marcadores, ajustar visualização
        if (this.markers.length > 0) {
            setTimeout(() => {
                try {
                    const group = new L.featureGroup(this.markers);
                    this.map.fitBounds(group.getBounds().pad(0.1));
                } catch (e) {
                    console.log('Erro ao ajustar bounds do mapa:', e);
                }
            }, 100);
        }
    }
    
    updateLegendCounts() {
        const allCasos = this.dataManager.getCasos().filter(caso => caso.aprovado);
        const categoryCounts = {};
        
        // Contar casos por categoria
        allCasos.forEach(caso => {
            categoryCounts[caso.categoria] = (categoryCounts[caso.categoria] || 0) + 1;
        });
        
        // Atualizar legenda com contadores
        const legendItems = document.querySelectorAll('.legend-item');
        legendItems.forEach(item => {
            const span = item.querySelector('span:last-child');
            if (span) {
                const originalText = span.textContent;
                const categoria = originalText;
                const count = categoryCounts[categoria] || 0;
                span.textContent = `${categoria} (${count})`;
            }
        });
    }

    getRegionCoords(regiao) {
        // Adicionar variação mais diversificada para melhor distribuição
        const baseCoords = this.regionCoords[regiao];
        if (!baseCoords) {
            // Coordenadas padrão para regiões não mapeadas
            console.warn(`Região não mapeada: ${regiao}. Usando coordenadas do centro.`);
            return this.regionCoords['Centro'];
        }

        const variation = 0.015; // Variação de aproximadamente 1.5km
        const angle = Math.random() * 2 * Math.PI; // Ângulo aleatório
        const distance = Math.random() * variation; // Distância aleatória
        
        return [
            baseCoords[0] + Math.cos(angle) * distance,
            baseCoords[1] + Math.sin(angle) * distance
        ];
    }

    createMarker(caso, coords) {
        const color = this.categoryColors[caso.categoria] || '#666666';
        
        // Criar ícone personalizado
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `
                <div style="
                    background-color: ${color};
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    color: white;
                    font-weight: bold;
                    cursor: pointer;
                ">
                    ${this.getCategoryIcon(caso.categoria)}
                </div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
            popupAnchor: [0, -15]
        });

        // Criar marcador
        const marker = L.marker(coords, { 
            icon: customIcon,
            riseOnHover: true
        });

        // Criar popup
        const popupContent = this.createPopupContent(caso);
        marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup',
            closeButton: true,
            autoClose: false
        });

        // Adicionar ao grupo
        this.markersGroup.addLayer(marker);
        this.markers.push(marker);

        return marker;
    }

    getCategoryIcon(categoria) {
        const icons = {
            'Educação': '📚',
            'Saúde': '🏥',
            'Meio Ambiente': '🌱',
            'Inclusão Social': '🤝',
            'Tecnologia Social': '💡',
            'Economia Solidária': '💰'
        };
        return icons[categoria] || '📍';
    }

    createPopupContent(caso) {
        return `
            <div class="map-popup">
                <div class="popup-header">
                    <span class="popup-category" style="background-color: ${this.categoryColors[caso.categoria]}">
                        ${caso.categoria}
                    </span>
                </div>
                <h4 class="popup-title">${this.escapeHtml(caso.titulo)}</h4>
                <div class="popup-info">
                    <div class="popup-row">
                        <span class="popup-icon">🏢</span>
                        <span>${this.escapeHtml(caso.organizacao)}</span>
                    </div>
                    <div class="popup-row">
                        <span class="popup-icon">📍</span>
                        <span>${this.escapeHtml(caso.regiao)}</span>
                    </div>
                    <div class="popup-row">
                        <span class="popup-icon">👥</span>
                        <span>${caso.beneficiarios} beneficiários</span>
                    </div>
                </div>
                <p class="popup-description">${this.truncateText(this.escapeHtml(caso.descricaoResumo), 120)}</p>
                <div class="popup-actions">
                    <a href="pages/caso.html?id=${caso.id}" class="popup-btn popup-btn-primary">Ver Detalhes</a>
                    <button class="popup-btn popup-btn-secondary" data-share-id="${caso.id}">
                        Compartilhar
                    </button>
                </div>
            </div>
        `;
    }

    shareCaso(casoId) {
        const caso = this.dataManager.getCasoById(casoId);
        
        if (caso) {
            if (navigator.share) {
                navigator.share({
                    title: caso.titulo,
                    text: caso.descricaoResumo,
                    url: `${window.location.origin}/pages/caso.html?id=${casoId}`
                }).catch(err => {
                    console.log('Erro ao compartilhar:', err);
                });
            } else {
                const url = `${window.location.origin}/pages/caso.html?id=${casoId}`;
                navigator.clipboard.writeText(url).then(() => {
                    this.showNotification('Link copiado para a área de transferência!');
                }).catch(err => {
                    console.error('Erro ao copiar para clipboard:', err);
                });
            }
        }
    }

    showNotification(message) {
        // Criar notificação simples
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #27ae60;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            font-weight: 600;
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Utilitários
    escapeHtml(text) {
        if (text == null || text === undefined) {
            return '';
        }
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    truncateText(text, maxLength) {
        if (text == null || text === undefined) {
            return '';
        }
        const str = String(text);
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength).trim() + '...';
    }
}

// Instância global do mapa
let rioMap;

// Inicializar mapa quando DOM estiver pronto e Leaflet carregado
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('rio-map')) {
        // Aguardar DataManager estar pronto
        const initMap = () => {
            if (window.DataManager) {
                rioMap = new RioMap();
                rioMap.init();
            } else {
                setTimeout(initMap, 100);
            }
        };
        initMap();
    }
});