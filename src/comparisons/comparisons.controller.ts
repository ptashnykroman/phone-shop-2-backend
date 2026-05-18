import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CompareProductsDto } from './dto/compare-products.dto';
import { ComparisonsService } from './comparisons.service';

@ApiTags('Comparisons')
@Controller('products')
export class ComparisonsController {
  constructor(private readonly comparisonsService: ComparisonsService) {}

  @Public()
  @Post('compare')
  @ApiOperation({ summary: 'Compare 2 to 4 products' })
  compare(@Body() dto: CompareProductsDto) {
    return this.comparisonsService.compareProducts(dto.productIds);
  }
}
