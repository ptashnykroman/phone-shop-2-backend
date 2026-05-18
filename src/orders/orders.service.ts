import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { decimalToNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const cart = await this.cartService.getOrCreateCart(userId);
    if (cart.items.length === 0) {
      throw new NotFoundException('Cart is empty');
    }

    const totalPrice = cart.items.reduce((sum, item) => {
      return sum + (decimalToNumber(item.product.price) ?? 0) * item.quantity;
    }, 0);

    const order = await this.prisma.$transaction(async (transaction) => {
      for (const item of cart.items) {
        if (item.product.stock < item.quantity) {
          throw new ForbiddenException(
            `Product "${item.product.name}" does not have enough stock`,
          );
        }
      }

      const createdOrder = await transaction.order.create({
        data: {
          userId,
          status:
            dto.paymentMethod === 'MOCK'
              ? OrderStatus.AWAITING_PAYMENT
              : OrderStatus.PENDING,
          totalPrice: new Prisma.Decimal(totalPrice.toFixed(2)),
          deliveryType: dto.deliveryType,
          deliveryAddress: dto.deliveryAddress,
          paymentMethod: dto.paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              productName: item.product.name,
              price: item.product.price,
              quantity: item.quantity,
            })),
          },
        },
        include: this.orderInclude,
      });

      await Promise.all(
        cart.items.map((item) =>
          transaction.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          }),
        ),
      );

      await transaction.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return createdOrder;
    });

    return order;
  }

  async getMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: this.orderInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(orderId: string, currentUser: { id: string; role: Role }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.orderInclude,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (currentUser.role !== Role.ADMIN && order.userId !== currentUser.id) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return order;
  }

  async adminListOrders(page = 1, limit = 20) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        include: this.orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count(),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto) {
    await this.ensureOrderExists(orderId);
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
      },
      include: this.orderInclude,
    });
  }

  async markPaid(orderId: string) {
    await this.ensureOrderExists(orderId);
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        status: OrderStatus.PROCESSING,
      },
      include: this.orderInclude,
    });
  }

  private async ensureOrderExists(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
  }

  private readonly orderInclude = {
    items: {
      orderBy: {
        createdAt: 'asc',
      },
    },
    user: {
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    },
  } satisfies Prisma.OrderInclude;
}
