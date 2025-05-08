const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/jwt');
const { models } = require('../models');

/**
 * Регистрация нового пользователя
 * @param {Object} request - Объект запроса Fastify
 * @param {Object} reply - Объект ответа Fastify
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

    // Хешируем пароль
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Создаем нового пользователя
    const newUser = await models.User.create({
      name,
      email,
      passwordHash,
      role: 'user'
    });

    // Генерируем JWT токен
    const token = generateToken({
      id: newUser.id,
      role: newUser.role
    });

    // Возвращаем токен и данные пользователя
    return {
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      }
    };
  } catch (error) {
    request.log.error('Ошибка при регистрации:', error);
    return reply.code(500).send({
      error: 'Ошибка сервера при регистрации',
      code: 'SERVER_ERROR'
    });
  }
}

/**
 * Вход пользователя
 * @param {Object} request - Объект запроса Fastify
 * @param {Object} reply - Объект ответа Fastify
 */
async function login(request, reply) {
  try {
    const { email, password } = request.body;

    // Ищем пользователя по email
    const user = await models.User.findOne({ where: { email } });
    if (!user) {
      return reply.code(401).send({
        error: 'Неверный email или пароль',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Проверяем пароль
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return reply.code(401).send({
        error: 'Неверный email или пароль',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Генерируем JWT токен
    const token = generateToken({
      id: user.id,
      role: user.role
    });

    // Возвращаем токен и данные пользователя
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    };
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
 * @param {Object} request - Объект запроса Fastify
 * @param {Object} reply - Объект ответа Fastify
 */
async function getMe(request, reply) {
  try {
    const userId = request.user.id;

    // Получаем данные пользователя
    const user = await models.User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'role']
    });

    if (!user) {
      return reply.code(404).send({
        error: 'Пользователь не найден',
        code: 'USER_NOT_FOUND'
      });
    }

    return user;
  } catch (error) {
    request.log.error('Ошибка при получении данных пользователя:', error);
    return reply.code(500).send({
      error: 'Ошибка сервера при получении данных пользователя',
      code: 'SERVER_ERROR'
    });
  }
}

module.exports = {
  register,
  login,
  getMe
};