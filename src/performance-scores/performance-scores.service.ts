import { Injectable, NotFoundException } from '@nestjs/common';
import { PerformanceScore, ProductSpecification } from '@prisma/client';
import { RedisCacheService } from '../common/utils/redis-cache.service';
import { PrismaService } from '../prisma/prisma.service';

type ScoreField =
  | 'everydayUseScore'
  | 'gamingScore'
  | 'cameraScore'
  | 'multitaskingScore'
  | 'batteryScore'
  | 'displayScore'
  | 'longTermUseScore';

interface ScoreRule {
  weight: number;
  resolve: (context: SpecificationContext) => number | null;
}

interface ScoreSnapshot {
  everydayUseScore: number;
  gamingScore: number;
  cameraScore: number;
  multitaskingScore: number;
  batteryScore: number;
  displayScore: number;
  longTermUseScore: number;
  overallScore: number;
  explanation: string;
}

class SpecificationContext {
  private readonly specificationMap: Map<string, ProductSpecification>;

  constructor(specifications: ProductSpecification[]) {
    this.specificationMap = new Map(
      specifications.map((specification) => [specification.key, specification]),
    );
  }

  numeric(key: string): number | null {
    const specification = this.specificationMap.get(key);
    if (!specification) {
      return null;
    }

    if (specification.numericValue != null) {
      return Number(specification.numericValue.toString());
    }

    const numericFromValue = Number(specification.value);
    return Number.isNaN(numericFromValue) ? null : numericFromValue;
  }

  text(key: string): string | null {
    return this.specificationMap.get(key)?.value?.toLowerCase().trim() ?? null;
  }

  bool(key: string): boolean | null {
    const specification = this.specificationMap.get(key);
    if (!specification) {
      return null;
    }

    const normalized = specification.value.trim().toLowerCase();
    if (['true', 'yes', '1', 'available', 'supported', 'tak', 'ye'].includes(normalized)) {
      return true;
    }

    if (
      ['false', 'no', '0', 'not available', 'unsupported', 'ni', 'nemae'].includes(
        normalized,
      )
    ) {
      return false;
    }

    return specification.numericValue != null
      ? Number(specification.numericValue.toString()) > 0
      : null;
  }
}

