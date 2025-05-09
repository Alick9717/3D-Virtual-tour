const { Sequelize } = require('sequelize');
const config = require('../config/env');
const path = require('path');
const fs = require('fs');

// Создаем инстанс Sequelize в зависимости от выбранного диалекта
let sequelize;

if (config.db.dialect === 'sqlite') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: config.db.path,
    logging: config.isDev ? console.log : false,
    define: {
      timestamps: true // Добавляем createdAt и updatedAt поля ко всем моделям
    }
  });
} else {
  // Для PostgreSQL или других диалектов
  sequelize = new Sequelize(
    config.db.database,
    config.db.username,
    config.db.password,
    {
      host: config.db.host,
      port: config.db.port,
      dialect: config.db.dialect,
      logging: config.isDev ? console.log : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      define: {
        timestamps: true
      }
    }
  );
}

// Объект для хранения моделей
const models = {};

// Импортируем все модели из директории models
// Это позволяет автоматически подключать все модели без необходимости 
// импортировать их вручную при добавлении новых
const modelsDir = path.join(__dirname);
fs.readdirSync(modelsDir)
  .filter(file => file !== 'index.js' && file.endsWith('.js'))
  .forEach(file => {
    const model = require(path.join(modelsDir, file))(sequelize);
    models[model.name] = model;
  });

// Устанавливаем ассоциации между моделями
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Проверка соединения с базой данных
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Соединение с базой данных успешно установлено.');
    return true;
  } catch (error) {
    console.error('Ошибка при соединении с базой данных:', error);
    return false;
  }
}

// Функция для синхронизации моделей с базой данных
async function syncDatabase(forceSync = false) {
  try {
    // Опция force: true удалит все таблицы и создаст их заново
    // В продакшене нужно использовать с осторожностью
    // alter: true позволяет изменять существующие таблицы
    const syncOptions = config.isDev
      ? { alter: true }
      : { alter: false };

    // Если принудительная синхронизация активирована
    if (forceSync) {
      syncOptions.force = true;
    }

    await sequelize.sync(syncOptions);
    console.log('Модели синхронизированы с базой данных');
    return true;
  } catch (error) {
    console.error('Ошибка при синхронизации моделей с базой данных:', error);
    throw error;
  }
}

// Создаем директорию для БД, если она не существует
const dbDir = path.dirname(config.db.path);
if (config.db.dialect === 'sqlite' && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

module.exports = {
  sequelize,
  models,
  testConnection,
  syncDatabase,
  Sequelize
};