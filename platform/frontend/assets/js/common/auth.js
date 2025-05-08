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
        console.error('Ошибка парсинга данных пользователя:', e);
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
        console.error('Ошибка обновления данных пользователя:', error);
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

/**
 * Настройка отображения и управления меню пользователя
 */
function setupUserMenu() {
    const userMenu = document.querySelector('.user-menu') || document.querySelector('.user-profile');
    const dropdownMenu = document.querySelector('.user-dropdown') || document.querySelector('.dropdown-menu') || document.querySelector('#popup');
    
    if (userMenu && dropdownMenu) {
        // Флаг для контроля состояния меню
        let isMenuOpen = false;
        
        userMenu.addEventListener('click', function(event) {
            event.stopPropagation();
            isMenuOpen = !isMenuOpen;
            dropdownMenu.style.display = isMenuOpen ? 'block' : 'none';
            // Для некоторых стилей может использоваться класс active
            if (dropdownMenu.classList.contains('active') || !isMenuOpen) {
                dropdownMenu.classList.remove('active');
            } else if (isMenuOpen) {
                dropdownMenu.classList.add('active');
            }
        });
        
        // Обработчик для клика по элементам меню
        dropdownMenu.addEventListener('click', function(event) {
            event.stopPropagation();
            // Проверяем, что клик был по элементу меню
            const menuItem = event.target.closest('.dropdown-item, .popup-item');
            if (menuItem) {
                // Если это кнопка выхода
                if (menuItem.id === 'logout-btn' || menuItem.textContent.includes('Выход')) {
                    logout();
                }
                
                // Закрываем меню после клика по элементу
                setTimeout(() => {
                    isMenuOpen = false;
                    dropdownMenu.style.display = 'none';
                    dropdownMenu.classList.remove('active');
                }, 100);
            }
        });
        
        // Закрываем меню при клике вне его
        document.addEventListener('click', function() {
            isMenuOpen = false;
            dropdownMenu.style.display = 'none';
            dropdownMenu.classList.remove('active');
        });
    }
}

/**
 * Проверка авторизации при загрузке страницы
 */
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
    
    // Обновляем данные пользователя с сервера (в фоне)
    refreshUserData().catch(console.error);
});

/**
 * Отображение данных пользователя в интерфейсе
 */
function displayUserData() {
    const user = getUser();
    if (!user) return;
    
    // Находим элементы для отображения имени пользователя
    const userNameElements = document.querySelectorAll('.user-name, .username');
    userNameElements.forEach(element => {
        element.textContent = user.name;
    });
    
    // Находим элементы для отображения аватара (первой буквы имени)
    const userAvatarElements = document.querySelectorAll('.user-avatar, .avatar');
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