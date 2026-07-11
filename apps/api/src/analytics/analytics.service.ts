import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [docs, approvals, sections, aiSystems] = await Promise.all([
      this.prisma.document.count(),
      this.prisma.sectionStatusEvent.count({
        where: { status: { equals: 'APPROVED' } },
      }),
      this.prisma.section.count(),
      this.prisma.project.count(),
    ]);
    return { docs, approvals, sections, aiSystems };
  }
}
