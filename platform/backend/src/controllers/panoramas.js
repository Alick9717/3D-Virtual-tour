const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const util = require('util');
const stream = require('stream');
const pump = util.promisify(stream.pipeline);
const { models } = require('../models');
const { Op } = require('sequelize');

// Директория для сохранения загруженных файлов
const uploadsDir = path.join(__dirname, '../../uploads');

// Создаем директорию для загрузок, если она не существует
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Получение списка панорам для тура
 * @param {Object} request - Объект запроса Fastify
 * @param {Object} reply - Объект ответа Fastify
 */
async function getPanoramas(request, reply) {
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
    if (tour.userId !== userId && request.user.role !== 'admin') {
      return reply.code(403).send({
        error: 'Доступ запрещен',
        code: 'ACCESS_DENIED'
      });
    }
    
    // Получаем панорамы тура
    const panoramas = await models.Panorama.findAll({
      where: { tourId },
      order: [['displayOrder', 'ASC'], ['createdAt', 'ASC']]
    });
    
    // Добавляем URL к каждой панораме
    const panoramasWithUrls = panoramas.map(panorama => {
      const panoramaData = panorama.toJSON();
      panoramaData.url = `/uploads/${panorama.filename}`;
      return panoramaData;
    });
    
    return panoramasWithUrls;
  } catch (error) {
    request.log.error('Ошибка при получении списка панорам:', error);
    return reply.code(500).send({
      error: 'Ошибка сервера при получении списка панорам',
      code: 'SERVER_ERROR'
    });
  }
}

/**
 * Загрузка новой панорамы
 * @param {Object} request - Объект запроса Fastify
 * @param {Object} reply - Объект ответа Fastify
 */
async function uploadPanorama(request, reply) {
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
    if (tour.userId !== userId && request.user.role !== 'admin') {
      return reply.code(403).send({
        error: 'Доступ запрещен',
        code: 'ACCESS_DENIED'
      });
    }
    
    const data = await request.file();
    
    if (!data) {
      return reply.code(400).send({
        error: 'Файл не найден',
        code: 'FILE_NOT_FOUND'
      });
    }
    
    // Проверяем тип файла (только изображения)
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedMimeTypes.includes(data.mimetype)) {
      return reply.code(400).send({
        error: 'Неподдерживаемый тип файла. Разрешены только JPEG и PNG',
        code: 'INVALID_FILE_TYPE'
      });
    }
    
    // Генерируем уникальное имя файла
    const fileId = uuidv4();
    const fileExtension = path.extname(data.filename);
    const filename = `${fileId}${fileExtension}`;
    const filepath = path.join(uploadsDir, filename);
    
    // Сохраняем файл
    await pump(data.file, fs.createWriteStream(filepath));
    
    // Получаем размер файла
    const stats = fs.statSync(filepath);
    const fileSize = stats.size;
    
    // Получаем все существующие панорамы для определения порядка отображения
    const panoramasCount = await models.Panorama.count({ where: { tourId } });
    
    // Создаем новую панораму в базе данных
    const newPanorama = await models.Panorama.create({
      tourId,
      name: data.filename.replace(fileExtension, ''), // Используем оригинальное имя файла без расширения
      filename,
      status: 'active',
      mimeType: data.mimetype,
      fileSize,
      displayOrder: panoramasCount // Новая панорама будет последней в списке
    });
    
    // Если это первая панорама, устанавливаем ее как стартовую
    if (panoramasCount === 0) {
      const settings = tour.settings || {};
      settings.startPanorama = newPanorama.id;
      await tour.update({ settings });
    }
    
    // Добавляем URL панорамы для ответа
    const panoramaData = newPanorama.toJSON();
    panoramaData.url = `/uploads/${panoramaData.filename}`;
    
    return panoramaData;
  } catch (error) {
    request.log.error('Ошибка при загрузке панорамы:', error);
    return reply.code(500).send({
      error: 'Ошибка сервера при загрузке панорамы',
      code: 'SERVER_ERROR'
    });
  }
}

