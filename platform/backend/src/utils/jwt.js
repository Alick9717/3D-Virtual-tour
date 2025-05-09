const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Генерация JWT токена для пользователя
 * @param {Object} payload - Данные пользователя для включения в токен
 * @returns {String} JWT токен
 */
function generateToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

/**
 * Генерация refresh токена для пользователя
 * @param {Object} payload - Данные пользователя для включения в токен
 * @returns {String} Refresh токен
 */
function generateRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.refreshExpiresIn });
}

/**
 * Проверка JWT токена
 * @param {String} token - JWT токен для проверки
 * @returns {Object} Декодированная полезная нагрузка токена
 * @throws {Error} Если токен недействителен или истек срок действия
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Срок действия токена истек');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Недействительный токен');
    }
    throw error;
  }
}

/**
 * Декодирование JWT токена без проверки подписи
 * @param {String} token - JWT токен для декодирования
 * @returns {Object} Декодированная полезная нагрузка токена
 */
function decodeToken(token) {
  return jwt.decode(token);
}

/**
 * Создание токенов для пользователя
 * @param {Object} user - Пользователь
 * @returns {Object} Объект с токенами и датами истечения срока действия
 */
function createTokens(user) {
  // Базовая информация для токена
  const payload = {
    id: user.id,
    role: user.role
  };

  // Создаем токен доступа
  const token = generateToken(payload);
  
  // Создаем refresh токен
  const refreshToken = generateRefreshToken(payload);
  
  // Декодируем токены для получения срока действия
  const decodedToken = decodeToken(token);
  const decodedRefreshToken = decodeToken(refreshToken);
  
  return {
    token,
    refreshToken,
    expiresAt: new Date(decodedToken.exp * 1000), // Преобразуем UNIX-время в JavaScript Date
    refreshExpiresAt: new Date(decodedRefreshToken.exp * 1000)
  };
}

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  createTokens
};