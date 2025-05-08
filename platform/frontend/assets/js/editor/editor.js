import { getTour, updateTour, getPanoramas, uploadPanorama, deletePanorama } from '../common/api.js';
import { isAuthenticated } from '../common/auth.js';

// Состояние редактора
const state = {
    tour: null,
    currentPanoramaId: null,
    loading: false,
    selectedFiles: [] // Для хранения выбранных файлов при загрузке
};

// Инициализация страницы
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем авторизацию
    if (!isAuthenticated()) return;
    
    // Получаем ID тура из URL
    const urlParams = new URLSearchParams(window.location.search);
    const tourId = urlParams.get('id');
    
    if (!tourId) {
        alert('ID тура не указан');
        window.location.href = '/pages/main.html';
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
    // Обработчик смены вкладок
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Убираем активный класс со всех вкладок и контента
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Добавляем активный класс выбранной вкладке
            this.classList.add('active');
            
            // Показываем соответствующий контент
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Обработчики для выпадающего меню пользователя
    const userMenu = document.querySelector('.user-menu');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    
    userMenu.addEventListener('click', function(event) {
        dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
        event.stopPropagation();
    });
    
    document.addEventListener('click', function() {
        dropdownMenu.style.display = 'none';
    });
    
    dropdownMenu.addEventListener('click', function(event) {
        event.stopPropagation();
    });
    
    // Обработчик кнопки "Сохранить"
    document.getElementById('save-btn').addEventListener('click', saveTour);
    
    // Обработчик кнопки "Превью"
    document.getElementById('view-preview-btn').addEventListener('click', function() {
        document.querySelector('.tab[data-tab="preview"]').click();
    });
    
    // Обработчик кнопки "Поделиться"
    document.getElementById('share-btn').addEventListener('click', shareTour);
    document.getElementById('editor-share-btn').addEventListener('click', shareTour);
    
    // Обработчик кнопки "Загрузить панорамы"
    document.getElementById('upload-btn').addEventListener('click', function() {
        document.getElementById('upload-modal').classList.add('active');
    });
    
    // Обработчики для модального окна загрузки
    document.getElementById('upload-modal-close').addEventListener('click', function() {
        document.getElementById('upload-modal').classList.remove('active');
    });
    
    document.getElementById('cancel-upload').addEventListener('click', function() {
        document.getElementById('upload-modal').classList.remove('active');
    });
    
    // Закрытие модального окна при клике вне его
    window.addEventListener('click', function(event) {
        if (event.target === document.getElementById('upload-modal')) {
            document.getElementById('upload-modal').classList.remove('active');
        }
    });
    
    // Обработка загрузки файлов
    const fileInput = document.getElementById('file-input');
    const fileSelectBtn = document.getElementById('file-select-btn');
    const dropArea = document.getElementById('drop-area');
    
    fileSelectBtn.addEventListener('click', function() {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', function() {
        state.selectedFiles = this.files;
        handleFiles(this.files);
    });
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.style.borderColor = '#4CAF50';
    }
    
    function unhighlight() {
        dropArea.style.borderColor = '#ddd';
    }
    
    dropArea.addEventListener('drop', function(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        state.selectedFiles = files;
        handleFiles(files);
    });
    
    // Обработчик кнопки загрузки файлов
    document.getElementById('submit-upload').addEventListener('click', uploadFiles);
    
    // Обработчики для слайдеров горизонта
    document.getElementById('pitch-slider').addEventListener('input', updateHorizon);
    document.getElementById('yaw-slider').addEventListener('input', updateHorizon);
    
    // Обработчик кнопки сброса горизонта
    document.getElementById('reset-horizon').addEventListener('click', resetHorizon);
    
    // Обработчик выбора логотипа
    document.getElementById('logo-select').addEventListener('change', function() {
        saveTourSettings();
    });
    
    // Обработчик выбора стартовой панорамы
    document.getElementById('start-panorama-select').addEventListener('change', function() {
        saveTourSettings();
    });
    
    // Обработчик кнопки добавления хотспота
    document.querySelector('.add-hotspot-btn').addEventListener('click', addHotspot);
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
        const tourData = await getTour(tourId);
        
        // Обновляем состояние
        state.tour = tourData;
        
        // Если есть настройки и указана стартовая панорама
        if (tourData.settings && tourData.settings.startPanorama) {
            state.currentPanoramaId = tourData.settings.startPanorama;
        } 
        // Иначе берем первую панораму из списка
        else if (tourData.panoramas && tourData.panoramas.length > 0) {
            state.currentPanoramaId = tourData.panoramas[0].id;
        }
        
        // Отображаем данные тура
        renderTourData();
        
        // Скрываем индикатор загрузки
        state.loading = false;
        document.getElementById('loader').style.display = 'none';
    } catch (error) {
        console.error('Ошибка при загрузке данных тура:', error);
        alert('Ошибка при загрузке данных тура');
        
        // Скрываем индикатор загрузки
        state.loading = false;
        document.getElementById('loader').style.display = 'none';
    }
}

