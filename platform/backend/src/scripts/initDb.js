const { models, syncDatabase } = require('../models');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const config = require('../config/env');

/**
 * Создание администратора по умолчанию
 */
async function createDefaultAdmin() {
  try {
    // Проверяем, существует ли уже администратор
    const adminExists = await models.User.findOne({
      where: { role: 'admin' }
    });
    
    if (adminExists) {
      console.log('Администратор уже существует, пропускаем создание');
      return;
    }
    
    // Хэшируем пароль администратора
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Создаем администратора
    const admin = await models.User.create({
      id: uuidv4(),
      name: 'Администратор',
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      passwordHash,
      role: 'admin',
      isActive: true
    });
    
    console.log(`Администратор создан с email: ${admin.email}`);
  } catch (error) {
    console.error('Ошибка при создании администратора:', error);
    throw error;
  }
}

/**
 * Создание директорий для файлов
 */
function createDirectories() {
  try {
    // Директория для загрузок
    const uploadsDir = config.upload.dir || path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`Создана директория для загрузок: ${uploadsDir}`);
    }
    
    // Директория для временных файлов
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log(`Создана директория для временных файлов: ${tempDir}`);
    }
    
    // Директория для логов
    const logsDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
      console.log(`Создана директория для логов: ${logsDir}`);
    }
  } catch (error) {
    console.error('Ошибка при создании директорий:', error);
    throw error;
  }
}

/**
 * Проверка и создание примера тура (для разработки)
 */
async function createDemoTourIfNeeded() {
  // Проверяем, находимся ли мы в режиме разработки
  if (process.env.NODE_ENV !== 'development' && !process.env.CREATE_DEMO_TOUR) {
    return;
  }
  
  try {
    // Находим администратора
    const admin = await models.User.findOne({
      where: { role: 'admin' }
    });
    
    if (!admin) {
      console.log('Администратор не найден, пропускаем создание демо-тура');
      return;
    }
    
    // Проверяем, существуют ли уже туры
    const toursCount = await models.Tour.count();
    
    if (toursCount > 0) {
      console.log('Туры уже существуют, пропускаем создание демо-тура');
      return;
    }
    
    // Создаем демо-тур
    const demoTour = await models.Tour.create({
      id: uuidv4(),
      userId: admin.id,
      name: 'Демонстрационный тур',
      objectType: 'apartment',
      description: 'Этот тур создан автоматически для демонстрационных целей.',
      status: 'draft',
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
        }
      }
    });
    
    console.log(`Создан демонстрационный тур с ID: ${demoTour.id}`);
  } catch (error) {
    console.error('Ошибка при создании демонстрационного тура:', error);
    // Не выбрасываем ошибку, так как это не критическая операция
  }
}

/**
 * Основная функция инициализации базы данных
 */
async function initDatabase() {
  try {
    console.log('Начинаем инициализацию базы данных...');
    
    // Создаем необходимые директории
    createDirectories();
    
    // Синхронизируем базу данных с моделями
    await syncDatabase();
    
    // Создаем администратора
    await createDefaultAdmin();
    
    // Создаем демо-тур, если нужно
    await createDemoTourIfNeeded();
    
    console.log('Инициализация базы данных завершена успешно');
  } catch (error) {
    console.error('Ошибка при инициализации базы данных:', error);
    process.exit(1);
  }
}

// Запускаем инициализацию, если скрипт запущен напрямую
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Скрипт инициализации базы данных выполнен успешно');
      process.exit(0);
    })
    .catch(error => {
      console.error('Ошибка при выполнении скрипта инициализации:', error);
      process.exit(1);
    });
} else {
  // Экспортируем функции для использования в других скриптах
  module.exports = {
    initDatabase,
    createDefaultAdmin,
    createDirectories,
    createDemoTourIfNeeded
  };
}