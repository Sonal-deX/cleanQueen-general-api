    import { NestFactory } from '@nestjs/core';
    import { AppModule } from './app.module';
    import { ConfigService } from '@nestjs/config';
    import { Sequelize } from 'sequelize-typescript';
    import { SEQUELIZE } from './database/database.providers';
    import * as cookieParser from 'cookie-parser';
    import { ValidationPipe, Logger } from '@nestjs/common';
    import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; // Import Swagger

    async function bootstrap() {
      const app = await NestFactory.create(AppModule);
      const configService = app.get(ConfigService);
      const logger = new Logger('Bootstrap');

      const port = configService.get<number>('PORT') || 3000;
      const nodeEnv = configService.get<string>('NODE_ENV');

      // --- CORS Configuration ---
      const allowedOrigins: string[] = [];
      if (nodeEnv === 'development') {
        logger.warn("DEVELOPMENT MODE: CORS is configured to allow all origins.");
        app.enableCors({ credentials: true, origin: true });
      } else {
        const clientUrlBrowser = configService.get<string>('CLIENT_URL_BROWSER');
        if (clientUrlBrowser) allowedOrigins.push(clientUrlBrowser);
        const clientUrlMobile = configService.get<string>('CLIENT_URL_MOBILE_APP');
        if (clientUrlMobile) allowedOrigins.push(clientUrlMobile);

        app.enableCors({
          origin: (origin, callback) => {
            if (!origin || allowedOrigins.indexOf(origin) !== -1) {
              callback(null, true);
            } else {
              logger.warn(`CORS: Blocked origin - ${origin}`);
              callback(new Error('Not allowed by CORS'));
            }
          },
          credentials: true,
        });
      }

      // --- Middleware ---
      app.use(cookieParser());
      app.setGlobalPrefix('api');

      // --- Global Pipes ---
      app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        disableErrorMessages: nodeEnv === 'production',
      }));

      // --- Swagger (OpenAPI) Documentation Setup ---
      if (nodeEnv === 'development' || nodeEnv === 'staging') { // Enable for dev/staging
        const swaggerConfig = new DocumentBuilder()
          .setTitle('Cleaning Service API')
          .setDescription('API documentation for the Enterprise Cleaning Service Management System')
          .setVersion('1.0')
          .addTag('Auth', 'Authentication and User Registration')
          .addTag('Users', 'User Management (Admin)')
          .addTag('Requests', 'Cleaning Service Requests')
          .addTag('Projects', 'Project and Task Management')
          .addTag('Reviews', 'Task Reviews and Ratings')
          .addBearerAuth( // For JWT Bearer Token
            {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              name: 'JWT',
              description: 'Enter JWT token',
              in: 'header',
            },
            'jwt', // Name this security scheme 'jwt'
          )
          // If you use HttpOnly cookies primarily for web admin:
          .addCookieAuth(
            'token', // Name of the cookie
            {
              type: 'apiKey', // 'apiKey' is used for cookie auth in swagger
              in: 'cookie',
              name: 'token', // This name must match the cookie name
              description: 'Session cookie for authenticated users (web admin)',
            },
            'cookieAuth', // Name this security scheme 'cookieAuth'
           )
          .build();
        const document = SwaggerModule.createDocument(app, swaggerConfig);
        SwaggerModule.setup('api-docs', app, document); // API docs will be at /api-docs
        logger.log(`Swagger API Documentation available at /api-docs`);
      }


      // --- Database Synchronization ---
      if (nodeEnv === 'development') {
        const sequelize = app.get<Sequelize>(SEQUELIZE);
        const syncAlter = configService.get<string>('DB_SYNC_ALTER') === 'true';
        const syncForce = configService.get<string>('DB_SYNC_FORCE') === 'true';

        if (syncForce) {
          logger.warn("DB SYNC: Forcing database sync (dropping tables).");
          await sequelize.sync({ force: true });
        } else if (syncAlter) {
          logger.warn("DB SYNC: Altering database tables.");
          await sequelize.sync({ alter: true });
        } else {
          logger.log("DB SYNC: Running standard sync (create if not exist).");
          await sequelize.sync();
        }
        logger.log("DB SYNC: Database synchronization complete.");
      }

      await app.listen(port);
      logger.log(`🚀 Application is running on: ${await app.getUrl()}`);
      logger.log(`🌱 Environment: ${nodeEnv}`);
    }
    bootstrap();
    