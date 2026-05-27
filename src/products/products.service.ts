import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Product, ProductSpecification } from '@prisma/client';
import { decimalToNumber } from '../common/utils/decimal.util';
import { parseSpecificationFilters } from '../common/utils/parse-spec-filters.util';
import { RedisCacheService } from '../common/utils/redis-cache.service';
import { slugify } from '../common/utils/slugify.util';
import { ImagesService } from '../images/images.service';
import { PrismaService } from '../prisma/prisma.service';
import { CharacteristicExplanationsService } from '../characteristic-explanations/characteristic-explanations.service';
import { PerformanceScoresService } from '../performance-scores/performance-scores.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductSortBy } from './dto/product-sort-by.enum';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly performanceScoresService: PerformanceScoresService,
    private readonly explanationsService: CharacteristicExplanationsService,
    private readonly imagesService: ImagesService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async create(dto: CreateProductDto) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    await this.ensureUniqueProduct(slug, dto.sku);

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        shortDescription: dto.shortDescription,
        price: new Prisma.Decimal(dto.price),
        oldPrice: dto.oldPrice ? new Prisma.Decimal(dto.oldPrice) : null,
        stock: dto.stock,
        sku: dto.sku,
        color: dto.color,
        images: this.imagesService.normalizeImages(dto.images),
        isActive: dto.isActive,
        brandId: dto.brandId,
        categoryId: dto.categoryId,
        specifications: dto.specifications?.length
          ? {
              create: dto.specifications.map((specification) => ({
                groupName: specification.groupName,
                key: specification.key,
                label: specification.label,
                value: specification.value,
                numericValue:
                  specification.numericValue !== undefined
                    ? new Prisma.Decimal(specification.numericValue)
                    : null,
                unit: specification.unit,
                importance: specification.importance,
                isComparable: specification.isComparable,
              })),
            }
          : undefined,
      },
      include: this.defaultInclude,
    });

    await this.performanceScoresService.recalculateAndPersist(product.id);
    return this.findOneById(product.id);
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.getRequiredProduct(id);

    const slug = dto.slug
      ? slugify(dto.slug)
      : dto.name
        ? slugify(dto.name)
        : undefined;

    if (slug || dto.sku) {
      const duplicate = await this.prisma.product.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(slug ? [{ slug }] : []),
            ...(dto.sku ? [{ sku: dto.sku }] : []),
          ],
        },
      });

      if (duplicate) {
        throw new ConflictException('Продукт з таким slug або SKU вже існує');
      }
    }

    if (dto.specifications) {
      await this.prisma.productSpecification.deleteMany({
        where: { productId: id },
      });
    }

    await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        shortDescription: dto.shortDescription,
        price:
          dto.price !== undefined ? new Prisma.Decimal(dto.price) : undefined,
        oldPrice:
          dto.oldPrice !== undefined
            ? new Prisma.Decimal(dto.oldPrice)
            : undefined,
        stock: dto.stock,
        sku: dto.sku,
        color: dto.color,
        images: dto.images
          ? this.imagesService.normalizeImages(dto.images)
          : undefined,
        isActive: dto.isActive,
        brandId: dto.brandId,
        categoryId: dto.categoryId,
        specifications: dto.specifications
          ? {
              create: dto.specifications.map((specification) => ({
                groupName: specification.groupName,
                key: specification.key,
                label: specification.label,
                value: specification.value,
                numericValue:
                  specification.numericValue !== undefined
                    ? new Prisma.Decimal(specification.numericValue)
                    : null,
                unit: specification.unit,
                importance: specification.importance,
                isComparable: specification.isComparable,
              })),
            }
          : undefined,
      },
      include: this.defaultInclude,
    });

    await this.invalidateProductCache(product.id, product.slug);
    await this.performanceScoresService.recalculateAndPersist(product.id);
    return this.findOneById(product.id);
  }

  async softDelete(id: string) {
    const product = await this.getRequiredProduct(id);
    await this.prisma.product.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
    await this.invalidateProductCache(product.id, product.slug);
    return { success: true };
  }

  async findOneById(id: string) {
    const cacheKey = `product:${id}`;
    return this.cacheService.getOrSet(cacheKey, async () => {
      const product = await this.prisma.product.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        include: this.defaultInclude,
      });

      if (!product) {
        throw new NotFoundException('Товар не знайдено');
      }

      return product;
    });
  }

  async findOneBySlug(slug: string) {
    const cacheKey = `product:slug:${slug}`;
    return this.cacheService.getOrSet(cacheKey, async () => {
      const product = await this.prisma.product.findFirst({
        where: {
          slug,
          deletedAt: null,
        },
        include: this.defaultInclude,
      });

      if (!product) {
        throw new NotFoundException('Товар не знайдено');
      }

      return product;
    });
  }

  async findAll(query: ProductQueryDto) {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new BadRequestException(
        'мінімальна ціна повинна бути меншою або дорівнювати максимальній ціні',
      );
    }

    const specificationFilters = parseSpecificationFilters(
      query.specifications,
    );
    const search = query.search?.trim();

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      isActive: true,
      brandId:
        query.brandIds && query.brandIds.length > 0
          ? { in: query.brandIds }
          : undefined,
      categoryId:
        query.categoryIds && query.categoryIds.length > 0
          ? { in: query.categoryIds }
          : undefined,
      color:
        query.colors && query.colors.length > 0
          ? { in: query.colors }
          : undefined,
      stock: query.inStock ? { gt: 0 } : undefined,
      price:
        query.minPrice !== undefined || query.maxPrice !== undefined
          ? {
              gte:
                query.minPrice !== undefined
                  ? new Prisma.Decimal(query.minPrice)
                  : undefined,
              lte:
                query.maxPrice !== undefined
                  ? new Prisma.Decimal(query.maxPrice)
                  : undefined,
            }
          : undefined,
      AND: specificationFilters.map((filterItem) => ({
        specifications: {
          some: {
            key: filterItem.key,
            OR: [
              { value: { contains: filterItem.value, mode: 'insensitive' } },
              {
                numericValue: Number.isNaN(Number(filterItem.value))
                  ? undefined
                  : new Prisma.Decimal(filterItem.value),
              },
            ],
          },
        },
      })),
      OR: search
        ? [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { shortDescription: { contains: search, mode: 'insensitive' } },
            {
              brand: {
                name: { contains: search, mode: 'insensitive' },
              },
            },
            {
              specifications: {
                some: {
                  OR: [
                    { key: { contains: search, mode: 'insensitive' } },
                    { label: { contains: search, mode: 'insensitive' } },
                    { value: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
            },
          ]
        : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: this.defaultInclude,
        orderBy: this.buildOrderBy(query),
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getExplainedSpecifications(productId: string) {
    return this.cacheService.getOrSet(
      `product:${productId}:explained-specs`,
      async () => {
        const product = await this.prisma.product.findFirst({
          where: { id: productId, deletedAt: null },
          include: {
            specifications: {
              orderBy: [
                { groupName: 'asc' },
                { importance: 'desc' },
                { label: 'asc' },
              ],
            },
          },
        });

        if (!product) {
          throw new NotFoundException('Товар не знайдено');
        }

        const explanations =
          await this.explanationsService.findBySpecificationKeys(
            product.specifications.map((item) => item.key),
          );

        const explanationMap = new Map(
          explanations.map((explanation) => [
            explanation.specificationKey,
            explanation,
          ]),
        );

        const grouped = new Map<
          string,
          Array<{
            key: string;
            label: string;
            value: string;
            unit?: string | null;
            simpleExplanation: string | null;
            practicalImpact: string | null;
            importance: number;
          }>
        >();

        for (const specification of product.specifications) {
          const explanation = explanationMap.get(specification.key);
          const items = grouped.get(specification.groupName) ?? [];
          items.push({
            key: specification.key,
            label: specification.label,
            value: specification.value,
            unit: specification.unit,
            simpleExplanation: explanation?.shortExplanation ?? null,
            practicalImpact: explanation?.practicalImpact ?? null,
            importance: specification.importance,
          });
          grouped.set(specification.groupName, items);
        }

        return Array.from(grouped.entries()).map(([groupName, items]) => ({
          groupName,
          items,
        }));
      },
      600,
    );
  }

  async getRequiredProduct(id: string): Promise<Product> {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!product) {
      throw new NotFoundException('Товар не знайдено');
    }

    return product;
  }

  async getComparableSpecificationMap(
    productId: string,
  ): Promise<Map<string, ProductSpecification>> {
    const specifications = await this.prisma.productSpecification.findMany({
      where: {
        productId,
        isComparable: true,
      },
    });

    return new Map(
      specifications.map((specification) => [specification.key, specification]),
    );
  }

  private buildOrderBy(
    query: ProductQueryDto,
  ): Prisma.ProductOrderByWithRelationInput[] {
    switch (query.sortBy) {
      case ProductSortBy.PRICE:
        return [{ price: query.sortOrder }];
      case ProductSortBy.RATING:
        return [{ ratingAverage: query.sortOrder }];
      case ProductSortBy.POPULARITY:
        return [{ reviewCount: query.sortOrder }, { createdAt: 'desc' }];
      case ProductSortBy.NEWEST:
      default:
        return [{ createdAt: query.sortOrder }];
    }
  }

  private async ensureUniqueProduct(slug: string, sku: string): Promise<void> {
    const duplicate = await this.prisma.product.findFirst({
      where: {
        OR: [{ slug }, { sku }],
      },
    });

    if (duplicate) {
      throw new ConflictException(
        'Товар з таким slug або SKU вже існує',
      );
    }
  }

  private async invalidateProductCache(
    id: string,
    slug: string,
  ): Promise<void> {
    await Promise.all([
      this.cacheService.del(`product:${id}`),
      this.cacheService.del(`product:slug:${slug}`),
      this.cacheService.del(`product:${id}:explained-specs`),
      this.cacheService.del(`product:${id}:performance`),
      this.cacheService.del(`product:${id}:alternatives`),
    ]);
  }

  private readonly defaultInclude = {
    brand: true,
    category: true,
    specifications: {
      orderBy: [{ groupName: 'asc' }, { importance: 'desc' }],
    },
    performanceScore: true,
    reviews: {
      where: { isApproved: true },
      select: {
        id: true,
        rating: true,
        text: true,
        createdAt: true,
      },
    },
  } satisfies Prisma.ProductInclude;
}