@Injectable()
export class PerformanceScoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async getOrCreateForProduct(productId: string): Promise<PerformanceScore> {
    return this.cacheService.getOrSet(`product:${productId}:performance`, async () => {
      const product = await this.prisma.product.findFirst({
        where: {
          id: productId,
          deletedAt: null,
        },
        include: {
          specifications: true,
          performanceScore: true,
        },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (
        product.performanceScore &&
        product.performanceScore.updatedAt >= product.updatedAt
      ) {
        return product.performanceScore;
      }

      return this.recalculateAndPersist(productId, product.specifications);
    });
  }

  async recalculateAndPersist(
    productId: string,
    preloadedSpecifications?: ProductSpecification[],
  ): Promise<PerformanceScore> {
    const specifications =
      preloadedSpecifications ??
      (await this.prisma.productSpecification.findMany({
        where: { productId },
      }));

    if (specifications.length === 0) {
      const emptySnapshot = this.createEmptySnapshot();
      const result = await this.prisma.performanceScore.upsert({
        where: { productId },
        create: {
          productId,
          ...emptySnapshot,
        },
        update: emptySnapshot,
      });

      await this.cacheService.set(`product:${productId}:performance`, result, 600);
      return result;
    }

    const snapshot = this.calculateScores(specifications);

    const result = await this.prisma.performanceScore.upsert({
      where: { productId },
      create: {
        productId,
        ...snapshot,
      },
      update: snapshot,
    });

    await this.cacheService.set(`product:${productId}:performance`, result, 600);
    return result;
  }

  calculateScores(specifications: ProductSpecification[]): ScoreSnapshot {
    const context = new SpecificationContext(specifications);

    const everydayUseScore = this.calculateCategoryScore(
      context,
      this.categoryRules.everydayUseScore,
    );
    const gamingScore = this.calculateCategoryScore(
      context,
      this.categoryRules.gamingScore,
    );
    const cameraScore = this.calculateCategoryScore(
      context,
      this.categoryRules.cameraScore,
    );
    const multitaskingScore = this.calculateCategoryScore(
      context,
      this.categoryRules.multitaskingScore,
    );
    const batteryScore = this.calculateCategoryScore(
      context,
      this.categoryRules.batteryScore,
    );
    const displayScore = this.calculateCategoryScore(
      context,
      this.categoryRules.displayScore,
    );
    const longTermUseScore = this.calculateCategoryScore(
      context,
      this.categoryRules.longTermUseScore,
    );

    const overallScore = Math.round(
      everydayUseScore * 0.15 +
        gamingScore * 0.15 +
        cameraScore * 0.15 +
        multitaskingScore * 0.12 +
        batteryScore * 0.15 +
        displayScore * 0.13 +
        longTermUseScore * 0.15,
    );

    const explanation = this.buildExplanation({
      everydayUseScore,
      gamingScore,
      cameraScore,
      multitaskingScore,
      batteryScore,
      displayScore,
      longTermUseScore,
      overallScore,
      explanation: '',
    });

    return {
      everydayUseScore,
      gamingScore,
      cameraScore,
      multitaskingScore,
      batteryScore,
      displayScore,
      longTermUseScore,
      overallScore,
      explanation,
    };
  }

  private calculateCategoryScore(
    context: SpecificationContext,
    rules: ScoreRule[],
  ): number {
    let weightedScore = 0;
    let totalWeight = 0;

    for (const rule of rules) {
      const value = rule.resolve(context);
      if (value === null) {
        continue;
      }

      weightedScore += this.clamp(value, 0, 100) * rule.weight;
      totalWeight += rule.weight;
    }

    if (totalWeight === 0) {
      return 50;
    }

    return Math.round(weightedScore / totalWeight);
  }

  private buildExplanation(snapshot: ScoreSnapshot): string {
    const categoryLabels: Record<ScoreField, string> = {
      everydayUseScore: 'everyday use',
      gamingScore: 'gaming',
      cameraScore: 'camera',
      multitaskingScore: 'multitasking',
      batteryScore: 'battery',
      displayScore: 'display',
      longTermUseScore: 'long-term value',
    };

    const entries = Object.entries(categoryLabels).map(([key, label]) => ({
      key: key as ScoreField,
      label,
      value: snapshot[key as ScoreField],
    }));

    const strongest = [...entries].sort((a, b) => b.value - a.value).slice(0, 2);
    const weakest = [...entries].sort((a, b) => a.value - b.value)[0];

    return `Strengths: ${strongest
      .map((entry) => `${entry.label} (${entry.value}/100)`)
      .join(', ')}. Weakest area: ${weakest.label} (${weakest.value}/100). Overall balance: ${snapshot.overallScore}/100.`;
  }

  private createEmptySnapshot(): ScoreSnapshot {
    return {
      everydayUseScore: 50,
      gamingScore: 50,
      cameraScore: 50,
      multitaskingScore: 50,
      batteryScore: 50,
      displayScore: 50,
      longTermUseScore: 50,
      overallScore: 50,
      explanation:
        'Not enough technical data for a detailed calculation, so a neutral score was applied.',
    };
  }

  private readonly categoryRules: Record<ScoreField, ScoreRule[]> = {
    everydayUseScore: [
      {
        weight: 0.4,
        resolve: (context) => this.directScore(context.numeric('processor_score')),
      },
      {
        weight: 0.2,
        resolve: (context) => this.scale(context.numeric('ram_gb'), 4, 16),
      },
      {
        weight: 0.25,
        resolve: (context) => this.storageTypeScore(context.text('storage_type')),
      },
      {
        weight: 0.15,
        resolve: (context) => this.scale(context.numeric('refresh_rate'), 60, 144),
      },
    ],
    gamingScore: [
      {
        weight: 0.5,
        resolve: (context) => this.directScore(context.numeric('processor_score')),
      },
      {
        weight: 0.2,
        resolve: (context) => this.scale(context.numeric('ram_gb'), 6, 18),
      },
      {
        weight: 0.2,
        resolve: (context) => this.scale(context.numeric('refresh_rate'), 60, 144),
      },
      {
        weight: 0.1,
        resolve: (context) => this.scale(context.numeric('battery_mah'), 3500, 6000),
      },
    ],
    cameraScore: [
      {
        weight: 0.35,
        resolve: (context) => this.scale(context.numeric('camera_main_mp'), 12, 108),
      },
      { weight: 0.2, resolve: (context) => this.booleanScore(context.bool('ois')) },
      {
        weight: 0.2,
        resolve: (context) =>
          this.sensorSizeScore(
            context.numeric('sensor_size'),
            context.text('sensor_size'),
          ),
      },
      {
        weight: 0.1,
        resolve: (context) =>
          this.scale(context.numeric('camera_ultrawide_mp'), 8, 50),
      },
      {
        weight: 0.15,
        resolve: (context) => this.scale(context.numeric('camera_zoom_optical'), 0, 5),
      },
    ],
    multitaskingScore: [
      {
        weight: 0.45,
        resolve: (context) => this.directScore(context.numeric('processor_score')),
      },
      {
        weight: 0.35,
        resolve: (context) => this.scale(context.numeric('ram_gb'), 4, 16),
      },
      {
        weight: 0.2,
        resolve: (context) => this.storageTypeScore(context.text('storage_type')),
      },
    ],
    batteryScore: [
      {
        weight: 0.7,
        resolve: (context) => this.scale(context.numeric('battery_mah'), 3500, 6000),
      },
      {
        weight: 0.15,
        resolve: (context) => this.scale(context.numeric('charging_watts'), 15, 120),
      },
      {
        weight: 0.15,
        resolve: (context) =>
          this.inverseScale(context.numeric('refresh_rate'), 60, 144),
      },
    ],
    displayScore: [
      {
        weight: 0.3,
        resolve: (context) => this.scale(context.numeric('refresh_rate'), 60, 144),
      },
      {
        weight: 0.25,
        resolve: (context) =>
          this.scale(context.numeric('display_brightness_nits'), 500, 3000),
      },
      {
        weight: 0.2,
        resolve: (context) =>
          this.directScore(context.numeric('display_resolution_score')),
      },
      {
        weight: 0.25,
        resolve: (context) => this.panelTypeScore(context.text('display_type')),
      },
    ],
    longTermUseScore: [
      {
        weight: 0.35,
        resolve: (context) => this.directScore(context.numeric('processor_score')),
      },
      {
        weight: 0.2,
        resolve: (context) => this.scale(context.numeric('ram_gb'), 4, 16),
      },
      {
        weight: 0.2,
        resolve: (context) => this.storageTypeScore(context.text('storage_type')),
      },
      {
        weight: 0.15,
        resolve: (context) =>
          this.scale(context.numeric('software_support_years'), 2, 7),
      },
      {
        weight: 0.1,
        resolve: (context) => this.scale(context.numeric('battery_mah'), 3500, 6000),
      },
    ],
  };

  private scale(value: number | null, min: number, max: number): number | null {
    if (value === null) {
      return null;
    }

    if (value <= min) {
      return 0;
    }

    if (value >= max) {
      return 100;
    }

    return ((value - min) / (max - min)) * 100;
  }

  private inverseScale(value: number | null, min: number, max: number): number | null {
    const scaled = this.scale(value, min, max);
    return scaled === null ? null : 100 - scaled;
  }

  private directScore(value: number | null): number | null {
    if (value === null) {
      return null;
    }

    return this.clamp(value, 0, 100);
  }

  private booleanScore(value: boolean | null): number | null {
    if (value === null) {
      return null;
    }

    return value ? 100 : 30;
  }

  private storageTypeScore(value: string | null): number | null {
    if (!value) {
      return null;
    }

    if (value.includes('ufs 4')) {
      return 100;
    }
    if (value.includes('ufs 3.1')) {
      return 88;
    }
    if (value.includes('ufs 3')) {
      return 82;
    }
    if (value.includes('ufs 2.2')) {
      return 68;
    }
    if (value.includes('nvme')) {
      return 92;
    }
    if (value.includes('emmc')) {
      return 45;
    }

    return 60;
  }

  private panelTypeScore(value: string | null): number | null {
    if (!value) {
      return null;
    }

    if (value.includes('ltpo')) {
      return 100;
    }
    if (value.includes('amoled') || value.includes('oled')) {
      return 92;
    }
    if (value.includes('ips')) {
      return 72;
    }
    if (value.includes('lcd')) {
      return 60;
    }

    return 70;
  }

  private sensorSizeScore(
    numericValue: number | null,
    rawValue: string | null,
  ): number | null {
    if (numericValue !== null) {
      return this.scale(numericValue, 0.5, 1.0);
    }

    if (!rawValue || !rawValue.includes('/')) {
      return null;
    }

    const [, denominator] = rawValue.split('/');
    const denominatorNumber = Number(denominator);
    if (Number.isNaN(denominatorNumber) || denominatorNumber === 0) {
      return null;
    }

    return this.scale(1 / denominatorNumber, 0.5, 1.0);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
