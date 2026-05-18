import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CharacteristicsService } from './characteristics.service';
import {
  CreateCharacteristicDto,
  UpdateCharacteristicDto,
} from './dto/create-characteristic.dto';

@ApiTags('Characteristics')
@Controller('products/:productId/specifications')
export class CharacteristicsController {
  constructor(private readonly characteristicsService: CharacteristicsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get raw product characteristics' })
  findAll(@Param('productId', new ParseUUIDPipe()) productId: string) {
    return this.characteristicsService.findAllByProduct(productId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create product characteristic' })
  create(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() dto: CreateCharacteristicDto,
  ) {
    return this.characteristicsService.create(productId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product characteristic' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCharacteristicDto,
  ) {
    return this.characteristicsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product characteristic' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.characteristicsService.remove(id);
  }
}
