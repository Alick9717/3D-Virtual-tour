const toursController = require('../controllers/tours');
const authenticate = require('../middlewares/auth');
const { checkRole } = require('../middlewares/auth');

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
        views: { type: 'integer' },
        metaData: { 
            type: 'object',
            properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                keywords: { type: 'string' },
                ogImage: { type: 'string' }
            }
        },
        panoramas: { 
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    filename: { type: 'string' },
                    status: { type: 'string', enum: ['active', 'inactive'] }
                }
            }
        },
        hotspots: { 
            type: 'array',
            items: {
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
                    }
                }
            }
        },
        settings: {
            type: 'object',
            properties: {
                logo: { type: 'string' },
                startPanorama: { type: ['string', 'null'] },
                autoRotate: { type: 'boolean' },
                compass: { type: 'boolean' },
                hotSpotDebug: { type: 'boolean' }
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
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            status: { type: 'string', enum: ['draft', 'ready', 'published'] },
            objectType: { type: 'string', enum: ['apartment', 'house', 'office', 'commercial'] }
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
                },
                filters: {
                    type: 'object',
                    properties: {
                        search: { type: 'string' },
                        status: { type: ['string', 'null'] },
                        objectType: { type: ['string', 'null'] },
                        sortField: { type: 'string' },
                        sortOrder: { type: 'string' }
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
            description: { type: 'string' },
            tags: { 
                type: 'array', 
                items: { type: 'string' } 
            }
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
            metaData: { 
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    keywords: { type: 'string' },
                    ogImage: { type: 'string' }
                }
            },
            settings: {
                type: 'object',
                properties: {
                    logo: { type: 'string' },
                    startPanorama: { type: ['string', 'null'] },
                    autoRotate: { type: 'boolean' },
                    compass: { type: 'boolean' },
                    hotSpotDebug: { type: 'boolean' }
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
                success: { type: 'boolean' },
                message: { type: 'string' }
            }
        }
    }
};

const duplicateTourSchema = {
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

const getToursStatsSchema = {
    response: {
        200: {
            type: 'object',
            properties: {
                totalTours: { type: 'integer' },
                toursByStatus: { 
                    type: 'object',
                    additionalProperties: true
                },
                toursByObjectType: { 
                    type: 'object',
                    additionalProperties: true
                },
                totalPanoramas: { type: 'integer' },
                recentTours: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            status: { type: 'string' },
                            createdAt: { type: 'string', format: 'date-time' }
                        }
                    }
                }
            }
        }
    }
};

