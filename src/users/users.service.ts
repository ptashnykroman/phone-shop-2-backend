import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export type SafeUser = Omit<User, 'passwordHash' | 'refreshTokenHash'>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: Role;
  }): Promise<SafeUser> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role ?? Role.USER,
      },
    });

    return this.serializeUser(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async getRequiredUser(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    const refreshTokenHash = refreshToken
      ? await bcrypt.hash(refreshToken, 10)
      : null;

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  async listUsers(params: {
    page: number;
    limit: number;
    role?: Role;
    isActive?: boolean;
  }): Promise<{ items: SafeUser[]; meta: { page: number; limit: number; total: number } }> {
    const where: Prisma.UserWhereInput = {
      role: params.role,
      isActive: params.isActive,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((item) => this.serializeUser(item)),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
      },
    };
  }

  serializeUser(user: User): SafeUser {
    const { passwordHash: _passwordHash, refreshTokenHash: _refreshTokenHash, ...safeUser } =
      user;
    return safeUser;
  }
}
