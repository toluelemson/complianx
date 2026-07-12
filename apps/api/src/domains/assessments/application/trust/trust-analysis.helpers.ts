export type CsvValue = string | number;
export type CsvRow = Record<string, CsvValue>;

export type FairnessSegmentResult = {
  segment: string;
  counts: number;
  fairnessGap: number;
  disparateImpact?: number;
  equalOpportunityGap?: number;
  equalizedOddsGap?: number;
};

export function parseCsv(content: string): CsvRow[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) {
    return [];
  }

  const header = lines[0].split(',').map((value) => value.trim());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const row: CsvRow = {};

    for (let j = 0; j < header.length; j++) {
      const key = header[j];
      const raw = parts[j] !== undefined ? parts[j].trim() : '';
      const asNumber = Number(raw);
      row[key] = Number.isNaN(asNumber) ? raw : asNumber;
    }

    rows.push(row);
  }

  return rows;
}

export function histogram(
  values: number[],
  min: number,
  max: number,
  bins: number,
) {
  const counts = new Array<number>(bins).fill(0);
  const width = max - min || 1;

  for (const value of values) {
    const index = Math.max(
      0,
      Math.min(bins - 1, Math.floor(((value - min) / width) * bins)),
    );
    counts[index] += 1;
  }

  const total = values.length || 1;
  return counts.map((count) => count / total);
}

export function calculatePsi(expected: number[], actual: number[]) {
  let sum = 0;

  for (let i = 0; i < expected.length; i++) {
    const baseline = Math.max(expected[i], 1e-6);
    const current = Math.max(actual[i], 1e-6);
    sum += (current - baseline) * Math.log(current / baseline);
  }

  return sum;
}

export function calculateKld(p: number[], q: number[]) {
  let sum = 0;

  for (let i = 0; i < p.length; i++) {
    const left = Math.max(p[i], 1e-6);
    const right = Math.max(q[i], 1e-6);
    sum += left * Math.log(left / right);
  }

  return sum;
}
