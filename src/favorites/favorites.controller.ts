import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FavoritesService } from './favorites.service';
import { ToggleFavoriteDto } from './dto/toggle-favorite.dto';

@ApiTags('Favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user favorites' })
  list(@CurrentUser() user: { id: string }) {
    return this.favoritesService.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add product to favorites' })
  add(@CurrentUser() user: { id: string }, @Body() dto: ToggleFavoriteDto) {
    return this.favoritesService.add(user.id, dto.productId);
  }

  @Delete()
  @ApiOperation({ summary: 'Remove product from favorites' })
  remove(@CurrentUser() user: { id: string }, @Body() dto: ToggleFavoriteDto) {
    return this.favoritesService.remove(user.id, dto.productId);
  }
}
