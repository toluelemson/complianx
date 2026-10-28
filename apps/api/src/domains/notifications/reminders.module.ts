import { Module } from '@nestjs/common';
import { AiSystemsModule } from '../ai-systems/ai-systems.module';
import { RemindersService } from './application/reminders.service';
import { RemindersController } from './presentation/reminders.controller';
import { CompanyModule } from '../organizations/company.module';

@Module({
  imports: [AiSystemsModule, CompanyModule],
  providers: [RemindersService],
  controllers: [RemindersController],
  exports: [RemindersService],
})
export class RemindersModule {}
