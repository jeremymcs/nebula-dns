/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * API Bootstrap Entry Point
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Nebula DNS API')
    .setDescription('Nebula DNS Control Plane REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('tenants', 'Tenant management')
    .addTag('users', 'User management')
    .addTag('policies', 'Policy management')
    .addTag('locations', 'Location management')
    .addTag('lists', 'Custom allow/block lists')
    .addTag('reports', 'Reports and analytics')
    .addTag('health', 'Health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Nebula DNS API running on port ${port}`);
  logger.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