/**
 * Обновление информации о панораме
 * @param {Object} request - Объект запроса Fastify
 * @param {Object} reply - Объект ответа Fastify
 */
async function updatePanorama(request, reply) {
  try {
    const userId = request.user.id;
    const tourId = request.params.tourId;
    const panoramaId = request.params.panoramaId;
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
    if (tour.userId !== userId && request.user.role !== 'admin') {
      return reply.code(403).send({
        error: 'Доступ запрещен',
        code: 'ACCESS_DENIED'
      });
    }
    
    // Ищем панораму
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
    
    // Если обновляется статус и панорама становится неактивной,
    // проверяем, есть ли другие активные панорамы
    if (updates.status === 'inactive' && panorama.status === 'active') {
      // Если это стартовая панорама тура, нужно выбрать другую
      if (tour.settings && tour.settings.startPanorama === panoramaId) {
        // Находим другую активную панораму
        const anotherPanorama = await models.Panorama.findOne({
          where: {
            tourId,
            id: { [Op.ne]: panoramaId },
            status: 'active'
          }
        });
        
        // Если другой активной панорамы нет, нельзя сделать эту неактивной
        if (!anotherPanorama) {
          return reply.code(400).send({
            error: 'Невозможно деактивировать стартовую панораму, так как нет других активных панорам',
            code: 'CANNOT_DEACTIVATE_START_PANORAMA'
          });
        }
        
        // Обновляем стартовую панораму
        const settings = { ...tour.settings };
        settings.startPanorama = anotherPanorama.id;
        await tour.update({ settings });
      }
    }
    
    // Обрабатываем обновление метаданных
    if (updates.metadata) {
      updates.metadata = {
        ...panorama.metadata,
        ...updates.metadata
      };
    }
    
    // Обновляем панораму
    await panorama.update(updates);
    
    // Добавляем URL панорамы для ответа
    const updatedPanoramaData = panorama.toJSON();
    updatedPanoramaData.url = `/uploads/${panorama.filename}`;
    
    return updatedPanoramaData;
  } catch (error) {
    request.log.error('Ошибка при обновлении панорамы:', error);
    return reply.code(500).send({
      error: 'Ошибка сервера при обновлении панорамы',
      code: 'SERVER_ERROR'
    });
  }
}

/**
 * Удаление панорамы
 * @param {Object} request - Объект запроса Fastify
 * @param {Object} reply - Объект ответа Fastify
 */
