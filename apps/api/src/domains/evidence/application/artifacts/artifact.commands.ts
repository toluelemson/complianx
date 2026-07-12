export interface EvidenceUpload {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export type EvidencePurpose = 'DATASET' | 'MODEL' | 'GENERIC';
export type EvidenceReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
