import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartService } from './cart.service';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get current cart for user or guest session' })
  getCart(
    @CurrentUser() user?: { id: string },
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.getCart(user?.id, sessionId);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  addItem(
    @Body() dto: AddCartItemDto,
    @CurrentUser() user?: { id: string },
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.addItem(dto, user?.id, sessionId);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  updateItem(
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user?: { id: string },
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.updateItem(itemId, dto, user?.id, sessionId);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  removeItem(
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @CurrentUser() user?: { id: string },
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.removeItem(itemId, user?.id, sessionId);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Delete('clear')
  @ApiOperation({ summary: 'Clear cart' })
  clear(
    @CurrentUser() user?: { id: string },
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.clearCart(user?.id, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('merge')
  @ApiOperation({ summary: 'Merge guest cart into authenticated cart' })
  mergeGuestCart(
    @CurrentUser() user: { id: string },
    @Body() dto: MergeCartDto,
  ) {
    return this.cartService.mergeGuestCart(user.id, dto.sessionId);
  }
}
