import type { EvidenceUpload } from './artifact.commands';

export type ScanResult = { safe: boolean; reason?: string };

export interface FileScanner {
  scan(file: EvidenceUpload): Promise<ScanResult>;
}

/** Local development scanner; replace the provider without changing upload flow. */
export class NoopFileScanner implements FileScanner {
  async scan(file: EvidenceUpload): Promise<ScanResult> {
    // Basic local gate; production deployments can bind a malware provider.
    const header = file.buffer.subarray(0, 8);
    if (header.subarray(0, 2).toString() === 'MZ') {
      return { safe: false, reason: 'Executable files are not accepted as evidence' };
    }
    if (header.subarray(0, 4).toString() === '\u007fELF' || header[0] === 0x23 && header[1] === 0x21) {
      return { safe: false, reason: 'Executable files are not accepted as evidence' };
    }
    return { safe: true };
  }
}
