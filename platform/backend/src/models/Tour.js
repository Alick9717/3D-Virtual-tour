const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Tour = sequelize.define('Tour', {
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
          msg: 'Название тура не может быть пустым'
        },
        len: {
          args: [1, 100],
          msg: 'Название тура должно быть от 1 до 100 символов'
        }
      }
    },
    objectType: {
      type: DataTypes.ENUM('apartment', 'house', 'office', 'commercial'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['apartment', 'house', 'office', 'commercial']],
          msg: 'Тип объекта должен быть apartment, house, office или commercial'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('draft', 'ready', 'published'),
      defaultValue: 'draft',
      allowNull: false,
      validate: {
        isIn: {
          args: [['draft', 'ready', 'published']],
          msg: 'Статус должен быть draft, ready или published'
        }
      }
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {
        logo: 'standard',   // standard, none, custom
        startPanorama: null, // ID стартовой панорамы
        autoRotate: false,  // Автоматическое вращение
        compass: true,      // Показывать компас
        hotSpotDebug: false // Режим отладки хотспотов
      },
      validate: {
        isValidSettings(value) {
          // Проверяем, что settings - это объект
          if (typeof value !== 'object' || value === null) {
            throw new Error('Настройки должны быть объектом');
          }
          
          // Проверяем поле logo
          if (value.logo && !['standard', 'none', 'custom'].includes(value.logo)) {
            throw new Error('Logo должен быть standard, none или custom');
          }
          
          // Проверяем autoRotate (если есть)
          if (value.autoRotate !== undefined && typeof value.autoRotate !== 'boolean') {
            throw new Error('autoRotate должен быть логическим значением');
          }
          
          // Проверяем compass (если есть)
          if (value.compass !== undefined && typeof value.compass !== 'boolean') {
            throw new Error('compass должен быть логическим значением');
          }
          
          // Проверяем hotSpotDebug (если есть)
          if (value.hotSpotDebug !== undefined && typeof value.hotSpotDebug !== 'boolean') {
            throw new Error('hotSpotDebug должен быть логическим значением');
          }
        }
      }
    },
    // Статистика просмотров
    views: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    // Дополнительные метаданные для SEO
    metaData: {
      type: DataTypes.JSONB,
      defaultValue: {
        title: '',       // SEO заголовок
        description: '', // Meta-описание
        keywords: '',    // Ключевые слова
        ogImage: ''      // Изображение для Open Graph
      }
    }
  }, {
    timestamps: true,
    tableName: 'tours',
    hooks: {
      beforeCreate: (tour) => {
        // Если не задано описание, используем название
        if (!tour.description) {
          tour.description = tour.name;
        }
        
        // Генерируем начальные метаданные, если не заданы
        if (!tour.metaData.title) {
          tour.metaData.title = tour.name;
        }
        if (!tour.metaData.description) {
          tour.metaData.description = tour.description || tour.name;
        }
      }
    }
  });

  // Определяем ассоциации
  Tour.associate = (models) => {
    // Тур принадлежит пользователю
    Tour.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'CASCADE' // Если удаляется пользователь, удаляются и его туры
    });
    
    // У тура много панорам
    Tour.hasMany(models.Panorama, {
      foreignKey: 'tourId',
      as: 'panoramas',
      onDelete: 'CASCADE' // Если удаляется тур, удаляются и его панорамы
    });
    
    // У тура много хотспотов
    Tour.hasMany(models.Hotspot, {
      foreignKey: 'tourId',
      as: 'hotspots',
      onDelete: 'CASCADE' // Если удаляется тур, удаляются и его хотспоты
    });
  };

  // Метод для безопасного изменения настроек
  Tour.prototype.updateSettings = function(newSettings) {
    const currentSettings = this.settings || {};
    this.settings = { ...currentSettings, ...newSettings };
    return this.save();
  };

  // Метод для увеличения счетчика просмотров
  Tour.prototype.incrementViews = function() {
    this.views += 1;
    return this.save();
  };

  // Метод для проверки, принадлежит ли тур пользователю
  Tour.prototype.belongsToUser = function(userId) {
    return this.userId === userId;
  };

  // Статический метод для поиска туров по пользователю
  Tour.findByUser = function(userId, options = {}) {
    return this.findAll({
      where: { userId },
      ...options
    });
  };

  // Статический метод для публичного поиска туров
  Tour.findPublic = function(options = {}) {
    return this.findAll({
      where: { status: 'published' },
      ...options
    });
  };

  return Tour;
};