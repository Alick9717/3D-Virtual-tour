const fastify = require('fastify');
const cors = require('@fastify/cors');
const multipart = require('fastify-multipart');
const path = require('path');
const { port, server: serverConfig, upload: uploadConfig } = require('./config/env');
const { syncDatabase, testConnection } = require('./models');
const authRoutes = require('./routes/auth');
const tourRoutes = require('./routes/tours');
const panoramaRoutes = require('./routes/panoramas');
const hotspotRoutes = require('./routes/hotspots');
const fs = require('fs');
const util = require('util');
const stream = require('stream');

// Создаем экземпляр Fastify сервера
const server = fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.NODE_ENV !== 'production'
  }
});

// Создаем директорию для загрузок, если она не существует
if (!fs.existsSync(uploadConfig.dir)) {
  fs.mkdirSync(uploadConfig.dir, { recursive: true });
}

// Регистрируем плагин для загрузки файлов
server.register(multipart, {
  limits: {
    fileSize: uploadConfig.maxFileSize // Максимальный размер файла
  }
});

// Регистрируем плагин CORS
server.register(cors, {
  origin: serverConfig.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
});

// Регистрируем маршруты аутентификации
server.register(authRoutes, { prefix: '/auth' });

// Регистрируем маршруты для туров
server.register(tourRoutes, { prefix: '/tours' });

// Регистрируем маршруты для панорам через маршруты туров
server.register(panoramaRoutes, { prefix: '/tours' });

// Регистрируем маршруты для хотспотов через маршруты туров
server.register(hotspotRoutes, { prefix: '/tours' });

// Добавляем обработчик для доступа к загруженным файлам
server.get('/uploads/:filename', (request, reply) => {
  const { filename } = request.params;
  const filepath = path.join(uploadConfig.dir, filename);
  
  // Проверяем, существует ли файл
  if (!fs.existsSync(filepath)) {
    return reply.code(404).send({
      error: 'Файл не найден',
      code: 'FILE_NOT_FOUND'
    });
  }
  
  // Определяем MIME-тип файла на основе расширения
  const ext = path.extname(filename).toLowerCase();
  let contentType = 'application/octet-stream';
  
  if (ext === '.jpg' || ext === '.jpeg') {
    contentType = 'image/jpeg';
  } else if (ext === '.png') {
    contentType = 'image/png';
  }
  
  // Устанавливаем заголовки для кэширования
  reply.header('Cache-Control', 'public, max-age=86400'); // 1 день
  reply.header('Content-Type', contentType);
  
  return reply.sendFile(filename, uploadConfig.dir);
});

// Корневой маршрут
server.get('/', async () => {
  return { 
    status: 'ok', 
    message: 'Virtual Tour Platform API',
    version: '1.0.0'
  };
});

// Маршрут для проверки состояния сервера
server.get('/health', async () => {
  const dbStatus = await testConnection();
  
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
});

// Декоратор для загрузки файлов
server.decorate('uploadFile', async (file, options = {}) => {
  const { filename = file.filename, customPath = '' } = options;
  
  // Определяем директорию для сохранения
  const uploadDir = customPath 
    ? path.join(uploadConfig.dir, customPath) 
    : uploadConfig.dir;
  
  // Создаем директорию, если она не существует
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  // Сохраняем файл
  const pump = util.promisify(stream.pipeline);
  const filepath = path.join(uploadDir, filename);
  await pump(file.file, fs.createWriteStream(filepath));
  
  return {
    filename,
    path: filepath,
    size: fs.statSync(filepath).size,
    mimetype: file.mimetype
  };
});

// Глобальный обработчик ошибок
server.setErrorHandler((error, request, reply) => {
  server.log.error(error);
  
  // Обработка ошибок валидации
  if (error.validation) {
    return reply.code(400).send({
      error: 'Ошибка валидации',
      code: 'VALIDATION_ERROR',
      details: error.validation
    });
  }
  
  // Обработка ошибок загрузки файлов
  if (error.statusCode === 413) {
    return reply.code(413).send({
      error: 'Превышен максимальный размер файла',
      code: 'FILE_TOO_LARGE'
    });
  }
  
  // Обработка других ошибок
  const statusCode = error.statusCode || 500;
  return reply.code(statusCode).send({
    error: error.message || 'Внутренняя ошибка сервера',
    code: error.code || 'INTERNAL_ERROR'
  });
});

// Обработчик для 404 ошибки
server.setNotFoundHandler((request, reply) => {
  reply.code(404).send({
    error: 'Ресурс не найден',
    code: 'NOT_FOUND'
  });
});

// Обработчики сигналов для корректного завершения работы
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, async () => {
    server.log.info(`Получен сигнал ${signal}, завершение работы...`);
    
    try {
      await server.close();
      server.log.info('Сервер успешно остановлен');
      process.exit(0);
    } catch (err) {
      server.log.error('Ошибка при остановке сервера:', err);
      process.exit(1);
    }
  });
});

// Запуск сервера
const start = async () => {
  try {
    // Тестируем соединение с базой данных
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      server.log.error('Не удалось подключиться к базе данных');
      process.exit(1);
    }
    
    // Синхронизируем базу данных
    await syncDatabase();
    
    // Запускаем сервер
    await server.listen({ port, host: serverConfig.host });
    server.log.info(`Сервер запущен на http://${serverConfig.host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();