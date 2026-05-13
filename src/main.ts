import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // отрезает поля, которых нет в DTO
      forbidNonWhitelisted: true,   // и кидает ошибку, если такие есть
      transform: true,              // преобразует типы (например, строку '5' в число 5)
    }),
  );
  
  app.setGlobalPrefix('api');       // все эндпоинты будут с префиксом /api
  
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Server running on http://localhost:${port}`);
}
bootstrap();