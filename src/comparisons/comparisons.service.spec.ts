import { ComparisonsService } from './comparisons.service';

describe('ComparisonsService', () => {
  const prismaMock = {
    product: {
      findMany: jest.fn(),
    },
  };

  const performanceScoresServiceMock = {
    getOrCreateForProduct: jest.fn(),
  };

  const cacheMock = {
    getOrSet: jest.fn(async (_key: string, factory: () => Promise<unknown>) => factory()),
  };

  let service: ComparisonsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ComparisonsService(
      prismaMock as never,
      performanceScoresServiceMock as never,
      cacheMock as never,
    );
  });

  it('highlights meaningful battery differences and returns category winners', async () => {
    const products = [
      comparableProduct('a', 4300, 80),
      comparableProduct('b', 5000, 88),
    ];

    (prismaMock.product.findMany as jest.Mock).mockResolvedValue(products);

    const result = await service.compareProducts(['a', 'b']);

    expect(
      result.highlightedDifferences.some(
        (item: { key: string }) => item.key === 'battery_mah',
      ),
    ).toBe(true);
    expect(
      result.winnerByCategory.find(
        (item: { category: string }) => item.category === 'battery',
      )?.winnerProductIds,
    ).toContain('b');
  });
});

function comparableProduct(
  id: string,
  batteryMah: number,
  batteryScore: number,
) {
  return {
    id,
    name: `Phone ${id}`,
    slug: `phone-${id}`,
    description: 'desc',
    shortDescription: 'short',
    price: { toString: () => '500.00' },
    oldPrice: null,
    stock: 10,
    sku: `sku-${id}`,
    color: 'Black',
    images: [],
    isActive: true,
    deletedAt: null,
    ratingAverage: { toString: () => '0' },
    reviewCount: 0,
    brandId: 'brand-id',
    categoryId: 'category-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    brand: {
      id: 'brand-id',
      name: 'Brand',
      slug: 'brand',
      description: null,
      logoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    category: {
      id: 'category-id',
      name: 'Smartphones',
      slug: 'smartphones',
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    specifications: [
      specification(id, 'battery_mah', 'Battery capacity', String(batteryMah), batteryMah),
      specification(id, 'refresh_rate', 'Refresh rate', '120', 120),
      specification(id, 'ram_gb', 'RAM', '8', 8),
    ],
    performanceScore: {
      id: `score-${id}`,
      productId: id,
      everydayUseScore: 80,
      gamingScore: 78,
      cameraScore: 74,
      multitaskingScore: 79,
      batteryScore,
      displayScore: 84,
      longTermUseScore: 81,
      overallScore: 80,
      explanation: 'score',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  } as never;
}

function specification(
  productId: string,
  key: string,
  label: string,
  value: string,
  numericValue: number,
) {
  return {
    id: `${productId}-${key}`,
    productId,
    groupName: 'General',
    key,
    label,
    value,
    numericValue: {
      toString: () => String(numericValue),
    },
    unit: key === 'battery_mah' ? 'mAh' : null,
    importance: 9,
    isComparable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as never;
}
