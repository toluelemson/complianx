import { Module } from '@nestjs/common';
import { AuthModule } from './auth.module';
import { UsersModule } from './users.module';

@Module({
  imports: [UsersModule, AuthModule],
  exports: [UsersModule, AuthModule],
})
export class IdentityAccessModule {}
