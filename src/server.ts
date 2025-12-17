import app from './app';
import env from './config/env';
import database from './config/db';
import logger from './utils/logger';

const PORT = env.PORT || 5000;

let server: any;

const startServer = async () => {
  try {
    // Connect to database
    await database.connect();

    // Start server
    server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${env.NODE_ENV} mode`);
      logger.info(`📍 API Base URL: http://localhost:${PORT}/api/${env.API_VERSION}`);
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);

      if (server) {
        server.close(async () => {
          logger.info('✅ HTTP server closed');

          // Close database connection
          await database.disconnect();

          logger.info('👋 Graceful shutdown completed');
          process.exit(0);
        });
      }

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('❌ Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default server;