async function deletePanorama(request, reply) {
  try {
    const userId = request.user.id;
    const tourId = request.params.tourId;
    const panoramaId = request.params.panoramaId;
    
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
    if (tour.userId !== userId && request.user.role !== 'admin') {
      return reply.code(403).send({
        error: 'Доступ запрещен',
        code: 'ACCESS_DENIED'
      });
    }
    
    // Ищем панораму
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
    
    // Проверяем, если это единственная активная панорама и тур опубликован
    if (panorama.status === 'active' && tour.status === 'published') {
      const activeCount = await models.Panorama.count({
        where: {
          tourId,
          status: 'active'
        }
      });
      
      if (activeCount === 1) {
        return reply.code(400).send({
          error: 'Невозможно удалить единственную активную панораму опубликованного тура',
          code: 'CANNOT_DELETE_ONLY_ACTIVE_PANORAMA'
        });
      }
    }
    
    // Удаляем файл
    const filepath = path.join(uploadsDir, panorama.filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
    
    // Если это была стартовая панорама, обновляем настройки тура
    if (tour.settings && tour.settings.startPanorama === panoramaId) {
      // Находим другую активную панораму
      const anotherPanorama = await models.Panorama.findOne({
        where: {
          tourId,
          id: { [Op.ne]: panoramaId },
          status: 'active'
        }
      });
      
      const settings = { ...tour.settings };
      settings.startPanorama = anotherPanorama ? anotherPanorama.id : null;
      await tour.update({ settings });
    }
    
    // Удаляем все хотспоты, связанные с этой панорамой
    await models.Hotspot.destroy({
      where: {
        [Op.or]: [
          { panoramaId },
          { targetPanoramaId: panoramaId }
        ]
      }
    });
    
    // Удаляем панораму
    await panorama.destroy();
    
    // Перестраиваем порядок отображения оставшихся панорам
    const remainingPanoramas = await models.Panorama.findAll({
      where: { tourId },
      order: [['displayOrder', 'ASC']]
    });
    
    // Обновляем порядок отображения
    for (let i = 0; i < remainingPanoramas.length; i++) {
      await remainingPanoramas[i].update({ displayOrder: i });
    }
    
    return { success: true };
  } catch (error) {
    request.log.error('Ошибка при удалении панорамы:', error);
    return reply.code(500).send({
      error: 'Ошибка сервера при удалении панорамы',
      code: 'SERVER_ERROR'
    });
  }
}

/**
 * Обновление порядка отображения панорам
 * @param {Object} request - Объект запроса Fastify
 * @param {Object} reply - Объект ответа Fastify
 */
async function updatePanoramaOrder(request, reply) {
  try {
    const userId = request.user.id;
    const tourId = request.params.tourId;
    const { panoramaIds } = request.body;
    
    // Проверяем, что массив ID панорам передан
    if (!Array.isArray(panoramaIds) || panoramaIds.length === 0) {
      return reply.code(400).send({
        error: 'Не предоставлен список ID панорам',
        code: 'INVALID_PANORAMA_IDS'
      });
    }
    
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
    if (tour.userId !== userId && request.user.role !== 'admin') {
      return reply.code(403).send({
        error: 'Доступ запрещен',
        code: 'ACCESS_DENIED'
      });
    }
    
    // Получаем все панорамы тура
    const tourPanoramas = await models.Panorama.findAll({
      where: { tourId }
    });
    
    // Проверяем, что все ID из запроса соответствуют панорамам тура
    const tourPanoramaIds = tourPanoramas.map(p => p.id);
    const allPanoramasExist = panoramaIds.every(id => tourPanoramaIds.includes(id));
    
    if (!allPanoramasExist) {
      return reply.code(400).send({
        error: 'Некоторые ID панорам не принадлежат данному туру',
        code: 'INVALID_PANORAMA_IDS'
      });
    }
    
    // Проверяем, что количество ID совпадает с количеством панорам
    if (panoramaIds.length !== tourPanoramas.length) {
      return reply.code(400).send({
        error: 'Количество ID панорам не совпадает с количеством панорам в туре',
        code: 'INVALID_PANORAMA_COUNT'
      });
    }
    
    // Обновляем порядок отображения для каждой панорамы
    for (let i = 0; i < panoramaIds.length; i++) {
      const panoramaId = panoramaIds[i];
      const panorama = tourPanoramas.find(p => p.id === panoramaId);
      await panorama.update({ displayOrder: i });
    }
    
    // Получаем обновленный список панорам
    const updatedPanoramas = await models.Panorama.findAll({
      where: { tourId },
      order: [['displayOrder', 'ASC']]
    });
    
    // Добавляем URL к каждой панораме
    const panoramasWithUrls = updatedPanoramas.map(panorama => {
      const panoramaData = panorama.toJSON();
      panoramaData.url = `/uploads/${panorama.filename}`;
      return panoramaData;
    });
    
    return panoramasWithUrls;
  } catch (error) {
    request.log.error('Ошибка при обновлении порядка отображения панорам:', error);
    return reply.code(500).send({
      error: 'Ошибка сервера при обновлении порядка отображения панорам',
      code: 'SERVER_ERROR'
    });
  }
}

module.exports = {
  getPanoramas,
  uploadPanorama,
  updatePanorama,
  deletePanorama,
  updatePanoramaOrder
};