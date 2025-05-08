const { models } = require('../models');
const { Op } = require('sequelize');

/**
 * Получение списка всех туров пользователя
 * @param {Object} request - Объект запроса Fastify
 * @param {Object} reply - Объект ответа Fastify
 */
async function getTours(request, reply) {
  try {
    const userId = request.user.id;
    
    // Получаем параметры запроса
    const search = request.query.search || '';
    const sortField = request.query.sortField || 'createdAt';
    const sortOrder = request.query.sortOrder || 'desc';
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 12;
    const offset = (page - 1) * limit;
    
    // Подготавливаем условия поиска
    const whereCondition = {
      userId
    };
    
    if (search) {
      whereCondition[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Определяем порядок сортировки
    const order = [[sortField, sortOrder.toUpperCase()]];
    
    // Запрос к базе данных
    const { rows: tours, count: totalTours } = await models.Tour.findAndCountAll({
      where: whereCondition,
      order,
      limit,
      offset,
      include: [{
        model: models.Panorama,
        as: 'panoramas',
        attributes: ['id', 'name', 'status'],
        required: false
      }]
    });
    
    // Рассчитываем общее количество страниц
    const totalPages = Math.ceil(totalTours / limit);
    
    // Формируем ответ
    return {
      tours,
      pagination: {
        totalTours,
        totalPages,
        currentPage: page,
        limit
      }
    };
  } catch (error) {
    request.log.error('Ошибка при получении списка туров:', error);
    return reply.code(500).send({
      error: 'Ошибка сервера при получении списка туров',
      code: 'SERVER_ERROR'
    });
  }
}

/**
 * Получение конкретного тура по ID
 * @param {Object} request - Объект запроса Fastify
 * @param {Object} reply - Объект ответа Fastify
 */
async function getTourById(request, reply) {
  try {
    const userId = request.user.id;
    const tourId = request.params.id;
    
    // Ищем тур по ID с загрузкой связанных данных
    const tour = await models.Tour.findOne({
      where: { id: tourId },
      include: [
        {
          model: models.Panorama,
          as: 'panoramas',
          required: false
        },
        {
          model: models.Hotspot,
          as: 'hotspots',
          required: false
        }
      ]
    });
    
    // Проверяем, существует ли тур
    if (!tour) {
      return reply.code(404).send({
        error: 'Тур не найден',
        code: 'TOUR_NOT_FOUND'
      });
    }
    
    // Проверяем, принадлежит ли тур пользователю
    if (tour.userId !== userId) {
      return reply.code(403).send({
        error: 'Доступ запрещен',
        code: 'ACCESS_DENIED'
      });
    }
    
    return tour;
  } catch (error) {
    request.log.error('Ошибка при получении тура:', error);
    return reply.code(500).send({
      error: 'Ошибка сервера при получении тура',
      code: 'SERVER_ERROR'
    });
  }
}

/**
 * Создание нового тура
 * @param {Object} request - Объект запроса Fastify
 * @param {Object} reply - Объект ответа Fastify
 */
async function createTour(request, reply) {
  try {
    const userId = request.user.id;
    const { name, objectType, description } = request.body;
    
    // Создаем новый тур
    const newTour = await models.Tour.create({
      userId,
      name,
      objectType,
      description,
      status: 'draft',
      settings: {
        logo: 'standard',
        startPanorama: null
      }
    });
    
    return newTour;
  } catch (error) {
    request.log.error('Ошибка при создании тура:', error);
    return reply.code(500).send({
      error: 'Ошибка сервера при создании тура',
      code: 'SERVER_ERROR'
    });
  }
}

/**
 * Обновление тура
 * @param {Object} request - Объект запроса Fastify
 * @param {Object} reply - Объект ответа Fastify
 */
async function updateTour(request, reply) {
  try {
    const userId = request.user.id;
    const tourId = request.params.id;
    const updates = request.body;
    
    // Ищем тур по ID
    const tour = await models.Tour.findByPk(tourId);
    
    // Проверяем, существует ли тур
    if (!tour) {
      return reply.code(404).send({
        error: 'Тур не найден',
        code: 'TOUR_NOT_FOUND'
      });
    }
    
    // Проверяем, принадлежит ли тур пользователю
    if (tour.userId !== userId) {
      return reply.code(403).send({
        error: 'Доступ запрещен',
        code: 'ACCESS_DENIED'
      });
    }
    
    // Обновляем тур
    await tour.update(updates);
    
    // Получаем обновленный тур с связанными данными
    const updatedTour = await models.Tour.findByPk(tourId, {
      include: [
        {
          model: models.Panorama,
          as: 'panoramas',
          required: false
        },
        {
          model: models.Hotspot,
          as: 'hotspots',
          required: false
        }
      ]
    });
    
    return updatedTour;
  } catch (error) {
    request.log.error('Ошибка при обновлении тура:', error);
    return reply.code(500).send({
      error: 'Ошибка сервера при обновлении тура',
      code: 'SERVER_ERROR'
    });
  }
}

/**
 * Удаление тура
 * @param {Object} request - Объект запроса Fastify
 * @param {Object} reply - Объект ответа Fastify
 */
async function deleteTour(request, reply) {
  try {
    const userId = request.user.id;
    const tourId = request.params.id;
    
    // Ищем тур по ID
    const tour = await models.Tour.findByPk(tourId);
    
    // Проверяем, существует ли тур
    if (!tour) {
      return reply.code(404).send({
        error: 'Тур не найден',
        code: 'TOUR_NOT_FOUND'
      });
    }
    
    // Проверяем, принадлежит ли тур пользователю
    if (tour.userId !== userId) {
      return reply.code(403).send({
        error: 'Доступ запрещен',
        code: 'ACCESS_DENIED'
      });
    }
    
    // Удаляем тур
    await tour.destroy();
    
    return { success: true };
  } catch (error) {
    request.log.error('Ошибка при удалении тура:', error);
    return reply.code(500).send({
      error: 'Ошибка сервера при удалении тура',
      code: 'SERVER_ERROR'
    });
  }
}

module.exports = {
  getTours,
  getTourById,
  createTour,
  updateTour,
  deleteTour
};