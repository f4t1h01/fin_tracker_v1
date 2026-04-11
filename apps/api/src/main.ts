import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { parseApiEnv } from "@repo/config";

import { PROFILE_UPLOAD_FILE_SIZE_LIMIT_BYTES } from "./modules/profile/upload.constants";
import { AppModule } from "./modules/app.module";

async function bootstrap() {
  const env = parseApiEnv(process.env);

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

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
      fileSize: PROFILE_UPLOAD_FILE_SIZE_LIMIT_BYTES
    }
  });

  await app.listen({
    port: env.API_PORT,
    host: "0.0.0.0"
  });
}

void bootstrap();
