import 'reflect-metadata';
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  ValidationPipe,
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Response, NextFunction } from 'express';
import { map } from 'rxjs/operators';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import { DataSource } from 'typeorm';
import type { AppRequest } from '../../../packages/backend-modules/src/common/http';
import { AppModule } from './composition/app.module';

@Catch()
class SafeExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const req = host.switchToHttp().getRequest<AppRequest>();
    const res = host.switchToHttp().getResponse<Response>();
    const known = error instanceof HttpException;
    const dependency =
      error instanceof Error &&
      (/QueryFailedError|Connection|Driver|EntityNotFound/.test(error.name) ||
        ('code' in error &&
          [
            'ECONNREFUSED',
            'ECONNRESET',
            'PROTOCOL_CONNECTION_LOST',
            'ETIMEDOUT',
          ].includes(String(error.code))));
    const parserStatus =
      error instanceof Error && 'type' in error
        ? error.type === 'entity.too.large'
          ? 413
          : error.type === 'entity.parse.failed'
            ? 400
            : undefined
        : undefined;
    const status = known
      ? error.getStatus()
      : (parserStatus ?? (dependency ? 503 : 500));
    const details = known ? error.getResponse() : null;
    const body =
      typeof details === 'object' && details
        ? (details as Record<string, unknown>)
        : {};
    const validation = Array.isArray(body.message);
    const businessCode =
      body.businessCode ??
      (status === 413
        ? 'PAYLOAD_TOO_LARGE'
        : status === 400
          ? 'VALIDATION_FAILED'
          : validation
            ? 'VALIDATION_FAILED'
            : status === 503
              ? 'DEPENDENCY_UNAVAILABLE'
              : status === 404
                ? 'RESOURCE_NOT_FOUND'
                : status === 405
                  ? 'METHOD_NOT_ALLOWED'
                  : 'INTERNAL_ERROR');
    res.status(status).json({
      code: status,
      businessCode,
      message: parserStatus
        ? parserStatus === 413
          ? '请求体超过 1 MiB 限制'
          : 'JSON 格式无效'
        : known
          ? validation
            ? '请求字段无效'
            : (body.message ?? '请求失败')
          : status === 503
            ? '依赖暂不可用，请稍后重试'
            : '服务暂不可用',
      data: null,
      requestId: req.requestId,
      ...(validation
        ? {
            fieldErrors: (body.message as string[]).map((message) => ({
              field: message.split(' ')[0],
              code: 'INVALID',
              message,
            })),
          }
        : {}),
    });
    if (!known)
      console.error(
        JSON.stringify({
          event: 'request_failed',
          requestId: req.requestId,
          type: error instanceof Error ? error.name : 'UnknownError',
          status,
        }),
      );
  }
}
@Injectable()
class EnvelopeInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    return next.handle().pipe(
      map((data: unknown) => ({
        code: 0,
        message: '成功',
        data,
        requestId: req.requestId,
      })),
    );
  }
}

export function validateRuntime() {
  const parsed = z
    .object({
      APP_ENV: z.enum(['development', 'test', 'production']),
      INSTANCE_ID: z.string().min(3),
      APP_ORIGIN: z.string().url(),
      JWT_SECRET: z.string().min(32),
      PORT: z.coerce.number().int().min(1).max(65535),
      HOST: z.string().min(1),
    })
    .safeParse(process.env);
  if (!parsed.success)
    throw new Error(
      `服务配置缺失或无效：${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`,
    );
  if (
    parsed.data.APP_ENV === 'production' &&
    !parsed.data.APP_ORIGIN.startsWith('https://')
  )
    throw new Error('生产环境 APP_ORIGIN 必须使用 HTTPS');
  return parsed.data;
}

export async function createApplication(exportOnly = false) {
  if (exportOnly) process.env.OPENAPI_EXPORT = 'true';
  else {
    if (process.env.OPENAPI_EXPORT)
      throw new Error('运行服务时禁止设置 OPENAPI_EXPORT');
    validateRuntime();
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: exportOnly ? false : ['error', 'warn', 'log'],
    bodyParser: false,
  });
  const express = await import('express');
  app.use((req: AppRequest, res: Response, next: NextFunction) => {
    req.requestId = randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '1mb' }));
  app.use(helmet());
  app.use(cookieParser());
  const limits = new Map<string, { count: number; until: number }>();
  app.use((req: AppRequest, res: Response, next: NextFunction) => {
    if (
      !['GET', 'POST', 'HEAD', 'OPTIONS'].includes(req.method) ||
      req.headers['x-http-method-override'] ||
      req.query._method !== undefined
    ) {
      res.status(405).json({
        code: 405,
        businessCode: 'METHOD_NOT_ALLOWED',
        message: '业务接口只允许 GET / POST',
        data: null,
        requestId: req.requestId,
      });
      return;
    }
    if (
      req.path === '/api/v1/auth/login' ||
      req.path === '/api/v1/auth/refresh'
    ) {
      const now = Date.now();
      for (const [key, value] of limits)
        if (value.until <= now) limits.delete(key);
      // 服务仅部署单实例；按来源和账号分别限流，不信任客户端转发头。
      const account =
        typeof req.body?.username === 'string'
          ? req.body.username.slice(0, 64)
          : '';
      const keys = [`ip:${req.ip}`, ...(account ? [`account:${account}`] : [])];
      for (const key of keys) {
        const slot = limits.get(key) ?? { count: 0, until: now + 60000 };
        slot.count++;
        limits.set(key, slot);
        if (
          slot.count > (key.startsWith('ip:') ? 60 : 10) ||
          limits.size > 10000
        ) {
          res.setHeader('Retry-After', '60');
          res.status(429).json({
            code: 429,
            businessCode: 'RATE_LIMITED',
            message: '请求过于频繁，请稍后重试',
            data: null,
            requestId: req.requestId,
          });
          return;
        }
      }
    }
    next();
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: false },
      validationError: { target: false, value: false },
    }),
  );
  app.useGlobalFilters(new SafeExceptionFilter());
  app.useGlobalInterceptors(new EnvelopeInterceptor());
  app.enableShutdownHooks();
  await app.init();
  return app;
}

export function openapi(app: NestExpressApplication) {
  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('DevPlatform API')
      .setVersion('0.1.0-alpha.1')
      .addBearerAuth()
      .build(),
  );
  for (const item of Object.values(doc.paths)) {
    for (const method of Object.keys(item ?? {})) {
      if (!['get', 'post', 'parameters'].includes(method))
        throw new Error(`禁止的业务方法：${method}`);
    }
    for (const operation of [item?.get, item?.post]) {
      if (!operation) continue;
      for (const response of Object.values(operation.responses)) {
        if (!response || !('content' in response)) continue;
        const media = response.content?.['application/json'];
        if (media?.schema)
          media.schema = {
            type: 'object',
            required: ['code', 'message', 'data', 'requestId'],
            properties: {
              code: { type: 'number', enum: [0] },
              message: { type: 'string' },
              data: media.schema,
              requestId: { type: 'string' },
            },
          };
      }
    }
  }
  return doc;
}

export async function closeApplication(app: NestExpressApplication) {
  const db = app.get(DataSource);
  await app.close();
  if (db.isInitialized) await db.destroy();
}
