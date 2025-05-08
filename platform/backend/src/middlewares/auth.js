const { verifyToken } = require('../utils/jwt');
const { models } = require('../models');

/**
 * Middleware для проверки аутентификации
 * @param {Object} request - Объект запроса Fastify
 * @param {Object} reply - Объект ответа Fastify
 */
async function authenticate(request, reply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    // Находим пользователя в базе данных
    const user = await models.User.findByPk(decoded.id, {
      attributes: ['id', 'name', 'email', 'role']
    });
    
    if (!user) {
      throw new Error('User not found');
    }

    // Прикрепляем пользователя к запросу
    request.user = user.toJSON();
  } catch (error) {
    request.log.error('Ошибка аутентификации:', error);
    return reply.code(401).send({
      error: 'Unauthorized',
      code: 'UNAUTHORIZED'
    });
  }
}

module.exports = authenticate;