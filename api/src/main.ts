import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // API versioning
  app.setGlobalPrefix('v1');
  
  // CORS (configure for production)
  app.enableCors({
    origin: process.env.UI_URL || 'http://localhost:3001',
    credentials: true,
  });
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`SafeDNS API listening on port ${port}`);
}

bootstrap();
