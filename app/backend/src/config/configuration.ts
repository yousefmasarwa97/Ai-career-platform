/**
 * Typed configuration factory consumed by `@nestjs/config`. Groups env values
 * into cohesive namespaces (server, jwt, database, storage, ai).
 */
export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  server: {
    port: parseInt(process.env.API_PORT ?? '3000', 10),
    host: process.env.API_HOST ?? '0.0.0.0',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtl: parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10),
    refreshTtl: parseInt(process.env.JWT_REFRESH_TTL ?? '604800', 10),
  },
  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    name: process.env.DATABASE_NAME,
  },
  storage: {
    endpoint: process.env.STORAGE_ENDPOINT,
    region: process.env.STORAGE_REGION ?? 'us-east-1',
    bucket: process.env.STORAGE_BUCKET,
    accessKey: process.env.STORAGE_ACCESS_KEY,
    secretKey: process.env.STORAGE_SECRET_KEY,
    forcePathStyle: (process.env.STORAGE_FORCE_PATH_STYLE ?? 'true') === 'true',
    serverSideEncryption: process.env.STORAGE_SERVER_SIDE_ENCRYPTION ?? 'AES256',
  },
  ai: {
    externalProviderEnabled: (process.env.AI_EXTERNAL_PROVIDER_ENABLED ?? 'false') === 'true',
    apiKey: process.env.AI_PROVIDER_API_KEY ?? '',
    baseUrl: process.env.AI_PROVIDER_BASE_URL ?? '',
  },
});
