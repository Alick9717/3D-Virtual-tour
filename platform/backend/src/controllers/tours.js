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
    const status = request.query.status;
    const objectType = request.query.objectType;
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
    
    // Добавляем фильтрацию по статусу, если указан
    if (status) {
      whereCondition.status = status;
    }
    
    // Добавляем фильтрацию по типу объекта, если указан
    if (objectType) {
      whereCondition.objectType = objectType;
    }
    
    // Определяем порядок сортировки
    const order = [[sortField, sortOrder.toUpperCase()]];
    
    // Запрос к базе данных
    const { rows: tours, count: totalTours } = await models.Tour.findAndCountAll({
      where: whereCondition,
      order,
      limit,
      offset,
      include: [
        {
          model: models.Panorama,
          as: 'panoramas',
          attributes: ['id', 'name', 'status', 'filename'],
          required: false
        }
      ],
      distinct: true // Для корректного подсчета с включенными связями
    });
    
    // Рассчитываем общее количество страниц
    const totalPages = Math.ceil(totalTours / limit);
    
    // Форматируем туры для ответа
    const formattedTours = tours.map(tour => {
      const tourData = tour.toJSON();
      
      // Добавляем URL для первой панорамы (если есть)
      if (tourData.panoramas && tourData.panoramas.length > 0) {
        tourData.panoramas.forEach(panorama => {
          panorama.previewUrl = `/uploads/${panorama.filename}`;
        });
        tourData.previewUrl = `/uploads/${tourData.panoramas[0].filename}`;
      } else {
        tourData.previewUrl = null;
      }
      
      // Добавляем количество панорам
      tourData.panoramasCount = tourData.panoramas.length;
      
      return tourData;
    });
    
    // Формируем ответ
    return {
      tours: formattedTours,
      pagination: {
        totalTours,
        totalPages,
        currentPage: page,
        limit
      },
      filters: {
        search,
        status,
        objectType,
        sortField,
        sortOrder
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
        },
        {
          model: models.User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'avatar']
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
    
    // Проверяем, принадлежит ли тур пользователю или является ли пользователь администратором
    if (tour.userId !== userId && request.user.role !== 'admin') {
      // Если тур опубликован, разрешаем просмотр
      if (tour.status !== 'published') {
        return reply.code(403).send({
          error: 'Доступ запрещен',
          code: 'ACCESS_DENIED'
        });
      }
    }
    
    // Преобразуем данные для ответа
    const tourData = tour.toJSON();
    
    // Добавляем полные URL для панорам
    if (tourData.panoramas && tourData.panoramas.length > 0) {
      tourData.panoramas.forEach(panorama => {
        panorama.url = `/uploads/${panorama.filename}`;
      });
    }
    
    // Добавляем статистику просмотров (в будущем можно добавить отдельную таблицу для статистики)
    tourData.viewsStats = {
      totalViews: 0, // Здесь будут данные из статистики
      uniqueVisitors: 0,
      averageViewTime: 0
    };
    
    return tourData;
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
    const { name, objectType, description, tags } = request.body;
    
    // Дополнительная валидация
    if (!name || name.trim().length === 0) {
      return reply.code(400).send({
        error: 'Название тура не может быть пустым',
        code: 'INVALID_NAME'
      });
    }
    
    if (!objectType) {
      return reply.code(400).send({
        error: 'Тип объекта обязателен',
        code: 'INVALID_OBJECT_TYPE'
      });
    }
    
    // Создаем новый тур
    const newTour = await models.Tour.create({
      userId,
      name,
      objectType,
      description: description || '',
      status: 'draft',
      tags: tags || [],
      settings: {
        logo: 'standard',
        startPanorama: null,
        controls: {
          zoom: true,
          rotate: true,
          fullscreen: true
        },
        display: {
          title: true,
          compass: true,
          hotspotTooltips: true
        },
        sharing: {
          enabled: true,
          platforms: ['facebook', 'twitter', 'email']
        }
      }
    });
    
    // Возвращаем созданный тур
    return {
      id: newTour.id,
      name: newTour.name,
      objectType: newTour.objectType,
      description: newTour.description,
      status: newTour.status,
      tags: newTour.tags,
      settings: newTour.settings,
      createdAt: newTour.createdAt,
      updatedAt: newTour.updatedAt
    };
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
    
    // Проверяем, принадлежит ли тур пользователю или является ли пользователь администратором
    if (tour.userId !== userId && request.user.role !== 'admin') {
      return reply.code(403).send({
        error: 'Доступ запрещен',
        code: 'ACCESS_DENIED'
      });
    }
    
    // Если пытаемся изменить статус на "published", проверяем наличие панорам
    if (updates.status === 'published') {
      const panoramasCount = await models.Panorama.count({ 
        where: { tourId, status: 'active' }
      });
      
      if (panoramasCount === 0) {
        return reply.code(400).send({
          error: 'Невозможно опубликовать тур без активных панорам',
          code: 'NO_PANORAMAS'
        });
      }
    }
    
    // Обрабатываем обновление настроек
    if (updates.settings) {
      // Если передан объект с определенными полями, мержим их с существующими настройками
      updates.settings = {
        ...tour.settings,
        ...updates.settings
      };
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
    
    // Проверяем, принадлежит ли тур пользователю или является ли пользователь администратором
    if (tour.userId !== userId && request.user.role !== 'admin') {
      return reply.code(403).send({
        error: 'Доступ запрещен',
        code: 'ACCESS_DENIED'
      });
    }
    
    // Удаляем все связанные хотспоты
    await models.Hotspot.destroy({
      where: { tourId }
    });
    
    // Получаем все панорамы тура для удаления файлов
    const panoramas = await models.Panorama.findAll({
      where: { tourId },
      attributes: ['id', 'filename']
    });
    
    // Удаляем все панорамы
    await models.Panorama.destroy({
      where: { tourId }
    });
    
    // Удаляем файлы панорам (здесь нужно реализовать удаление физических файлов)
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, '../../uploads');
    
    for (const panorama of panoramas) {
      const filePath = path.join(uploadsDir, panorama.filename);
      
      // Проверяем существование файла и удаляем его
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Удаляем тур
    await tour.destroy();
    
    return { 
      success: true,
      message: 'Тур успешно удален'
    };
  } catch (error) {
    request.log.error('Ошибка при удалении тура:', error);
    return reply.code(500).send({
      error: 'Ошибка сервера при удалении тура',
      code: 'SERVER_ERROR'
    });
  }
}

