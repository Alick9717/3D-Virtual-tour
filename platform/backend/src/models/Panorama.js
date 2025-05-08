const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Panorama = sequelize.define('Panorama', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  }, {
    timestamps: true,
    tableName: 'panoramas'
  });

  Panorama.associate = (models) => {
    Panorama.belongsTo(models.Tour, {
      foreignKey: 'tourId',
      as: 'tour'
    });
    
    Panorama.hasMany(models.Hotspot, {
      foreignKey: 'panoramaId',
      as: 'hotspots'
    });
  };

  return Panorama;
};