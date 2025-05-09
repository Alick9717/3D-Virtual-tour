const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Hotspot = sequelize.define('Hotspot', {
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
          msg: 'Название хотспота не может быть пустым'
        },
        len: {
          args: [1, 100],
          msg: 'Название хотспота должно быть от 1 до 100 символов'
        }
      }
    },
    // Тип хотспота (scene - переход на другую панораму, info - информация)
    type: {
      type: DataTypes.ENUM('scene', 'info'),
      defaultValue: 'scene',
      validate: {
        isIn: {
          args: [['scene', 'info']],
          msg: 'Тип хотспота должен быть scene или info'
        }
      }
    },
    // Позиция хотспота (сферические координаты)
    position: {
      type: DataTypes.JSONB,
      defaultValue: {
        x: 0, // yaw - горизонтальный угол (-180 до 180)
        y: 0, // pitch - вертикальный угол (-90 до 90)
        z: 0  // дополнительный параметр для специальных случаев
      },
      validate: {
        isValidPosition(value) {
          if (typeof value !== 'object' || value === null) {
            throw new Error('Позиция должна быть объектом');
          }
          
          if (value.x === undefined || typeof value.x !== 'number' || value.x < -180 || value.x > 180) {
            throw new Error('x (yaw) должен быть числом в диапазоне -180 до 180');
          }
          
          if (value.y === undefined || typeof value.y !== 'number' || value.y < -90 || value.y > 90) {
            throw new Error('y (pitch) должен быть числом в диапазоне -90 до 90');
          }
          
          if (value.z !== undefined && typeof value.z !== 'number') {
            throw new Error('z должен быть числом');
          }
        }
      }
    },
    // Дополнительная информация о хотспоте
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // CSS-класс для хотспота (для кастомного отображения)
    cssClass: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Дополнительные параметры для хотспота
    parameters: {
      type: DataTypes.JSONB,
      defaultValue: {
        tooltip: true,   // Показывать всплывающую подсказку
        tooltipArrow: true, // Показывать стрелку в подсказке
        tooltipDelay: 200,  // Задержка перед показом подсказки (мс)
        scaleToContainer: true, // Масштабировать размер под контейнер
        clickable: true    // Можно ли кликнуть по хотспоту
      },
      validate: {
        isValidParameters(value) {
          if (typeof value !== 'object' || value === null) {
            throw new Error('Параметры должны быть объектом');
          }
          
          if (value.tooltip !== undefined && typeof value.tooltip !== 'boolean') {
            throw new Error('tooltip должен быть логическим значением');
          }
          
          if (value.tooltipArrow !== undefined && typeof value.tooltipArrow !== 'boolean') {
            throw new Error('tooltipArrow должен быть логическим значением');
          }
          
          if (value.tooltipDelay !== undefined && (typeof value.tooltipDelay !== 'number' || value.tooltipDelay < 0)) {
            throw new Error('tooltipDelay должен быть положительным числом');
          }
          
          if (value.scaleToContainer !== undefined && typeof value.scaleToContainer !== 'boolean') {
            throw new Error('scaleToContainer должен быть логическим значением');
          }
          
          if (value.clickable !== undefined && typeof value.clickable !== 'boolean') {
            throw new Error('clickable должен быть логическим значением');
          }
        }
      }
    }
  }, {
    timestamps: true,
    tableName: 'hotspots'
  });

  // Определяем ассоциации
  Hotspot.associate = (models) => {
    // Хотспот принадлежит туру
    Hotspot.belongsTo(models.Tour, {
      foreignKey: 'tourId',
      as: 'tour',
      onDelete: 'CASCADE' // Если удаляется тур, удаляются и его хотспоты
    });
    
    // Хотспот принадлежит панораме (источник)
    Hotspot.belongsTo(models.Panorama, {
      foreignKey: 'panoramaId',
      as: 'panorama',
      onDelete: 'CASCADE' // Если удаляется панорама, удаляются и её хотспоты
    });
    
    // Хотспот может ссылаться на другую панораму (цель)
    Hotspot.belongsTo(models.Panorama, {
      foreignKey: 'targetPanoramaId',
      as: 'targetPanorama'
    });
  };

  // Методы для работы с позицией хотспота
  Hotspot.prototype.setPosition = function(x, y, z = 0) {
    this.position = { x, y, z };
    return this.save();
  };

  // Метод для форматирования данных хотспота для Pannellum
  Hotspot.prototype.toPannellumFormat = function() {
    const result = {
      id: this.id,
      pitch: this.position.y,
      yaw: this.position.x,
      text: this.name,
      type: this.type === 'scene' ? 'scene' : 'info'
    };

    // Добавляем целевую панораму для хотспотов типа 'scene'
    if (this.type === 'scene' && this.targetPanoramaId) {
      result.sceneId = this.targetPanoramaId;
    }

    // Добавляем CSS-класс, если указан
    if (this.cssClass) {
      result.cssClass = this.cssClass;
    }

    // Добавляем контент для хотспотов типа 'info'
    if (this.type === 'info' && this.content) {
      result.content = this.content;
    }

    return result;
  };

  // Статический метод для поиска по туру
  Hotspot.findByTour = function(tourId, options = {}) {
    return this.findAll({
      where: { tourId },
      ...options
    });
  };

  // Статический метод для поиска по панораме
  Hotspot.findByPanorama = function(panoramaId, options = {}) {
    return this.findAll({
      where: { panoramaId },
      ...options
    });
  };

  return Hotspot;
};