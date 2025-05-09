const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
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
          msg: 'Имя пользователя не может быть пустым'
        },
        len: {
          args: [2, 50],
          msg: 'Имя пользователя должно быть от 2 до 50 символов'
        }
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        args: true,
        msg: 'Пользователь с таким email уже существует'
      },
      validate: {
        isEmail: {
          msg: 'Некорректный формат email'
        },
        notEmpty: {
          msg: 'Email не может быть пустым'
        }
      }
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
      allowNull: false
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    timestamps: true, // Включаем поля createdAt и updatedAt
    tableName: 'users', // Явно указываем имя таблицы
    defaultScope: {
      attributes: { exclude: ['passwordHash'] } // По умолчанию не возвращаем пароль
    },
    scopes: {
      withPassword: {
        attributes: { include: ['passwordHash'] } // Специальный скоуп для получения хэша пароля
      }
    }
  });

  // Определяем ассоциации
  User.associate = (models) => {
    // Пользователь может иметь много туров
    User.hasMany(models.Tour, {
      foreignKey: 'userId',
      as: 'tours',
      onDelete: 'CASCADE' // Если удаляется пользователь, удаляются и его туры
    });
  };

  // Хук перед созданием: хэширование пароля
  User.beforeCreate(async (user) => {
    if (user.changed('passwordHash')) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
    }
  });

  // Хук перед обновлением: хэширование пароля при изменении
  User.beforeUpdate(async (user) => {
    if (user.changed('passwordHash')) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
    }
  });

  // Статический метод для создания пользователя
  User.createUser = async function(userData) {
    // Напрямую принимаем пароль, а затем хэшируем его
    const { password, ...otherData } = userData;
    return await this.create({
      ...otherData,
      passwordHash: password
    });
  };

  // Метод для проверки пароля
  User.prototype.verifyPassword = async function(password) {
    return await bcrypt.compare(password, this.passwordHash);
  };

  // Метод для безопасного возврата пользователя (без passwordHash)
  User.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.passwordHash;
    return values;
  };

  return User;
};