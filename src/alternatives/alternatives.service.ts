import { Injectable, NotFoundException } from '@nestjs/common';
import { AlternativeReasonType, Product } from '@prisma/client';
import { RedisCacheService } from '../common/utils/redis-cache.service';
import { decimalToNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import { PerformanceScoresService } from '../performance-scores/performance-scores.service';

type RecommendationType =
  | 'cheaperSimilar'
  | 'slightlyMoreExpensiveBetter'
  | 'betterCamera'
  | 'betterBattery'
  | 'betterPerformance'
  | 'bestValue';

interface ProductWithScore extends Product {
  performanceScore: {
    everydayUseScore: number;
    gamingScore: number;
    cameraScore: number;
    multitaskingScore: number;
    batteryScore: number;
    displayScore: number;
    longTermUseScore: number;
    overallScore: number;
    explanation: string;
  } | null;
}

@Injectable()
export class AlternativesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly performanceScoresService: PerformanceScoresService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async getAlternativesForProduct(productId: string) {
    return this.cacheService.getOrSet(`product:${productId}:alternatives`, async () => {
      const source = await this.prisma.product.findFirst({
        where: {
          id: productId,
          deletedAt: null,
          isActive: true,
        },
        include: {
          brand: true,
          category: true,
          performanceScore: true,
        },
      });

      if (!source) {
        throw new NotFoundException('Product not found');
      }

      const sourceScore =
        source.performanceScore ??
        (await this.performanceScoresService.getOrCreateForProduct(source.id));

      const candidates = await this.prisma.product.findMany({
        where: {
          categoryId: source.categoryId,
          id: { not: source.id },
          isActive: true,
          deletedAt: null,
        },
        include: {
          brand: true,
          category: true,
          performanceScore: true,
        },
        take: 40,
      });

      const hydratedCandidates = await Promise.all(
        candidates.map(async (candidate) => ({
          ...candidate,
          performanceScore:
            candidate.performanceScore ??
            (await this.performanceScoresService.getOrCreateForProduct(candidate.id)),
        })),
      );

      const grouped = {
        cheaperSimilar: this.rankCandidates(
          'cheaperSimilar',
          source,
          sourceScore,
          hydratedCandidates,
        ),
        slightlyMoreExpensiveBetter: this.rankCandidates(
          'slightlyMoreExpensiveBetter',
          source,
          sourceScore,
          hydratedCandidates,
        ),
        betterCamera: this.rankCandidates(
          'betterCamera',
          source,
          sourceScore,
          hydratedCandidates,
        ),
        betterBattery: this.rankCandidates(
          'betterBattery',
          source,
          sourceScore,
          hydratedCandidates,
        ),
        betterPerformance: this.rankCandidates(
          'betterPerformance',
          source,
          sourceScore,
          hydratedCandidates,
        ),
        bestValue: this.rankCandidates(
          'bestValue',
          source,
          sourceScore,
          hydratedCandidates,
        ),
      };

      return {
        sourceProduct: source,
        alternativesByType: grouped,
      };
    });
  }

  private rankCandidates(
    type: RecommendationType,
    source: ProductWithScore,
    sourceScore: NonNullable<ProductWithScore['performanceScore']>,
    candidates: ProductWithScore[],
  ) {
    return candidates
      .map((candidate) =>
        this.buildRecommendation(type, source, sourceScore, candidate),
      )
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  private buildRecommendation(
    type: RecommendationType,
    source: ProductWithScore,
    sourceScore: NonNullable<ProductWithScore['performanceScore']>,
    candidate: ProductWithScore,
  ) {
    const candidateScore = candidate.performanceScore;
    if (!candidateScore) {
      return null;
    }

    const sourcePrice = decimalToNumber(source.price) ?? 0;
    const candidatePrice = decimalToNumber(candidate.price) ?? 0;
    const priceDifference = Number((candidatePrice - sourcePrice).toFixed(2));
    const priceDiffPercent =
      sourcePrice === 0 ? 0 : (priceDifference / sourcePrice) * 100;

    const similarity = this.calculateSimilarity(
      sourceScore,
      candidateScore,
      priceDiffPercent,
    );
    const overallDiff = candidateScore.overallScore - sourceScore.overallScore;
    const cameraDiff = candidateScore.cameraScore - sourceScore.cameraScore;
    const batteryDiff = candidateScore.batteryScore - sourceScore.batteryScore;
    const performanceDiff =
      (candidateScore.gamingScore + candidateScore.multitaskingScore) / 2 -
      (sourceScore.gamingScore + sourceScore.multitaskingScore) / 2;
    const valueGain =
      candidateScore.overallScore / Math.max(candidatePrice, 1) -
      sourceScore.overallScore / Math.max(sourcePrice, 1);

    let score = 0;
    let reasonType: AlternativeReasonType;

    switch (type) {
      case 'cheaperSimilar':
        if (!(priceDifference < 0 && similarity >= 70 && overallDiff >= -8)) {
          return null;
        }
        score =
          similarity * 0.65 + Math.min(Math.abs(priceDiffPercent), 20) * 1.75;
        reasonType = AlternativeReasonType.CHEAPER_SIMILAR;
        break;
      case 'slightlyMoreExpensiveBetter':
        if (!(priceDiffPercent > 0 && priceDiffPercent <= 15 && overallDiff >= 10)) {
          return null;
        }
        score = overallDiff * 4 + (15 - priceDiffPercent) * 3;
        reasonType = AlternativeReasonType.SLIGHTLY_MORE_EXPENSIVE_BETTER;
        break;
      case 'betterCamera':
        if (!(cameraDiff >= 12 && priceDiffPercent <= 25)) {
          return null;
        }
        score = cameraDiff * 4 + Math.max(0, 20 - Math.max(priceDiffPercent, 0));
        reasonType = AlternativeReasonType.BETTER_CAMERA;
        break;
      case 'betterBattery':
        if (!(batteryDiff >= 12 && priceDiffPercent <= 25)) {
          return null;
        }
        score = batteryDiff * 4 + Math.max(0, 20 - Math.max(priceDiffPercent, 0));
        reasonType = AlternativeReasonType.BETTER_BATTERY;
        break;
      case 'betterPerformance':
        if (!(performanceDiff >= 10 && priceDiffPercent <= 20)) {
          return null;
        }
        score =
          performanceDiff * 4 + Math.max(0, 18 - Math.max(priceDiffPercent, 0));
        reasonType = AlternativeReasonType.BETTER_PERFORMANCE;
        break;
      case 'bestValue':
        if (!(valueGain > 0.01 || (priceDifference < 0 && similarity >= 65))) {
          return null;
        }
        score =
          valueGain * 10000 + similarity * 0.4 + (priceDifference < 0 ? 12 : 0);
        reasonType = AlternativeReasonType.BEST_VALUE;
        break;
      default:
        return null;
    }

    const roundedScore = Number(score.toFixed(2));
    const advantages = this.getMainAdvantages(
      sourceScore,
      candidateScore,
      priceDifference,
    );

    return {
      product: candidate,
      reasonType,
      score: roundedScore,
      title: this.buildTitle(type),
      explanation: this.buildExplanation(
        type,
        source.name,
        candidate.name,
        priceDifference,
        {
          overallDiff,
          cameraDiff,
          batteryDiff,
          performanceDiff,
        },
      ),
      priceDifference,
      mainAdvantages: advantages,
    };
  }

  private calculateSimilarity(
    sourceScore: NonNullable<ProductWithScore['performanceScore']>,
    candidateScore: NonNullable<ProductWithScore['performanceScore']>,
    priceDiffPercent: number,
  ): number {
    const diffs = [
      Math.abs(candidateScore.everydayUseScore - sourceScore.everydayUseScore),
      Math.abs(candidateScore.gamingScore - sourceScore.gamingScore),
      Math.abs(candidateScore.cameraScore - sourceScore.cameraScore),
      Math.abs(candidateScore.batteryScore - sourceScore.batteryScore),
      Math.abs(candidateScore.displayScore - sourceScore.displayScore),
      Math.abs(candidateScore.longTermUseScore - sourceScore.longTermUseScore),
    ];

    const categorySimilarity =
      100 - diffs.reduce((sum, value) => sum + value, 0) / diffs.length;
    const pricePenalty = Math.min(Math.abs(priceDiffPercent) * 0.4, 18);
    return Math.max(0, Number((categorySimilarity - pricePenalty).toFixed(2)));
  }

  private getMainAdvantages(
    sourceScore: NonNullable<ProductWithScore['performanceScore']>,
    candidateScore: NonNullable<ProductWithScore['performanceScore']>,
    priceDifference: number,
  ): string[] {
    const categoryLabels = [
      {
        label: 'better camera',
        diff: candidateScore.cameraScore - sourceScore.cameraScore,
      },
      {
        label: 'better battery life',
        diff: candidateScore.batteryScore - sourceScore.batteryScore,
      },
      {
        label: 'better performance',
        diff:
          (candidateScore.gamingScore + candidateScore.multitaskingScore) / 2 -
          (sourceScore.gamingScore + sourceScore.multitaskingScore) / 2,
      },
      {
        label: 'better display',
        diff: candidateScore.displayScore - sourceScore.displayScore,
      },
      {
        label: 'better long-term value',
        diff: candidateScore.longTermUseScore - sourceScore.longTermUseScore,
      },
    ];

    const advantages = categoryLabels
      .filter((item) => item.diff >= 8)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 3)
      .map((item) => item.label);

    if (priceDifference < 0) {
      advantages.unshift('lower price');
    }

    return advantages.slice(0, 3);
  }

  private buildTitle(type: RecommendationType): string {
    switch (type) {
      case 'cheaperSimilar':
        return 'Similar experience for less money';
      case 'slightlyMoreExpensiveBetter':
        return 'Slightly more expensive, noticeably better';
      case 'betterCamera':
        return 'Better pick for photos and video';
      case 'betterBattery':
        return 'Better pick for battery life';
      case 'betterPerformance':
        return 'Better pick for speed and gaming';
      case 'bestValue':
        return 'Best value for money';
    }
  }

  private buildExplanation(
    type: RecommendationType,
    sourceName: string,
    candidateName: string,
    priceDifference: number,
    diffs: {
      overallDiff: number;
      cameraDiff: number;
      batteryDiff: number;
      performanceDiff: number;
    },
  ): string {
    const pricePart =
      priceDifference === 0
        ? 'for the same price'
        : priceDifference < 0
          ? `${Math.abs(priceDifference).toFixed(2)} cheaper`
          : `${priceDifference.toFixed(2)} more expensive`;

    switch (type) {
      case 'cheaperSimilar':
        return `${candidateName} delivers a very similar overall experience to ${sourceName}, but is ${pricePart}.`;
      case 'slightlyMoreExpensiveBetter':
        return `${candidateName} is ${pricePart}, but gives a noticeably stronger overall package (+${Math.round(
          diffs.overallDiff,
        )} points).`;
      case 'betterCamera':
        return `${candidateName} is ${pricePart} and has a meaningfully better camera (+${Math.round(
          diffs.cameraDiff,
        )} points).`;
      case 'betterBattery':
        return `${candidateName} is ${pricePart} and offers noticeably stronger battery life (+${Math.round(
          diffs.batteryDiff,
        )} points).`;
      case 'betterPerformance':
        return `${candidateName} is ${pricePart} and is better for heavy use and gaming (+${Math.round(
          diffs.performanceDiff,
        )} points).`;
      case 'bestValue':
        return `${candidateName} looks stronger for the money: the value-to-price ratio is better than ${sourceName}.`;
    }
  }
}
