const { DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');
const config = require('../config/env');

module.exports = (sequelize) => {
  const Panorama = sequelize.define('Panorama', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Название панорамы не может быть пустым'
        },
        len: {
          args: [1, 100],
          msg: 'Название панорамы должно быть от 1 до 100 символов'
        }
      }
    },
    // Имя файла панорамы в хранилище
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Имя файла не может быть пустым'
        }
      }
    },
    // Статус панорамы (активная или неактивная)
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active',
      allowNull: false,
      validate: {
        isIn: {
          args: [['active', 'inactive']],
          msg: 'Статус должен быть active или inactive'
        }
      }
    },
    // Размер файла в байтах
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // MIME-тип файла
    mimeType: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isValidMimeType(value) {
          const allowedTypes = config.upload.allowedMimeTypes;
          if (value && !allowedTypes.includes(value)) {
            throw new Error(`MIME-тип должен быть одним из следующих: ${allowedTypes.join(', ')}`);
          }
        }
      }
    },
    // Дополнительные метаданные панорамы
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {
        fov: 75,           // Field of view - угол обзора
        initialYaw: 0,     // Начальный угол поворота
        initialPitch: 0,   // Начальный угол наклона
        showZoomCtrl: true, // Показывать элементы управления зумом
        autoLoad: true     // Автоматическая загрузка
      },
      validate: {
        isValidMetadata(value) {
          if (typeof value !== 'object' || value === null) {
            throw new Error('Метаданные должны быть объектом');
          }
          
          // Проверка числовых значений на корректность
          if (value.fov !== undefined && (typeof value.fov !== 'number' || value.fov < 40 || value.fov > 120)) {
            throw new Error('fov должен быть числом в диапазоне 40-120');
          }
          
          if (value.initialYaw !== undefined && (typeof value.initialYaw !== 'number' || value.initialYaw < -180 || value.initialYaw > 180)) {
            throw new Error('initialYaw должен быть числом в диапазоне -180 до 180');
          }
          
          if (value.initialPitch !== undefined && (typeof value.initialPitch !== 'number' || value.initialPitch < -90 || value.initialPitch > 90)) {
            throw new Error('initialPitch должен быть числом в диапазоне -90 до 90');
          }
          
          // Проверка булевых значений
          if (value.showZoomCtrl !== undefined && typeof value.showZoomCtrl !== 'boolean') {
            throw new Error('showZoomCtrl должен быть логическим значением');
          }
          
          if (value.autoLoad !== undefined && typeof value.autoLoad !== 'boolean') {
            throw new Error('autoLoad должен быть логическим значением');
          }
        }
      }
    },
    // Порядок отображения в списке панорам
    displayOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    }
  }, {
    timestamps: true,
    tableName: 'panoramas',
    hooks: {
      // Перед удалением панорамы удаляем файл
      beforeDestroy: async (panorama) => {
        try {
          const filePath = path.join(config.upload.dir, panorama.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Удален файл: ${filePath}`);
          }
        } catch (error) {
          console.error(`Ошибка при удалении файла: ${error.message}`);
          // Не прерываем процесс удаления панорамы, даже если файл не удалось удалить
        }
      }
    }
  });

  // Определяем ассоциации
  Panorama.associate = (models) => {
    // Панорама принадлежит туру
    Panorama.belongsTo(models.Tour, {
      foreignKey: 'tourId',
      as: 'tour',
      onDelete: 'CASCADE' // Если удаляется тур, удаляются и его панорамы
    });
    
    // У панорамы может быть много хотспотов
    Panorama.hasMany(models.Hotspot, {
      foreignKey: 'panoramaId',
      as: 'hotspots',
      onDelete: 'CASCADE' // Если удаляется панорама, удаляются и её хотспоты
    });
    
    // Панорама может быть целью для хотспотов
    Panorama.hasMany(models.Hotspot, {
      foreignKey: 'targetPanoramaId',
      as: 'targetForHotspots'
    });
  };

  // Получить полный URL к файлу панорамы
  Panorama.prototype.getFileUrl = function(baseUrl = '') {
    return `${baseUrl}/uploads/${this.filename}`;
  };

  // Получить полный путь к файлу панорамы на сервере
  Panorama.prototype.getFilePath = function() {
    return path.join(config.upload.dir, this.filename);
  };

  // Проверить существование файла
  Panorama.prototype.fileExists = function() {
    return fs.existsSync(this.getFilePath());
  };

  // Обновить метаданные панорамы
  Panorama.prototype.updateMetadata = function(newMetadata) {
    const currentMetadata = this.metadata || {};
    this.metadata = { ...currentMetadata, ...newMetadata };
    return this.save();
  };

  // Статический метод для поиска по туру
  Panorama.findByTour = function(tourId, options = {}) {
    return this.findAll({
      where: { tourId },
      order: [['displayOrder', 'ASC'], ['createdAt', 'ASC']],
      ...options
    });
  };

  // Статический метод для получения активных панорам тура
  Panorama.findActiveByTour = function(tourId, options = {}) {
    return this.findAll({
      where: { 
        tourId,
        status: 'active'
      },
      order: [['displayOrder', 'ASC'], ['createdAt', 'ASC']],
      ...options
    });
  };

  return Panorama;
};