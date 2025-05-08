// Импортируем функции для работы с API
import { apiRequest } from '../common/api.js';

// Состояние просмотрщика
const state = {
    tour: null,
    currentPanoramaId: null,
    loading: true
};

// Инициализация страницы
document.addEventListener('DOMContentLoaded', function() {
    // Получаем ID тура из URL
    const urlParams = new URLSearchParams(window.location.search);
    const tourId = urlParams.get('id');
    
    if (!tourId) {
        showError('ID тура не указан');
        return;
    }
    
    // Загружаем данные тура
    loadTourData(tourId);
    
    // Инициализируем обработчики событий
    initEventListeners();
});

/**
 * Инициализация обработчиков событий
 */
function initEventListeners() {
    // Кнопка полноэкранного режима
    document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);
    
    // Кнопка информации о туре
    document.getElementById('info-btn').addEventListener('click', showTourInfo);
    
    // Кнопка поделиться
    document.getElementById('share-btn').addEventListener('click', shareTour);
}

/**
 * Загрузка данных тура
 * @param {string} tourId - ID тура
 */
async function loadTourData(tourId) {
    try {
        // Показываем индикатор загрузки
        state.loading = true;
        document.getElementById('loader').style.display = 'flex';
        
        // Получаем тур по ID
        const tourData = await apiRequest(`/tours/${tourId}`, 'GET', null, false);
        
        // Проверяем, опубликован ли тур
        if (tourData.status !== 'published') {
            showError('Тур не опубликован');
            return;
        }
        
        // Обновляем состояние
        state.tour = tourData;
        
        // Если есть настройки и указана стартовая панорама
        if (tourData.settings && tourData.settings.startPanorama) {
            state.currentPanoramaId = tourData.settings.startPanorama;
        } 
        // Иначе берем первую панораму из списка
        else if (tourData.panoramas && tourData.panoramas.length > 0) {
            state.currentPanoramaId = tourData.panoramas[0].id;
        } else {
            showError('В туре нет панорам');
            return;
        }
        
        // Отображаем данные тура
        renderTour();
        
        // Скрываем индикатор загрузки
        state.loading = false;
        document.getElementById('loader').style.display = 'none';
    } catch (error) {
        console.error('Ошибка при загрузке данных тура:', error);
        showError('Ошибка при загрузке тура');
    }
}

/**
 * Отображение ошибки
 * @param {string} message - Сообщение об ошибке
 */
