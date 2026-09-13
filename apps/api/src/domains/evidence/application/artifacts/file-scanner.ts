import type { EvidenceUpload } from './artifact.commands';

export type ScanResult = { safe: boolean; reason?: string };

export interface FileScanner {
  scan(file: EvidenceUpload): Promise<ScanResult>;
}

/** Local development scanner; replace the provider without changing upload flow. */
export class NoopFileScanner implements FileScanner {
  async scan(_file: EvidenceUpload): Promise<ScanResult> {
    return { safe: true };
  }
}
