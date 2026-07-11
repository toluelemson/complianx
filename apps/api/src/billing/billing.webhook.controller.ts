import { Controller, Headers, Post, RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from './billing.service';

@Controller('billing/webhook')
export class BillingWebhookController {
  constructor(private readonly billing: BillingService) {}

  @Post()
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const payload = Buffer.isBuffer(req.body)
      ? req.body
      : req.rawBody
      ? Buffer.isBuffer(req.rawBody)
        ? req.rawBody
        : Buffer.from(req.rawBody)
      : Buffer.from(
          typeof req.body === 'string'
            ? req.body
            : JSON.stringify(req.body ?? {}),
        );
    console.log('[Stripe Webhook] signature header:', signature);
    console.log('[Stripe Webhook] raw payload (first 200 chars):', payload.toString('utf8'));
    return this.billing.handleWebhook(signature, payload);
  }
}
