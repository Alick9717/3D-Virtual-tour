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
      allowNull: false
    },
    objectType: {
      type: DataTypes.ENUM('apartment', 'house', 'office', 'commercial'),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('draft', 'ready', 'published'),
      defaultValue: 'draft'
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {
        logo: 'standard',
        startPanorama: null
      }
    }
  }, {
    timestamps: true,
    tableName: 'tours'
  });

  Tour.associate = (models) => {
    Tour.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    Tour.hasMany(models.Panorama, {
      foreignKey: 'tourId',
      as: 'panoramas'
    });
    
    Tour.hasMany(models.Hotspot, {
      foreignKey: 'tourId',
      as: 'hotspots'
    });
  };

  return Tour;
};