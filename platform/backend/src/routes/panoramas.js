const panoramasController = require('../controllers/panoramas');
const authenticate = require('../middlewares/auth');

/**
 * Схемы для валидации запросов по панорамам
 */
const panoramaSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        filename: { type: 'string' },
        uploadedAt: { type: 'string', format: 'date-time' },
        status: { type: 'string', enum: ['active', 'inactive'] }
    }
};

const getPanoramasSchema = {
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
            items: panoramaSchema
        }
    }
};

const updatePanoramaSchema = {
    params: {
        type: 'object',
        required: ['tourId', 'panoramaId'],
        properties: {
            tourId: { type: 'string' },
            panoramaId: { type: 'string' }
        }
    },
    body: {
        type: 'object',
        properties: {
            name: { type: 'string' },
            status: { type: 'string', enum: ['active', 'inactive'] }
        }
    },
    response: {
        200: panoramaSchema
    }
};

const deletePanoramaSchema = {
    params: {
        type: 'object',
        required: ['tourId', 'panoramaId'],
        properties: {
            tourId: { type: 'string' },
            panoramaId: { type: 'string' }
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
 * Регистрация маршрутов для панорам
 * @param {FastifyInstance} fastify - Экземпляр Fastify
 * @param {Object} options - Настройки плагина
 */
async function panoramaRoutes(fastify, options) {
    // Все маршруты требуют аутентификации
    fastify.addHook('preHandler', authenticate);
    
    // Получение списка панорам для тура
    fastify.get('/:tourId/panoramas', { schema: getPanoramasSchema }, panoramasController.getPanoramas);
    
    // Загрузка новой панорамы
    fastify.post('/:tourId/panoramas', panoramasController.uploadPanorama);
    
    // Обновление информации о панораме
    fastify.put('/:tourId/panoramas/:panoramaId', { schema: updatePanoramaSchema }, panoramasController.updatePanorama);
    
    // Удаление панорамы
    fastify.delete('/:tourId/panoramas/:panoramaId', { schema: deletePanoramaSchema }, panoramasController.deletePanorama);
}

module.exports = panoramaRoutes;