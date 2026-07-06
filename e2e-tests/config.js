const path = require('path');

const PORT = process.env.PORT || 5050;
const HOST = 'localhost';
const BASE_URL = `http://${HOST}:${PORT}`;

module.exports = {
  PORT,
  HOST,
  BASE_URL,
  DATA_DIR: path.join(__dirname, '../technosync-dashboard/server/data'),
};
