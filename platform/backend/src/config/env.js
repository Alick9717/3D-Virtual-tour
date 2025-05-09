const dotenv = require('dotenv');
const path = require('path');

// Загружаем переменные окружения из .env файла
dotenv.config();

// Определяем окружение (development, production, testing)
const NODE_ENV = process.env.NODE_ENV || 'development';

// Конфигурация базы данных
const DB_CONFIG = {
  // Основная конфигурация
  path: process.env.DB_PATH || path.join(__dirname, '../../database.sqlite'),
  
  // Для PostgreSQL (в будущем)
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  dialect: process.env.DB_DIALECT || 'sqlite' // sqlite, postgres, mysql
};

// Конфигурация сервера
const SERVER_CONFIG = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  apiPrefix: process.env.API_PREFIX || '',
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:5173', 'http://127.0.0.1:5173']
};

// Конфигурация JWT
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'your_default_secret_key',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
};

// Конфигурация для загрузки файлов
const UPLOAD_CONFIG = {
  dir: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
  maxFileSize: process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE) : 10 * 1024 * 1024, // 10 МБ
  allowedMimeTypes: process.env.ALLOWED_MIME_TYPES ? 
    process.env.ALLOWED_MIME_TYPES.split(',') : 
    ['image/jpeg', 'image/jpg', 'image/png']
};

// Экспорт общей конфигурации
module.exports = {
  env: NODE_ENV,
  isDev: NODE_ENV === 'development',
  isProd: NODE_ENV === 'production',
  isTest: NODE_ENV === 'test',
  
  // Экспорт конфигураций по категориям
  db: DB_CONFIG,
  server: SERVER_CONFIG,
  jwt: JWT_CONFIG,
  upload: UPLOAD_CONFIG,
  
  // Прямой доступ к некоторым часто используемым параметрам
  port: SERVER_CONFIG.port,
  jwtSecret: JWT_CONFIG.secret,
  jwtExpiresIn: JWT_CONFIG.expiresIn,
  dbPath: DB_CONFIG.path,
  uploadsDir: UPLOAD_CONFIG.dir
};