import { Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly ordersService: OrdersService,
  ) {}

  @Post('orders/:orderId/mock-success')
  @ApiOperation({ summary: 'Simulate successful payment for an order' })
  async mockSuccess(
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @CurrentUser() user: { id: string; role: 'USER' | 'ADMIN' },
  ) {
    const order = await this.ordersService.getOrderById(orderId, {
      id: user.id,
      role: user.role,
    });

    return this.paymentsService.mockSuccess(
      orderId,
      { id: user.id, role: user.role },
      order.userId,
    );
  }
}
