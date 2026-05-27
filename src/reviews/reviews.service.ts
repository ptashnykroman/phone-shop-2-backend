import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(userId: string, productId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
      },
    });

    if (!product) {
      throw new NotFoundException('Товар не знайдено');
    }

    const existing = await this.prisma.review.findFirst({
      where: {
        userId,
        productId,
      },
    });

    if (existing) {
      throw new ConflictException('Ви вже залишили відгук про цей продукт');
    }

    return this.prisma.review.create({
      data: {
        userId,
        productId,
        rating: dto.rating,
        text: dto.text,
      },
    });
  }

  getProductReviews(productId: string) {
    return this.prisma.review.findMany({
      where: {
        productId,
        isApproved: true,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async moderateReview(reviewId: string, dto: ModerateReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Відгук не знайдено');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { isApproved: dto.isApproved },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await this.refreshProductRating(review.productId);
    return updated;
  }

  private async refreshProductRating(productId: string) {
    const aggregate = await this.prisma.review.aggregate({
      where: {
        productId,
        isApproved: true,
      },
      _avg: {
        rating: true,
      },
      _count: {
        id: true,
      },
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        ratingAverage: new Prisma.Decimal(
          Number(aggregate._avg.rating ?? 0).toFixed(2),
        ),
        reviewCount: aggregate._count.id,
      },
    });
  }
}
