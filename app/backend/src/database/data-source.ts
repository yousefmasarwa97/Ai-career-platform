import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

loadEnv();

/**
 * TypeORM DataSource used by the migration tooling (npm run migration:*).
 * Entities and migrations are registered by glob so later tasks only add files.
 * `synchronize` is always false — schema changes go through migrations (Req 16.2).
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER ?? 'career',
  password: process.env.DATABASE_PASSWORD ?? 'career',
  database: process.env.DATABASE_NAME ?? 'ai_career_platform',
  entities: [__dirname + '/../**/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
