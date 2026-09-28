const mongoose = require('mongoose');
const logger = require('../utils/logger');
let connection;
mongoose.connection.on('connected', () => logger.info('database.connected'));
mongoose.connection.on('disconnected', () => logger.warn('database.disconnected'));
mongoose.connection.on('error', error => logger.error('database.error', { error }));
// Values/filters/documents are deliberately excluded from database query logs.
mongoose.set('debug', (collection, operation) => logger.debug('database.query', { collection, operation }));
module.exports = async function connectToDb() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) { logger.error('database.configuration_missing', { setting: 'MONGODB_URI' }); throw new Error('MONGODB_URI is missing.'); }
  if (!connection) {
    logger.info('database.connecting');
    connection = mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 }).catch(error => { connection = null; logger.error('database.connection_failed', { error }); throw error; });
  }
  await connection;
};
