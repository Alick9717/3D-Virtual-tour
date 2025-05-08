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
 * Удаление панорамы
 * @param {string} tourId - ID тура
 * @param {string} panoramaId - ID панорамы
 * @returns {Promise<Object>} Результат удаления
 */
async function deletePanorama(tourId, panoramaId) {
    return apiRequest(`/tours/${tourId}/panoramas/${panoramaId}`, 'DELETE');
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
    deletePanorama
};