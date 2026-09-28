const http = require('http');
const app = require('./app');
const logger = require('./utils/logger');
const { initializeSocket } = require('./socket');
const port = process.env.PORT || 3000;
const server = http.createServer(app);
initializeSocket(server);
server.on('error', error => { logger.error('server.failed', { error }); process.exitCode = 1; });
server.listen(port, () => {
  logger.info('server.ready', { port, environment: process.env.NODE_ENV || 'development', logLevel: process.env.LOG_LEVEL || 'debug' });
  logger.info('configuration.summary', { databaseConfigured: Boolean(process.env.MONGODB_URI), mapsConfigured: Boolean(process.env.GOOGLE_MAPS_API), smtpConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS), upiEnabled: require('./services/razorpay.service').config().enabled });
  if (!process.env.JWT_SECRET) logger.warn('configuration.jwt_secret_missing');
});
function shutdown(reason, error) {
  logger.error('server.shutdown', { reason, ...(error ? { error } : {}) });
  server.close(() => process.exit(error ? 1 : 0));
  setTimeout(() => process.exit(error ? 1 : 0), 5000).unref();
}
process.on('unhandledRejection', error => shutdown('unhandled_rejection', error instanceof Error ? error : new Error('Unhandled rejection')));
process.on('uncaughtException', error => shutdown('uncaught_exception', error));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
