import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { decimalToNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId?: string, sessionId?: string) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    return this.serializeCart(cart);
  }

  async addItem(dto: AddCartItemDto, userId?: string, sessionId?: string) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    const product = await this.prisma.product.findFirst({
      where: {
        id: dto.productId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Товар не знайдено');
    }

    if (product.stock < dto.quantity) {
      throw new BadRequestException('Запитана кількість недоступна');
    }

    await this.prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
      create: {
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
      },
      update: {
        quantity: {
          increment: dto.quantity,
        },
      },
    });

    return this.getCart(userId, cart.sessionId ?? sessionId);
  }

  async updateItem(
    itemId: string,
    dto: UpdateCartItemDto,
    userId?: string,
    sessionId?: string,
  ) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
      include: {
        product: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Товар у кошику не знайдено');
    }

    if (item.product.stock < dto.quantity) {
      throw new BadRequestException('Запитана кількість недоступна');
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    return this.getCart(userId, cart.sessionId ?? sessionId);
  }

  async removeItem(itemId: string, userId?: string, sessionId?: string) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });

    if (!item) {
      throw new NotFoundException('Товар у кошику не знайдено');
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCart(userId, cart.sessionId ?? sessionId);
  }

  async clearCart(userId?: string, sessionId?: string) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
    return this.getCart(userId, cart.sessionId ?? sessionId);
  }

  async mergeGuestCart(userId: string, sessionId: string) {
    const [userCart, guestCart] = await Promise.all([
      this.getOrCreateCart(userId),
      this.prisma.cart.findUnique({
        where: { sessionId },
        include: {
          items: true,
        },
      }),
    ]);

    if (!guestCart || guestCart.items.length === 0) {
      return this.getCart(userId);
    }

    await this.prisma.$transaction(
      guestCart.items.map((item) =>
        this.prisma.cartItem.upsert({
          where: {
            cartId_productId: {
              cartId: userCart.id,
              productId: item.productId,
            },
          },
          create: {
            cartId: userCart.id,
            productId: item.productId,
            quantity: item.quantity,
          },
          update: {
            quantity: {
              increment: item.quantity,
            },
          },
        }),
      ),
    );

    await this.prisma.cart.delete({
      where: { id: guestCart.id },
    });

    return this.getCart(userId);
  }

  async getOrCreateCart(userId?: string, sessionId?: string) {
    const normalizedSessionId = sessionId?.trim() || undefined;

    if (userId) {
      const existing = await this.prisma.cart.findUnique({
        where: { userId },
        include: this.cartInclude,
      });

      if (existing) {
        return existing;
      }

      return this.prisma.cart.create({
        data: { userId },
        include: this.cartInclude,
      });
    }

    const resolvedSessionId = normalizedSessionId ?? randomUUID();

    const existing = await this.prisma.cart.findUnique({
      where: { sessionId: resolvedSessionId },
      include: this.cartInclude,
    });

    if (existing) {
      return existing;
    }

    return this.prisma.cart.create({
      data: { sessionId: resolvedSessionId },
      include: this.cartInclude,
    });
  }

  private serializeCart(
    cart: Prisma.CartGetPayload<{
      include: typeof CartService.prototype.cartInclude;
    }>,
  ) {
    const items = cart.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      product: item.product,
      lineTotal: Number(
        (decimalToNumber(item.product.price) ?? 0) * item.quantity,
      ).toFixed(2),
    }));

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.lineTotal),
      0,
    );

    return {
      id: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      items,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: Number(subtotal.toFixed(2)),
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  private readonly cartInclude = {
    items: {
      include: {
        product: {
          include: {
            brand: true,
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    },
  } satisfies Prisma.CartInclude;
}
