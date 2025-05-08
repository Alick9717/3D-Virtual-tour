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
      allowNull: false
    },
    position: {
      type: DataTypes.JSONB,
      defaultValue: {
        x: 0,
        y: 0,
        z: 0
      }
    },
    targetPanoramaId: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    timestamps: true,
    tableName: 'hotspots'
  });

  Hotspot.associate = (models) => {
    Hotspot.belongsTo(models.Tour, {
      foreignKey: 'tourId',
      as: 'tour'
    });
    
    Hotspot.belongsTo(models.Panorama, {
      foreignKey: 'panoramaId',
      as: 'panorama'
    });
  };

  return Hotspot;
};