import { getTours, createTour, deleteTour } from '../common/api.js';
import { isAuthenticated } from '../common/auth.js';

// Состояние приложения
const state = {
    tours: [],
    currentPage: 1,
    totalPages: 1,
    view: 'tile', // 'tile' или 'list'
    search: '',
    sort: 'date-desc' // По умолчанию сортировка по дате (новые сверху)
};

// Инициализация страницы
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем авторизацию
    if (!isAuthenticated()) return;
    
    // Загружаем список туров
    loadTours();
    
    // Инициализируем обработчики событий
    initEventListeners();
});

/**
 * Инициализация обработчиков событий
 */
function initEventListeners() {
    // Переключение между видами
    const tileViewBtn = document.getElementById('tile-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    
    tileViewBtn.addEventListener('click', () => switchView('tile'));
    listViewBtn.addEventListener('click', () => switchView('list'));
    
    // Поиск
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', debounce(function() {
        state.search = this.value;
        state.currentPage = 1; // Сбрасываем на первую страницу при поиске
        loadTours();
    }, 500));
    
    // Сортировка
    const sortSelect = document.getElementById('sort-select');
    sortSelect.addEventListener('change', function() {
        state.sort = this.value;
        loadTours();
    });
    
    // Создание тура
    const createTourBtn = document.getElementById('create-tour-btn');
    const createTourModal = document.getElementById('create-tour-modal');
    const modalCloseElements = document.querySelectorAll('.modal-close, .modal-close-btn');
    
    createTourBtn.addEventListener('click', () => {
        createTourModal.classList.add('active');
    });
    
    modalCloseElements.forEach(element => {
        element.addEventListener('click', () => {
            createTourModal.classList.remove('active');
        });
    });
    
    // Закрытие модального окна при клике вне его
    window.addEventListener('click', function(event) {
        if (event.target === createTourModal) {
            createTourModal.classList.remove('active');
        }
    });
    
    // Отправка формы создания тура
    const createTourSubmitBtn = document.getElementById('create-tour-submit');
    createTourSubmitBtn.addEventListener('click', handleCreateTour);
    
    // Пагинация
    const pagination = document.getElementById('pagination');
    pagination.addEventListener('click', function(event) {
        const pageBtn = event.target.closest('.page-btn');
        if (!pageBtn) return;
        
        const page = pageBtn.dataset.page;
        if (page) {
            state.currentPage = parseInt(page);
            loadTours();
        }
    });
}

/**
 * Загрузка списка туров
 */
async function loadTours() {
    try {
        // Показываем прелоадер
        const loader = document.getElementById('loader');
        loader.style.display = 'block';
        
        // Скрываем контейнеры с турами
        document.getElementById('tile-view').style.display = 'none';
        document.getElementById('list-view').style.display = 'none';
        
        // Формируем параметры запроса
        const params = {
            page: state.currentPage,
            limit: 12
        };
        
        if (state.search) {
            params.search = state.search;
        }
        
        if (state.sort) {
            // Маппинг значений сортировки с фронтенда на значения бэкенда
            const sortMapping = {
                'date-desc': { field: 'createdAt', order: 'desc' },
                'date-asc': { field: 'createdAt', order: 'asc' },
                'name-asc': { field: 'name', order: 'asc' },
                'name-desc': { field: 'name', order: 'desc' }
            };
            
            const sortInfo = sortMapping[state.sort] || { field: 'createdAt', order: 'desc' };
            params.sortField = sortInfo.field;
            params.sortOrder = sortInfo.order;
        }
        
        // Получаем список туров от API
        const result = await getTours(params);
        
        // Обновляем состояние
        state.tours = result.tours;
        state.totalPages = result.pagination.totalPages;
        
        // Отображаем туры
        renderTours();
        
        // Отображаем пагинацию
        renderPagination();
        
        // Скрываем прелоадер
        loader.style.display = 'none';
        
        // Показываем контейнер в зависимости от выбранного вида
        if (state.view === 'tile') {
            document.getElementById('tile-view').style.display = 'grid';
        } else {
            document.getElementById('list-view').style.display = 'block';
        }
    } catch (error) {
        console.error('Ошибка при загрузке туров:', error);
        
        // Скрываем прелоадер
        document.getElementById('loader').style.display = 'none';
        
        // Показываем сообщение об ошибке
        alert('Произошла ошибка при загрузке туров. Пожалуйста, попробуйте позже.');
    }
}

/**
 * Отображение туров в интерфейсе
 */
