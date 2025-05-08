const toursController = require('../controllers/tours');
const authenticate = require('../middlewares/auth');

/**
 * Схемы для валидации запросов по турам
 */
const tourSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        userId: { type: 'string' },
        name: { type: 'string' },
        objectType: { type: 'string', enum: ['apartment', 'house', 'office', 'commercial'] },
        description: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'ready', 'published'] },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        panoramas: { 
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    uploadedAt: { type: 'string', format: 'date-time' },
                    status: { type: 'string', enum: ['active', 'inactive'] }
                }
            }
        },
        settings: {
            type: 'object',
            properties: {
                logo: { type: 'string' },
                startPanorama: { type: ['string', 'null'] }
            }
        }
    }
};

const getToursSchema = {
    querystring: {
        type: 'object',
        properties: {
            search: { type: 'string' },
            sortField: { type: 'string', enum: ['name', 'createdAt'] },
            sortOrder: { type: 'string', enum: ['asc', 'desc'] },
            page: { type: 'integer', minimum: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100 }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                tours: {
                    type: 'array',
                    items: tourSchema
                },
                pagination: {
                    type: 'object',
                    properties: {
                        totalTours: { type: 'integer' },
                        totalPages: { type: 'integer' },
                        currentPage: { type: 'integer' },
                        limit: { type: 'integer' }
                    }
                }
            }
        }
    }
};

const getTourByIdSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string' }
        }
    },
    response: {
        200: tourSchema
    }
};

const createTourSchema = {
    body: {
        type: 'object',
        required: ['name', 'objectType'],
        properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            objectType: { type: 'string', enum: ['apartment', 'house', 'office', 'commercial'] },
            description: { type: 'string' }
        }
    },
    response: {
        200: tourSchema
    }
};

const updateTourSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string' }
        }
    },
    body: {
        type: 'object',
        properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            objectType: { type: 'string', enum: ['apartment', 'house', 'office', 'commercial'] },
            description: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'ready', 'published'] },
            settings: {
                type: 'object',
                properties: {
                    logo: { type: 'string' },
                    startPanorama: { type: ['string', 'null'] }
                }
            }
        }
    },
    response: {
        200: tourSchema
    }
};

const deleteTourSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string' }
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
 * Регистрация маршрутов для туров
 * @param {FastifyInstance} fastify - Экземпляр Fastify
 * @param {Object} options - Настройки плагина
 */
async function tourRoutes(fastify, options) {
    // Все маршруты требуют аутентификации
    fastify.addHook('preHandler', authenticate);
    
    // Получение списка туров
    fastify.get('/', { schema: getToursSchema }, toursController.getTours);
    
    // Получение тура по ID
    fastify.get('/:id', { schema: getTourByIdSchema }, toursController.getTourById);
    
    // Создание нового тура
    fastify.post('/', { schema: createTourSchema }, toursController.createTour);
    
// Обновление тура
    fastify.put('/:id', { schema: updateTourSchema }, toursController.updateTour);
    
    // Удаление тура
    fastify.delete('/:id', { schema: deleteTourSchema }, toursController.deleteTour);
}

module.exports = tourRoutes;