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
import { CharacteristicExplanationsService } from './characteristic-explanations.service';
import { CreateCharacteristicExplanationDto } from './dto/create-characteristic-explanation.dto';
import { UpdateCharacteristicExplanationDto } from './dto/update-characteristic-explanation.dto';

@ApiTags('Characteristic Explanations')
@Controller('characteristic-explanations')
export class CharacteristicExplanationsController {
  constructor(
    private readonly characteristicExplanationsService: CharacteristicExplanationsService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List characteristic explanations' })
  findAll() {
    return this.characteristicExplanationsService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create characteristic explanation' })
  create(@Body() dto: CreateCharacteristicExplanationDto) {
    return this.characteristicExplanationsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update characteristic explanation' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCharacteristicExplanationDto,
  ) {
    return this.characteristicExplanationsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete characteristic explanation' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.characteristicExplanationsService.remove(id);
  }
}
