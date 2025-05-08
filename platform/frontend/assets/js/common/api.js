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
        console.log(`Выполняется ${method} запрос к ${API_URL}${url}`);
        const response = await fetch(`${API_URL}${url}`, options);
        
        // Проверяем статус ответа
        if (response.status === 401) {
            // Если не авторизован, удаляем токен и перенаправляем на страницу входа
            console.log('Ошибка авторизации (401), перенаправление на страницу входа');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/pages/sing-in.html';
            return;
        }
        
        // Получаем данные ответа
        let result;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            result = await response.text();
        }
        
        if (!response.ok) {
            console.error(`Ошибка API (${response.status}):`, result);
            throw {
                status: response.status,
                error: result.error || 'Ошибка при выполнении запроса',
                code: result.code
            };
        }
        
        return result;
    } catch (error) {
        console.error('Ошибка при выполнении запроса:', error);
        throw error;
    }
}

/**
 * Обработка ошибок API
 * @param {Error} error - Объект ошибки
 * @returns {string} Текст ошибки для отображения пользователю
 */
function handleApiError(error) {
    console.error('API error:', error);
    
    if (error.error) {
        return error.error;
    } else if (error.message) {
        return error.message;
    } else {
        return 'Неизвестная ошибка при обращении к API';
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
 * @returns {Promise<Object>} Объект с турами и информацией о пагинации
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
        console.log('Нет токена авторизации, перенаправление на страницу входа');
        window.location.href = '/pages/sing-in.html';
        return;
    }
    
    try {
        console.log(`Загрузка файла для тура ${tourId}`);
        const response = await fetch(`${API_URL}/tours/${tourId}/panoramas`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData // Не устанавливаем Content-Type для формы с файлами
        });
        
        if (response.status === 401) {
            console.log('Ошибка авторизации (401), перенаправление на страницу входа');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/pages/sing-in.html';
            return;
        }
        
        // Получаем данные ответа
        let result;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            result = await response.text();
            try {
                result = JSON.parse(result);
            } catch (e) {
                // Если не удалось распарсить как JSON, оставляем как текст
            }
        }
        
        if (!response.ok) {
            console.error(`Ошибка загрузки файла (${response.status}):`, result);
            throw {
                status: response.status,
                error: result.error || 'Ошибка при загрузке файла',
                code: result.code
            };
        }
        
        return result;
    } catch (error) {
        console.error('Ошибка при загрузке файла:', error);
        throw error;
    }
}

/**
 * Обновление информации о панораме
 * @param {string} tourId - ID тура
 * @param {string} panoramaId - ID панорамы
 * @param {Object} panoramaData - Данные для обновления
 * @returns {Promise<Object>} Обновленная панорама
 */
async function updatePanorama(tourId, panoramaId, panoramaData) {
    return apiRequest(`/tours/${tourId}/panoramas/${panoramaId}`, 'PUT', panoramaData);
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
 * @param {Object} hotspotData - Данные хотспота
 * @returns {Promise<Object>} Созданный хотспот
 */
async function createHotspot(tourId, hotspotData) {
    return apiRequest(`/tours/${tourId}/hotspots`, 'POST', hotspotData);
}

/**
 * Обновление хотспота
 * @param {string} tourId - ID тура
 * @param {string} hotspotId - ID хотспота
 * @param {Object} hotspotData - Данные для обновления
 * @returns {Promise<Object>} Обновленный хотспот
 */
async function updateHotspot(tourId, hotspotId, hotspotData) {
    return apiRequest(`/tours/${tourId}/hotspots/${hotspotId}`, 'PUT', hotspotData);
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
    handleApiError,
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