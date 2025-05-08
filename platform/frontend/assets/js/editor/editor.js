import { getTour, updateTour } from '../common/api.js';
import { isAuthenticated } from '../common/auth.js';

// Состояние редактора
const state = {
    tour: null,
    currentPanoramaId: null,
    loading: false
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
        
        // Имитация запроса к API (в будущем будет заменено на реальный запрос)
        setTimeout(() => {
            // Временные данные
            const tourData = {
                id: tourId,
                name: 'Квартира на Ленинском',
                objectType: 'apartment',
                description: 'Просторная квартира в новостройке',
                createdAt: '2025-05-02',
                status: 'ready',
                panoramas: [
                    { id: '1', name: 'Гостиная', uploadedAt: '2025-05-01', status: 'active' },
                    { id: '2', name: 'Кухня', uploadedAt: '2025-05-01', status: 'active' },
                    { id: '3', name: 'Спальня', uploadedAt: '2025-05-01', status: 'active' },
                    { id: '4', name: 'Ванная', uploadedAt: '2025-05-01', status: 'active' },
                    { id: '5', name: 'Балкон', uploadedAt: '2025-05-02', status: 'inactive' }
                ],
                settings: {
                    logo: 'standard',
                    startPanorama: '1'
                },
                hotspots: [
                    { id: '1', panoramaId: '1', name: 'Hotspot #1', target: '2' },
                    { id: '2', panoramaId: '1', name: 'Hotspot #2', target: '3' }
                ]
            };
            
            // Обновляем состояние
            state.tour = tourData;
            state.currentPanoramaId = tourData.settings.startPanorama;
            
            // Отображаем данные тура
            renderTourData();
            
            // Скрываем индикатор загрузки
            state.loading = false;
            document.getElementById('loader').style.display = 'none';
        }, 1000);
        
        // В будущем этот код будет заменен на реальный запрос
        /*
        const tourData = await getTour(tourId);
        
        // Обновляем состояние
        state.tour = tourData;
        state.currentPanoramaId = tourData.settings.startPanorama;
        
        // Отображаем данные тура
        renderTourData();
        
        // Скрываем индикатор загрузки
        state.loading = false;
        document.getElementById('loader').style.display = 'none';
        */
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
    document.getElementById('logo-select').value = state.tour.settings.logo;
    
    // Рендерим панорамы
    renderPanoramas();
    
    // Рендерим миниатюры
    renderThumbnails();
    
    // Рендерим хотспоты
    renderHotspots();
    
    // Рендерим выпадающий список стартовой панорамы
    renderStartPanoramaOptions();
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
        
        const card = document.createElement('div');
        card.className = 'panorama-card';
        card.innerHTML = `
            <div class="panorama-preview" style="background-image: url('https://via.placeholder.com/300x150');"></div>
            <div class="panorama-info">
                <div class="panorama-name">${panorama.name}</div>
                <div class="panorama-details">Загружено: ${formatDate(panorama.uploadedAt)}</div>
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
                deletePanorama(panoramaId);
            }
        });
    });
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
        // Миниатюра для превью
        const previewThumb = document.createElement('div');
        previewThumb.className = 'panorama-thumbnail';
        previewThumb.setAttribute('data-id', panorama.id);
        previewThumb.innerHTML = `
            <img src="https://via.placeholder.com/100x50" alt="${panorama.name}">
            <p>${panorama.name}</p>
        `;
        previewThumbnails.appendChild(previewThumb);
        
        // Миниатюра для редактора
        const editorThumb = document.createElement('div');
        editorThumb.className = 'panorama-thumbnail';
        editorThumb.setAttribute('data-id', panorama.id);
        editorThumb.innerHTML = `
            <img src="https://via.placeholder.com/100x50" alt="${panorama.name}">
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
    const fileInput = document.getElementById('file-input');
    
    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Пожалуйста, выберите файлы для загрузки');
        return;
    }
    
    // Показываем индикатор загрузки
    state.loading = true;
    document.getElementById('loader').style.display = 'flex';
    
    try {
        // Имитация загрузки
        setTimeout(() => {
            // Скрываем индикатор загрузки
            state.loading = false;
            document.getElementById('loader').style.display = 'none';
            
            // Закрываем модальное окно
            document.getElementById('upload-modal').classList.remove('active');
            
            // Очищаем список файлов
            document.getElementById('file-list').innerHTML = '';
            fileInput.value = '';
            
            // Имитируем добавление новых панорам
            const newPanoramas = Array.from(fileInput.files).map((file, index) => {
                return {
                    id: `new-${Date.now()}-${index}`,
                    name: file.name.split('.')[0],
                    uploadedAt: new Date().toISOString(),
                    status: 'active'
                };
            });
            
            // Добавляем новые панорамы в состояние
            if (!state.tour.panoramas) {
                state.tour.panoramas = [];
            }
            state.tour.panoramas = [...state.tour.panoramas, ...newPanoramas];
            
            // Если это первые панорамы, устанавливаем стартовую
            if (state.tour.panoramas.length === newPanoramas.length) {
                state.tour.settings.startPanorama = newPanoramas[0].id;
                state.currentPanoramaId = newPanoramas[0].id;
            }
            
            // Обновляем интерфейс
            renderTourData();
            
            alert('Панорамы успешно загружены!');
        }, 2000);
        
        // В будущем этот код будет заменен на реальный запрос
        /*
        // Для каждого файла создаем FormData и отправляем запрос
        for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            const formData = new FormData();
            formData.append('file', file);
            
            await uploadPanorama(state.tour.id, formData);
        }
        
        // Обновляем данные тура
        await loadTourData(state.tour.id);
        
        // Скрываем индикатор загрузки
        state.loading = false;
        document.getElementById('loader').style.display = 'none';
        
        // Закрываем модальное окно
        document.getElementById('upload-modal').classList.remove('active');
        
        // Очищаем список файлов
        document.getElementById('file-list').innerHTML = '';
        fileInput.value = '';
        */
    } catch (error) {
        console.error('Ошибка при загрузке файлов:', error);
        alert('Ошибка при загрузке файлов');
        
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
function updatePanoramaName(panoramaId, newName) {
    if (!state.tour || !state.tour.panoramas) return;
    
    // Находим индекс панорамы
    const panoramaIndex = state.tour.panoramas.findIndex(p => p.id === panoramaId);
    
    if (panoramaIndex === -1) return;
    
    // Обновляем название
    state.tour.panoramas[panoramaIndex].name = newName;
    
    // Обновляем интерфейс
    renderTourData();
    
    // В будущем здесь будет запрос к API
    // await updatePanorama(state.tour.id, panoramaId, { name: newName });
}

/**
 * Удаление панорамы
 * @param {string} panoramaId - ID панорамы
 */
function deletePanorama(panoramaId) {
    if (!state.tour || !state.tour.panoramas) return;
    
    // Находим индекс панорамы
    const panoramaIndex = state.tour.panoramas.findIndex(p => p.id === panoramaId);
    
    if (panoramaIndex === -1) return;
    
    // Удаляем панораму
    state.tour.panoramas.splice(panoramaIndex, 1);
    
    // Если это была стартовая панорама, обновляем настройки
    if (state.tour.settings.startPanorama === panoramaId) {
        state.tour.settings.startPanorama = state.tour.panoramas.length > 0 
            ? state.tour.panoramas[0].id 
            : null;
    }
    
    // Если это была текущая панорама, выбираем другую
    if (state.currentPanoramaId === panoramaId) {
        state.currentPanoramaId = state.tour.settings.startPanorama;
    }
    
    // Обновляем интерфейс
    renderTourData();
    
    // В будущем здесь будет запрос к API
    // await deletePanorama(state.tour.id, panoramaId);
}

/**
 * Добавление нового хотспота
 */
function addHotspot() {
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
    
    // Создаем новый хотспот
    const newHotspot = {
        id: `hotspot-${Date.now()}`,
        panoramaId: state.currentPanoramaId,
        name: `Hotspot #${(state.tour.hotspots?.length || 0) + 1}`,
        target: targetPanoramaId
    };
    
    // Добавляем хотспот в состояние
    if (!state.tour.hotspots) {
        state.tour.hotspots = [];
    }
    state.tour.hotspots.push(newHotspot);
    
    // Обновляем интерфейс
    renderHotspots();
}

/**
 * Редактирование хотспота
 * @param {string} hotspotId - ID хотспота
 */
function editHotspot(hotspotId) {
    if (!state.tour || !state.tour.hotspots) return;
    
    // Находим хотспот
    const hotspot = state.tour.hotspots.find(h => h.id === hotspotId);
    
    if (!hotspot) return;
    
    // В реальном приложении здесь будет открываться модальное окно для редактирования
    const newName = prompt('Введите новое название хотспота:', hotspot.name);
    
    if (!newName) return;
    
    // Обновляем название
    hotspot.name = newName;
    
    // Обновляем интерфейс
    renderHotspots();
}

/**
 * Обновление горизонта (pitch/yaw)
 */
function updateHorizon() {
    const pitch = document.getElementById('pitch-slider').value;
    const yaw = document.getElementById('yaw-slider').value;
    
    // В реальном приложении здесь будет обновление положения 3D-просмотра
    console.log('Horizon updated:', { pitch, yaw });
}

/**
 * Сброс горизонта
 */
function resetHorizon() {
    document.getElementById('pitch-slider').value = 0;
    document.getElementById('yaw-slider').value = 0;
    
    updateHorizon();
}

/**
 * Сохранение настроек тура
 */
function saveTourSettings() {
    if (!state.tour) return;
    
    // Получаем значения из интерфейса
    const logo = document.getElementById('logo-select').value;
    const startPanorama = document.getElementById('start-panorama-select').value;
    
    // Обновляем настройки в состоянии
    state.tour.settings.logo = logo;
    state.tour.settings.startPanorama = startPanorama;
    
    // В будущем здесь будет запрос к API
    // await updateTour(state.tour.id, { settings: state.tour.settings });
}

/**
 * Сохранение тура
 */
async function saveTour() {
    if (!state.tour) return;
    
    try {
        // Показываем индикатор загрузки
        state.loading = true;
        document.getElementById('loader').style.display = 'flex';
        
        // Имитация запроса
        setTimeout(() => {
            // Скрываем индикатор загрузки
            state.loading = false;
            document.getElementById('loader').style.display = 'none';
            
            alert('Тур успешно сохранен!');
        }, 1000);
        
        // В будущем этот код будет заменен на реальный запрос
        /*
        await updateTour(state.tour.id, state.tour);
        
        // Скрываем индикатор загрузки
        state.loading = false;
        document.getElementById('loader').style.display = 'none';
        
        alert('Тур успешно сохранен!');
        */
    } catch (error) {
        console.error('Ошибка при сохранении тура:', error);
        alert('Ошибка при сохранении тура');
        
        // Скрываем индикатор загрузки
        state.loading = false;
        document.getElementById('loader').style.display = 'none';
    }
}

/**
 * Функция для поделиться туром
 */
function shareTour() {
    if (!state.tour) return;
    
    // Создаем URL для публичного доступа
    const publicUrl = `${window.location.origin}/view.html?id=${state.tour.id}`;
    
    // Копируем URL в буфер обмена
    navigator.clipboard.writeText(publicUrl)
        .then(() => {
            alert('Ссылка на тур скопирована в буфер обмена');
        })
        .catch(err => {
            console.error('Ошибка при копировании ссылки:', err);
            alert(`Ссылка на тур: ${publicUrl}`);
        });
}

/**
 * Форматирование даты
 * @param {string} dateString - Строка с датой в формате ISO
 * @returns {string} Отформатированная дата (ДД.ММ.ГГГГ)
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}