const incrementTourViewsSchema = {
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
                success: { type: 'boolean' },
                views: { type: 'integer' }
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
    // Маршруты, которые требуют аутентификации
    fastify.register(async (instance) => {
        // Добавляем middleware аутентификации
        instance.addHook('preHandler', authenticate);
        
        // Получение списка туров
        instance.get('/', { schema: getToursSchema }, toursController.getTours);
        
        // Получение статистики туров
        instance.get('/stats', { schema: getToursStatsSchema }, toursController.getToursStats);
        
        // Получение тура по ID
        instance.get('/:id', { schema: getTourByIdSchema }, toursController.getTourById);
        
        // Создание нового тура
        instance.post('/', { schema: createTourSchema }, toursController.createTour);
        
        // Обновление тура
        instance.put('/:id', { schema: updateTourSchema }, toursController.updateTour);
        
        // Удаление тура
        instance.delete('/:id', { schema: deleteTourSchema }, toursController.deleteTour);
        
        // Дублирование тура
        instance.post('/:id/duplicate', { schema: duplicateTourSchema }, toursController.duplicateTour);
    });
    
    // Публичные маршруты (без аутентификации)
    
    // Получение опубликованного тура по ID (для публичного доступа)
    fastify.get('/public/:id', {
        schema: {
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
        }
    }, async (request, reply) => {
        try {
            const tourId = request.params.id;
            
            // Ищем тур по ID с загрузкой связанных данных
            const tour = await fastify.models.Tour.findOne({
                where: { 
                    id: tourId,
                    status: 'published' // Только опубликованные
                },
                include: [
                    {
                        model: fastify.models.Panorama,
                        as: 'panoramas',
                        where: { status: 'active' },
                        required: false
                    },
                    {
                        model: fastify.models.Hotspot,
                        as: 'hotspots',
                        required: false
                    },
                    {
                        model: fastify.models.User,
                        as: 'user',
                        attributes: ['id', 'name']
                    }
                ]
            });
            
            // Проверяем, существует ли тур
            if (!tour) {
                return reply.code(404).send({
                    error: 'Тур не найден или не опубликован',
                    code: 'TOUR_NOT_FOUND'
                });
            }
            
            // Увеличиваем счетчик просмотров
            await tour.increment('views', { by: 1 });
            
            return tour;
        } catch (error) {
            request.log.error('Ошибка при получении публичного тура:', error);
            return reply.code(500).send({
                error: 'Ошибка сервера при получении тура',
                code: 'SERVER_ERROR'
            });
        }
    });
    
    // Увеличение счетчика просмотров тура
    fastify.post('/public/:id/views', { schema: incrementTourViewsSchema }, async (request, reply) => {
        try {
            const tourId = request.params.id;
            
            // Ищем тур по ID
            const tour = await fastify.models.Tour.findOne({
                where: { id: tourId, status: 'published' }
            });
            
            // Проверяем, существует ли тур
            if (!tour) {
                return reply.code(404).send({
                    error: 'Тур не найден или не опубликован',
                    code: 'TOUR_NOT_FOUND'
                });
            }
            
            // Увеличиваем счетчик просмотров
            await tour.increment('views', { by: 1 });
            
            return {
                success: true,
                views: tour.views + 1
            };
        } catch (error) {
            request.log.error('Ошибка при увеличении счетчика просмотров:', error);
            return reply.code(500).send({
                error: 'Ошибка сервера при увеличении счетчика просмотров',
                code: 'SERVER_ERROR'
            });
        }
    });
    
    // Маршруты для администратора
    fastify.register(async (adminInstance) => {
        // Добавляем middleware аутентификации и проверки роли
        adminInstance.addHook('preHandler', authenticate);
        adminInstance.addHook('preHandler', checkRole('admin'));
        
        // Получение всех туров (для админа)
        adminInstance.get('/admin/all', async (request, reply) => {
            try {
                const tours = await fastify.models.Tour.findAll({
                    include: [
                        {
                            model: fastify.models.User,
                            as: 'user',
                            attributes: ['id', 'name', 'email']
                        }
                    ],
                    order: [['createdAt', 'DESC']]
                });
                
                return {
                    tours,
                    count: tours.length
                };
            } catch (error) {
                request.log.error('Ошибка при получении всех туров:', error);
                return reply.code(500).send({
                    error: 'Ошибка сервера при получении туров',
                    code: 'SERVER_ERROR'
                });
            }
        });
        
        // Удаление нескольких туров (для админа)
        adminInstance.post('/admin/delete-multiple', {
            schema: {
                body: {
                    type: 'object',
                    required: ['tourIds'],
                    properties: {
                        tourIds: {
                            type: 'array',
                            items: { type: 'string' },
                            minItems: 1
                        }
                    }
                },
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            deleted: { type: 'integer' }
                        }
                    }
                }
            }
        }, async (request, reply) => {
            try {
                const { tourIds } = request.body;
                
                // Удаляем все указанные туры
                const result = await fastify.models.Tour.destroy({
                    where: {
                        id: { [fastify.models.Sequelize.Op.in]: tourIds }
                    }
                });
                
                return {
                    success: true,
                    deleted: result
                };
            } catch (error) {
                request.log.error('Ошибка при удалении нескольких туров:', error);
                return reply.code(500).send({
                    error: 'Ошибка сервера при удалении туров',
                    code: 'SERVER_ERROR'
                });
            }
        });
    });
}

module.exports = tourRoutes;