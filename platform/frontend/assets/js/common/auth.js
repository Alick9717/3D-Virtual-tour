import { apiRequest } from './api.js';

/**
 * Проверка авторизации пользователя
 * @returns {boolean} Авторизован ли пользователь
 */
function isAuthenticated() {
    return !!localStorage.getItem('token');
}

/**
 * Получение данных авторизованного пользователя из локального хранилища
 * @returns {Object|null} Данные пользователя или null, если не авторизован
 */
function getUser() {
    const userJson = localStorage.getItem('user');
    if (!userJson) return null;
    
    try {
        return JSON.parse(userJson);
    } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
    }
}

/**
 * Обновление данных пользователя в локальном хранилище
 * @returns {Promise<Object>} Обновленные данные пользователя
 */
async function refreshUserData() {
    try {
        const userData = await apiRequest('/auth/me');
        localStorage.setItem('user', JSON.stringify(userData));
        return userData;
    } catch (error) {
        console.error('Error refreshing user data:', error);
        throw error;
    }
}

/**
 * Выход из системы
 */
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/pages/sing-in.html';
}

// Функции для управления выпадающим меню пользователя
function setupUserMenu() {
    const userMenu = document.querySelector('.user-menu');
    const dropdownMenu = document.querySelector('.user-dropdown') || document.querySelector('.dropdown-menu');
    
    if (userMenu && dropdownMenu) {
        // Флаг для контроля состояния меню
        let isMenuOpen = false;
        
        userMenu.addEventListener('click', function(event) {
            event.stopPropagation();
            isMenuOpen = !isMenuOpen;
            dropdownMenu.style.display = isMenuOpen ? 'block' : 'none';
        });
        
        // Обработчик для клика по элементам меню
        dropdownMenu.addEventListener('click', function(event) {
            event.stopPropagation();
            // Проверяем, что клик был по элементу меню, а не по самому меню
            if (event.target.closest('.dropdown-item')) {
                // Не закрываем меню сразу, чтобы пользователь мог выбрать пункт меню
                setTimeout(() => {
                    isMenuOpen = false;
                    dropdownMenu.style.display = 'none';
                }, 100);
            }
        });
        
        // Закрываем меню при клике вне его
        document.addEventListener('click', function() {
            isMenuOpen = false;
            dropdownMenu.style.display = 'none';
        });
    }
}

// Проверка авторизации при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Не проверяем авторизацию на странице входа/регистрации
    if (window.location.pathname.includes('sing-in.html')) {
        return;
    }
    
    if (!isAuthenticated()) {
        window.location.href = '/pages/sing-in.html';
        return;
    }
    
    // Добавляем обработчик для кнопки выхода из системы
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Отображаем данные пользователя
    displayUserData();
    
    // Настраиваем выпадающее меню пользователя
    setupUserMenu();
});

/**
 * Отображение данных пользователя в интерфейсе
 */
function displayUserData() {
    const user = getUser();
    if (!user) return;
    
    // Находим элементы для отображения имени пользователя
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(element => {
        element.textContent = user.name;
    });
    
    // Находим элементы для отображения аватара (первой буквы имени)
    const userAvatarElements = document.querySelectorAll('.user-avatar');
    userAvatarElements.forEach(element => {
        element.textContent = user.name.charAt(0).toUpperCase();
    });
}

// Экспортируем функции для использования в других файлах
export {
    isAuthenticated,
    getUser,
    refreshUserData,
    logout,
    displayUserData
};