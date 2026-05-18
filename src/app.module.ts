import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AdminModule } from './admin/admin.module';
import { AlternativesModule } from './alternatives/alternatives.module';
import { AuthModule } from './auth/auth.module';
import { BrandsModule } from './brands/brands.module';
import { CartModule } from './cart/cart.module';
import { CategoriesModule } from './categories/categories.module';
import { CharacteristicExplanationsModule } from './characteristic-explanations/characteristic-explanations.module';
import { CharacteristicsModule } from './characteristics/characteristics.module';
import { ComparisonsModule } from './comparisons/comparisons.module';
import { CommonModule } from './common/common.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DecimalSerializerInterceptor } from './common/interceptors/decimal-serializer.interceptor';
import { FavoritesModule } from './favorites/favorites.module';
import { HealthModule } from './health/health.module';
import { ImagesModule } from './images/images.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { PerformanceScoresModule } from './performance-scores/performance-scores.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    CommonModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    BrandsModule,
    CategoriesModule,
    ImagesModule,
    CharacteristicExplanationsModule,
    PerformanceScoresModule,
    AlternativesModule,
    ComparisonsModule,
    ProductsModule,
    CharacteristicsModule,
    CartModule,
    OrdersModule,
    ReviewsModule,
    FavoritesModule,
    PaymentsModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DecimalSerializerInterceptor,
    },
  ],
})
export class AppModule {}