/**
 * Отображение данных тура в интерфейсе
 */
function renderTourData() {
    if (!state.tour) return;
    
    // Заголовок тура
    document.getElementById('tour-title').textContent = state.tour.name;
    
    // Настройки
    if (state.tour.settings) {
        document.getElementById('logo-select').value = state.tour.settings.logo || 'standard';
    }
    
    // Рендерим панорамы
    renderPanoramas();
    
    // Рендерим миниатюры
    renderThumbnails();
    
    // Рендерим хотспоты
    renderHotspots();
    
    // Рендерим выпадающий список стартовой панорамы
    renderStartPanoramaOptions();
    
    // Инициализация Pannellum
    initPannellum();
}

/**
 * Инициализация Pannellum для просмотра панорам
 */
function initPannellum() {
    if (!state.tour || !state.tour.panoramas || state.tour.panoramas.length === 0) {
        return;
    }
    
    // Находим текущую панораму
    const panorama = state.tour.panoramas.find(p => p.id === state.currentPanoramaId);
    if (!panorama) return;
    
    // URL для загрузки панорамы
    const panoramaUrl = `/api/uploads/${panorama.filename}`;
    
    // Инициализируем Pannellum для превью
    pannellum.viewer('panorama-viewer', {
        type: 'equirectangular',
        panorama: panoramaUrl,
        autoLoad: true,
        title: panorama.name,
        preview: 'https://via.placeholder.com/100x50',
        hotSpots: getHotspotsForViewer()
    });
    
    // Инициализируем Pannellum для редактора
    pannellum.viewer('editor-viewer', {
        type: 'equirectangular',
        panorama: panoramaUrl,
        autoLoad: true,
        title: panorama.name,
        preview: 'https://via.placeholder.com/100x50',
        hotSpots: getHotspotsForViewer(),
        hfov: 100,
        mouseZoom: false
    });
}

/**
 * Получение хотспотов в формате для Pannellum
 */
function getHotspotsForViewer() {
    if (!state.tour || !state.tour.hotspots) return [];
    
    // Фильтруем хотспоты для текущей панорамы
    return state.tour.hotspots
        .filter(h => h.panoramaId === state.currentPanoramaId)
        .map(h => {
            return {
                id: h.id,
                pitch: h.position ? h.position.y || 0 : 0,
                yaw: h.position ? h.position.x || 0 : 0,
                text: h.name,
                type: 'info',
                targetPanorama: h.targetPanoramaId
            };
        });
}

/**
 * Отображение панорам в сетке
 */
