import { getTour, updateTour, getPanoramas, uploadPanorama, deletePanorama, updatePanorama, getHotspots, createHotspot, updateHotspot, deleteHotspot } from '../common/api.js';
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
    
    if (userMenu && dropdownMenu) {
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
    }
    
    // Обработчик кнопки "Сохранить"
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveTour);
    }
    
    // Обработчик кнопки "Превью"
    const viewPreviewBtn = document.getElementById('view-preview-btn');
    if (viewPreviewBtn) {
        viewPreviewBtn.addEventListener('click', function() {
            document.querySelector('.tab[data-tab="preview"]').click();
        });
    }
    
    // Обработчик кнопки "Поделиться"
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', shareTour);
    }
    
    const editorShareBtn = document.getElementById('editor-share-btn');
    if (editorShareBtn) {
        editorShareBtn.addEventListener('click', shareTour);
    }
    
    // Обработчик кнопки "Загрузить панорамы"
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', function() {
            const uploadModal = document.getElementById('upload-modal');
            if (uploadModal) {
                uploadModal.classList.add('active');
            }
        });
    }
    
    // Обработчики для модального окна загрузки
    const uploadModalClose = document.getElementById('upload-modal-close');
    if (uploadModalClose) {
        uploadModalClose.addEventListener('click', function() {
            const uploadModal = document.getElementById('upload-modal');
            if (uploadModal) {
                uploadModal.classList.remove('active');
            }
        });
    }
    
    const cancelUpload = document.getElementById('cancel-upload');
    if (cancelUpload) {
        cancelUpload.addEventListener('click', function() {
            const uploadModal = document.getElementById('upload-modal');
            if (uploadModal) {
                uploadModal.classList.remove('active');
            }
        });
    }
    
    // Закрытие модального окна при клике вне его
    window.addEventListener('click', function(event) {
        const uploadModal = document.getElementById('upload-modal');
        if (event.target === uploadModal) {
            uploadModal.classList.remove('active');
        }
    });
    
    // Обработка загрузки файлов
    const fileInput = document.getElementById('file-input');
    const fileSelectBtn = document.getElementById('file-select-btn');
    const dropArea = document.getElementById('drop-area');
    
    if (fileInput && fileSelectBtn) {
        fileSelectBtn.addEventListener('click', function() {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', function() {
            state.selectedFiles = this.files;
            handleFiles(this.files);
        });
    }
    
    if (dropArea) {
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
    }
    
    // Обработчик кнопки загрузки файлов
    const submitUpload = document.getElementById('submit-upload');
    if (submitUpload) {
        submitUpload.addEventListener('click', uploadFiles);
    }
    
    // Обработчики для слайдеров горизонта
    const pitchSlider = document.getElementById('pitch-slider');
    if (pitchSlider) {
        pitchSlider.addEventListener('input', updateHorizon);
    }
    
    const yawSlider = document.getElementById('yaw-slider');
    if (yawSlider) {
        yawSlider.addEventListener('input', updateHorizon);
    }
    
    // Обработчик кнопки сброса горизонта
    const resetHorizon = document.getElementById('reset-horizon');
    if (resetHorizon) {
        resetHorizon.addEventListener('click', resetHorizonValues);
    }
    
    // Обработчик выбора логотипа
    const logoSelect = document.getElementById('logo-select');
    if (logoSelect) {
        logoSelect.addEventListener('change', function() {
            saveTourSettings();
        });
    }
    
    // Обработчик выбора стартовой панорамы
    const startPanoramaSelect = document.getElementById('start-panorama-select');
    if (startPanoramaSelect) {
        startPanoramaSelect.addEventListener('change', function() {
            saveTourSettings();
        });
    }
    
    // Обработчик кнопки добавления хотспота
    const addHotspotBtn = document.querySelector('.add-hotspot-btn');
    if (addHotspotBtn) {
        addHotspotBtn.addEventListener('click', addHotspot);
    }
}

/**
 * Загрузка данных тура
 * @param {string} tourId - ID тура
 */