/**
 * Получение общей статистики туров пользователя
 * @param {Object} request - Объект запроса Fastify
 * @param {Object} reply - Объект ответа Fastify
 */
async function getToursStats(request, reply) {
  try {
    const userId = request.user.id;
    
    // Общая статистика по турам
    const totalTours = await models.Tour.count({
      where: { userId }
    });
    
    // Статистика по статусам
    const toursByStatus = await models.Tour.findAll({
      attributes: [
        'status', 
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { userId },
      group: ['status']
    });
    
    // Статистика по типам объектов
    const toursByObjectType = await models.Tour.findAll({
      attributes: [
        'objectType', 
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { userId },
      group: ['objectType']
    });
    
    // Общее количество панорам
    const totalPanoramas = await models.Panorama.count({
      include: [{
        model: models.Tour,
        as: 'tour',
        where: { userId }
      }]
    });
    
    // Статистика по последним созданным турам (последние 5)
    const recentTours = await models.Tour.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'name', 'status', 'createdAt']
    });
    
    return {
      totalTours,
      toursByStatus: Object.fromEntries(
        toursByStatus.map(item => [item.status, item.get('count')])
      ),
      toursByObjectType: Object.fromEntries(
        toursByObjectType.map(item => [item.objectType, item.get('count')])
      ),
      totalPanoramas,
      recentTours
    };
  } catch (error) {
    request.log.error('Ошибка при получении статистики туров:', error);
    return reply.code(500).send({
      error: 'Ошибка сервера при получении статистики туров',
      code: 'SERVER_ERROR'
    });
  }
}

/**
 * Копирование тура
 * @param {Object} request - Объект запроса Fastify
 * @param {Object} reply - Объект ответа Fastify
 */
