// Контроллер panoramas.js выглядит хорошо, но давайте добавим дополнительную обработку ошибок и логирование
// Также можно улучшить валидацию загружаемых файлов

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const util = require('util');
const stream = require('stream');
const pump = util.promisify(stream.pipeline);
const { models } = require('../models');

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
    if (tour.userId !== userId) {
      return reply.code(403).send({
        error: 'Доступ запрещен',
        code: 'ACCESS_DENIED'
      });
    }
    
    // Получаем панорамы тура
    const panoramas = await models.Panorama.findAll({
      where: { tourId },
      order: [['createdAt', 'ASC']]
    });
    
    return panoramas;
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
    if (tour.userId !== userId) {
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
    
    // Создаем новую панораму в базе данных
    const newPanorama = await models.Panorama.create({
      tourId,
      name: data.filename.replace(fileExtension, ''), // Используем оригинальное имя файла без расширения
      filename,
      status: 'active',
      fileSize: data.file.bytesRead,
      mimeType: data.mimetype
    });
    
    // Если это первая панорама, устанавливаем ее как стартовую
    const panoramasCount = await models.Panorama.count({ where: { tourId } });
    if (panoramasCount === 1) {
      const settings = tour.settings || {};
      settings.startPanorama = newPanorama.id;
      await tour.update({ settings });
    }
    
    return newPanorama;
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
    if (tour.userId !== userId) {
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
    
    // Обновляем панораму
    await panorama.update(updates);
    
    return panorama;
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
      if (tour.userId !== userId) {
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
      
      // Удаляем файл
      const filepath = path.join(uploadsDir, panorama.filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      
      // Если это была стартовая панорама, обновляем настройки тура
      if (tour.settings && tour.settings.startPanorama === panoramaId) {
        // Находим другую активную панораму
        const { Op } = require('sequelize');
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
      const { Op } = require('sequelize');
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
      
      return { success: true };
    } catch (error) {
      request.log.error('Ошибка при удалении панорамы:', error);
      return reply.code(500).send({
        error: 'Ошибка сервера при удалении панорамы',
        code: 'SERVER_ERROR'
      });
    }
}

module.exports = {
  getPanoramas,
  uploadPanorama,
  updatePanorama,
  deletePanorama
};