const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbPath: process.env.DB_PATH || path.join(__dirname, '../../database.sqlite')
};