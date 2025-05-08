const { Sequelize } = require('sequelize');
const { dbPath } = require('../config/env');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false
});

// Импортируем модели
const User = require('./User')(sequelize);
const Tour = require('./Tour')(sequelize);
const Panorama = require('./Panorama')(sequelize);
const Hotspot = require('./Hotspot')(sequelize);

// Устанавливаем ассоциации
const models = {
  User,
  Tour,
  Panorama,
  Hotspot
};

Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Функция для синхронизации базы данных
async function syncDatabase() {
  try {
    // Синхронизируем все модели с базой данных
    await sequelize.sync({ alter: true });
    console.log('Таблицы синхронизированы с базой данных');
  } catch (error) {
    console.error('Ошибка синхронизации базы данных:', error);
    throw error;
  }
}

module.exports = {
  sequelize,
  models,
  syncDatabase
};