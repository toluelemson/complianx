import { extname } from 'node:path';
import type { EvidenceUpload } from './artifact.commands';

export type EvidenceFileType = 'pdf' | 'doc' | 'docx' | 'txt' | 'csv' | 'json';

const acceptedMimeTypes: Record<EvidenceFileType, readonly string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  txt: ['text/plain'],
  csv: ['text/csv', 'application/vnd.ms-excel'],
  json: ['application/json', 'text/json'],
};

const oleCompoundFileHeader = Buffer.from([
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
]);

export type EvidenceFileTypeValidation =
  | { valid: true; detectedType: EvidenceFileType }
  | { valid: false; reason: string };

export function validateEvidenceFileType(
  file: EvidenceUpload,
): EvidenceFileTypeValidation {
  const extension = extname(file.originalname).toLowerCase().slice(1);
  if (!(extension in acceptedMimeTypes)) {
    return { valid: false, reason: 'Unsupported evidence file extension' };
  }
  const expectedType = extension as EvidenceFileType;
  if (!acceptedMimeTypes[expectedType].includes(file.mimetype)) {
    return {
      valid: false,
      reason: 'Evidence filename extension and claimed MIME type do not match',
    };
  }

  const textHint = ['txt', 'csv', 'json'].includes(expectedType)
    ? (expectedType as Extract<EvidenceFileType, 'txt' | 'csv' | 'json'>)
    : undefined;
  const detectedType = detectEvidenceFileType(file.buffer, textHint);
  if (detectedType !== expectedType) {
    return {
      valid: false,
      reason: 'Evidence file contents do not match its filename and MIME type',
    };
  }
  return { valid: true, detectedType };
}

export function detectEvidenceFileType(
  buffer: Buffer,
  textHint?: Extract<EvidenceFileType, 'txt' | 'csv' | 'json'>,
): EvidenceFileType | undefined {
  if (buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) return 'pdf';
  if (buffer.subarray(0, 8).equals(oleCompoundFileHeader)) return 'doc';
  if (isDocx(buffer)) return 'docx';

  const text = decodePlainText(buffer);
  if (text === undefined) return undefined;
  if (textHint === 'json') {
    try {
      JSON.parse(text);
      return 'json';
    } catch {
      return undefined;
    }
  }
  return textHint === 'csv' ? 'csv' : 'txt';
}

function decodePlainText(buffer: Buffer): string | undefined {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return undefined;
  }
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    if (
      code === 0 ||
      (code < 0x20 && ![0x09, 0x0a, 0x0c, 0x0d].includes(code))
    ) {
      return undefined;
    }
  }
  return text;
}

function isDocx(buffer: Buffer): boolean {
  // Read ZIP central-directory filenames instead of trusting arbitrary strings in
  // the file body. DOCX packages require both of these entries.
  const eocdSignature = 0x06054b50;
  const centralSignature = 0x02014b50;
  const minimumEocdSize = 22;
  const searchStart = Math.max(0, buffer.length - 65_557);
  let eocd = -1;
  for (
    let offset = buffer.length - minimumEocdSize;
    offset >= searchStart;
    offset--
  ) {
    if (buffer.readUInt32LE(offset) === eocdSignature) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) return false;

  const entries = buffer.readUInt16LE(eocd + 10);
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (centralOffset + centralSize > eocd) return false;

  let offset = centralOffset;
  let hasContentTypes = false;
  let hasWordDocument = false;
  for (let index = 0; index < entries; index++) {
    if (
      offset + 46 > eocd ||
      buffer.readUInt32LE(offset) !== centralSignature
    ) {
      return false;
    }
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const nextOffset = offset + 46 + nameLength + extraLength + commentLength;
    if (nextOffset > eocd) return false;
    const name = buffer
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString('utf8');
    hasContentTypes ||= name === '[Content_Types].xml';
    hasWordDocument ||= name === 'word/document.xml';
    offset = nextOffset;
  }
  return hasContentTypes && hasWordDocument;
}
