const { verifyToken } = require('../utils/jwt');
const { models } = require('../models');

/**
 * Middleware для проверки авторизации
 * @param {Object} request - Объект запроса
 * @param {Object} reply - Объект ответа
 * @param {Function} done - Функция для продолжения выполнения
 */
async function authenticate(request, reply) {
  try {
    // Получаем заголовок авторизации
    const authHeader = request.headers.authorization;
    
    // Проверяем наличие токена
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        error: 'Не предоставлен токен авторизации',
        code: 'UNAUTHORIZED'
      });
    }

    // Извлекаем токен
    const token = authHeader.split(' ')[1];
    
    // Проверяем токен
    const decoded = verifyToken(token);
    
    // Находим пользователя в базе данных
    const user = await models.User.findByPk(decoded.id, {
      attributes: { exclude: ['passwordHash'] }
    });
    
    // Проверяем, существует ли пользователь
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

    // Прикрепляем пользователя к запросу
    request.user = user;
  } catch (error) {
    request.log.error('Ошибка аутентификации:', error);
    
    // Разные сообщения об ошибках в зависимости от типа ошибки
    if (error.message === 'Срок действия токена истек') {
      return reply.code(401).send({
        error: 'Срок действия токена истек',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.message === 'Недействительный токен') {
      return reply.code(401).send({
        error: 'Недействительный токен',
        code: 'INVALID_TOKEN'
      });
    }
    
    return reply.code(401).send({
      error: 'Ошибка авторизации',
      code: 'UNAUTHORIZED'
    });
  }
}

/**
 * Middleware для проверки роли пользователя
 * @param {String} role - Требуемая роль
 * @returns {Function} Middleware функция
 */
function checkRole(role) {
  return async (request, reply) => {
    // Проверяем, что пользователь аутентифицирован
    if (!request.user) {
      return reply.code(401).send({
        error: 'Требуется авторизация',
        code: 'UNAUTHORIZED'
      });
    }
    
    // Проверяем роль пользователя
    if (request.user.role !== role) {
      return reply.code(403).send({
        error: 'Недостаточно прав',
        code: 'FORBIDDEN'
      });
    }
  };
}

/**
 * Middleware для проверки владельца ресурса
 * @param {Function} getResourceOwner - Функция для получения владельца ресурса
 * @returns {Function} Middleware функция
 */
function checkOwnership(getResourceOwner) {
  return async (request, reply) => {
    // Проверяем, что пользователь аутентифицирован
    if (!request.user) {
      return reply.code(401).send({
        error: 'Требуется авторизация',
        code: 'UNAUTHORIZED'
      });
    }
    
    try {
      // Получаем владельца ресурса
      const resourceOwnerId = await getResourceOwner(request);
      
      // Если владелец не найден, ошибка 404
      if (!resourceOwnerId) {
        return reply.code(404).send({
          error: 'Ресурс не найден',
          code: 'RESOURCE_NOT_FOUND'
        });
      }
      
      // Проверяем, является ли пользователь владельцем или администратором
      if (request.user.id !== resourceOwnerId && request.user.role !== 'admin') {
        return reply.code(403).send({
          error: 'Недостаточно прав',
          code: 'FORBIDDEN'
        });
      }
    } catch (error) {
      request.log.error('Ошибка при проверке владельца ресурса:', error);
      return reply.code(500).send({
        error: 'Внутренняя ошибка сервера',
        code: 'SERVER_ERROR'
      });
    }
  };
}

module.exports = {
  authenticate,
  checkRole,
  checkOwnership
};