function renderPanoramas() {
    const panoramasGrid = document.getElementById('panoramas-grid');
    panoramasGrid.innerHTML = '';
    
    if (!state.tour || !state.tour.panoramas || state.tour.panoramas.length === 0) {
        panoramasGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 30px;">Нет загруженных панорам</div>';
        return;
    }
    
    state.tour.panoramas.forEach(panorama => {
        const statusClass = panorama.status === 'active' ? 'status-active' : 'status-inactive';
        const statusText = panorama.status === 'active' ? 'В туре' : 'Неиспользуемая';
        
        const previewUrl = `/api/uploads/${panorama.filename}`;
        
        const card = document.createElement('div');
        card.className = 'panorama-card';
        card.innerHTML = `
            <div class="panorama-preview" style="background-image: url('${previewUrl}');"></div>
            <div class="panorama-info">
                <div class="panorama-name">${panorama.name}</div>
                <div class="panorama-details">Загружено: ${formatDate(panorama.createdAt)}</div>
                <div class="panorama-status ${statusClass}">${statusText}</div>
                <div class="panorama-edit">
                    <input type="text" value="${panorama.name}" data-id="${panorama.id}">
                    <div class="edit-icon" data-id="${panorama.id}">
                        <i class="material-icons">check</i>
                    </div>
                    <div class="delete-icon" data-id="${panorama.id}">
                        <i class="material-icons">delete</i>
                    </div>
                </div>
            </div>
        `;
        panoramasGrid.appendChild(card);
    });
    
    // Добавляем обработчики для кнопок редактирования
    document.querySelectorAll('.edit-icon').forEach(btn => {
        btn.addEventListener('click', function() {
            const panoramaId = this.getAttribute('data-id');
            const input = document.querySelector(`.panorama-edit input[data-id="${panoramaId}"]`);
            const newName = input.value.trim();
            
            if (!newName) {
                alert('Название не может быть пустым');
                return;
            }
            
            updatePanoramaName(panoramaId, newName);
        });
    });
    
    // Добавляем обработчики для кнопок удаления
    document.querySelectorAll('.delete-icon').forEach(btn => {
        btn.addEventListener('click', function() {
            const panoramaId = this.getAttribute('data-id');
            if (confirm('Вы уверены, что хотите удалить эту панораму?')) {
                handleDeletePanorama(panoramaId);
            }
        });
    });
}

/**
 * Обработчик удаления панорамы
 * @param {string} panoramaId - ID панорамы
 */
async function handleDeletePanorama(panoramaId) {
    if (!state.tour || !state.tour.id) return;
    
    try {
        // Показываем индикатор загрузки
        state.loading = true;
        document.getElementById('loader').style.display = 'flex';
        
        // Отправляем запрос на удаление панорамы
        await deletePanorama(state.tour.id, panoramaId);
        
        // Обновляем данные тура
        await loadTourData(state.tour.id);
        
        // Показываем сообщение об успешном удалении
        alert('Панорама успешно удалена!');
        
    } catch (error) {
        console.error('Ошибка при удалении панорамы:', error);
        alert('Ошибка при удалении панорамы');
    } finally {
        // Скрываем индикатор загрузки
        state.loading = false;
        document.getElementById('loader').style.display = 'none';
    }
}

/**
 * Отображение миниатюр панорам
 */
function renderThumbnails() {
    const previewThumbnails = document.getElementById('preview-thumbnails');
    const editorThumbnails = document.getElementById('editor-thumbnails');
    
    // Очищаем контейнеры
    previewThumbnails.innerHTML = '';
    editorThumbnails.innerHTML = '';
    
    if (!state.tour || !state.tour.panoramas || state.tour.panoramas.length === 0) {
        return;
    }
    
    // Отображаем только активные панорамы
    const activePanoramas = state.tour.panoramas.filter(p => p.status === 'active');
    
    activePanoramas.forEach(panorama => {
        const thumbnailUrl = `/api/uploads/${panorama.filename}`;
        
        // Миниатюра для превью
        const previewThumb = document.createElement('div');
        previewThumb.className = 'panorama-thumbnail';
        previewThumb.setAttribute('data-id', panorama.id);
        previewThumb.innerHTML = `
            <img src="${thumbnailUrl}" alt="${panorama.name}">
            <p>${panorama.name}</p>
        `;
        previewThumbnails.appendChild(previewThumb);
        
        // Миниатюра для редактора
        const editorThumb = document.createElement('div');
        editorThumb.className = 'panorama-thumbnail';
        editorThumb.setAttribute('data-id', panorama.id);
        editorThumb.innerHTML = `
            <img src="${thumbnailUrl}" alt="${panorama.name}">
            <p>${panorama.name}</p>
        `;
        editorThumbnails.appendChild(editorThumb);
        
        // Добавляем класс active текущей панораме
        if (panorama.id === state.currentPanoramaId) {
            previewThumb.classList.add('active');
            editorThumb.classList.add('active');
        }
    });
    
    // Добавляем обработчики кликов
    document.querySelectorAll('.panorama-thumbnail').forEach(thumb => {
        thumb.addEventListener('click', function() {
            const panoramaId = this.getAttribute('data-id');
            selectPanorama(panoramaId);
        });
    });
}

