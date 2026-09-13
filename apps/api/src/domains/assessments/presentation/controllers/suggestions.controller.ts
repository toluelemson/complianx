import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SuggestionsService } from '../../application/suggestions/suggestions.service';
import { JwtAuthGuard } from '../../../../platform/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../../../platform/auth/authenticated-request.type';
import { CreateFeedbackDto } from '../dto/suggestions/create-feedback.dto';
import { CompanyContextService } from '../../../organizations/application/membership/company-context.service';

@UseGuards(JwtAuthGuard)
@Controller('suggestions')
export class SuggestionsController {
  constructor(
    private readonly suggestionsService: SuggestionsService,
    private readonly companyContext: CompanyContextService,
  ) {}

  private companyId(req: AuthenticatedRequest) {
    return this.companyContext.resolveCompany(
      req.user,
      req.headers?.['x-company-id'] as string | undefined,
    ).companyId;
  }

  @Post('feedback')
  record(@Req() req: AuthenticatedRequest, @Body() dto: CreateFeedbackDto) {
    return this.suggestionsService.recordFeedback(
      req.user.userId,
      this.companyId(req),
      dto,
    );
  }

  @Get('feedback/:sectionId/:fieldName')
  list(
    @Param('sectionId') sectionId: string,
    @Param('fieldName') fieldName: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.suggestionsService.listForField(
      sectionId,
      fieldName,
      req.user.userId,
      this.companyId(req),
    );
  }
}
