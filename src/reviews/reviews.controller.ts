import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('products/:productId/reviews')
  @ApiOperation({ summary: 'Create product review' })
  create(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(user.id, productId, dto);
  }

  @Public()
  @Get('products/:productId/reviews')
  @ApiOperation({ summary: 'List approved reviews for product' })
  listProductReviews(@Param('productId', new ParseUUIDPipe()) productId: string) {
    return this.reviewsService.getProductReviews(productId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Patch('reviews/:reviewId/moderation')
  @ApiOperation({ summary: 'Moderate review approval' })
  moderate(
    @Param('reviewId', new ParseUUIDPipe()) reviewId: string,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.reviewsService.moderateReview(reviewId, dto);
  }
}