async function loadTourData(tourId) {
    try {
        // Показываем индикатор загрузки
        state.loading = true;
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'flex';
        }
        
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
        if (loader) {
            loader.style.display = 'none';
        }
    } catch (error) {
        console.error('Ошибка при загрузке данных тура:', error);
        alert('Ошибка при загрузке данных тура: ' + (error.message || 'Неизвестная ошибка'));
        
        // Скрываем индикатор загрузки
        state.loading = false;
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

/**
 * Отображение данных тура в интерфейсе
 */
function renderTourData() {
    if (!state.tour) return;
    
    // Заголовок тура
    const tourTitle = document.getElementById('tour-title');
    if (tourTitle) {
        tourTitle.textContent = state.tour.name;
    }
    
    // Настройки
    const logoSelect = document.getElementById('logo-select');
    if (logoSelect && state.tour.settings) {
        logoSelect.value = state.tour.settings.logo || 'standard';
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
    const panoramaViewer = document.getElementById('panorama-viewer');
    if (panoramaViewer && typeof pannellum !== 'undefined') {
        // Используем локальный фон для превью
        pannellum.viewer('panorama-viewer', {
            type: 'equirectangular',
            panorama: panoramaUrl,
            autoLoad: true,
            title: panorama.name,
            hotSpots: getHotspotsForViewer(),
            hfov: 110
        });
    }
    
    // Инициализируем Pannellum для редактора
    const editorViewer = document.getElementById('editor-viewer');
    if (editorViewer && typeof pannellum !== 'undefined') {
        // Используем локальный фон для превью
        pannellum.viewer('editor-viewer', {
            type: 'equirectangular',
            panorama: panoramaUrl,
            autoLoad: true,
            title: panorama.name,
            hotSpots: getHotspotsForViewer(),
            hfov: 100,
            mouseZoom: false
        });
    }
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
    if (!panoramasGrid) return;
    
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
                <div class="panorama-actions">
                    <button class="rename-btn" data-id="${panorama.id}">Переименовать</button>
                    <button class="delete-btn" data-id="${panorama.id}">Удалить</button>
                </div>
            </div>
        `;
        panoramasGrid.appendChild(card);
    });
    
    // Добавляем обработчики для кнопок редактирования
    document.querySelectorAll('.rename-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const panoramaId = this.getAttribute('data-id');
            const panorama = state.tour.panoramas.find(p => p.id === panoramaId);
            if (panorama) {
                const newName = prompt('Введите новое имя панорамы:', panorama.name);
                if (newName && newName.trim()) {
                    updatePanoramaName(panoramaId, newName.trim());
                }
            }
        });
    });
    
    // Добавляем обработчики для кнопок удаления
    document.querySelectorAll('.delete-btn').forEach(btn => {
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
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'flex';
        }
        
        // Отправляем запрос на удаление панорамы
        await deletePanorama(state.tour.id, panoramaId);
        
        // Обновляем данные тура
        await loadTourData(state.tour.id);
        
        // Показываем сообщение об успешном удалении
        alert('Панорама успешно удалена!');
        
    } catch (error) {
        console.error('Ошибка при удалении панорамы:', error);
        alert('Ошибка при удалении панорамы: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
        // Скрываем индикатор загрузки
        state.loading = false;
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

/**
 * Отображение миниатюр панорам
 */
function renderThumbnails() {
    const previewThumbnails = document.getElementById('preview-thumbnails');
    const editorThumbnails = document.getElementById('editor-thumbnails');
    
    // Очищаем контейнеры
    if (previewThumbnails) previewThumbnails.innerHTML = '';
    if (editorThumbnails) editorThumbnails.innerHTML = '';
    
    if (!state.tour || !state.tour.panoramas || state.tour.panoramas.length === 0) {
        return;
    }
    
    // Отображаем только активные панорамы
    const activePanoramas = state.tour.panoramas.filter(p => p.status === 'active');
    
    activePanoramas.forEach(panorama => {
        const thumbnailUrl = `/api/uploads/${panorama.filename}`;
        
        // Миниатюра для превью
        if (previewThumbnails) {
            const previewThumb = document.createElement('div');
            previewThumb.className = 'panorama-thumbnail';
            previewThumb.setAttribute('data-id', panorama.id);
            previewThumb.innerHTML = `
                <img src="${thumbnailUrl}" alt="${panorama.name}" onerror="this.src='/assets/img/placeholder.jpg'">
                <p>${panorama.name}</p>
            `;
            previewThumbnails.appendChild(previewThumb);
            
            // Добавляем класс active текущей панораме
            if (panorama.id === state.currentPanoramaId) {
                previewThumb.classList.add('active');
            }
            
            // Добавляем обработчик клика
            previewThumb.addEventListener('click', function() {
                selectPanorama(panorama.id);
            });
        }
        
        // Миниатюра для редактора
        if (editorThumbnails) {
            const editorThumb = document.createElement('div');
            editorThumb.className = 'panorama-thumbnail';
            editorThumb.setAttribute('data-id', panorama.id);
            editorThumb.innerHTML = `
                <img src="${thumbnailUrl}" alt="${panorama.name}" onerror="this.src='/assets/img/placeholder.jpg'">
                <p>${panorama.name}</p>
            `;
            editorThumbnails.appendChild(editorThumb);
            
            // Добавляем класс active текущей панораме
            if (panorama.id === state.currentPanoramaId) {
                editorThumb.classList.add('active');
            }
            
            // Добавляем обработчик клика
            editorThumb.addEventListener('click', function() {
                selectPanorama(panorama.id);
            });
        }
    });
}

/**
 * Отображение хотспотов
 */
function renderHotspots() {
    const hotspotList = document.getElementById('hotspot-list');
    if (!hotspotList) return;
    
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
        // Найдем целевую панораму для отображения имени
        let targetPanoramaName = 'Не задано';
        if (hotspot.targetPanoramaId && state.tour.panoramas) {
            const targetPanorama = state.tour.panoramas.find(p => p.id === hotspot.targetPanoramaId);
            if (targetPanorama) {
                targetPanoramaName = targetPanorama.name;
            }
        }
        
        const item = document.createElement('div');
        item.className = 'hotspot-item';
        item.innerHTML = `
            <div class="hotspot-info">
                <div class="hotspot-name">${hotspot.name}</div>
                <div class="hotspot-target">Переход на: ${targetPanoramaName}</div>
            </div>
            <div class="hotspot-actions">
                <button class="edit-hotspot-btn" data-id="${hotspot.id}">
                    <i class="material-icons">edit</i>
                </button>
                <button class="delete-hotspot-btn" data-id="${hotspot.id}">
                    <i class="material-icons">delete</i>
                </button>
            </div>
        `;
        hotspotList.appendChild(item);
    });
    
    // Добавляем обработчики для кнопок редактирования хотспотов
    document.querySelectorAll('.edit-hotspot-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const hotspotId = this.getAttribute('data-id');
            editHotspot(hotspotId);
        });
    });
    
    // Добавляем обработчики для кнопок удаления хотспотов
    document.querySelectorAll('.delete-hotspot-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const hotspotId = this.getAttribute('data-id');
            if (confirm('Вы уверены, что хотите удалить этот хотспот?')) {
                deleteHotspotHandler(hotspotId);
            }
        });
    });
}

/**
 * Отображение выпадающего списка стартовой панорамы
 */
function renderStartPanoramaOptions() {
    const startPanoramaSelect = document.getElementById('start-panorama-select');
    if (!startPanoramaSelect) return;
    
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
    if (panoramaId === state.currentPanoramaId) return;
    
    // Обновляем состояние
    state.currentPanoramaId = panoramaId;
    
    // Обновляем активную миниатюру
    const thumbnails = document.querySelectorAll('.panorama-thumbnail');
    thumbnails.forEach(thumb => {
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
    if (!fileList) return;
    
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
        
        const fileSize = document.createElement('div');
        fileSize.className = 'file-size';
        fileSize.textContent = formatFileSize(file.size);
        
        const fileRemove = document.createElement('div');
        fileRemove.className = 'file-remove';
        fileRemove.innerHTML = '<i class="material-icons">close</i>';
        fileRemove.addEventListener('click', function() {
            fileItem.remove();
        });
        
        fileItem.appendChild(fileName);
        fileItem.appendChild(fileSize);
        fileItem.appendChild(fileRemove);
        fileList.appendChild(fileItem);
    });
}

/**
 * Форматирование размера файла
 * @param {number} bytes - Размер в байтах
 * @returns {string} Отформатированный размер
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Байт';
    const k = 1024;
    const sizes = ['Байт', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.display = 'flex';
    }
    
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
        const uploadModal = document.getElementById('upload-modal');
        if (uploadModal) {
            uploadModal.classList.remove('active');
        }
        
        // Очищаем список файлов
        const fileList = document.getElementById('file-list');
        if (fileList) {
            fileList.innerHTML = '';
        }
        
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.value = '';
        }
        
        state.selectedFiles = [];
        
        alert('Панорамы успешно загружены!');
    } catch (error) {
        console.error('Ошибка при загрузке файлов:', error);
        alert('Ошибка при загрузке файлов: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
        // Скрываем индикатор загрузки
        state.loading = false;
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'none';
        }
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
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'flex';
        }
        
        // Отправляем запрос на обновление панорамы
        await updatePanorama(state.tour.id, panoramaId, { name: newName });
        
        // Обновляем данные тура
        await loadTourData(state.tour.id);
        
        // Показываем сообщение об успешном обновлении
        alert('Название панорамы успешно обновлено!');
    } catch (error) {
        console.error('Ошибка при обновлении названия панорамы:', error);
        alert('Ошибка при обновлении названия панорамы: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
        // Скрываем индикатор загрузки
        state.loading = false;
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'none';
        }
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
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'flex';
        }
        
        // Отправляем запрос на создание хотспота
        await createHotspot(state.tour.id, {
            name: `Хотспот ${(state.tour.hotspots?.length || 0) + 1}`,
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
        alert('Ошибка при создании хотспота: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
        // Скрываем индикатор загрузки
        state.loading = false;
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'none';
        }
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
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'flex';
        }
        
        // Отправляем запрос на обновление хотспота
        await updateHotspot(state.tour.id, hotspotId, { name: newName });
        
        // Обновляем данные тура
        await loadTourData(state.tour.id);
        
        // Показываем сообщение об успешном обновлении
        alert('Хотспот успешно обновлен!');
    } catch (error) {
        console.error('Ошибка при обновлении хотспота:', error);
        alert('Ошибка при обновлении хотспота: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
        // Скрываем индикатор загрузки
        state.loading = false;
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

/**
 * Удаление хотспота
 * @param {string} hotspotId - ID хотспота
 */
async function deleteHotspotHandler(hotspotId) {
    if (!state.tour || !state.tour.id) return;
    
    try {
        // Показываем индикатор загрузки
        state.loading = true;
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'flex';
        }
        
        // Отправляем запрос на удаление хотспота
        await deleteHotspot(state.tour.id, hotspotId);
        
        // Обновляем данные тура
        await loadTourData(state.tour.id);
        
        // Показываем сообщение об успешном удалении
        alert('Хотспот успешно удален!');
    } catch (error) {
        console.error('Ошибка при удалении хотспота:', error);
        alert('Ошибка при удалении хотспота: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
        // Скрываем индикатор загрузки
        state.loading = false;
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

/**
 * Обновление горизонта (pitch/yaw)
 */
function updateHorizon() {
    const pitch = document.getElementById('pitch-slider');
    const yaw = document.getElementById('yaw-slider');
    
    if (!pitch || !yaw) return;
    
    // Если есть инициализированный viewer, обновляем значения
    if (window.viewer) {
        window.viewer.setPitch(parseFloat(pitch.value));
        window.viewer.setYaw(parseFloat(yaw.value));
    }
}

/**
 * Сброс значений горизонта
 */
function resetHorizonValues() {
    const pitch = document.getElementById('pitch-slider');
    const yaw = document.getElementById('yaw-slider');
    
    if (!pitch || !yaw) return;
    
    pitch.value = 0;
    yaw.value = 0;
    
    updateHorizon();
}

/**
 * Сохранение настроек тура
 */
async function saveTourSettings() {
    if (!state.tour || !state.tour.id) return;
    
    const logoSelect = document.getElementById('logo-select');
    const startPanoramaSelect = document.getElementById('start-panorama-select');
    
    if (!logoSelect || !startPanoramaSelect) return;
    
    const settings = {
        logo: logoSelect.value,
        startPanorama: startPanoramaSelect.value
    };
    
    try {
        // Показываем индикатор загрузки
        state.loading = true;
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'flex';
        }
        
        // Отправляем запрос на обновление тура
        await updateTour(state.tour.id, { settings });
        
        // Обновляем данные тура
        await loadTourData(state.tour.id);
        
        // Показываем сообщение об успешном сохранении
        alert('Настройки тура успешно сохранены!');
    } catch (error) {
        console.error('Ошибка при сохранении настроек тура:', error);
        alert('Ошибка при сохранении настроек тура: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
        // Скрываем индикатор загрузки
        state.loading = false;
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

/**
 * Сохранение тура
 */
async function saveTour() {
    if (!state.tour || !state.tour.id) return;
    
    const settings = {};
    
    // Получаем настройки из полей формы
    const logoSelect = document.getElementById('logo-select');
    if (logoSelect) {
        settings.logo = logoSelect.value;
    }
    
    const startPanoramaSelect = document.getElementById('start-panorama-select');
    if (startPanoramaSelect) {
        settings.startPanorama = startPanoramaSelect.value;
    }
    
    try {
        // Показываем индикатор загрузки
        state.loading = true;
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'flex';
        }
        
        // Отправляем запрос на обновление тура
        await updateTour(state.tour.id, { settings });
        
        // Обновляем данные тура
        await loadTourData(state.tour.id);
        
        // Показываем сообщение об успешном сохранении
        alert('Тур успешно сохранен!');
    } catch (error) {
        console.error('Ошибка при сохранении тура:', error);
        alert('Ошибка при сохранении тура: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
        // Скрываем индикатор загрузки
        state.loading = false;
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

/**
 * Поделиться туром
 */
function shareTour() {
    if (!state.tour) return;
    
    // Формируем URL для просмотра тура
    const shareUrl = `/pages/view.html?id=${state.tour.id}`;
    
    // Показываем модальное окно с ссылкой для шаринга
    alert(`Скопируйте ссылку для шаринга тура: ${window.location.origin}${shareUrl}`);
    
    // В будущем можно использовать Web Share API, если он доступен
    if (navigator.share) {
        navigator.share({
            title: state.tour.name,
            text: 'Виртуальный тур',
            url: `${window.location.origin}${shareUrl}`
        }).catch(console.error);
    } else {
        // Копируем ссылку в буфер обмена
        try {
            navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`);
            alert('Ссылка скопирована в буфер обмена!');
        } catch (error) {
            console.error('Ошибка при копировании в буфер обмена:', error);
        }
    }
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