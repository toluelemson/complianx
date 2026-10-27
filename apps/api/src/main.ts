import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { PrismaService } from './platform/database/prisma.service';
import { raw, type NextFunction, type Request, type Response } from 'express';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  if (config.getOrThrow<boolean>('SWAGGER_ENABLED')) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Neuraldocx API')
      .setDescription(
        'Neuraldocx EU AI Act compliance workspace API. Authenticated endpoints require a JWT. Tenant-scoped endpoints use the active company resolved from the authenticated membership and the X-Company-Id header.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'bearerAuth',
      )
      .addApiKey(
        { type: 'apiKey', in: 'header', name: 'X-Company-Id' },
        'companyId',
      )
      .addTag('Authentication')
      .addTag('AI systems and projects')
      .addTag('Assessments and evidence')
      .addTag('Compliance workflow and reporting')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      useGlobalPrefix: true,
      jsonDocumentUrl: 'docs/openapi.json',
      yamlDocumentUrl: 'docs/openapi.yaml',
    });
  }

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
