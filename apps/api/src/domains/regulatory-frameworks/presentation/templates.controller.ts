import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TemplatesService } from '../application/templates.service';
import { JwtAuthGuard } from '../../../platform/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../../platform/auth/authenticated-request.type';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { BulkTemplateActionDto } from './dto/bulk-template-action.dto';

@UseGuards(JwtAuthGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  list(
    @Query('sectionName') sectionName: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.templatesService.listForUser(
      req.user.userId,
      sectionName || undefined,
    );
  }

  @Post()
  create(@Body() dto: CreateTemplateDto, @Req() req: AuthenticatedRequest) {
    return this.templatesService.create(req.user.userId, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.templatesService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.templatesService.delete(req.user.userId, id);
  }

  @Post('bulk')
  bulk(@Body() dto: BulkTemplateActionDto, @Req() req: AuthenticatedRequest) {
    return this.templatesService.bulkAction(req.user.userId, dto);
  }
}
