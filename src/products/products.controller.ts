import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AlternativesService } from '../alternatives/alternatives.service';
import { PerformanceScoresService } from '../performance-scores/performance-scores.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly performanceScoresService: PerformanceScoresService,
    private readonly alternativesService: AlternativesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a product' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List products with pagination, filtering, and sorting' })
  @ApiQuery({ name: 'brandIds', required: false, type: String })
  @ApiQuery({ name: 'categoryIds', required: false, type: String })
  @ApiQuery({ name: 'colors', required: false, type: String })
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get product by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findOneBySlug(slug);
  }

  @Public()
  @Get(':id/specifications/explained')
  @ApiOperation({ summary: 'Get product specifications with plain-language explanations' })
  getExplainedSpecifications(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.productsService.getExplainedSpecifications(id);
  }

  @Public()
  @Get(':id/performance-score')
  @ApiOperation({ summary: 'Get performance score breakdown for a product' })
  getPerformanceScore(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.performanceScoresService.getOrCreateForProduct(id);
  }

  @Public()
  @Get(':id/alternatives')
  @ApiOperation({ summary: 'Get rule-based product alternatives' })
  getAlternatives(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.alternativesService.getAlternativesForProduct(id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get product by id' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.productsService.findOneById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete product' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.productsService.softDelete(id);
  }
}
