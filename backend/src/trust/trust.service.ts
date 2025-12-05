import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { TrustMetric, TrustSample as TrustSampleModel } from '@prisma/client';
import { promises as fs } from 'fs';
import { join } from 'path';
import { MonetizationService } from '../monetization/monetization.service';

@Injectable()
export class TrustService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
    private readonly monetization: MonetizationService,
  ) {}

  async listByProject(projectId: string, userId: string, companyId: string) {
    await this.projectsService.assertAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
    });
    return this.prisma.trustMetric.findMany({
      where: { projectId },
      include: {
        samples: {
          orderBy: { timestamp: 'desc' },
          take: 6,
        },
      },
    });
  }

  async create(
    projectId: string,
    userId: string,
    companyId: string,
    dto: {
      name: string;
      pillar: string;
      unit: string;
      targetMin?: number;
      targetMax?: number;
      datasetName?: string;
      modelName?: string;
      sectionId?: string;
    },
  ) {
    await this.projectsService.assertOwnership(projectId, userId, companyId);
    return this.prisma.trustMetric.create({
      data: {
        projectId,
        name: dto.name,
        pillar: dto.pillar,
        unit: dto.unit,
        targetMin: dto.targetMin,
        targetMax: dto.targetMax,
        datasetName: dto.datasetName,
        modelName: dto.modelName,
        sectionId: dto.sectionId,
      },
    });
  }

  async addSample(
    metricId: string,
    userId: string,
    companyId: string,
    payload: {
      value: number;
      note?: string;
      artifactId?: string;
    },
  ) {
    const metric = await this.prisma.trustMetric.findUnique({
      where: { id: metricId },
      include: { project: true },
    });
    if (!metric) {
      throw new NotFoundException('Metric not found');
    }
    await this.projectsService.assertOwnership(
      metric.projectId,
      userId,
      companyId,
    );
    const status = this.evaluateStatus(metric, payload.value);
    return this.prisma.trustSample.create({
      data: {
        metricId,
        value: payload.value,
        status,
        note: payload.note,
        artifactId: payload.artifactId,
      },
    });
  }

  private evaluateStatus(metric: TrustMetric, value: number) {
    if (metric.targetMin !== null && value < metric.targetMin) {
      return 'ALERT';
    }
    if (metric.targetMax !== null && value > metric.targetMax) {
      return 'WARN';
    }
    return 'OK';
  }

  async analyzeFairness(userId: string, companyId: string, dto: {
    projectId: string;
    datasetArtifactId: string;
    modelArtifactId?: string;
    columns?: { sensitive_attribute?: string; y_true?: string; y_pred?: string };
    metricId?: string;
  }) {
    const { projectId } = dto;
    await this.projectsService.assertOwnership(projectId, userId, companyId);
    await this.monetization.checkAndConsumeForProject(projectId, 'trust', 1);
    const dataset = await this.prisma.sectionArtifact.findUnique({
      where: { id: dto.datasetArtifactId },
    });
    if (!dataset || dataset.projectId !== projectId) {
      throw new NotFoundException('Dataset artifact not found');
    }
    const modelArtifact = dto.modelArtifactId
      ? await this.prisma.sectionArtifact.findUnique({
          where: { id: dto.modelArtifactId },
        })
      : null;
    if (modelArtifact && modelArtifact.projectId !== projectId) {
      throw new NotFoundException('Model artifact not found');
    }

    const storageRoot = join(process.cwd(), 'storage', 'artifacts');
    const datasetPath = join(storageRoot, dataset.storedName);
    const csvRaw = await fs.readFile(datasetPath, 'utf8');
    const rows = this.parseCsv(csvRaw);
    const cols = dto.columns || {};
    const sensitiveCol = cols.sensitive_attribute || 'sensitive_attribute';
    const yTrueCol = cols.y_true || 'y_true';
    const yPredCol = cols.y_pred; // optional
    if (!rows.length || !(sensitiveCol in rows[0])) {
      throw new NotFoundException(
        `CSV missing sensitive attribute column: ${sensitiveCol}`,
      );
    }
    const targetCol = yPredCol && yPredCol in rows[0] ? yPredCol : yTrueCol;
    if (!(targetCol in rows[0])) {
      throw new NotFoundException(`CSV missing target column: ${targetCol}`);
    }
    // Aggregate per-group stats
    type GroupAgg = {
      total: number;
      positive: number; // on targetCol
      // When y_pred present, also track for EO metrics
      tp: number;
      fp: number;
      fn: number;
      tn: number;
    };
    const groups = new Map<string, GroupAgg>();
    const hasPred = !!(dto.columns?.y_pred && dto.columns?.y_pred in rows[0]) || (rows[0].hasOwnProperty('y_pred'));
    for (const r of rows) {
      const g = String(r[sensitiveCol]);
      const yTrue = Number(r[yTrueCol]);
      const yTarget = Number(r[targetCol]);
      const yPred = hasPred ? Number(r[dto.columns?.y_pred || 'y_pred']) : undefined;
      if (!groups.has(g))
        groups.set(g, { total: 0, positive: 0, tp: 0, fp: 0, fn: 0, tn: 0 });
      const agg = groups.get(g)!;
      agg.total += 1;
      if (yTarget === 1) agg.positive += 1;
      if (hasPred && (yPred === 0 || yPred === 1) && (yTrue === 0 || yTrue === 1)) {
        if (yTrue === 1 && yPred === 1) agg.tp += 1;
        else if (yTrue === 0 && yPred === 1) agg.fp += 1;
        else if (yTrue === 1 && yPred === 0) agg.fn += 1;
        else if (yTrue === 0 && yPred === 0) agg.tn += 1;
      }
    }

    // Positive rate gap (existing fairness gap)
    const rates = Array.from(groups.values())
      .map((g) => (g.total > 0 ? g.positive / g.total : 0))
      .filter((x) => !Number.isNaN(x));
    const maxRate = rates.length ? Math.max(...rates) : 0;
    const minRate = rates.length ? Math.min(...rates) : 0;
    const gap = Math.abs(maxRate - minRate);

    // Upsert metric
    let metric: TrustMetric | null = null;
    if (dto.metricId) {
      metric = await this.prisma.trustMetric.findUnique({
        where: { id: dto.metricId },
      });
    }
    if (!metric) {
      metric = await this.prisma.trustMetric.findFirst({
        where: { projectId, name: 'Fairness gap' },
      });
    }
    if (!metric) {
      metric = await this.prisma.trustMetric.create({
        data: {
          projectId,
          name: 'Fairness gap',
          pillar: 'Fairness',
          unit: 'gap',
          targetMax: 0.05,
          datasetName: dataset.originalName,
          modelName: modelArtifact?.originalName || undefined,
        },
      });
    }
    const status = this.evaluateStatus(metric, gap);
    const note = `Auto-computed fairness gap on ${dataset.originalName}${
      modelArtifact ? ` with model ${modelArtifact.originalName}` : ''
    } using ${targetCol} by ${sensitiveCol}.`;
    const sample = await this.prisma.trustSample.create({
      data: {
        metricId: metric.id,
        value: gap,
        status,
        note,
        artifactId: dataset.id,
      },
    });

    // Disparate Impact (80% rule): min(rate)/max(rate)
    let diSample: TrustSampleModel | null = null;
    if (rates.length >= 2) {
      const di = maxRate > 0 ? minRate / maxRate : 0;
      let diMetric = await this.prisma.trustMetric.findFirst({
        where: { projectId, name: 'Disparate impact' },
      });
      if (!diMetric) {
        diMetric = await this.prisma.trustMetric.create({
          data: {
            projectId,
            name: 'Disparate impact',
            pillar: 'Fairness',
            unit: 'ratio',
            targetMin: 0.8, // 80% rule
            datasetName: dataset.originalName,
            modelName: modelArtifact?.originalName || undefined,
          },
        });
      }
      const diStatus = this.evaluateStatus(diMetric, di);
      diSample = await this.prisma.trustSample.create({
        data: {
          metricId: diMetric.id,
          value: di,
          status: diStatus,
          note: `Disparate impact computed from positive rates across groups using ${
            targetCol
          }.`,
          artifactId: dataset.id,
        },
      });
    }

    // Equal Opportunity (TPR gap) and Equalized Odds (max(TPR gap, FPR gap))
    let eoSample: TrustSampleModel | null = null;
    let eoddsSample: TrustSampleModel | null = null;
    if (hasPred) {
      const tprs: number[] = [];
      const fprs: number[] = [];
      groups.forEach((g) => {
        const pos = g.tp + g.fn;
        const neg = g.fp + g.tn;
        const tpr = pos > 0 ? g.tp / pos : 0;
        const fpr = neg > 0 ? g.fp / neg : 0;
        if (!Number.isNaN(tpr)) tprs.push(tpr);
        if (!Number.isNaN(fpr)) fprs.push(fpr);
      });
      if (tprs.length >= 2) {
        const tprGap = Math.max(...tprs) - Math.min(...tprs);
        let eoMetric = await this.prisma.trustMetric.findFirst({
          where: { projectId, name: 'Equal opportunity gap' },
        });
        if (!eoMetric) {
          eoMetric = await this.prisma.trustMetric.create({
            data: {
              projectId,
              name: 'Equal opportunity gap',
              pillar: 'Fairness',
              unit: 'gap',
              targetMax: 0.05,
              datasetName: dataset.originalName,
              modelName: modelArtifact?.originalName || undefined,
            },
          });
        }
        const eoStatus = this.evaluateStatus(eoMetric, tprGap);
        eoSample = await this.prisma.trustSample.create({
          data: {
            metricId: eoMetric.id,
            value: tprGap,
            status: eoStatus,
            note: `Equal opportunity gap (TPR disparity) using y_true and y_pred by ${sensitiveCol}.`,
            artifactId: dataset.id,
          },
        });
      }
      if (tprs.length >= 2 && fprs.length >= 2) {
        const tprGap = Math.max(...tprs) - Math.min(...tprs);
        const fprGap = Math.max(...fprs) - Math.min(...fprs);
        const eoGap = Math.max(tprGap, fprGap);
        let eoddsMetric = await this.prisma.trustMetric.findFirst({
          where: { projectId, name: 'Equalized odds gap' },
        });
        if (!eoddsMetric) {
          eoddsMetric = await this.prisma.trustMetric.create({
            data: {
              projectId,
              name: 'Equalized odds gap',
              pillar: 'Fairness',
              unit: 'gap',
              targetMax: 0.10,
              datasetName: dataset.originalName,
              modelName: modelArtifact?.originalName || undefined,
            },
          });
        }
        const eoddsStatus = this.evaluateStatus(eoddsMetric, eoGap);
        eoddsSample = await this.prisma.trustSample.create({
          data: {
            metricId: eoddsMetric.id,
            value: eoGap,
            status: eoddsStatus,
            note: `Equalized odds gap (max of TPR and FPR disparities). TPR gap=${tprGap.toFixed(
              3,
            )}, FPR gap=${fprGap.toFixed(3)}.`,
            artifactId: dataset.id,
          },
        });
      }
    }

    return { metric, sample, diSample, eoSample, eoddsSample };
  }

  private parseCsv(content: string): Array<Record<string, any>> {
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (!lines.length) return [];
    const header = lines[0].split(',').map((h) => h.trim());
    const rows: Array<Record<string, any>> = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      const obj: Record<string, any> = {};
      for (let j = 0; j < header.length; j++) {
        const key = header[j];
        const val = parts[j] !== undefined ? parts[j].trim() : '';
        const asNum = Number(val);
        obj[key] = Number.isNaN(asNum) ? val : asNum;
      }
      rows.push(obj);
    }
    return rows;
  }

  async analyzeFairnessSegments(userId: string, companyId: string, dto: {
    projectId: string;
    datasetArtifactId: string;
    columns?: { sensitive_attribute?: string; y_true?: string; y_pred?: string };
    segments: Array<{ name: string; filter: { column: string; values: (string | number)[] } }>;
  }) {
    const { projectId } = dto;
    await this.projectsService.assertOwnership(projectId, userId, companyId);
    const dataset = await this.prisma.sectionArtifact.findUnique({
      where: { id: dto.datasetArtifactId },
    });
    if (!dataset || dataset.projectId !== projectId) {
      throw new NotFoundException('Dataset artifact not found');
    }
    const storageRoot = join(process.cwd(), 'storage', 'artifacts');
    const datasetPath = join(storageRoot, dataset.storedName);
    const csvRaw = await fs.readFile(datasetPath, 'utf8');
    const allRows = this.parseCsv(csvRaw);
    const cols = dto.columns || {};
    const sensitiveCol = cols.sensitive_attribute || 'sensitive_attribute';
    const yTrueCol = cols.y_true || 'y_true';
    const yPredCol = cols.y_pred; // optional
    const hasPredGlobal = !!(yPredCol && allRows.length && yPredCol in allRows[0]);

    const results: Array<{
      segment: string;
      counts: number;
      fairnessGap: number;
      disparateImpact?: number;
      equalOpportunityGap?: number;
      equalizedOddsGap?: number;
    }> = [];

    for (const seg of dto.segments) {
      const { column, values } = seg.filter;
      const set = new Set(values.map((v) => String(v)));
      const rows = allRows.filter((r) => String(r[column]) && set.has(String(r[column])));
      if (!rows.length) {
        results.push({ segment: seg.name, counts: 0, fairnessGap: 0 });
        continue;
      }
      // Aggregate per sensitive group for this segment
      type Agg = { total: number; positive: number; tp: number; fp: number; fn: number; tn: number };
      const groups = new Map<string, Agg>();
      const hasPred = hasPredGlobal || (rows.length && yPredCol && yPredCol in rows[0]);
      for (const r of rows) {
        const g = String(r[sensitiveCol]);
        const yTrue = Number(r[yTrueCol]);
        const pred = hasPred && yPredCol ? Number(r[yPredCol]) : undefined;
        if (!groups.has(g)) groups.set(g, { total: 0, positive: 0, tp: 0, fp: 0, fn: 0, tn: 0 });
        const agg = groups.get(g)!;
        agg.total += 1;
        if (yTrue === 1) agg.positive += 1; // positive rate base on y_true if no y_pred
        if (hasPred && (pred === 0 || pred === 1) && (yTrue === 0 || yTrue === 1)) {
          if (yTrue === 1 && pred === 1) agg.tp += 1;
          else if (yTrue === 0 && pred === 1) agg.fp += 1;
          else if (yTrue === 1 && pred === 0) agg.fn += 1;
          else if (yTrue === 0 && pred === 0) agg.tn += 1;
        }
      }
      const rates = Array.from(groups.values()).map((g) => (g.total > 0 ? g.positive / g.total : 0));
      const maxRate = rates.length ? Math.max(...rates) : 0;
      const minRate = rates.length ? Math.min(...rates) : 0;
      const fairnessGap = Math.abs(maxRate - minRate);
      const result: any = { segment: seg.name, counts: rows.length, fairnessGap };
      if (rates.length >= 2) {
        result.disparateImpact = maxRate > 0 ? minRate / maxRate : 0;
      }
      if (hasPred) {
        const tprs: number[] = [];
        const fprs: number[] = [];
        groups.forEach((g) => {
          const pos = g.tp + g.fn;
          const neg = g.fp + g.tn;
          const tpr = pos > 0 ? g.tp / pos : 0;
          const fpr = neg > 0 ? g.fp / neg : 0;
          tprs.push(tpr);
          fprs.push(fpr);
        });
        if (tprs.length >= 2) {
          const tprGap = Math.max(...tprs) - Math.min(...tprs);
          result.equalOpportunityGap = tprGap;
        }
        if (tprs.length >= 2 && fprs.length >= 2) {
          const tprGap = Math.max(...tprs) - Math.min(...tprs);
          const fprGap = Math.max(...fprs) - Math.min(...fprs);
          result.equalizedOddsGap = Math.max(tprGap, fprGap);
        }
      }
      results.push(result);
    }
    return { dataset: dataset.originalName, results };
  }

  async removeMetric(metricId: string, userId: string, companyId: string) {
    const metric = await this.prisma.trustMetric.findUnique({
      where: { id: metricId },
      include: { project: true },
    });
    if (!metric) {
      throw new NotFoundException('Metric not found');
    }
    await this.projectsService.assertOwnership(metric.projectId, userId, companyId);
    // Delete samples first to satisfy FK constraints
    await this.prisma.trustSample.deleteMany({ where: { metricId } });
    await this.prisma.trustMetric.delete({ where: { id: metricId } });
    return { success: true };
  }

  async removeSample(sampleId: string, userId: string, companyId: string) {
    const sample = await this.prisma.trustSample.findUnique({
      where: { id: sampleId },
      include: { metric: true },
    });
    if (!sample) {
      throw new NotFoundException('Sample not found');
    }
    await this.projectsService.assertOwnership(sample.metric.projectId, userId, companyId);
    await this.prisma.trustSample.delete({ where: { id: sampleId } });
    return { success: true };
  }

  async analyzeRobustness(userId: string, companyId: string, dto: {
    projectId: string;
    datasetArtifactId: string;
    columns?: { y_pred_baseline?: string; y_pred_perturbed?: string; y_score?: string };
  }) {
    const { projectId } = dto;
    await this.projectsService.assertOwnership(projectId, userId, companyId);
    // Enforce plan limits for trust analyses
    await this.monetization.checkAndConsumeForProject(projectId, 'trust', 1);
    const dataset = await this.prisma.sectionArtifact.findUnique({
      where: { id: dto.datasetArtifactId },
    });
    if (!dataset || dataset.projectId !== projectId) {
      throw new NotFoundException('Dataset artifact not found');
    }
    const storageRoot = join(process.cwd(), 'storage', 'artifacts');
    const datasetPath = join(storageRoot, dataset.storedName);
    const csvRaw = await fs.readFile(datasetPath, 'utf8');
    const rows = this.parseCsv(csvRaw);
    if (!rows.length) {
      throw new NotFoundException('Dataset is empty');
    }
    const cols = dto.columns || {};
    const yPred0 = cols.y_pred_baseline || 'y_pred';
    const yPred1 = cols.y_pred_perturbed || 'y_pred_perturbed';
    const yScore = cols.y_score || 'y_score';

    // Flip rate between baseline and perturbed predictions when both exist
    let flips = 0;
    let paired = 0;
    if (yPred0 in rows[0] && yPred1 in rows[0]) {
      for (const r of rows) {
        const a = Number(r[yPred0]);
        const b = Number(r[yPred1]);
        if ((a === 0 || a === 1) && (b === 0 || b === 1)) {
          paired += 1;
          if (a !== b) flips += 1;
        }
      }
    }
    const flipRate = paired > 0 ? flips / paired : 0;

    // Boundary vulnerability rate: share of scores close to decision boundary
    let vuln = 0;
    let scored = 0;
    if (yScore in rows[0]) {
      for (const r of rows) {
        const s = Number(r[yScore]);
        if (!Number.isNaN(s)) {
          scored += 1;
          if (s >= 0.4 && s <= 0.6) vuln += 1;
        }
      }
    }
    const vulnRate = scored > 0 ? vuln / scored : 0;

    // Upsert metrics and create samples
    // Robustness flip rate
    let flipMetric = await this.prisma.trustMetric.findFirst({
      where: { projectId, name: 'Robustness flip rate' },
    });
    if (!flipMetric) {
      flipMetric = await this.prisma.trustMetric.create({
        data: {
          projectId,
          name: 'Robustness flip rate',
          pillar: 'Robustness',
          unit: 'rate',
          targetMax: 0.05,
          datasetName: dataset.originalName,
        },
      });
    }
    const flipStatus = this.evaluateStatus(flipMetric, flipRate);
    const flipSample = await this.prisma.trustSample.create({
      data: {
        metricId: flipMetric.id,
        value: flipRate,
        status: flipStatus,
        note: paired
          ? `Flip rate using ${yPred0} vs ${yPred1} across ${paired} pairs.`
          : 'No paired predictions found to compute flip rate.',
        artifactId: dataset.id,
      },
    });

    // Boundary vulnerability
    let vulnMetric = await this.prisma.trustMetric.findFirst({
      where: { projectId, name: 'Boundary vulnerability rate' },
    });
    if (!vulnMetric) {
      vulnMetric = await this.prisma.trustMetric.create({
        data: {
          projectId,
          name: 'Boundary vulnerability rate',
          pillar: 'Robustness',
          unit: 'rate',
          targetMax: 0.2,
          datasetName: dataset.originalName,
        },
      });
    }
    const vulnStatus = this.evaluateStatus(vulnMetric, vulnRate);
    const vulnSample = await this.prisma.trustSample.create({
      data: {
        metricId: vulnMetric.id,
        value: vulnRate,
        status: vulnStatus,
        note: scored
          ? `Fraction of ${yScore} within [0.4,0.6] across ${scored} scored rows.`
          : `Column ${yScore} not found; boundary vulnerability not computed.`,
        artifactId: dataset.id,
      },
    });

    return { flipMetric, flipSample, vulnMetric, vulnSample };
  }

  async analyzeDrift(userId: string, companyId: string, dto: {
    projectId: string;
    baselineArtifactId: string;
    currentArtifactId: string;
    columns?: string[];
    targets?: { y_true?: string; y_score?: string };
  }) {
    const { projectId } = dto;
    await this.projectsService.assertOwnership(projectId, userId, companyId);
    // Enforce plan limits for trust analyses
    await this.monetization.checkAndConsumeForProject(projectId, 'trust', 1);
    const baseline = await this.prisma.sectionArtifact.findUnique({
      where: { id: dto.baselineArtifactId },
    });
    const current = await this.prisma.sectionArtifact.findUnique({
      where: { id: dto.currentArtifactId },
    });
    if (!baseline || baseline.projectId !== projectId) {
      throw new NotFoundException('Baseline artifact not found');
    }
    if (!current || current.projectId !== projectId) {
      throw new NotFoundException('Current artifact not found');
    }
    const storageRoot = join(process.cwd(), 'storage', 'artifacts');
    const bCsv = await fs.readFile(join(storageRoot, baseline.storedName), 'utf8');
    const cCsv = await fs.readFile(join(storageRoot, current.storedName), 'utf8');
    const bRows = this.parseCsv(bCsv);
    const cRows = this.parseCsv(cCsv);
    if (!bRows.length || !cRows.length) {
      throw new NotFoundException('Artifacts have no rows');
    }
    // Determine numeric columns to compare
    const numCols = new Set<string>();
    const candidateCols = dto.columns && dto.columns.length ? dto.columns : Object.keys(cRows[0]);
    for (const col of candidateCols) {
      if (!(col in bRows[0]) || !(col in cRows[0])) continue;
      let numCount = 0;
      for (let i = 0; i < Math.min(50, cRows.length); i++) {
        const v = Number(cRows[i][col]);
        if (!Number.isNaN(v)) numCount++;
      }
      if (numCount >= 10) numCols.add(col);
    }
    const bins = 10;
    const psiVals: number[] = [];
    const klVals: number[] = [];
    function histogram(values: number[], min: number, max: number, bins: number) {
      const counts = new Array(bins).fill(0);
      const width = max - min || 1;
      for (const v of values) {
        const idx = Math.max(0, Math.min(bins - 1, Math.floor(((v - min) / width) * bins)));
        counts[idx] += 1;
      }
      const total = values.length || 1;
      return counts.map((c) => c / total);
    }
    function psi(expected: number[], actual: number[]) {
      let sum = 0;
      for (let i = 0; i < expected.length; i++) {
        const e = Math.max(expected[i], 1e-6);
        const a = Math.max(actual[i], 1e-6);
        sum += (a - e) * Math.log(a / e);
      }
      return sum;
    }
    function kld(p: number[], q: number[]) {
      let sum = 0;
      for (let i = 0; i < p.length; i++) {
        const pi = Math.max(p[i], 1e-6);
        const qi = Math.max(q[i], 1e-6);
        sum += pi * Math.log(pi / qi);
      }
      return sum;
    }
    for (const col of numCols) {
      const bVals = bRows.map((r) => Number(r[col])).filter((v) => !Number.isNaN(v));
      const cVals = cRows.map((r) => Number(r[col])).filter((v) => !Number.isNaN(v));
      if (!bVals.length || !cVals.length) continue;
      const min = Math.min(Math.min(...bVals), Math.min(...cVals));
      const max = Math.max(Math.max(...bVals), Math.max(...cVals));
      const bHist = histogram(bVals, min, max, bins);
      const cHist = histogram(cVals, min, max, bins);
      psiVals.push(psi(bHist, cHist));
      klVals.push(kld(bHist, cHist));
    }
    const psiAvg = psiVals.length ? psiVals.reduce((a, b) => a + b, 0) / psiVals.length : 0;
    const klAvg = klVals.length ? klVals.reduce((a, b) => a + b, 0) / klVals.length : 0;

    // Calibration error (ECE) on current dataset if targets present
    let ece = 0;
    let eceCount = 0;
    const yTrue = dto.targets?.y_true || 'y_true';
    const yScore = dto.targets?.y_score || 'y_score';
    if (yTrue in cRows[0] && yScore in cRows[0]) {
      const buckets = new Array(10).fill(0).map(() => ({ n: 0, acc: 0, conf: 0 }));
      for (const r of cRows) {
        const t = Number(r[yTrue]);
        const s = Number(r[yScore]);
        if ((t === 0 || t === 1) && !Number.isNaN(s)) {
          const idx = Math.max(0, Math.min(9, Math.floor(s * 10)));
          buckets[idx].n += 1;
          buckets[idx].acc += t;
          buckets[idx].conf += s;
          eceCount += 1;
        }
      }
      let sum = 0;
      for (let i = 0; i < 10; i++) {
        const b = buckets[i];
        if (b.n === 0) continue;
        const acc = b.acc / b.n;
        const conf = b.conf / b.n;
        sum += (b.n / Math.max(eceCount, 1)) * Math.abs(acc - conf);
      }
      ece = sum;
    }

    // Upsert metrics and record samples
    // PSI (avg)
    let psiMetric = await this.prisma.trustMetric.findFirst({
      where: { projectId, name: 'PSI (avg)' },
    });
    if (!psiMetric) {
      psiMetric = await this.prisma.trustMetric.create({
        data: {
          projectId,
          name: 'PSI (avg)',
          pillar: 'Drift',
          unit: 'psi',
          targetMax: 0.1,
          datasetName: current.originalName,
        },
      });
    }
    const psiStatus = this.evaluateStatus(psiMetric, psiAvg);
    const psiSample = await this.prisma.trustSample.create({
      data: {
        metricId: psiMetric.id,
        value: psiAvg,
        status: psiStatus,
        note: `Average PSI across ${numCols.size} columns comparing ${baseline.originalName} → ${current.originalName}.`,
        artifactId: current.id,
      },
    });

    // KL (avg)
    let klMetric = await this.prisma.trustMetric.findFirst({
      where: { projectId, name: 'KL divergence (avg)' },
    });
    if (!klMetric) {
      klMetric = await this.prisma.trustMetric.create({
        data: {
          projectId,
          name: 'KL divergence (avg)',
          pillar: 'Drift',
          unit: 'kl',
          targetMax: 0.1,
          datasetName: current.originalName,
        },
      });
    }
    const klStatus = this.evaluateStatus(klMetric, klAvg);
    const klSample = await this.prisma.trustSample.create({
      data: {
        metricId: klMetric.id,
        value: klAvg,
        status: klStatus,
        note: `Average KL divergence across ${numCols.size} columns comparing ${baseline.originalName} → ${current.originalName}.`,
        artifactId: current.id,
      },
    });

    // Calibration error (ECE)
    let eceMetric = await this.prisma.trustMetric.findFirst({
      where: { projectId, name: 'Calibration error (ECE)' },
    });
    if (!eceMetric) {
      eceMetric = await this.prisma.trustMetric.create({
        data: {
          projectId,
          name: 'Calibration error (ECE)',
          pillar: 'Robustness',
          unit: 'ece',
          targetMax: 0.05,
          datasetName: current.originalName,
        },
      });
    }
    const eceStatus = this.evaluateStatus(eceMetric, ece);
    const eceSample = await this.prisma.trustSample.create({
      data: {
        metricId: eceMetric.id,
        value: ece,
        status: eceStatus,
        note: eceCount
          ? `ECE over ${eceCount} scored rows using ${yScore}/${yTrue}.`
          : `Columns ${yScore}/${yTrue} not found; ECE not computed.`,
        artifactId: current.id,
      },
    });

    return {
      psiMetric,
      psiSample,
      klMetric,
      klSample,
      eceMetric,
      eceSample,
    };
  }
}
