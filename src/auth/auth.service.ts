import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CartService } from '../cart/cart.service';
import { SafeUser, UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cartService: CartService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: SafeUser } & AuthTokens> {
    const user = await this.usersService.createUser({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user,
      ...tokens,
    };
  }

  async login(dto: LoginDto): Promise<{ user: SafeUser } & AuthTokens> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
    if (dto.sessionId) {
      await this.cartService.mergeGuestCart(user.id, dto.sessionId);
    }

    return {
      user: this.usersService.serializeUser(user),
      ...tokens,
    };
  }

  async refresh(refreshToken: string): Promise<{ user: SafeUser } & AuthTokens> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.usersService.getRequiredUser(payload.sub);

    if (!user.refreshTokenHash) {
      throw new ForbiddenException('Refresh session is not active');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isValid) {
      throw new ForbiddenException('Refresh token is invalid');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.usersService.serializeUser(user),
      ...tokens,
    };
  }

  async logout(userId: string): Promise<{ success: true }> {
    await this.usersService.updateRefreshToken(userId, null);
    return { success: true };
  }

  async getCurrentUser(userId: string): Promise<SafeUser> {
    const user = await this.usersService.getRequiredUser(userId);
    return this.usersService.serializeUser(user);
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: Role,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, role };
    const accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ??
      'default-access-secret';
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ??
      'default-refresh-secret';
    const accessTtl = this.configService.get<string>('JWT_ACCESS_TTL') ?? '15m';
    const refreshTtl =
      this.configService.get<string>('JWT_REFRESH_TTL') ?? '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessTtl as never,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshTtl as never,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ??
          'default-refresh-secret',
      });
    } catch {
      throw new ForbiddenException('Refresh token is invalid or expired');
    }
  }
}
