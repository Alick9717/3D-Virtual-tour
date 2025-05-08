const hotspotsController = require('../controllers/hotspots');
const authenticate = require('../middlewares/auth');

/**
 * Схемы для валидации запросов по хотспотам
 */
const hotspotSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    panoramaId: { type: 'string' },
    targetPanoramaId: { type: ['string', 'null'] },
    position: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        z: { type: 'number' }
      }
    },
    tourId: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

const getHotspotsSchema = {
  params: {
    type: 'object',
    required: ['tourId'],
    properties: {
      tourId: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'array',
      items: hotspotSchema
    }
  }
};

const createHotspotSchema = {
  params: {
    type: 'object',
    required: ['tourId'],
    properties: {
      tourId: { type: 'string' }
    }
  },
  body: {
    type: 'object',
    required: ['name', 'panoramaId'],
    properties: {
      name: { type: 'string', minLength: 1 },
      panoramaId: { type: 'string' },
      targetPanoramaId: { type: ['string', 'null'] },
      position: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          z: { type: 'number' }
        }
      }
    }
  },
  response: {
    200: hotspotSchema
  }
};

const updateHotspotSchema = {
  params: {
    type: 'object',
    required: ['tourId', 'hotspotId'],
    properties: {
      tourId: { type: 'string' },
      hotspotId: { type: 'string' }
    }
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1 },
      targetPanoramaId: { type: ['string', 'null'] },
      position: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          z: { type: 'number' }
        }
      }
    }
  },
  response: {
    200: hotspotSchema
  }
};

const deleteHotspotSchema = {
  params: {
    type: 'object',
    required: ['tourId', 'hotspotId'],
    properties: {
      tourId: { type: 'string' },
      hotspotId: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' }
      }
    }
  }
};

/**
 * Регистрация маршрутов для хотспотов
 * @param {FastifyInstance} fastify - Экземпляр Fastify
 * @param {Object} options - Настройки плагина
 */
async function hotspotRoutes(fastify, options) {
  // Все маршруты требуют аутентификации
  fastify.addHook('preHandler', authenticate);
  
  // Получение списка хотспотов для тура
  fastify.get('/:tourId/hotspots', { schema: getHotspotsSchema }, hotspotsController.getHotspots);
  
  // Создание нового хотспота
  fastify.post('/:tourId/hotspots', { schema: createHotspotSchema }, hotspotsController.createHotspot);
  
  // Обновление хотспота
  fastify.put('/:tourId/hotspots/:hotspotId', { schema: updateHotspotSchema }, hotspotsController.updateHotspot);
  
  // Удаление хотспота
  fastify.delete('/:tourId/hotspots/:hotspotId', { schema: deleteHotspotSchema }, hotspotsController.deleteHotspot);
}

module.exports = hotspotRoutes;