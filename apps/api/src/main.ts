import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { getApiEnv } from "@repo/config";

import { PROFILE_UPLOAD_FILE_SIZE_LIMIT_BYTES } from "./modules/profile/upload.constants";
import { AppModule } from "./modules/app.module";

async function bootstrap() {
  // Validates and memoizes env once; hot paths read the cached value.
  const env = getApiEnv();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      // nginx overwrites X-Forwarded-For with the single resolved client address
      // (see ops/nginx.conf real_ip config), so the left-most entry is trustworthy.
      // Without this, request.ip is the proxy address and every IP-keyed rate limit
      // collapses into one shared bucket.
      trustProxy: true
    })
  );

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true
    })
  );

  const corsPlugin = (await import("@fastify/cors")).default as never;
  await app.register(corsPlugin, {
    origin: env.CORS_ORIGIN,
    credentials: true
  });

  const multipartPlugin = (await import("@fastify/multipart")).default as never;
  await app.register(multipartPlugin, {
    limits: {
      fileSize: PROFILE_UPLOAD_FILE_SIZE_LIMIT_BYTES,
      files: 1
    }
  });

  app.enableShutdownHooks();

  await app.listen({
    port: env.API_PORT,
    host: "0.0.0.0"
  });
}

void bootstrap();