/**
 * Отображение хотспотов
 */
function renderHotspots() {
    const hotspotList = document.getElementById('hotspot-list');
    hotspotList.innerHTML = '';
    
    if (!state.tour || !state.tour.hotspots) {
        return;
    }
    
    // Фильтруем хотспоты только для текущей панорамы
    const currentHotspots = state.tour.hotspots.filter(h => h.panoramaId === state.currentPanoramaId);
    
    if (currentHotspots.length === 0) {
        hotspotList.innerHTML = '<div style="text-align: center; padding: 10px;">Нет хотспотов</div>';
        return;
    }
    
    currentHotspots.forEach(hotspot => {
        const item = document.createElement('div');
        item.className = 'hotspot-item';
        item.innerHTML = `
            <span>${hotspot.name}</span>
            <i class="material-icons" data-id="${hotspot.id}">edit</i>
        `;
        hotspotList.appendChild(item);
    });
    
    // Добавляем обработчики для кнопок редактирования хотспотов
    document.querySelectorAll('.hotspot-item i').forEach(btn => {
        btn.addEventListener('click', function() {
            const hotspotId = this.getAttribute('data-id');
            editHotspot(hotspotId);
        });
    });
}

/**
 * Отображение выпадающего списка стартовой панорамы
 */
function renderStartPanoramaOptions() {
    const startPanoramaSelect = document.getElementById('start-panorama-select');
    startPanoramaSelect.innerHTML = '';
    
    if (!state.tour || !state.tour.panoramas || state.tour.panoramas.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Нет доступных панорам';
        startPanoramaSelect.appendChild(option);
        return;
    }
    
    // Отображаем только активные панорамы
    const activePanoramas = state.tour.panoramas.filter(p => p.status === 'active');
    
    activePanoramas.forEach(panorama => {
        const option = document.createElement('option');
        option.value = panorama.id;
        option.textContent = panorama.name;
        startPanoramaSelect.appendChild(option);
    });
    
    // Устанавливаем текущую стартовую панораму
    if (state.tour.settings && state.tour.settings.startPanorama) {
        startPanoramaSelect.value = state.tour.settings.startPanorama;
    }
}

/**
 * Выбор панорамы
 * @param {string} panoramaId - ID панорамы
 */
function selectPanorama(panoramaId) {
    // Обновляем состояние
    state.currentPanoramaId = panoramaId;
    
    // Обновляем активные классы
    document.querySelectorAll('.panorama-thumbnail').forEach(thumb => {
        thumb.classList.toggle('active', thumb.getAttribute('data-id') === panoramaId);
    });
    
    // Перерисовываем хотспоты для выбранной панорамы
    renderHotspots();
    
    // Обновляем Pannellum
    initPannellum();
}

/**
 * Обработка загруженных файлов
 * @param {FileList} files - Список файлов
 */
function handleFiles(files) {
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = '';
    
    // Проверяем, что есть файлы
    if (!files || files.length === 0) {
        return;
    }
    
    // Добавляем файлы в список
    Array.from(files).forEach(file => {
        // Проверяем тип файла (только изображения)
        if (!file.type.startsWith('image/')) {
            return;
        }
        
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        const fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
        
        const fileRemove = document.createElement('div');
        fileRemove.className = 'file-remove';
        fileRemove.innerHTML = '<i class="material-icons">close</i>';
        fileRemove.addEventListener('click', function() {
            fileItem.remove();
        });
        
        fileItem.appendChild(fileName);
        fileItem.appendChild(fileRemove);
        fileList.appendChild(fileItem);
    });
}

/**
 * Загрузка файлов
 */
