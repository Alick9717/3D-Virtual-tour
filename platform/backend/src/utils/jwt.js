const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

/**
 * Генерация JWT токена для пользователя
 * @param {Object} payload - Данные пользователя для включения в токен
 * @returns {String} JWT токен
 */
function generateToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
}

/**
 * Проверка JWT токена
 * @param {String} token - JWT токен для проверки
 * @returns {Object} Декодированная полезная нагрузка токена
 */
function verifyToken(token) {
  return jwt.verify(token, jwtSecret);
}

module.exports = {
  generateToken,
  verifyToken
};