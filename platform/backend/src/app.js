const fastify = require('fastify');
const cors = require('@fastify/cors');
const multipart = require('fastify-multipart');
const path = require('path');
const { port } = require('./config/env');
const { syncDatabase } = require('./models');
const authRoutes = require('./routes/auth');
const tourRoutes = require('./routes/tours');
const panoramaRoutes = require('./routes/panoramas');
const hotspotRoutes = require('./routes/hotspots');
const { Op } = require('sequelize');

// Создаем экземпляр Fastify сервера
const server = fastify({
  logger: true
});

// Регистрируем плагин для загрузки файлов
server.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB (максимальный размер файла)
  }
});

// Регистрируем плагин CORS
server.register(cors, {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // URL фронтенда
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
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
  reply.sendFile(filename, path.join(__dirname, '../uploads'));
});

// Корневой маршрут
server.get('/', async () => {
  return { status: 'ok', message: 'Virtual Tour Platform API' };
});

// Глобальный обработчик ошибок
server.setErrorHandler((error, request, reply) => {
  server.log.error(error);
  
  // Обработка ошибок валидации
  if (error.validation) {
    return reply.code(400).send({
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      details: error.validation
    });
  }

  // Обработка других ошибок
  const statusCode = error.statusCode || 500;
  return reply.code(statusCode).send({
    error: error.message || 'Internal Server Error',
    code: error.code || 'INTERNAL_ERROR'
  });
});

// Запуск сервера
const start = async () => {
  try {
    // Синхронизируем базу данных
    await syncDatabase();
    
    // Запускаем сервер
    await server.listen({ port, host: '0.0.0.0' });
    server.log.info(`Server is running on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();