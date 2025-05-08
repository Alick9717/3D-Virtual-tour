// Функция для переключения между вкладками
function switchTab(tab) {
    // Убираем класс active со всех вкладок и форм
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.form-content').forEach(f => f.classList.remove('active'));
    
    // Добавляем класс active нужной вкладке и форме
    if (tab === 'login') {
        document.querySelector('.tab:nth-child(1)').classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        document.querySelector('.tab:nth-child(2)').classList.add('active');
        document.getElementById('register-form').classList.add('active');
    }
}

// API URL
const API_URL = 'http://localhost:3000';

// Проверка, аутентифицирован ли пользователь
function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = 'main.html';
    }
}

// Обработка входа
async function handleLogin(event) {
    event.preventDefault();
    
    // Сбрасываем сообщения об ошибках
    document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
    
    const email = document.querySelector('#login-form input[type="email"]').value;
    const password = document.querySelector('#login-form input[type="password"]').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Сохраняем токен и данные пользователя
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Перенаправляем на главную страницу
            window.location.href = 'main.html';
        } else {
            // Показываем сообщение об ошибке
            const generalError = document.getElementById('login-general-error');
            generalError.textContent = data.error || 'Ошибка входа';
            generalError.style.display = 'block';
        }
    } catch (error) {
        console.error('Ошибка при входе:', error);
        const generalError = document.getElementById('login-general-error');
        generalError.textContent = 'Произошла ошибка при попытке входа';
        generalError.style.display = 'block';
    }
}

// Обработка регистрации
async function handleRegister(event) {
    event.preventDefault();
    
    // Сбрасываем сообщения об ошибках
    document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
    
    const name = document.querySelector('#register-form input[type="text"]').value;
    const email = document.querySelector('#register-form input[type="email"]').value;
    const password = document.querySelector('#register-form input[type="password"]').value;
    
    // Валидация на фронтенде
    let hasError = false;
    
    if (name.length < 2) {
        const nameError = document.getElementById('register-name-error');
        nameError.textContent = 'Имя должно содержать не менее 2 символов';
        nameError.style.display = 'block';
        hasError = true;
    }
    
    if (password.length < 8) {
        const passwordError = document.getElementById('register-password-error');
        passwordError.textContent = 'Пароль должен содержать не менее 8 символов';
        passwordError.style.display = 'block';
        hasError = true;
    }
    
    if (hasError) return;
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Сохраняем токен и данные пользователя
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Перенаправляем на главную страницу
            window.location.href = 'main.html';
        } else {
            // Обработка разных типов ошибок
            if (data.code === 'EMAIL_TAKEN') {
                const emailError = document.getElementById('register-email-error');
                emailError.textContent = 'Этот email уже зарегистрирован';
                emailError.style.display = 'block';
            } else if (data.code === 'VALIDATION_ERROR') {
                const generalError = document.getElementById('register-general-error');
                generalError.textContent = 'Ошибка валидации данных';
                generalError.style.display = 'block';
            } else {
                const generalError = document.getElementById('register-general-error');
                generalError.textContent = data.error || 'Ошибка при регистрации';
                generalError.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        const generalError = document.getElementById('register-general-error');
        generalError.textContent = 'Произошла ошибка при попытке регистрации';
        generalError.style.display = 'block';
    }
}

// Инициализация обработчиков после загрузки страницы
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем авторизацию
    checkAuth();
    
    // Добавляем обработчики событий
    const loginForm = document.querySelector('#login-form form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const registerForm = document.querySelector('#register-form form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});