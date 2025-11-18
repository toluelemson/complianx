import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AutoSaveService } from './auto-save.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SaveSectionDto } from './dto/save-section.dto';

@UseGuards(JwtAuthGuard)
@Controller('autosave')
export class AutoSaveController {
  constructor(private readonly autoSaveService: AutoSaveService) {}

  @Post('sections')
  saveSection(@Request() req, @Body() dto: SaveSectionDto) {
    return this.autoSaveService.saveSection(req.user.userId, dto);
  }

  @Get('sections/:sectionId')
  getSection(@Param('sectionId') sectionId: string) {
    return this.autoSaveService.getSectionAutosave(sectionId);
  }

  @Delete('sections/:sectionId')
  deleteSection(@Param('sectionId') sectionId: string) {
    return this.autoSaveService.deleteSectionAutosave(sectionId);
  }
}
