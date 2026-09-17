import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  const config = app.get(ConfigService);
  const port = config.get<number>('server.port') ?? 3000;
  const host = config.get<string>('server.host') ?? '0.0.0.0';
  await app.listen(port, host);
}

void bootstrap();
