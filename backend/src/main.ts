import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import * as bodyParser from 'body-parser';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
    rawBody: true, // <- VERY important
  });

  app.use('/billing/webhook', bodyParser.raw({ type: '*/*' }));
  const normalizeOrigin = (o: string) => o.replace(/\/$/, '').toLowerCase();

  const allowedOrigins =
    process.env.FRONTEND_URL?.split(',')
      .map((o) => normalizeOrigin(o.trim()))
      .filter(Boolean) ?? [];

  console.log('allowedOrigins:', allowedOrigins);


  app.enableCors({
    origin: (origin: string, cb: (arg0: Error | null, arg1: boolean) => any) => {
      if (!origin) return cb(null, true);
      const normalized = normalizeOrigin(origin);
      console.log('incoming origin:', origin);

      if (
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(normalized)
      ) {
        return cb(null, true);
      }

      return cb(new Error(`Not allowed by CORS: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
    allowedHeaders: [
      'content-type',
      'authorization',
      'x-requested-with',
    ],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
