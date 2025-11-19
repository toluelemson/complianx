import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { SuggestionsService } from './suggestions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@UseGuards(JwtAuthGuard)
@Controller('suggestions')
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Post('feedback')
  record(@Request() req, @Body() dto: CreateFeedbackDto) {
    return this.suggestionsService.recordFeedback(req.user.userId, dto);
  }

  @Get('feedback/:sectionId/:fieldName')
  list(@Param('sectionId') sectionId: string, @Param('fieldName') fieldName: string) {
    return this.suggestionsService.listForField(sectionId, fieldName);
  }
}