async function uploadFiles() {
    if (!state.tour || !state.tour.id) {
        alert('Ошибка: ID тура не определен');
        return;
    }
    
    if (!state.selectedFiles || state.selectedFiles.length === 0) {
        alert('Пожалуйста, выберите файлы для загрузки');
        return;
    }
    
    // Показываем индикатор загрузки
    state.loading = true;
    document.getElementById('loader').style.display = 'flex';
    
    try {
        // Загружаем каждый файл по очереди
        for (let i = 0; i < state.selectedFiles.length; i++) {
            const file = state.selectedFiles[i];
            
            // Проверяем, что это изображение
            if (!file.type.startsWith('image/')) {
                continue;
            }
            
            const formData = new FormData();
            formData.append('file', file);
            
            await uploadPanorama(state.tour.id, formData);
        }
        
        // Обновляем данные тура
        await loadTourData(state.tour.id);
        
        // Закрываем модальное окно
        document.getElementById('upload-modal').classList.remove('active');
        
        // Очищаем список файлов
        document.getElementById('file-list').innerHTML = '';
        document.getElementById('file-input').value = '';
        state.selectedFiles = [];
        
        alert('Панорамы успешно загружены!');
    } catch (error) {
        console.error('Ошибка при загрузке файлов:', error);
        alert('Ошибка при загрузке файлов');
    } finally {
        // Скрываем индикатор загрузки
        state.loading = false;
        document.getElementById('loader').style.display = 'none';
    }
}

/**
 * Обновление названия панорамы
 * @param {string} panoramaId - ID панорамы
 * @param {string} newName - Новое название
 */
async function updatePanoramaName(panoramaId, newName) {
    if (!state.tour || !state.tour.id) return;
    
    try {
        // Показываем индикатор загрузки
        state.loading = true;
        document.getElementById('loader').style.display = 'flex';
        
        // Отправляем запрос на обновление панорамы
        await updatePanorama(state.tour.id, panoramaId, { name: newName });
        
        // Обновляем данные тура
        await loadTourData(state.tour.id);
        
        // Показываем сообщение об успешном обновлении
        alert('Название панорамы успешно обновлено!');
    } catch (error) {
        console.error('Ошибка при обновлении названия панорамы:', error);
        alert('Ошибка при обновлении названия панорамы');
    } finally {
        // Скрываем индикатор загрузки
        state.loading = false;
        document.getElementById('loader').style.display = 'none';
    }
}

/**
 * Добавление нового хотспота
 */
async function addHotspot() {
    if (!state.tour || !state.currentPanoramaId) {
        alert('Сначала выберите панораму');
        return;
    }
    
    // Проверяем, есть ли другие активные панорамы для создания перехода
    const activePanoramas = state.tour.panoramas.filter(p => 
        p.status === 'active' && p.id !== state.currentPanoramaId
    );
    
    if (activePanoramas.length === 0) {
        alert('Для создания хотспота нужны как минимум две активные панорамы');
        return;
    }
    
    // Определяем целевую панораму (первую доступную)
    const targetPanoramaId = activePanoramas[0].id;
    
    try {
        // Показываем индикатор загрузки
        state.loading = true;
        document.getElementById('loader').style.display = 'flex';
        
        // Отправляем запрос на создание хотспота
        await createHotspot(state.tour.id, {
            name: `Hotspot #${(state.tour.hotspots?.length || 0) + 1}`,
            panoramaId: state.currentPanoramaId,
            targetPanoramaId: targetPanoramaId,
            position: { x: 0, y: 0, z: 0 }
        });
        
        // Обновляем данные тура
        await loadTourData(state.tour.id);
        
        // Показываем сообщение об успешном создании
        alert('Хотспот успешно создан!');
    } catch (error) {
        console.error('Ошибка при создании хотспота:', error);
        alert('Ошибка при создании хотспота');
    } finally {
        // Скрываем индикатор загрузки
        state.loading = false;
        document.getElementById('loader').style.display = 'none';
    }
}

/**
 * Редактирование хотспота
 * @param {string} hotspotId - ID хотспота
 */
