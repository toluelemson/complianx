import type { EvidenceUpload } from './artifact.commands';
import {
  detectEvidenceFileType,
  validateEvidenceFileType,
} from './evidence-file-type';

function upload(
  originalname: string,
  mimetype: string,
  buffer: Buffer,
): EvidenceUpload {
  return { originalname, mimetype, buffer, size: buffer.length };
}

function minimalDocx(): Buffer {
  const names = ['[Content_Types].xml', 'word/document.xml'];
  const centralEntries = names.map((name) => {
    const nameBytes = Buffer.from(name);
    const entry = Buffer.alloc(46 + nameBytes.length);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(nameBytes.length, 28);
    nameBytes.copy(entry, 46);
    return entry;
  });
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  const central = Buffer.concat(centralEntries);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(names.length, 8);
  eocd.writeUInt16LE(names.length, 10);
  eocd.writeUInt32LE(central.length, 12);
  eocd.writeUInt32LE(localHeader.length, 16);
  return Buffer.concat([localHeader, central, eocd]);
}

describe('evidence file type validation', () => {
  it('accepts a genuine PDF signature', () => {
    expect(
      validateEvidenceFileType(
        upload('report.pdf', 'application/pdf', Buffer.from('%PDF-1.7\n')),
      ),
    ).toEqual({ valid: true, detectedType: 'pdf' });
  });

  it('rejects an executable renamed and claimed as PDF', () => {
    expect(
      validateEvidenceFileType(
        upload('report.pdf', 'application/pdf', Buffer.from('MZ executable')),
      ),
    ).toEqual({
      valid: false,
      reason: 'Evidence file contents do not match its filename and MIME type',
    });
  });

  it('detects a DOCX from its ZIP central directory', () => {
    expect(detectEvidenceFileType(minimalDocx())).toBe('docx');
    expect(
      validateEvidenceFileType(
        upload(
          'assessment.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          minimalDocx(),
        ),
      ),
    ).toEqual({ valid: true, detectedType: 'docx' });
  });

  it('accepts valid UTF-8 text', () => {
    expect(
      validateEvidenceFileType(
        upload(
          'notes.txt',
          'text/plain',
          Buffer.from('Human review complete.'),
        ),
      ),
    ).toEqual({ valid: true, detectedType: 'txt' });
  });

  it('rejects an unsupported binary file', () => {
    expect(
      validateEvidenceFileType(
        upload(
          'payload.bin',
          'application/octet-stream',
          Buffer.from([0, 1, 2, 3]),
        ),
      ),
    ).toEqual({ valid: false, reason: 'Unsupported evidence file extension' });
  });

  it('rejects an extension and claimed MIME mismatch', () => {
    expect(
      validateEvidenceFileType(
        upload('report.pdf', 'text/plain', Buffer.from('%PDF-1.7\n')),
      ),
    ).toEqual({
      valid: false,
      reason: 'Evidence filename extension and claimed MIME type do not match',
    });
  });

  it('rejects a valid signature that does not match the extension', () => {
    expect(
      validateEvidenceFileType(
        upload(
          'report.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          Buffer.from('%PDF-1.7\n'),
        ),
      ),
    ).toEqual({
      valid: false,
      reason: 'Evidence file contents do not match its filename and MIME type',
    });
  });

  it.each([
    [
      'data.csv',
      'text/csv',
      Buffer.from('name,status\nmodel,approved\n'),
      'csv',
    ],
    ['data.json', 'application/json', Buffer.from('{"reviewed":true}'), 'json'],
    [
      'legacy.doc',
      'application/msword',
      Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      'doc',
    ],
  ])('preserves support for %s', (name, mime, contents, detectedType) => {
    expect(validateEvidenceFileType(upload(name, mime, contents))).toEqual({
      valid: true,
      detectedType,
    });
  });

  it('rejects malformed JSON even when its metadata agrees', () => {
    expect(
      validateEvidenceFileType(
        upload('data.json', 'application/json', Buffer.from('{not-json}')),
      ).valid,
    ).toBe(false);
  });
});
