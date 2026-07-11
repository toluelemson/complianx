import { Module } from '@nestjs/common';
import { CompanyService } from './application/companies/company.service';
import { CompanyController } from './presentation/controllers/company.controller';
import { CompanyContextService } from './application/membership/company-context.service';

@Module({
  providers: [CompanyService, CompanyContextService],
  controllers: [CompanyController],
  exports: [CompanyContextService],
})
export class CompanyModule {}
