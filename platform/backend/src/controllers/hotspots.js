const { models } = require('../models');
const { Op } = require('sequelize');

/**
 * Получение списка хотспотов для тура
 * @param {Object} request - Объект запроса Fastify
 * @param {Object} reply - Объект ответа Fastify
 */
async function getHotspots(request, reply) {
  try {
    const userId = request.user.id;
    const tourId = request.params.tourId;
    
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
    
    // Получаем хотспоты тура
    const hotspots = await models.Hotspot.findAll({
      where: { tourId }
    });
    
    return hotspots;
  } catch (error) {
    request.log.error('Ошибка при получении списка хотспотов:', error);
    return reply.code(500).send({
      error: 'Ошибка сервера при получении списка хотспотов',
      code: 'SERVER_ERROR'
    });
  }
}

/**
 * Создание нового хотспота
 * @param {Object} request - Объект запроса Fastify
 * @param {Object} reply - Объект ответа Fastify
 */
async function createHotspot(request, reply) {
  try {
    const userId = request.user.id;
    const tourId = request.params.tourId;
    const { name, panoramaId, targetPanoramaId, position } = request.body;
    
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
    
    // Проверяем, существует ли панорама
    const panorama = await models.Panorama.findOne({
      where: {
        id: panoramaId,
        tourId
      }
    });
    
    if (!panorama) {
      return reply.code(404).send({
        error: 'Панорама не найдена',
        code: 'PANORAMA_NOT_FOUND'
      });
    }
    
    // Проверяем, существует ли целевая панорама
    if (targetPanoramaId) {
      const targetPanorama = await models.Panorama.findOne({
        where: {
          id: targetPanoramaId,
          tourId
        }
      });
      
      if (!targetPanorama) {
        return reply.code(404).send({
          error: 'Целевая панорама не найдена',
          code: 'TARGET_PANORAMA_NOT_FOUND'
        });
      }
    }
    
    // Создаем новый хотспот
    const newHotspot = await models.Hotspot.create({
      tourId,
      panoramaId,
      targetPanoramaId,
      name,
      position: position || { x: 0, y: 0, z: 0 }
    });
    
    return newHotspot;
  } catch (error) {
    request.log.error('Ошибка при создании хотспота:', error);
    return reply.code(500).send({
      error: 'Ошибка сервера при создании хотспота',
      code: 'SERVER_ERROR'
    });
  }
}

/**
 * Обновление хотспота
 * @param {Object} request - Объект запроса Fastify
 * @param {Object} reply - Объект ответа Fastify
 */
async function updateHotspot(request, reply) {
  try {
    const userId = request.user.id;
    const tourId = request.params.tourId;
    const hotspotId = request.params.hotspotId;
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
    
    // Ищем хотспот
    const hotspot = await models.Hotspot.findOne({
      where: {
        id: hotspotId,
        tourId
      }
    });
    
    if (!hotspot) {
      return reply.code(404).send({
        error: 'Хотспот не найден',
        code: 'HOTSPOT_NOT_FOUND'
      });
    }
    
    // Проверяем, существует ли целевая панорама, если она указана
    if (updates.targetPanoramaId) {
      const targetPanorama = await models.Panorama.findOne({
        where: {
          id: updates.targetPanoramaId,
          tourId
        }
      });
      
      if (!targetPanorama) {
        return reply.code(404).send({
          error: 'Целевая панорама не найдена',
          code: 'TARGET_PANORAMA_NOT_FOUND'
        });
      }
    }
    
    // Обновляем хотспот
    await hotspot.update(updates);
    
    return hotspot;
  } catch (error) {
    request.log.error('Ошибка при обновлении хотспота:', error);
    return reply.code(500).send({
      error: 'Ошибка сервера при обновлении хотспота',
      code: 'SERVER_ERROR'
    });
  }
}

/**
 * Удаление хотспота
 * @param {Object} request - Объект запроса Fastify
 * @param {Object} reply - Объект ответа Fastify
 */
async function deleteHotspot(request, reply) {
  try {
    const userId = request.user.id;
    const tourId = request.params.tourId;
    const hotspotId = request.params.hotspotId;
    
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
    
    // Ищем хотспот
    const hotspot = await models.Hotspot.findOne({
      where: {
        id: hotspotId,
        tourId
      }
    });
    
    if (!hotspot) {
      return reply.code(404).send({
        error: 'Хотспот не найден',
        code: 'HOTSPOT_NOT_FOUND'
      });
    }
    
    // Удаляем хотспот
    await hotspot.destroy();
    
    return { success: true };
  } catch (error) {
    request.log.error('Ошибка при удалении хотспота:', error);
    return reply.code(500).send({
      error: 'Ошибка сервера при удалении хотспота',
      code: 'SERVER_ERROR'
    });
  }
}

module.exports = {
  getHotspots,
  createHotspot,
  updateHotspot,
  deleteHotspot
};