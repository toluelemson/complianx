import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { PrismaService } from './platform/database/prisma.service';
import { raw, type NextFunction, type Request, type Response } from 'express';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, '').toLowerCase();
}

function parseConfiguredOrigins(...values: Array<string | undefined>) {
  return [
    ...new Set(
      values
        .flatMap((value) => (value ?? '').split(','))
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => normalizeOrigin(value)),
    ),
  ];
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bodyParser: false,
  });
  const config = app.get(ConfigService);
  const bodyLimit = config.getOrThrow<number>('API_BODY_LIMIT_BYTES');
  const trustProxyHops = config.getOrThrow<number>('TRUST_PROXY_HOPS');
  if (trustProxyHops > 0) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxyHops);
  }

  app.use('/billing/webhook', raw({ type: '*/*', limit: bodyLimit }));
  app.useBodyParser('json', { limit: bodyLimit });
  app.useBodyParser('urlencoded', { limit: bodyLimit, extended: true });
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'billing/webhook', method: RequestMethod.POST }],
  });

  const allowedOrigins = parseConfiguredOrigins(
    config.get<string>('CORS_ORIGINS'),
    config.get<string>('FRONTEND_URL'),
  );
  const isAllowedOrigin = (origin?: string) =>
    !origin || allowedOrigins.includes(normalizeOrigin(origin));

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') {
      const origin = req.headers.origin;

      if (!isAllowedOrigin(origin)) {
        return res.sendStatus(403);
      }

      if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Vary', 'Origin');
      }
      res.header('Vary', 'Origin');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header(
        'Access-Control-Allow-Methods',
        'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      );
      res.header(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Company-Id, x-company-id',
      );

      return res.sendStatus(204);
    }

    next();
  });

  app.enableCors({
    origin: (origin: string, cb: (err: Error | null, ok: boolean) => void) => {
      if (!origin) return cb(null, true);
      if (isAllowedOrigin(origin)) {
        return cb(null, true);
      }

      return cb(new Error(`Not allowed by CORS: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Company-Id',
      'x-company-id',
    ],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);
  await app.listen(config.getOrThrow<number>('PORT'));
}

void bootstrap();
