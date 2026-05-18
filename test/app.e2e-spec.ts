import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { ComparisonsController } from '../src/comparisons/comparisons.controller';
import { ComparisonsService } from '../src/comparisons/comparisons.service';
import { HealthController } from '../src/health/health.controller';
import { HealthService } from '../src/health/health.service';
import { PerformanceScoresService } from '../src/performance-scores/performance-scores.service';
import { ProductsController } from '../src/products/products.controller';
import { ProductsService } from '../src/products/products.service';
import { AlternativesService } from '../src/alternatives/alternatives.service';

describe('HTTP endpoints', () => {
  let app: INestApplication;

  const authService = {
    login: jest.fn(),
    register: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
  };

  const productsService = {
    findAll: jest.fn(),
    findOneById: jest.fn(),
    findOneBySlug: jest.fn(),
    getExplainedSpecifications: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const performanceScoresService = {
    getOrCreateForProduct: jest.fn(),
  };

  const alternativesService = {
    getAlternativesForProduct: jest.fn(),
  };

  const comparisonsService = {
    compareProducts: jest.fn(),
  };

  const healthService = {
    check: jest.fn().mockResolvedValue({
      status: 'ok',
      database: 'up',
      cache: 'memory',
      timestamp: new Date().toISOString(),
    }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        AuthController,
        ProductsController,
        ComparisonsController,
        HealthController,
      ],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ProductsService, useValue: productsService },
        { provide: PerformanceScoresService, useValue: performanceScoresService },
        { provide: AlternativesService, useValue: alternativesService },
        { provide: ComparisonsService, useValue: comparisonsService },
        { provide: HealthService, useValue: healthService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    healthService.check.mockResolvedValue({
      status: 'ok',
      database: 'up',
      cache: 'memory',
      timestamp: new Date().toISOString(),
    });
  });

  it('rejects invalid login payloads', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'bad-email', password: '123' })
      .expect(400);
  });

  it('passes parsed query params to products list service', async () => {
    const brandId = '11111111-1111-4111-8111-111111111111';
    productsService.findAll.mockResolvedValue({ items: [], meta: { total: 0 } });

    await request(app.getHttpServer())
      .get(`/products?page=2&limit=5&brandIds=${brandId}`)
      .expect(200);

    expect(productsService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 5,
        brandIds: [brandId],
      }),
    );
  });

  it('returns compare response for valid request', async () => {
    const payload = {
      productIds: [
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
      ],
    };

    comparisonsService.compareProducts.mockResolvedValue({
      products: [],
      highlightedDifferences: [],
      winnerByCategory: [],
      summary: {},
    });

    await request(app.getHttpServer())
      .post('/products/compare')
      .send(payload)
      .expect(201);

    expect(comparisonsService.compareProducts).toHaveBeenCalledWith(
      payload.productIds,
    );
  });

  it('returns health payload', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
    expect(healthService.check).toHaveBeenCalled();
  });
});
