import { Module } from '@nestjs/common';
import { AiSystemsModule } from '../ai-systems/ai-systems.module';
import { RemindersService } from './application/reminders.service';
import { RemindersController } from './presentation/reminders.controller';

@Module({
  imports: [AiSystemsModule],
  providers: [RemindersService],
  controllers: [RemindersController],
  exports: [RemindersService],
})
export class RemindersModule {}
