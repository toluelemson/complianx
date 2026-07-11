import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { BulkTemplateActionDto } from './dto/bulk-template-action.dto';

@UseGuards(JwtAuthGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  list(@Query('sectionName') sectionName: string, @Request() req) {
    return this.templatesService.listForUser(
      req.user.userId,
      sectionName || undefined,
    );
  }

  @Post()
  create(@Body() dto: CreateTemplateDto, @Request() req) {
    return this.templatesService.create(req.user.userId, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @Request() req,
  ) {
    return this.templatesService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req) {
    return this.templatesService.delete(req.user.userId, id);
  }

  @Post('bulk')
  bulk(
    @Body() dto: BulkTemplateActionDto,
    @Request() req,
  ) {
    return this.templatesService.bulkAction(req.user.userId, dto);
  }
}
