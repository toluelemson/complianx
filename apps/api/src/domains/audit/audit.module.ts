import { Module } from '@nestjs/common';
import { PrismaModule } from '../../platform/database/prisma.module';
import { CompanyModule } from '../organizations/company.module';
import { AiSystemsModule } from '../ai-systems/ai-systems.module';
import { AuditController } from './presentation/audit.controller';
import { AuditService } from './application/audit.service';

@Module({
  imports: [PrismaModule, CompanyModule, AiSystemsModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
