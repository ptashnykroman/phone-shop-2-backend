import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Admin overview dashboard counters' })
  async overview() {
    const [users, products, orders, reviews] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.product.count({ where: { deletedAt: null } }),
      this.prisma.order.count(),
      this.prisma.review.count(),
    ]);

    return {
      users,
      products,
      orders,
      reviews,
    };
  }

  @Get('users')
  @ApiOperation({ summary: 'Admin list users' })
  listUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('role') role?: Role,
    @Query('isActive') isActive?: string,
  ) {
    return this.usersService.listUsers({
      page: Number(page),
      limit: Number(limit),
      role,
      isActive:
        isActive === undefined ? undefined : isActive === 'true',
    });
  }
}
