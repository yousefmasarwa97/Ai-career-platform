import * as Joi from 'joi';

/**
 * Environment schema for the API server. `@nestjs/config` validates process.env
 * against this at boot, failing fast on misconfiguration (supports Req 16.2 —
 * reliable persistence requires correct DB/storage config).
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  API_PORT: Joi.number().default(3000),
  API_HOST: Joi.string().default('0.0.0.0'),

  JWT_ACCESS_SECRET: Joi.string().min(8).required(),
  JWT_REFRESH_SECRET: Joi.string().min(8).required(),
  JWT_ACCESS_TTL: Joi.number().default(900),
  JWT_REFRESH_TTL: Joi.number().default(604800),

  DATABASE_HOST: Joi.string().default('localhost'),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().allow('').required(),
  DATABASE_NAME: Joi.string().required(),

  STORAGE_ENDPOINT: Joi.string().uri().required(),
  STORAGE_REGION: Joi.string().default('us-east-1'),
  STORAGE_BUCKET: Joi.string().required(),
  STORAGE_ACCESS_KEY: Joi.string().required(),
  STORAGE_SECRET_KEY: Joi.string().required(),
  STORAGE_FORCE_PATH_STYLE: Joi.boolean().default(true),
  STORAGE_SERVER_SIDE_ENCRYPTION: Joi.string().default('AES256'),

  AI_EXTERNAL_PROVIDER_ENABLED: Joi.boolean().default(false),
  AI_PROVIDER_API_KEY: Joi.string().allow('').optional(),
  AI_PROVIDER_BASE_URL: Joi.string().allow('').optional(),
});