async function duplicateTour(request, reply) {
  try {
    const userId = request.user.id;
    const tourId = request.params.id;
    
    // Ищем исходный тур
    const sourceTour = await models.Tour.findByPk(tourId, {
      include: [
        {
          model: models.Panorama,
          as: 'panoramas'
        },
        {
          model: models.Hotspot,
          as: 'hotspots'
        }
      ]
    });
    
    // Проверяем, существует ли тур
    if (!sourceTour) {
      return reply.code(404).send({
        error: 'Тур не найден',
        code: 'TOUR_NOT_FOUND'
      });
    }
    
    // Проверяем, принадлежит ли тур пользователю или является ли пользователь администратором
    if (sourceTour.userId !== userId && request.user.role !== 'admin') {
      return reply.code(403).send({
        error: 'Доступ запрещен',
        code: 'ACCESS_DENIED'
      });
    }
    
    // Создаем новый тур (копию)
    const newTour = await models.Tour.create({
      userId,
      name: `${sourceTour.name} (копия)`,
      objectType: sourceTour.objectType,
      description: sourceTour.description,
      status: 'draft', // Всегда ставим статус "черновик" для копии
      tags: sourceTour.tags,
      settings: sourceTour.settings
    });
    
    // Копируем панорамы
    if (sourceTour.panoramas && sourceTour.panoramas.length > 0) {
      const fs = require('fs');
      const path = require('path');
      const { v4: uuidv4 } = require('uuid');
      const uploadsDir = path.join(__dirname, '../../uploads');
      
      const panoramaMap = {}; // Для соответствия ID старых и новых панорам
      
      for (const panorama of sourceTour.panoramas) {
        // Создаем копию файла с новым именем
        const sourceFilePath = path.join(uploadsDir, panorama.filename);
        const fileExtension = path.extname(panorama.filename);
        const newFilename = `${uuidv4()}${fileExtension}`;
        const newFilePath = path.join(uploadsDir, newFilename);
        
        if (fs.existsSync(sourceFilePath)) {
          fs.copyFileSync(sourceFilePath, newFilePath);
          
          // Создаем новую запись о панораме
          const newPanorama = await models.Panorama.create({
            tourId: newTour.id,
            name: panorama.name,
            filename: newFilename,
            status: panorama.status
          });
          
          // Сохраняем соответствие ID
          panoramaMap[panorama.id] = newPanorama.id;
        }
      }
      
      // Копируем хотспоты с учетом обновленных ID панорам
      if (sourceTour.hotspots && sourceTour.hotspots.length > 0) {
        for (const hotspot of sourceTour.hotspots) {
          // Пропускаем хотспоты, для которых нет соответствующих панорам в новом туре
          if (!panoramaMap[hotspot.panoramaId]) continue;
          
          // Определяем целевую панораму для хотспота
          const targetPanoramaId = hotspot.targetPanoramaId 
            ? panoramaMap[hotspot.targetPanoramaId] 
            : null;
          
          await models.Hotspot.create({
            tourId: newTour.id,
            panoramaId: panoramaMap[hotspot.panoramaId],
            targetPanoramaId,
            name: hotspot.name,
            position: hotspot.position
          });
        }
      }
      
      // Обновляем стартовую панораму в настройках, если она есть
      if (newTour.settings && newTour.settings.startPanorama) {
        const startPanoramaId = newTour.settings.startPanorama;
        
        if (panoramaMap[startPanoramaId]) {
          await newTour.update({
            settings: {
              ...newTour.settings,
              startPanorama: panoramaMap[startPanoramaId]
            }
          });
        }
      }
    }
    
    // Получаем созданный тур со всеми связями
    const createdTour = await models.Tour.findByPk(newTour.id, {
      include: [
        {
          model: models.Panorama,
          as: 'panoramas'
        },
        {
          model: models.Hotspot,
          as: 'hotspots'
        }
      ]
    });
    
    return createdTour;
  } catch (error) {
    request.log.error('Ошибка при дублировании тура:', error);
    return reply.code(500).send({
      error: 'Ошибка сервера при дублировании тура',
      code: 'SERVER_ERROR'
    });
  }
}

module.exports = {
  getTours,
  getTourById,
  createTour,
  updateTour,
  deleteTour,
  getToursStats,
  duplicateTour
};