import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { PrismaService } from '../../../../platform/database/prisma.service';
import { ProjectsService } from '../../../../projects/projects.service';
import { extname } from 'path';
import { randomBytes, createHash } from 'crypto';
import {
  FILE_STORAGE,
  type FileStorage,
} from '../../../../platform/files/file-storage.port';
import type {
  EvidencePurpose,
  EvidenceReviewStatus,
  EvidenceUpload,
} from './artifact.commands';

@Injectable()
export class ArtifactsService {
  private readonly storageBucket = 'artifacts';

  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
  ) {}

  private async ensureSection(projectId: string, sectionId: string) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });
    if (!section || section.projectId !== projectId) {
      throw new NotFoundException('Section not found');
    }
    return section;
  }

  private buildCitationKey(sectionName: string, version: number) {
    const normalized = sectionName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    const versionSegment = String(version).padStart(2, '0');
    return `${normalized}-A${versionSegment}`;
  }

  async list(
    projectId: string,
    sectionId: string,
    userId: string,
    companyId: string,
  ) {
    await this.projectsService.assertAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
      allowCompanyMember: true,
    });
    await this.ensureSection(projectId, sectionId);
    return this.prisma.sectionArtifact.findMany({
      where: { sectionId },
      orderBy: { version: 'desc' },
      include: {
        uploadedBy: { select: { id: true, email: true } },
        reviewedBy: { select: { id: true, email: true } },
        previousArtifact: {
          select: {
            id: true,
            version: true,
            checksum: true,
            citationKey: true,
          },
        },
      },
    });
  }

  async upload(
    projectId: string,
    sectionId: string,
    userId: string,
    companyId: string,
    file: EvidenceUpload | undefined,
    description?: string,
    purpose?: EvidencePurpose,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    await this.projectsService.assertOwnership(projectId, userId, companyId);
    const section = await this.ensureSection(projectId, sectionId);
    const storedName = `${sectionId}-${Date.now()}-${randomBytes(8).toString('hex')}${extname(file.originalname)}`;
    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    const latest = await this.prisma.sectionArtifact.findFirst({
      where: { sectionId },
      orderBy: { version: 'desc' },
    });
    const version = (latest?.version ?? 0) + 1;
    const citationKey = this.buildCitationKey(section.name, version);
    await this.storage.write(this.storageBucket, storedName, file.buffer);
    const normalizedPurpose =
      purpose === 'DATASET' || purpose === 'MODEL' ? purpose : 'GENERIC';
    return this.prisma.sectionArtifact.create({
      data: {
        originalName: file.originalname,
        storedName,
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size,
        description: description?.trim() ? description.trim() : null,
        sectionId,
        projectId,
        uploadedById: userId,
        checksum,
        version,
        citationKey,
        previousArtifactId: latest?.id ?? null,
        purpose: normalizedPurpose as any,
      },
      include: {
        uploadedBy: { select: { id: true, email: true } },
        reviewedBy: { select: { id: true, email: true } },
        previousArtifact: {
          select: {
            id: true,
            version: true,
            checksum: true,
            citationKey: true,
          },
        },
      },
    });
  }

  async remove(artifactId: string, userId: string, companyId: string) {
    const artifact = await this.prisma.sectionArtifact.findUnique({
      where: { id: artifactId },
    });
    if (!artifact) {
      throw new NotFoundException('Artifact not found');
    }
    await this.projectsService.assertOwnership(
      artifact.projectId,
      userId,
      companyId,
    );
    const newerCount = await this.prisma.sectionArtifact.count({
      where: { previousArtifactId: artifactId },
    });
    if (newerCount > 0) {
      throw new BadRequestException(
        'Cannot delete an artifact that has newer versions',
      );
    }
    await this.prisma.sectionArtifact.delete({
      where: { id: artifactId },
    });
    if (this.storage.exists(this.storageBucket, artifact.storedName)) {
      await this.storage.remove(this.storageBucket, artifact.storedName);
    }
    return { success: true };
  }

  async download(artifactId: string, userId: string, companyId: string) {
    const artifact = await this.prisma.sectionArtifact.findUnique({
      where: { id: artifactId },
    });
    if (!artifact) {
      throw new NotFoundException('Artifact not found');
    }
    await this.projectsService.assertAccess(
      artifact.projectId,
      userId,
      companyId,
      { allowOwner: true, allowReviewer: true, allowApprover: true },
    );
    if (!this.storage.exists(this.storageBucket, artifact.storedName)) {
      throw new NotFoundException('Stored file missing');
    }
    return new StreamableFile(
      this.storage.createReadStream(this.storageBucket, artifact.storedName),
      {
        disposition: `attachment; filename="${artifact.originalName}"`,
        type: artifact.mimeType || 'application/octet-stream',
      },
    );
  }

  async review(
    artifactId: string,
    reviewerId: string,
    status: EvidenceReviewStatus,
    comment?: string,
  ) {
    const artifact = await this.prisma.sectionArtifact.findUnique({
      where: { id: artifactId },
      include: { project: true },
    });
    if (!artifact) {
      throw new NotFoundException('Artifact not found');
    }
    const access = await this.projectsService.assertAccess(
      artifact.projectId,
      reviewerId,
      artifact.project.companyId ?? undefined,
      { allowOwner: false, allowReviewer: true, allowApprover: true },
    );
    const membershipRole = access.membershipRole;
    if (membershipRole !== 'REVIEWER' && membershipRole !== 'ADMIN') {
      throw new ForbiddenException(
        'Only workspace reviewers may approve evidence',
      );
    }
    return this.prisma.sectionArtifact.update({
      where: { id: artifactId },
      data: {
        status,
        reviewComment: comment?.trim() ? comment.trim() : null,
        reviewedAt: new Date(),
        reviewedById: reviewerId,
      },
      include: {
        uploadedBy: { select: { id: true, email: true } },
        reviewedBy: { select: { id: true, email: true } },
        previousArtifact: {
          select: {
            id: true,
            version: true,
            checksum: true,
            citationKey: true,
          },
        },
      },
    });
  }
}