function showError(message) {
    const loader = document.getElementById('loader');
    loader.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 20px;">😢</div>
        <p>${message}</p>
        <button style="margin-top: 20px; padding: 10px 20px; background-color: #4CAF50; border: none; color: white; border-radius: 4px; cursor: pointer;" 
                onclick="window.location.href = '/'">
            На главную
        </button>
    `;
    loader.style.display = 'flex';
}

/**
 * Отображение тура
 */
function renderTour() {
    if (!state.tour) return;
    
    // Заголовок тура
    document.getElementById('tour-title').textContent = state.tour.name;
    
    // Логотип
    if (state.tour.settings && state.tour.settings.logo) {
        const logo = document.getElementById('logo');
        if (state.tour.settings.logo === 'none') {
            logo.style.display = 'none';
        } else if (state.tour.settings.logo === 'custom') {
            // Здесь будет логика для пользовательского логотипа
            logo.style.display = 'block';
        } else {
            // Стандартный логотип
            logo.style.display = 'block';
        }
    }
    
    // Рендерим миниатюры
    renderThumbnails();
    
    // Инициализация Pannellum
    initPannellum();
}

/**
 * Отображение миниатюр панорам
 */
function renderThumbnails() {
    const thumbnailsContainer = document.getElementById('panorama-thumbnails');
    thumbnailsContainer.innerHTML = '';
    
    if (!state.tour || !state.tour.panoramas || state.tour.panoramas.length === 0) {
        return;
    }
    
    // Отображаем только активные панорамы
    const activePanoramas = state.tour.panoramas.filter(p => p.status === 'active');
    
    activePanoramas.forEach(panorama => {
        const thumbnailUrl = `/api/uploads/${panorama.filename}`;
        
        const thumbnail = document.createElement('div');
        thumbnail.className = `panorama-thumbnail ${panorama.id === state.currentPanoramaId ? 'active' : ''}`;
        thumbnail.setAttribute('data-id', panorama.id);
        thumbnail.innerHTML = `
            <img src="${thumbnailUrl}" alt="${panorama.name}">
            <p>${panorama.name}</p>
        `;
        thumbnailsContainer.appendChild(thumbnail);
        
        // Добавляем обработчик клика
        thumbnail.addEventListener('click', function() {
            selectPanorama(panorama.id);
        });
    });
}

/**
 * Инициализация Pannellum
 */
function initPannellum() {
    if (!state.tour || !state.currentPanoramaId) return;
    
    // Находим текущую панораму
    const panorama = state.tour.panoramas.find(p => p.id === state.currentPanoramaId);
    if (!panorama) return;
    
    // URL для загрузки панорамы
    const panoramaUrl = `/api/uploads/${panorama.filename}`;
    
    // Инициализируем Pannellum
    try {
        // Если уже есть инстанс, удаляем его
        if (window.viewer) {
            window.viewer.destroy();
            delete window.viewer;
        }
        
        // Создаем новый инстанс
        window.viewer = pannellum.viewer('panorama-viewer', {
            type: 'equirectangular',
            panorama: panoramaUrl,
            autoLoad: true,
            title: panorama.name,
            hotSpots: getHotspotsForViewer(panorama.id),
            hfov: 110,
            mouseZoom: true,
            showControls: false
        });
        
        // Добавляем обработчик для хотспотов
        window.viewer.on('click', function(e) {
            const hotspot = e.target;
            if (hotspot && hotspot.classList.contains('pnlm-hotspot') && hotspot.dataset.targetPanoramaId) {
                selectPanorama(hotspot.dataset.targetPanoramaId);
            }
        });
    } catch (error) {
        console.error('Ошибка при инициализации Pannellum:', error);
        showError('Ошибка при инициализации просмотрщика панорам');
    }
}

/**
 * Получение хотспотов для текущей панорамы
 * @param {string} panoramaId - ID панорамы
 * @returns {Array} Массив хотспотов для Pannellum
 */
function getHotspotsForViewer(panoramaId) {
    if (!state.tour || !state.tour.hotspots) return [];
    
    // Фильтруем хотспоты для текущей панорамы
    return state.tour.hotspots
        .filter(h => h.panoramaId === panoramaId)
        .map(h => {
            // Преобразуем в формат для Pannellum
            return {
                id: h.id,
                pitch: h.position ? h.position.y || 0 : 0,
                yaw: h.position ? h.position.x || 0 : 0,
                text: h.name,
                type: 'custom',
                cssClass: 'custom-hotspot',
                targetPanoramaId: h.targetPanoramaId,
                createTooltipFunc: hotspot => {
                    const tooltip = document.createElement('div');
                    tooltip.classList.add('hotspot-tooltip');
                    tooltip.textContent = h.name;
                    
                    // Добавляем атрибут с ID целевой панорамы
                    hotspot.dataset.targetPanoramaId = h.targetPanoramaId;
                    
                    return tooltip;
                }
            };
        });
}

/**
 * Выбор панорамы
 * @param {string} panoramaId - ID панорамы
 */
function selectPanorama(panoramaId) {
    if (panoramaId === state.currentPanoramaId) return;
    
    // Обновляем состояние
    state.currentPanoramaId = panoramaId;
    
    // Обновляем активную миниатюру
    const thumbnails = document.querySelectorAll('.panorama-thumbnail');
    thumbnails.forEach(thumb => {
        thumb.classList.toggle('active', thumb.getAttribute('data-id') === panoramaId);
    });
    
    // Обновляем Pannellum
    initPannellum();
}

/**
 * Переключение полноэкранного режима
 */
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(e => {
            console.error('Ошибка при переходе в полноэкранный режим:', e);
        });
        // Меняем иконку
        document.getElementById('fullscreen-btn').innerHTML = '<i class="fas fa-compress"></i>';
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            // Меняем иконку
            document.getElementById('fullscreen-btn').innerHTML = '<i class="fas fa-expand"></i>';
        }
    }
}

/**
 * Показать информацию о туре
 */
function showTourInfo() {
    if (!state.tour) return;
    
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '3000';
    
    // Содержимое модального окна
    const content = document.createElement('div');
    content.style.backgroundColor = 'white';
    content.style.padding = '30px';
    content.style.borderRadius = '8px';
    content.style.maxWidth = '500px';
    content.style.width = '90%';
    content.style.color = '#333';
    
    // Заголовок
    const title = document.createElement('h2');
    title.textContent = state.tour.name;
    title.style.marginBottom = '15px';
    
    // Тип объекта
    const objectType = document.createElement('p');
    const objectTypeMap = {
        'apartment': 'Квартира',
        'house': 'Дом',
        'office': 'Офис',
        'commercial': 'Коммерческое помещение'
    };
    objectType.textContent = `Тип объекта: ${objectTypeMap[state.tour.objectType] || state.tour.objectType}`;
    objectType.style.marginBottom = '10px';
    
    // Описание
    const description = document.createElement('p');
    description.textContent = state.tour.description || 'Нет описания';
    description.style.marginBottom = '20px';
    
    // Кнопка закрытия
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Закрыть';
    closeBtn.style.padding = '10px 20px';
    closeBtn.style.backgroundColor = '#4CAF50';
    closeBtn.style.color = 'white';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '4px';
    closeBtn.style.cursor = 'pointer';
    
    // Добавляем все элементы
    content.appendChild(title);
    content.appendChild(objectType);
    content.appendChild(description);
    content.appendChild(closeBtn);
    modal.appendChild(content);
    
    // Добавляем модальное окно на страницу
    document.body.appendChild(modal);
    
    // Обработчик клика по кнопке закрытия
    closeBtn.addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // Обработчик клика вне содержимого
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

/**
 * Поделиться туром
 */
function shareTour() {
    if (!state.tour) return;
    
    // Получаем URL для шаринга
    const shareUrl = window.location.href;
    
    // Проверяем, поддерживается ли Web Share API
    if (navigator.share) {
        navigator.share({
            title: state.tour.name,
            text: state.tour.description || 'Виртуальный тур',
            url: shareUrl
        }).catch(console.error);
    } else {
        // Если Share API не поддерживается, копируем ссылку в буфер обмена
        navigator.clipboard.writeText(shareUrl)
            .then(() => {
                alert('Ссылка на тур скопирована в буфер обмена');
            })
            .catch(err => {
                console.error('Ошибка при копировании ссылки:', err);
                alert(`Ссылка на тур: ${shareUrl}`);
            });
    }
}