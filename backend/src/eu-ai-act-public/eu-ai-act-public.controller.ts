import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { EuAiActPublicService } from './eu-ai-act-public.service';
import { CreatePublicSessionDto } from './dto/create-public-session.dto';
import { SavePublicAnswerDto } from './dto/save-public-answer.dto';
import { FinalizePublicSessionDto } from './dto/finalize-public-session.dto';
import { QuickAssessDto } from './dto/quick-assess.dto';
import { GenerateDemoReportDto } from './dto/generate-demo-report.dto';

@Controller('public/eu-ai-act')
export class EuAiActPublicController {
  constructor(private readonly euAiActPublicService: EuAiActPublicService) {}

  @Post('sessions')
  createSession(@Body() dto: CreatePublicSessionDto) {
    return this.euAiActPublicService.createSession(dto);
  }

  @Post('assess')
  quickAssess(@Body() dto: QuickAssessDto) {
    return this.euAiActPublicService.quickAssess(dto);
  }

  @Post('demo-report')
  generateDemoReport(@Body() dto: GenerateDemoReportDto) {
    return this.euAiActPublicService.generateDemoReport(dto);
  }

  @Get('sessions/:sessionId')
  getSession(
    @Param('sessionId') sessionId: string,
    @Headers('x-session-token') sessionToken: string,
  ) {
    return this.euAiActPublicService.getSession(sessionId, sessionToken);
  }

  @Put('sessions/:sessionId/answers/:questionKey')
  saveAnswer(
    @Param('sessionId') sessionId: string,
    @Param('questionKey') questionKey: string,
    @Headers('x-session-token') sessionToken: string,
    @Body() dto: SavePublicAnswerDto,
  ) {
    return this.euAiActPublicService.saveAnswer(
      sessionId,
      sessionToken,
      questionKey,
      dto,
    );
  }

  @Post('sessions/:sessionId/finalize')
  finalizeSession(
    @Param('sessionId') sessionId: string,
    @Headers('x-session-token') sessionToken: string,
    @Body() dto: FinalizePublicSessionDto,
  ) {
    return this.euAiActPublicService.finalizeSession(
      sessionId,
      sessionToken,
      dto.confirmCompleteness,
    );
  }

  @Get('results/:resultId')
  getResult(@Param('resultId') resultId: string) {
    return this.euAiActPublicService.getResult(resultId);
  }
}
