import { Module } from '@nestjs/common';
import { BillingService } from './application/billing.service';
import { MonetizationService } from './application/monetization.service';
import { BillingController } from './presentation/billing.controller';
import { BillingWebhookController } from './presentation/billing-webhook.controller';
import { CompanyModule } from '../organizations/company.module';

@Module({
  imports: [CompanyModule],
  controllers: [BillingController, BillingWebhookController],
  providers: [BillingService, MonetizationService],
  exports: [BillingService, MonetizationService],
})
export class SubscriptionsModule {}
