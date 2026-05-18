import { PerformanceScoresService } from './performance-scores.service';

describe('PerformanceScoresService', () => {
  const prismaMock = {
    performanceScore: { upsert: jest.fn() },
    productSpecification: { findMany: jest.fn() },
  };
  const cacheMock = {
    getOrSet: jest.fn(),
    set: jest.fn(),
  };

  let service: PerformanceScoresService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PerformanceScoresService(
      prismaMock as never,
      cacheMock as never,
    );
  });

  it('calculates strong gaming and overall scores for a high-end phone', () => {
    const result = service.calculateScores([
      productSpec('processor_score', '93', 93),
      productSpec('ram_gb', '16', 16),
      productSpec('battery_mah', '5500', 5500),
      productSpec('refresh_rate', '120', 120),
      productSpec('storage_type', 'UFS 4.0'),
      productSpec('camera_main_mp', '50', 50),
      productSpec('camera_ultrawide_mp', '12', 12),
      productSpec('camera_zoom_optical', '3', 3),
      productSpec('ois', 'true', 1),
      productSpec('sensor_size', '1/1.3', 0.77),
      productSpec('display_brightness_nits', '3000', 3000),
      productSpec('display_resolution_score', '92', 92),
      productSpec('display_type', 'LTPO AMOLED'),
      productSpec('charging_watts', '100', 100),
      productSpec('software_support_years', '5', 5),
    ]);

    expect(result.gamingScore).toBeGreaterThanOrEqual(85);
    expect(result.displayScore).toBeGreaterThan(85);
    expect(result.batteryScore).toBeGreaterThan(70);
    expect(result.overallScore).toBeGreaterThanOrEqual(83);
  });

  it('stores a neutral score when specifications are missing', async () => {
    const upsertResult = {
      productId: 'product-id',
      everydayUseScore: 50,
      gamingScore: 50,
      cameraScore: 50,
      multitaskingScore: 50,
      batteryScore: 50,
      displayScore: 50,
      longTermUseScore: 50,
      overallScore: 50,
      explanation: 'neutral',
    };

    (prismaMock.performanceScore.upsert as jest.Mock).mockResolvedValue(upsertResult);

    const result = await service.recalculateAndPersist('product-id', []);

    expect(prismaMock.performanceScore.upsert).toHaveBeenCalled();
    expect(result.overallScore).toBe(50);
  });
});

function productSpec(key: string, value: string, numericValue?: number) {
  return {
    id: `${key}-id`,
    productId: 'product-id',
    groupName: 'General',
    key,
    label: key,
    value,
    numericValue:
      numericValue !== undefined
        ? { toString: () => String(numericValue) }
        : null,
    unit: null,
    importance: 8,
    isComparable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as never;
}
