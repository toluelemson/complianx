import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { createReadStream, existsSync, promises as fs } from 'fs';
import { join } from 'path';
import * as archiver from 'archiver';
import { PassThrough } from 'stream';

@Injectable()
export class DocumentsService {
  private readonly storageRoot = join(process.cwd(), 'storage', 'documents');

  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  async list(projectId: string, userId: string, companyId: string) {
    await this.projectsService.assertAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
      allowCompanyMember: true,
    });
    return this.prisma.document.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRecord(projectId: string, type: string, fileName: string) {
    return this.prisma.document.create({
      data: {
        type,
        url: fileName,
        projectId,
      },
    });
  }

  async getDocumentForDownload(id: string, userId: string, companyId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    await this.projectsService.assertAccess(
      doc.projectId,
      userId,
      companyId,
      { allowOwner: true, allowReviewer: true, allowApprover: true, allowCompanyMember: true },
    );
    const filePath = join(this.storageRoot, doc.url);
    if (!existsSync(filePath)) {
      throw new NotFoundException('File missing from storage');
    }
    return new StreamableFile(createReadStream(filePath), {
      disposition: `attachment; filename="${doc.type}.pdf"`,
      type: 'application/pdf',
    });
  }

  async zipDocuments(projectId: string, userId: string, companyId: string) {
    await this.projectsService.assertAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
    });
    const docs = await this.prisma.document.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
    const archiveStream = archiver('zip', { zlib: { level: 9 } });
    const passThrough = new PassThrough();
    archiveStream.pipe(passThrough);

    await Promise.all(
      docs.map(async (doc) => {
        const filePath = join(this.storageRoot, doc.url);
        if (existsSync(filePath)) {
          archiveStream.file(filePath, {
            name: `${doc.type}-${doc.id}.pdf`,
          });
        }
      }),
    );

    archiveStream.finalize();
    return new StreamableFile(passThrough, {
      disposition: `attachment; filename="project-${projectId}-documents.zip"`,
      type: 'application/zip',
    });
  }
}
