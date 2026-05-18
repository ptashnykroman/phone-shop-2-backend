import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RedisCacheService } from '../common/utils/redis-cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { PerformanceScoresService } from '../performance-scores/performance-scores.service';
import {
  CreateCharacteristicDto,
  UpdateCharacteristicDto,
} from './dto/create-characteristic.dto';

@Injectable()
export class CharacteristicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly performanceScoresService: PerformanceScoresService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async findAllByProduct(productId: string) {
    return this.prisma.productSpecification.findMany({
      where: { productId },
      orderBy: [{ groupName: 'asc' }, { importance: 'desc' }],
    });
  }

  async create(productId: string, dto: CreateCharacteristicDto) {
    await this.ensureProductExists(productId);
    const specification = await this.prisma.productSpecification.create({
      data: {
        productId,
        groupName: dto.groupName,
        key: dto.key,
        label: dto.label,
        value: dto.value,
        numericValue:
          dto.numericValue !== undefined
            ? new Prisma.Decimal(dto.numericValue)
            : null,
        unit: dto.unit,
        importance: dto.importance,
        isComparable: dto.isComparable,
      },
    });

    await this.invalidateDerivedCaches(productId);
    return specification;
  }

  async update(id: string, dto: UpdateCharacteristicDto) {
    const existing = await this.prisma.productSpecification.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Characteristic not found');
    }

    const specification = await this.prisma.productSpecification.update({
      where: { id },
      data: {
        groupName: dto.groupName,
        key: dto.key,
        label: dto.label,
        value: dto.value,
        numericValue:
          dto.numericValue !== undefined
            ? new Prisma.Decimal(dto.numericValue)
            : undefined,
        unit: dto.unit,
        importance: dto.importance,
        isComparable: dto.isComparable,
      },
    });

    await this.invalidateDerivedCaches(existing.productId);
    return specification;
  }

  async remove(id: string) {
    const existing = await this.prisma.productSpecification.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Characteristic not found');
    }

    await this.prisma.productSpecification.delete({ where: { id } });
    await this.invalidateDerivedCaches(existing.productId);
    return { success: true };
  }

  private async ensureProductExists(productId: string) {
    const exists = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Product not found');
    }
  }

  private async invalidateDerivedCaches(productId: string) {
    await Promise.all([
      this.performanceScoresService.recalculateAndPersist(productId),
      this.cacheService.del(`product:${productId}:explained-specs`),
      this.cacheService.del(`product:${productId}:alternatives`),
      this.cacheService.del(`product:${productId}:performance`),
    ]);
  }
}
