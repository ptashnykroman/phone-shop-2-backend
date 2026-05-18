import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCharacteristicExplanationDto } from './dto/create-characteristic-explanation.dto';
import { UpdateCharacteristicExplanationDto } from './dto/update-characteristic-explanation.dto';

@Injectable()
export class CharacteristicExplanationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCharacteristicExplanationDto) {
    const existing = await this.prisma.characteristicExplanation.findUnique({
      where: { specificationKey: dto.specificationKey },
    });

    if (existing) {
      throw new ConflictException(
        'Explanation for this specification key already exists',
      );
    }

    return this.prisma.characteristicExplanation.create({
      data: dto,
    });
  }

  findAll() {
    return this.prisma.characteristicExplanation.findMany({
      orderBy: { label: 'asc' },
    });
  }

  findBySpecificationKeys(specificationKeys: string[]) {
    return this.prisma.characteristicExplanation.findMany({
      where: {
        specificationKey: {
          in: specificationKeys,
        },
      },
    });
  }

  async update(id: string, dto: UpdateCharacteristicExplanationDto) {
    await this.ensureExists(id);
    return this.prisma.characteristicExplanation.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.characteristicExplanation.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: string) {
    const explanation = await this.prisma.characteristicExplanation.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!explanation) {
      throw new NotFoundException('Characteristic explanation not found');
    }
  }
}
