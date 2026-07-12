import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { PrismaService } from './platform/database/prisma.service';
import * as bodyParser from 'body-parser';

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, '').toLowerCase();
}

function expandOriginVariants(origin: string) {
  const normalized = normalizeOrigin(origin);
  const variants = new Set([normalized]);

  try {
    const url = new URL(normalized);
    const { protocol, host, pathname, search, hash } = url;

    if (pathname || search || hash) {
      variants.add(`${protocol}//${host}`);
    }

    if (host.startsWith('www.')) {
      variants.add(`${protocol}//${host.slice(4)}`);
    } else if (host.includes('.')) {
      variants.add(`${protocol}//www.${host}`);
    }
  } catch {
    // Ignore invalid URLs and keep the normalized origin as-is.
  }

  return [...variants];
}

function parseConfiguredOrigins(...values: Array<string | undefined>) {
  return [
    ...new Set(
      values
        .flatMap((value) => (value ?? '').split(','))
        .map((value) => value.trim())
        .filter(Boolean)
        .flatMap((value) => expandOriginVariants(value)),
    ),
  ];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.use('/billing/webhook', bodyParser.raw({ type: '*/*' }));
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'billing/webhook', method: RequestMethod.POST }],
  });

  const allowedOrigins = parseConfiguredOrigins(
    process.env.CORS_ORIGINS,
    process.env.FRONTEND_URL,
  );
  const isAllowedOrigin = (origin?: string) =>
    !origin ||
    allowedOrigins.length === 0 ||
    allowedOrigins.includes(normalizeOrigin(origin));

  // 🔥 1) Handle all OPTIONS requests manually
  app.use((req: any, res: any, next: () => void) => {
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
        'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'
      );
      res.header(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Company-Id, x-company-id'
      );

    
      res.header('X-Cors-Debug', 'from-nest');

      return res.sendStatus(204);
    }

    next();
  });

  console.log('allowedOrigins:', allowedOrigins);

  // 🔥 2) Keep enableCors, but it’s now “secondary”
  app.enableCors({
    origin: (origin: string, cb: (err: Error | null, ok: boolean) => void) => {
      if (!origin) return cb(null, true);
      console.log('incoming origin:', origin);

      if (isAllowedOrigin(origin)) {
        return cb(null, true);
      }

      return cb(new Error(`Not allowed by CORS: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    // you can keep or remove this; the middleware already covers OPTIONS
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
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