async function editHotspot(hotspotId) {
    if (!state.tour || !state.tour.hotspots) return;
    
    // Находим хотспот
    const hotspot = state.tour.hotspots.find(h => h.id === hotspotId);
    
    if (!hotspot) return;
    
    // В реальном приложении здесь будет открываться модальное окно для редактирования
    const newName = prompt('Введите новое название хотспота:', hotspot.name);
    
    if (!newName) return;
    
    try {
        // Показываем индикатор загрузки
        state.loading = true;
        document.getElementById('loader').style.display = 'flex';
        
        // Отправляем запрос на обновление хотспота
        await updateHotspot(state.tour.id, hotspotId, { name: newName });
        
        // Обновляем данные тура
        await loadTourData(state.tour.id);
        
        // Показываем сообщение об успешном обновлении
        alert('Хотспот успешно обновлен!');
    } catch (error) {
        console.error('Ошибка при обновлении хотспота:', error);
        alert('Ошибка при обновлении хотспота');
    } finally {
        // Скрываем индикатор загрузки
        state.loading = false;
        document.getElementById('loader').style.display = 'none';
    }
}

/**
 * Обновление горизонта (pitch/yaw)
 */
function updateHorizon() {
    const pitch = document.getElementById('pitch-slider').value;
    const yaw = document.getElementById('yaw-slider').value;
    
    // Если есть инициализированный viewer, обновляем значения
    if (window.editorViewer) {
        window.editorViewer.setPitch(parseFloat(pitch));
        window.editorViewer.setYaw(parseFloat(yaw));
    }
}

// API URL
const API_URL = '/api';

/**
 * Базовая функция для отправки запросов к API
 * @param {string} url - URL эндпоинта
 * @param {string} method - HTTP метод (GET, POST, PUT, DELETE)
 * @param {Object} data - Данные для отправки (для POST, PUT)
 * @param {boolean} requiresAuth - Требуется ли авторизация
 * @returns {Promise<Object>} Ответ от API
 */
async function apiRequest(url, method = 'GET', data = null, requiresAuth = true) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    // Добавляем токен авторизации, если требуется
    if (requiresAuth) {
        const token = localStorage.getItem('token');
        if (!token) {
            // Если токена нет, перенаправляем на страницу входа
            window.location.href = '/pages/sing-in.html';
            return;
        }
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const options = {
        method,
        headers
    };
    
    // Добавляем тело запроса для POST и PUT
    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`${API_URL}${url}`, options);
        
        // Проверяем статус ответа
        if (response.status === 401) {
            // Если не авторизован, удаляем токен и перенаправляем на страницу входа
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/pages/sing-in.html';
            return;
        }
        
        const result = await response.json();
        
        if (!response.ok) {
            throw {
                status: response.status,
                error: result.error,
                code: result.code
            };
        }
        
        return result;
    } catch (error) {
        console.error('API error:', error);
        throw error;
    }
}

/**
 * Получение данных пользователя
 * @returns {Promise<Object>} Данные пользователя
 */
async function getCurrentUser() {
    return apiRequest('/auth/me');
}

/**
 * Получение списка туров
 * @param {Object} params - Параметры запроса (поиск, сортировка)
 * @returns {Promise<Array>} Список туров
 */
async function getTours(params = {}) {
    let url = '/tours';
    
    // Добавляем параметры запроса, если они есть
    if (Object.keys(params).length > 0) {
        const queryParams = new URLSearchParams();
        
        if (params.search) {
            queryParams.append('search', params.search);
        }
        
        if (params.sortField && params.sortOrder) {
            queryParams.append('sortField', params.sortField);
            queryParams.append('sortOrder', params.sortOrder);
        }
        
        if (params.page) {
            queryParams.append('page', params.page);
        }
        
        if (params.limit) {
            queryParams.append('limit', params.limit);
        }
        
        url += `?${queryParams.toString()}`;
    }
    
    return apiRequest(url);
}

/**
 * Получение данных конкретного тура
 * @param {string} tourId - ID тура
 * @returns {Promise<Object>} Данные тура
 */
async function getTour(tourId) {
    return apiRequest(`/tours/${tourId}`);
}

