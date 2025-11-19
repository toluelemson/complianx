import { Section, SectionArtifact } from '@prisma/client';

type SectionForMerge = Pick<Section, 'name' | 'content'> & {
  artifacts?: Array<
    Pick<
      SectionArtifact,
      | 'id'
      | 'originalName'
      | 'description'
      | 'createdAt'
      | 'status'
      | 'version'
      | 'checksum'
      | 'citationKey'
      | 'reviewComment'
      | 'reviewedAt'
    >
  >;
};

export function mergeSections(sections: SectionForMerge[]) {
  return sections.reduce<Record<string, any>>((acc, section) => {
    const content = section.content as any;
    let normalized: Record<string, any>;
    if (content && typeof content === 'object' && !Array.isArray(content)) {
      normalized = { ...content };
    } else if (Array.isArray(content)) {
      normalized = { entries: [...content] };
    } else {
      normalized = { value: content };
    }
    if (section.artifacts?.length) {
      normalized._artifacts = section.artifacts.map((artifact) => ({
        id: artifact.id,
        citation: artifact.citationKey,
        name: artifact.originalName,
        description: artifact.description,
        uploadedAt: artifact.createdAt,
        status: artifact.status,
        version: artifact.version,
        checksum: artifact.checksum,
        reviewComment: artifact.reviewComment,
        reviewedAt: artifact.reviewedAt,
      }));
    }
    acc[section.name] = normalized;
    return acc;
  }, {});
}
