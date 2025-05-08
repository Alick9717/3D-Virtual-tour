const authController = require('../controllers/auth');
const authenticate = require('../middlewares/auth');

/**
 * Схемы для валидации запросов аутентификации
 */
const registerSchema = {
  body: {
    type: 'object',
    required: ['name', 'email', 'password'],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 50 },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' }
          }
        }
      }
    }
  }
};

const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' }
          }
        }
      }
    }
  }
};

const meSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' }
      }
    }
  }
};

/**
 * Регистрация маршрутов аутентификации
 * @param {FastifyInstance} fastify - Экземпляр Fastify
 * @param {Object} options - Настройки плагина
 */
async function authRoutes(fastify, options) {
  // Регистрация пользователя
  fastify.post('/register', { schema: registerSchema }, authController.register);

  // Вход пользователя
  fastify.post('/login', { schema: loginSchema }, authController.login);

  // Информация о текущем пользователе (требуется аутентификация)
  fastify.get('/me', { preHandler: authenticate, schema: meSchema }, authController.getMe);
}

module.exports = authRoutes;