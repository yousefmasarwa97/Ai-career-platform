import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './storage/storage.module';
import { HealthController } from './health/health.controller';

/**
 * Root module. Loads and validates environment, wires the database and
 * object-storage infrastructure modules, and exposes a health endpoint.
 * Feature modules (auth, profile, cv, jobs, agents) are added in later tasks.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    DatabaseModule,
    StorageModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
