import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.use('/billing/webhook', bodyParser.raw({ type: '*/*' }));

  // 🔥 1) Handle all OPTIONS requests manually
  app.use((req: any, res: any, next: () => void) => {
    if (req.method === 'OPTIONS') {
      const origin = req.headers.origin || '*';

      res.header('Access-Control-Allow-Origin', origin);
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

       // 🔥 debug marker
      res.header('X-Cors-Debug', 'from-nest');

      return res.sendStatus(204);
    }

    next();
  });

  const normalizeOrigin = (o: string) => o.replace(/\/$/, '').toLowerCase();

  const allowedOrigins =
    process.env.FRONTEND_URL?.split(',')
      .map((o) => normalizeOrigin(o.trim()))
      .filter(Boolean) ?? [];

  console.log('allowedOrigins:', allowedOrigins);

  // 🔥 2) Keep enableCors, but it’s now “secondary”
  app.enableCors({
    origin: (origin: string, cb: (err: Error | null, ok: boolean) => void) => {
      if (!origin) return cb(null, true);
      const normalized = normalizeOrigin(origin);
      console.log('incoming origin:', origin);

      if (allowedOrigins.length === 0 || allowedOrigins.includes(normalized)) {
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
