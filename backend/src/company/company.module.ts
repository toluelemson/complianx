import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { CompanyContextService } from './company-context.service';

@Module({
  providers: [CompanyService, CompanyContextService],
  controllers: [CompanyController],
  exports: [CompanyContextService],
})
export class CompanyModule {}
