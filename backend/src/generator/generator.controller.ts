import { Body, Controller, Param, Post, Request, UseGuards } from '@nestjs/common';
import { GeneratorService } from './generator.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/generate')
export class GeneratorController {
  constructor(private readonly generatorService: GeneratorService) {}

  @Post()
  generate(
    @Param('projectId') projectId: string,
    @Request() req,
    @Body('documentTypes') documentTypes?: string[],
  ) {
    return this.generatorService.generate(
      projectId,
      req.user.userId,
      documentTypes,
    );
  }
}
