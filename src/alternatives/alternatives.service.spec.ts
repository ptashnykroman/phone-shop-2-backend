import { AlternativeReasonType, Prisma } from '@prisma/client';
import { AlternativesService } from './alternatives.service';

describe('AlternativesService', () => {
  const prismaMock = {
    product: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const performanceScoresServiceMock = {
    getOrCreateForProduct: jest.fn(),
  };

  const cacheMock = {
    getOrSet: jest.fn(async (_key: string, factory: () => Promise<unknown>) => factory()),
  };

  let service: AlternativesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AlternativesService(
      prismaMock as never,
      performanceScoresServiceMock as never,
      cacheMock as never,
    );
  });

  it('returns cheaper similar and better camera recommendations', async () => {
    const source = product('source', 700, {
      everydayUseScore: 78,
      gamingScore: 72,
      cameraScore: 80,
      multitaskingScore: 76,
      batteryScore: 74,
      displayScore: 82,
      longTermUseScore: 79,
      overallScore: 78,
      explanation: 'source',
    });

    const cheaper = product('cheaper', 620, {
      everydayUseScore: 76,
      gamingScore: 70,
      cameraScore: 76,
      multitaskingScore: 75,
      batteryScore: 76,
      displayScore: 80,
      longTermUseScore: 77,
      overallScore: 75,
      explanation: 'cheaper',
    });

    const cameraPick = product('camera', 749, {
      everydayUseScore: 77,
      gamingScore: 71,
      cameraScore: 95,
      multitaskingScore: 76,
      batteryScore: 74,
      displayScore: 83,
      longTermUseScore: 78,
      overallScore: 81,
      explanation: 'camera',
    });

    (prismaMock.product.findFirst as jest.Mock).mockResolvedValue(source);
    (prismaMock.product.findMany as jest.Mock).mockResolvedValue([cheaper, cameraPick]);

    const result = await service.getAlternativesForProduct('source');

    expect(result.alternativesByType.cheaperSimilar[0].reasonType).toBe(
      AlternativeReasonType.CHEAPER_SIMILAR,
    );
    expect(result.alternativesByType.cheaperSimilar[0].product.id).toBe('cheaper');
    expect(result.alternativesByType.betterCamera[0].product.id).toBe('camera');
  });
});

function product(
  id: string,
  price: number,
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
  },
) {
  return {
    id,
    name: id,
    slug: `${id}-slug`,
    description: `${id} description`,
    shortDescription: `${id} short`,
    price: new Prisma.Decimal(price),
    oldPrice: null,
    stock: 10,
    sku: `${id}-sku`,
    color: 'Black',
    images: [],
    isActive: true,
    deletedAt: null,
    ratingAverage: new Prisma.Decimal(0),
    reviewCount: 0,
    brandId: 'brand-id',
    categoryId: 'category-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    performanceScore,
  } as never;
}
