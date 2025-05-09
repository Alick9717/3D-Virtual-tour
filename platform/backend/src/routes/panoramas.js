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
        fileSize: { type: 'integer' },
        mimeType: { type: 'string' },
        status: { type: 'string', enum: ['active', 'inactive'] },
        metadata: { 
            type: 'object',
            properties: {
                fov: { type: 'number' },
                initialYaw: { type: 'number' },
                initialPitch: { type: 'number' },
                showZoomCtrl: { type: 'boolean' },
                autoLoad: { type: 'boolean' }
            }
        },
        displayOrder: { type: 'integer' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
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
            status: { type: 'string', enum: ['active', 'inactive'] },
            metadata: { 
                type: 'object',
                properties: {
                    fov: { type: 'number' },
                    initialYaw: { type: 'number' },
                    initialPitch: { type: 'number' },
                    showZoomCtrl: { type: 'boolean' },
                    autoLoad: { type: 'boolean' }
                }
            },
            displayOrder: { type: 'integer' }
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
    
    // Обновление порядка отображения панорам
    fastify.put('/:tourId/panoramas/order', {
        schema: {
            params: {
                type: 'object',
                required: ['tourId'],
                properties: {
                    tourId: { type: 'string' }
                }
            },
            body: {
                type: 'array',
                items: {
                    type: 'object',
                    required: ['id', 'displayOrder'],
                    properties: {
                        id: { type: 'string' },
                        displayOrder: { type: 'integer' }
                    }
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
        }
    }, async (request, reply) => {
        try {
            const userId = request.user.id;
            const tourId = request.params.tourId;
            const orderUpdates = request.body;
            
            // Ищем тур по ID
            const tour = await fastify.models.Tour.findByPk(tourId);
            
            // Проверяем, существует ли тур
            if (!tour) {
                return reply.code(404).send({
                    error: 'Тур не найден',
                    code: 'TOUR_NOT_FOUND'
                });
            }
            
            // Проверяем, принадлежит ли тур пользователю
            if (tour.userId !== userId && request.user.role !== 'admin') {
                return reply.code(403).send({
                    error: 'Доступ запрещен',
                    code: 'ACCESS_DENIED'
                });
            }
            
            // Обрабатываем обновления порядка
            for (const update of orderUpdates) {
                await fastify.models.Panorama.update(
                    { displayOrder: update.displayOrder },
                    { where: { id: update.id, tourId } }
                );
            }
            
            return { success: true };
        } catch (error) {
            request.log.error('Ошибка при обновлении порядка панорам:', error);
            return reply.code(500).send({
                error: 'Ошибка сервера при обновлении порядка панорам',
                code: 'SERVER_ERROR'
            });
        }
    });
}

module.exports = panoramaRoutes;