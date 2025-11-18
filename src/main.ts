import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins =
    process.env.FRONTEND_URL?.split(',').map((origin) => origin.trim()) ?? [];
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*')
      ) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
