import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly ordersService: OrdersService) {}

  async mockSuccess(
    orderId: string,
    currentUser: { id: string; role: Role },
    orderOwnerId: string,
  ) {
    if (currentUser.role !== Role.ADMIN && currentUser.id !== orderOwnerId) {
      throw new ForbiddenException('Ви не маєте доступу до цього платежу');
    }

    return this.ordersService.markPaid(orderId);
  }
}
