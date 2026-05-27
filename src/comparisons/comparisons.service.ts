import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PerformanceScore,
  Product,
  ProductSpecification,
} from '@prisma/client';
import { RedisCacheService } from '../common/utils/redis-cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { PerformanceScoresService } from '../performance-scores/performance-scores.service';

type ComparableProduct = Product & {
  brand: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  specifications: ProductSpecification[];
  performanceScore: PerformanceScore | null;
};

@Injectable()
export class ComparisonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly performanceScoresService: PerformanceScoresService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async compareProducts(productIds: string[]) {
    const uniqueProductIds = Array.from(new Set(productIds));
    if (uniqueProductIds.length < 2 || uniqueProductIds.length > 4) {
      throw new BadRequestException('Ви можете порівнювати між 2 і 4 товарами');
    }

    const cacheKey = `compare:${uniqueProductIds.slice().sort().join(':')}`;
    return this.cacheService.getOrSet(cacheKey, async () => {
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: uniqueProductIds },
          deletedAt: null,
          isActive: true,
        },
        include: {
          brand: true,
          category: true,
          specifications: {
            where: { isComparable: true },
            orderBy: [{ groupName: 'asc' }, { importance: 'desc' }],
          },
          performanceScore: true,
        },
      });

      if (products.length !== uniqueProductIds.length) {
        throw new NotFoundException('Один або більше товарів не знайдено');
      }

      const hydratedProducts = await Promise.all(
        products.map(async (product) => ({
          ...product,
          performanceScore:
            product.performanceScore ??
            (await this.performanceScoresService.getOrCreateForProduct(
              product.id,
            )),
        })),
      );

      const comparableSpecifications =
        this.getComparableSpecifications(hydratedProducts);
      const groupedSpecifications = this.groupSpecifications(hydratedProducts);
      const highlightedDifferences = this.detectSignificantDifferences(
        hydratedProducts,
        groupedSpecifications,
      );
      const winnerByCategory = this.calculateCategoryWinners(hydratedProducts);
      const summary = this.buildComparisonSummary(
        hydratedProducts,
        highlightedDifferences,
        winnerByCategory,
      );

      return {
        products: hydratedProducts,
        comparableSpecifications,
        groupedSpecifications,
        highlightedDifferences,
        winnerByCategory,
        summary,
      };
    });
  }

  getComparableSpecifications(products: ComparableProduct[]) {
    return products.map((product) => ({
      productId: product.id,
      specifications: product.specifications,
    }));
  }

  groupSpecifications(products: ComparableProduct[]) {
    const grouped = new Map<
      string,
      Map<
        string,
        {
          groupName: string;
          key: string;
          label: string;
          importance: number;
          values: Array<{
            productId: string;
            productName: string;
            value: string;
            numericValue: number | null;
            unit: string | null;
          }>;
        }
      >
    >();

    for (const product of products) {
      for (const specification of product.specifications) {
        const group = grouped.get(specification.groupName) ?? new Map();
        const entry = group.get(specification.key) ?? {
          groupName: specification.groupName,
          key: specification.key,
          label: specification.label,
          importance: specification.importance,
          values: [],
        };

        entry.values.push({
          productId: product.id,
          productName: product.name,
          value: specification.value,
          numericValue:
            specification.numericValue != null
              ? Number(specification.numericValue.toString())
              : null,
          unit: specification.unit ?? null,
        });

        group.set(specification.key, entry);
        grouped.set(specification.groupName, group);
      }
    }

    return Array.from(grouped.entries()).map(([groupName, items]) => ({
      groupName,
      items: Array.from(items.values()).sort(
        (a, b) => b.importance - a.importance,
      ),
    }));
  }

  detectSignificantDifferences(
    products: ComparableProduct[],
    groupedSpecifications: ReturnType<
      ComparisonsService['groupSpecifications']
    >,
  ) {
    const productOrder = products.map((product) => product.id);

    return groupedSpecifications
      .flatMap((group) =>
        group.items.map((item) => {
          const allValues = productOrder.map((productId) => {
            const value = item.values.find(
              (entry) => entry.productId === productId,
            );
            return (
              value ?? {
                productId,
                productName:
                  products.find((product) => product.id === productId)?.name ??
                  '',
                value: 'N/A',
                numericValue: null,
                unit: null,
              }
            );
          });

          const numericValues = allValues
            .map((value) => value.numericValue)
            .filter((value): value is number => value !== null);

          const type =
            numericValues.length >= 2
              ? 'numeric'
              : allValues.every((value) =>
                    ['true', 'false', 'tak', 'ni', 'yes', 'no'].includes(
                      value.value.toLowerCase(),
                    ),
                  )
                ? 'boolean'
                : 'text';

          const isSignificant =
            type === 'numeric'
              ? this.isNumericDifferenceSignificant(item.key, numericValues)
              : type === 'boolean'
                ? new Set(allValues.map((value) => value.value.toLowerCase()))
                    .size > 1
                : this.isTextDifferenceSignificant(
                    allValues.map((value) => value.value),
                  );

          if (!isSignificant) {
            return null;
          }

          const bestNumeric = numericValues.length
            ? Math.max(...numericValues)
            : null;

          return {
            groupName: item.groupName,
            key: item.key,
            label: item.label,
            type,
            values: allValues.map((value) => ({
              productId: value.productId,
              value:
                type === 'numeric' && value.numericValue !== null
                  ? value.numericValue
                  : value.value,
              unit: value.unit,
              isBest:
                type === 'numeric' && bestNumeric !== null
                  ? value.numericValue === bestNumeric
                  : false,
            })),
            explanation: this.buildDifferenceExplanation(
              products,
              item.key,
              item.label,
              type,
              allValues,
            ),
            importance: item.importance,
          };
        }),
      )
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.importance - a.importance);
  }

  calculateCategoryWinners(products: ComparableProduct[]) {
    const categoryScores = [
      {
        category: 'camera',
        selector: (product: ComparableProduct) =>
          product.performanceScore?.cameraScore ?? 0,
      },
      {
        category: 'battery',
        selector: (product: ComparableProduct) =>
          product.performanceScore?.batteryScore ?? 0,
      },
      {
        category: 'display',
        selector: (product: ComparableProduct) =>
          product.performanceScore?.displayScore ?? 0,
      },
      {
        category: 'performance',
        selector: (product: ComparableProduct) =>
          ((product.performanceScore?.gamingScore ?? 0) +
            (product.performanceScore?.multitaskingScore ?? 0)) /
          2,
      },
      {
        category: 'storage',
        selector: (product: ComparableProduct) =>
          this.calculateStorageWinnerScore(product.specifications),
      },
    ];

    return categoryScores.map((definition) => {
      const sorted = [...products].sort(
        (a, b) => definition.selector(b) - definition.selector(a),
      );

      const bestScore = definition.selector(sorted[0]);
      const winners = sorted.filter(
        (product) => Math.abs(definition.selector(product) - bestScore) < 1,
      );

      return {
        category: definition.category,
        winnerProductIds: winners.map((winner) => winner.id),
        score: Number(bestScore.toFixed(2)),
      };
    });
  }

  buildComparisonSummary(
    products: ComparableProduct[],
    highlightedDifferences: ReturnType<
      ComparisonsService['detectSignificantDifferences']
    >,
    winnerByCategory: ReturnType<
      ComparisonsService['calculateCategoryWinners']
    >,
  ) {
    const standoutWinners = winnerByCategory
      .filter((entry) => entry.winnerProductIds.length === 1)
      .map((entry) => {
        const product = products.find(
          (item) => item.id === entry.winnerProductIds[0],
        );
        return product ? `${product.name} wins in "${entry.category}"` : null;
      })
      .filter((item): item is string => item !== null);

    return {
      significantDifferencesCount: highlightedDifferences.length,
      standoutWinners,
      conclusion:
        highlightedDifferences.length === 0
          ? 'Ці моделі дуже схожі загалом, тому ціна або дизайн можуть стати рішучим фактором.'
          : `Виявлено ${highlightedDifferences.length} значущих відмінностей. Спочатку зверніть увагу на категорії з чітким переможцем.`,
    };
  }

  private isNumericDifferenceSignificant(
    key: string,
    values: number[],
  ): boolean {
    if (values.length < 2) {
      return false;
    }

    const max = Math.max(...values);
    const min = Math.min(...values);
    const absoluteDifference = max - min;
    const relativeDifference =
      min === 0 ? absoluteDifference : absoluteDifference / min;

    const thresholds: Record<string, { absolute: number; relative: number }> = {
      battery_mah: { absolute: 300, relative: 0.08 },
      refresh_rate: { absolute: 20, relative: 0.15 },
      ram_gb: { absolute: 2, relative: 0.15 },
      processor_score: { absolute: 8, relative: 0.08 },
      camera_main_mp: { absolute: 12, relative: 0.15 },
      charging_watts: { absolute: 10, relative: 0.15 },
      display_brightness_nits: { absolute: 150, relative: 0.08 },
      storage_gb: { absolute: 64, relative: 0.15 },
      sensor_size: { absolute: 0.08, relative: 0.1 },
    };

    const threshold = thresholds[key] ?? { absolute: 1, relative: 0.12 };
    return (
      absoluteDifference >= threshold.absolute ||
      relativeDifference >= threshold.relative
    );
  }

  private isTextDifferenceSignificant(values: string[]): boolean {
    return new Set(values.map((value) => value.trim().toLowerCase())).size > 1;
  }

  private buildDifferenceExplanation(
    products: ComparableProduct[],
    key: string,
    label: string,
    type: 'numeric' | 'boolean' | 'text',
    values: Array<{
      productId: string;
      productName: string;
      value: string;
      numericValue: number | null;
      unit: string | null;
    }>,
  ): string {
    const impactHints: Record<string, string> = {
      battery_mah: 'може перетворитися на довший час автономної роботи',
      refresh_rate: 'робить прокрутку та рух виглядати плавніше',
      ram_gb: 'допомагає телефону зберігати більше завдань активними одночасно',
      processor_score: 'може забезпечити помітно сильніший продуктивність',
      camera_main_mp: 'може покращити деталізацію фото',
      sensor_size: 'може допомогти камері у складніших умовах освітлення',
      storage_gb: 'дає більше місця для додатків, фото та відео',
      charging_watts: 'може скоротити час зарядки',
    };

    if (type === 'numeric') {
      const best = [...values]
        .filter((value) => value.numericValue !== null)
        .sort((a, b) => (b.numericValue ?? 0) - (a.numericValue ?? 0))[0];

      return `${best.productName} має найкращий результат "${label}", який ${
        impactHints[key] ?? 'може мати значення в реальних умовах використання'
      }.`;
    }

    if (type === 'boolean') {
      const available = values.find((value) =>
        ['true', 'tak', 'yes'].includes(value.value.toLowerCase()),
      );
      return available
        ? `${available.productName} включає "${label}", тоді як не кожен конкурент має це.`
        : `Між телефонами є практична різниця для "${label}".`;
    }

    const unique = Array.from(new Set(values.map((value) => value.value)));
    const involvedProducts = values
      .map(
        (value) =>
          products.find((product) => product.id === value.productId)?.name,
      )
      .filter((value): value is string => Boolean(value))
      .join(', ');

    return `Для "${label}", моделі ${involvedProducts} відрізняються: ${unique.join(', ')}.`;
  }

  private calculateStorageWinnerScore(
    specifications: ProductSpecification[],
  ): number {
    const specificationMap = new Map(
      specifications.map((specification) => [specification.key, specification]),
    );
    const storageGb = specificationMap.get('storage_gb')?.numericValue
      ? Number(specificationMap.get('storage_gb')?.numericValue?.toString())
      : 128;
    const storageType =
      specificationMap.get('storage_type')?.value?.toLowerCase() ?? 'ufs 2.2';

    const typeBonus = storageType.includes('ufs 4')
      ? 100
      : storageType.includes('ufs 3.1')
        ? 85
        : storageType.includes('ufs 2.2')
          ? 65
          : 50;

    return storageGb * 0.2 + typeBonus;
  }
}
