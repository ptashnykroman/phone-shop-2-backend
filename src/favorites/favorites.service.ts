import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Товар не знайдено');
    }

    const existing = await this.prisma.favorite.findFirst({
      where: {
        userId,
        productId,
      },
    });

    if (existing) {
      throw new ConflictException('Товар вже у вибраному');
    }

    return this.prisma.favorite.create({
      data: {
        userId,
        productId,
      },
      include: {
        product: {
          include: {
            brand: true,
            category: true,
          },
        },
      },
    });
  }

  async remove(userId: string, productId: string) {
    const favorite = await this.prisma.favorite.findFirst({
      where: {
        userId,
        productId,
      },
    });

    if (!favorite) {
      throw new NotFoundException('Вибраний товар не знайдено');
    }

    await this.prisma.favorite.delete({
      where: { id: favorite.id },
    });

    return { success: true };
  }

  list(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            brand: true,
            category: true,
            performanceScore: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
