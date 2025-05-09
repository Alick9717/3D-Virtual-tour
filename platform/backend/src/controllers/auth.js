const bcrypt = require('bcrypt');
const { models } = require('../models');
const { createTokens } = require('../utils/jwt');

/**
 * Регистрация нового пользователя
 * @param {Object} request - Объект запроса
 * @param {Object} reply - Объект ответа
 */
async function register(request, reply) {
  try {
    const { name, email, password } = request.body;

    // Проверяем, существует ли пользователь с таким email
    const existingUser = await models.User.findOne({ where: { email } });
    if (existingUser) {
      return reply.code(409).send({
        error: 'Пользователь с таким email уже существует',
        code: 'EMAIL_TAKEN'
      });
    }

    // Создаем нового пользователя
    const user = await models.User.createUser({
      name,
      email,
      password
    });

    // Генерируем JWT токен
    const { token, refreshToken, expiresAt, refreshExpiresAt } = createTokens(user);

    // Обновляем дату последнего входа
    await user.update({ lastLogin: new Date() });

    // Возвращаем токен и данные пользователя
    return reply.code(201).send({
      token,
      refreshToken,
      expiresAt,
      refreshExpiresAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    request.log.error('Ошибка при регистрации:', error);
    
    // Проверяем, является ли ошибка ошибкой валидации Sequelize
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return reply.code(400).send({
        error: 'Ошибка валидации данных',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }
    
    return reply.code(500).send({
      error: 'Ошибка сервера при регистрации',
      code: 'SERVER_ERROR'
    });
  }
}

/**
 * Вход пользователя
 * @param {Object} request - Объект запроса
 * @param {Object} reply - Объект ответа
 */
async function login(request, reply) {
  try {
    const { email, password } = request.body;

    // Ищем пользователя по email с включением пароля
    const user = await models.User.scope('withPassword').findOne({ where: { email } });
    
    // Проверяем, существует ли пользователь
    if (!user) {
      return reply.code(401).send({
        error: 'Неверный email или пароль',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Проверяем, активен ли пользователь
    if (user.isActive === false) {
      return reply.code(403).send({
        error: 'Учетная запись пользователя деактивирована',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Проверяем пароль
    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      return reply.code(401).send({
        error: 'Неверный email или пароль',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Генерируем JWT токен
    const { token, refreshToken, expiresAt, refreshExpiresAt } = createTokens(user);

    // Обновляем дату последнего входа
    await user.update({ lastLogin: new Date() });

    // Возвращаем токен и данные пользователя (без пароля)
    const userData = user.toJSON();
    return reply.send({
      token,
      refreshToken,
      expiresAt,
      refreshExpiresAt,
      user: userData
    });
  } catch (error) {
    request.log.error('Ошибка при входе:', error);
    return reply.code(500).send({
      error: 'Ошибка сервера при входе',
      code: 'SERVER_ERROR'
    });
  }
}

/**
 * Получение информации о текущем пользователе
 * @param {Object} request - Объект запроса
 * @param {Object} reply - Объект ответа
 */
async function getMe(request, reply) {
  try {
    // Пользователь уже должен быть прикреплен к запросу middleware аутентификации
    const user = request.user;
    
    if (!user) {
      return reply.code(401).send({
        error: 'Требуется авторизация',
        code: 'UNAUTHORIZED'
      });
    }
    
    // Вернуть информацию о пользователе
    return reply.send(user);
  } catch (error) {
    request.log.error('Ошибка при получении данных пользователя:', error);
    return reply.code(500).send({
      error: 'Ошибка сервера при получении данных пользователя',
      code: 'SERVER_ERROR'
    });
  }
}

/**
 * Обновление refresh токена
 * @param {Object} request - Объект запроса
 * @param {Object} reply - Объект ответа
 */
async function refreshToken(request, reply) {
  try {
    const { refreshToken } = request.body;
    
    if (!refreshToken) {
      return reply.code(400).send({
        error: 'Refresh токен не предоставлен',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }
    
    // Проверяем refresh токен
    const decoded = verifyToken(refreshToken);
    
    // Ищем пользователя
    const user = await models.User.findByPk(decoded.id);
    
    if (!user) {
      return reply.code(401).send({
        error: 'Пользователь не найден',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Проверяем, активен ли пользователь
    if (user.isActive === false) {
      return reply.code(403).send({
        error: 'Учетная запись пользователя деактивирована',
        code: 'ACCOUNT_INACTIVE'
      });
    }
    
    // Генерируем новые токены
    const tokens = createTokens(user);
    
    return reply.send(tokens);
  } catch (error) {
    request.log.error('Ошибка при обновлении токена:', error);
    
    if (error.message === 'Срок действия токена истек') {
      return reply.code(401).send({
        error: 'Срок действия refresh токена истек',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }
    
    if (error.message === 'Недействительный токен') {
      return reply.code(401).send({
        error: 'Недействительный refresh токен',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
    
    return reply.code(500).send({
      error: 'Ошибка сервера при обновлении токена',
      code: 'SERVER_ERROR'
    });
  }
}

module.exports = {
  register,
  login,
  getMe,
  refreshToken
};