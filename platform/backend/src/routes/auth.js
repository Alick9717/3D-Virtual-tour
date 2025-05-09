const authController = require('../controllers/auth');
const { authenticate } = require('../middlewares/auth');

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
    201: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
        refreshExpiresAt: { type: 'string', format: 'date-time' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' }
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
      password: { type: 'string', minLength: 1 }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
        refreshExpiresAt: { type: 'string', format: 'date-time' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            lastLogin: { type: ['string', 'null'], format: 'date-time' }
          }
        }
      }
    }
  }
};

const refreshTokenSchema = {
  body: {
    type: 'object',
    required: ['refreshToken'],
    properties: {
      refreshToken: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
        refreshExpiresAt: { type: 'string', format: 'date-time' }
      }
    }
  }
};

const meSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        lastLogin: { type: ['string', 'null'], format: 'date-time' }
      }
    }
  }
};

/**
 * Регистрация маршрутов аутентификации
 * @param {FastifyInstance} fastify - Экземпляр Fastify
 * @param {Object} options - Опции
 */
async function authRoutes(fastify, options) {
  // Регистрация нового пользователя
  fastify.post('/register', { schema: registerSchema }, authController.register);

  // Вход пользователя
  fastify.post('/login', { schema: loginSchema }, authController.login);

  // Обновление токена
  fastify.post('/refresh', { schema: refreshTokenSchema }, authController.refreshToken);

  // Получение информации о текущем пользователе (требуется аутентификация)
  fastify.get('/me', { 
    preHandler: authenticate,
    schema: meSchema
  }, authController.getMe);
}

module.exports = authRoutes;