/**
 * Создание нового тура
 * @param {Object} tourData - Данные для создания тура
 * @returns {Promise<Object>} Созданный тур
 */
async function createTour(tourData) {
    return apiRequest('/tours', 'POST', tourData);
}

/**
 * Обновление тура
 * @param {string} tourId - ID тура
 * @param {Object} tourData - Данные для обновления
 * @returns {Promise<Object>} Обновленный тур
 */
async function updateTour(tourId, tourData) {
    return apiRequest(`/tours/${tourId}`, 'PUT', tourData);
}

/**
 * Удаление тура
 * @param {string} tourId - ID тура
 * @returns {Promise<Object>} Результат удаления
 */
async function deleteTour(tourId) {
    return apiRequest(`/tours/${tourId}`, 'DELETE');
}

/**
 * Получение панорам для тура
 * @param {string} tourId - ID тура
 * @returns {Promise<Array>} Список панорам
 */
async function getPanoramas(tourId) {
    return apiRequest(`/tours/${tourId}/panoramas`);
}

/**
 * Загрузка новой панорамы
 * @param {string} tourId - ID тура
 * @param {FormData} formData - Данные формы с файлом
 * @returns {Promise<Object>} Созданная панорама
 */
async function uploadPanorama(tourId, formData) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/pages/sing-in.html';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/tours/${tourId}/panoramas`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData // Не устанавливаем Content-Type для формы с файлами
        });
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/pages/sing-in.html';
            return;
        }
        
        const result = await response.json();
        
        if (!response.ok) {
            throw {
                status: response.status,
                error: result.error,
                code: result.code
            };
        }
        
        return result;
    } catch (error) {
        console.error('API error:', error);
        throw error;
    }
}

/**
 * Обновление панорамы
 * @param {string} tourId - ID тура
 * @param {string} panoramaId - ID панорамы
 * @param {Object} data - Данные для обновления
 * @returns {Promise<Object>} Обновленная панорама
 */
async function updatePanorama(tourId, panoramaId, data) {
    return apiRequest(`/tours/${tourId}/panoramas/${panoramaId}`, 'PUT', data);
}

/**
 * Удаление панорамы
 * @param {string} tourId - ID тура
 * @param {string} panoramaId - ID панорамы
 * @returns {Promise<Object>} Результат удаления
 */
async function deletePanorama(tourId, panoramaId) {
    return apiRequest(`/tours/${tourId}/panoramas/${panoramaId}`, 'DELETE');
}

/**
 * Получение хотспотов для тура
 * @param {string} tourId - ID тура
 * @returns {Promise<Array>} Список хотспотов
 */
async function getHotspots(tourId) {
    return apiRequest(`/tours/${tourId}/hotspots`);
}

/**
 * Создание нового хотспота
 * @param {string} tourId - ID тура
 * @param {Object} data - Данные для создания хотспота
 * @returns {Promise<Object>} Созданный хотспот
 */
async function createHotspot(tourId, data) {
    return apiRequest(`/tours/${tourId}/hotspots`, 'POST', data);
}

/**
 * Обновление хотспота
 * @param {string} tourId - ID тура
 * @param {string} hotspotId - ID хотспота
 * @param {Object} data - Данные для обновления
 * @returns {Promise<Object>} Обновленный хотспот
 */
async function updateHotspot(tourId, hotspotId, data) {
    return apiRequest(`/tours/${tourId}/hotspots/${hotspotId}`, 'PUT', data);
}

/**
 * Удаление хотспота
 * @param {string} tourId - ID тура
 * @param {string} hotspotId - ID хотспота
 * @returns {Promise<Object>} Результат удаления
 */
async function deleteHotspot(tourId, hotspotId) {
    return apiRequest(`/tours/${tourId}/hotspots/${hotspotId}`, 'DELETE');
}

// Экспортируем функции для использования в других файлах
export {
    apiRequest,
    getCurrentUser,
    getTours,
    getTour,
    createTour,
    updateTour,
    deleteTour,
    getPanoramas,
    uploadPanorama,
    updatePanorama,
    deletePanorama,
    getHotspots,
    createHotspot,
    updateHotspot,
    deleteHotspot
};