function renderTours() {
    const tileViewContainer = document.getElementById('tile-view');
    const listTableBody = document.getElementById('list-table-body');
    
    // Очищаем контейнеры
    tileViewContainer.innerHTML = '';
    listTableBody.innerHTML = '';
    
    // Если туров нет, показываем сообщение
    if (state.tours.length === 0) {
        tileViewContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 30px;">Туров не найдено</div>';
        listTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px;">Туров не найдено</td></tr>';
        return;
    }
    
    // Маппинг типов объектов
    const objectTypeMap = {
        'apartment': 'Квартира',
        'house': 'Дом',
        'office': 'Офис',
        'commercial': 'Коммерческое помещение'
    };
    
    // Маппинг статусов
    const statusMap = {
        'draft': 'Черновик',
        'ready': 'Готов',
        'published': 'Опубликован'
    };
    
    // Маппинг классов статусов
    const statusClassMap = {
        'draft': 'status-draft',
        'ready': 'status-ready',
        'published': 'status-published'
    };
    
    // Отображаем каждый тур
    state.tours.forEach(tour => {
        // Создаем элемент для плиточного вида
        const card = document.createElement('div');
        card.className = 'tour-card';
        card.innerHTML = `
            <div class="card-image" style="background-image: url('https://via.placeholder.com/300x160');"></div>
            <div class="card-content">
                <div class="card-title">${tour.name}</div>
                <div class="card-status ${statusClassMap[tour.status]}">${statusMap[tour.status]}</div>
                <div class="card-actions">
                    <div class="action-btn edit-btn" data-id="${tour.id}">
                        <i class="fas fa-pencil-alt"></i>
                    </div>
                    <div class="action-btn delete-btn" data-id="${tour.id}">
                        <i class="fas fa-trash"></i>
                    </div>
                </div>
            </div>
        `;
        tileViewContainer.appendChild(card);
        
        // Создаем строку для табличного вида
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${tour.name}</td>
            <td>${objectTypeMap[tour.objectType]}</td>
            <td>${formatDate(tour.createdAt)}</td>
            <td><span class="card-status ${statusClassMap[tour.status]}">${statusMap[tour.status]}</span></td>
            <td>
                <div class="card-actions">
                    <div class="action-btn edit-btn" data-id="${tour.id}">
                        <i class="fas fa-pencil-alt"></i>
                    </div>
                    <div class="action-btn delete-btn" data-id="${tour.id}">
                        <i class="fas fa-trash"></i>
                    </div>
                </div>
            </td>
        `;
        listTableBody.appendChild(row);
    });
    
    // Добавляем обработчики для кнопок редактирования
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tourId = this.getAttribute('data-id');
            window.location.href = `/pages/edit.html?id=${tourId}`;
        });
    });
    
    // Добавляем обработчики для кнопок удаления
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tourId = this.getAttribute('data-id');
            if (confirm('Вы уверены, что хотите удалить этот тур?')) {
                handleDeleteTour(tourId);
            }
        });
    });
}

/**
 * Отображение пагинации
 */
function renderPagination() {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    // Добавляем кнопку "Предыдущая"
    const prevBtn = document.createElement('div');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.dataset.page = Math.max(1, state.currentPage - 1);
    pagination.appendChild(prevBtn);
    
    // Добавляем кнопки страниц
    for (let i = 1; i <= state.totalPages; i++) {
        const pageBtn = document.createElement('div');
        pageBtn.className = `page-btn ${i === state.currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.dataset.page = i;
        pagination.appendChild(pageBtn);
    }
    
    // Добавляем кнопку "Следующая"
    const nextBtn = document.createElement('div');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.dataset.page = Math.min(state.totalPages, state.currentPage + 1);
    pagination.appendChild(nextBtn);
}

/**
 * Переключение между видами отображения
 * @param {string} view - 'tile' или 'list'
 */
function switchView(view) {
    state.view = view;
    
    // Обновляем активные кнопки
    document.getElementById('tile-view-btn').classList.toggle('active', view === 'tile');
    document.getElementById('list-view-btn').classList.toggle('active', view === 'list');
    
    // Показываем нужный контейнер
    document.getElementById('tile-view').style.display = view === 'tile' ? 'grid' : 'none';
    document.getElementById('list-view').style.display = view === 'list' ? 'block' : 'none';
}

/**
 * Обработка создания нового тура
 */
async function handleCreateTour() {
    const name = document.getElementById('tour-name').value;
    const objectType = document.getElementById('tour-type').value;
    const description = document.getElementById('tour-description').value;
    
    // Валидация
    if (!name || !objectType) {
        alert('Пожалуйста, заполните обязательные поля');
        return;
    }
    
    try {
        // Создаем объект с данными тура
        const tourData = {
            name,
            objectType,
            description
        };
        
        // Отправляем запрос на создание тура
        await createTour(tourData);
        
        // Закрываем модальное окно
        document.getElementById('create-tour-modal').classList.remove('active');
        
        // Очищаем форму
        document.getElementById('create-tour-form').reset();
        
        // Обновляем список туров
        loadTours();
        
        // Показываем сообщение об успешном создании
        alert('Тур успешно создан!');
    } catch (error) {
        console.error('Ошибка при создании тура:', error);
        alert('Произошла ошибка при создании тура. Пожалуйста, попробуйте позже.');
    }
}

/**
 * Обработка удаления тура
 * @param {string} tourId - ID тура для удаления
 */
async function handleDeleteTour(tourId) {
    try {
        // Отправляем запрос на удаление тура
        await deleteTour(tourId);
        
        // Обновляем список туров
        loadTours();
        
        // Показываем сообщение об успешном удалении
        alert('Тур успешно удален!');
    } catch (error) {
        console.error('Ошибка при удалении тура:', error);
        alert('Произошла ошибка при удалении тура. Пожалуйста, попробуйте позже.');
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

/**
 * Функция для задержки выполнения (для поиска)
 * @param {Function} func - Функция для выполнения
 * @param {number} wait - Время задержки в миллисекундах
 * @returns {Function} Функция с задержкой
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}