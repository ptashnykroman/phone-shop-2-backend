# Phone Shop Backend

Backend for a diploma-grade mobile phone e-commerce platform built with `NestJS`, `Prisma`, `PostgreSQL`, `Redis`, and JWT authentication.

## Implemented scope

- Modular monolith with REST API
- Prisma schema with UUID ids, relations, indexes, Decimal prices, and soft delete for products
- JWT auth with register, login, refresh, logout, and current user
- RBAC with `USER` and `ADMIN` protected routes
- Public catalog endpoints for brands, categories, products, comparisons, health
- Product CRUD, pagination, filtering, sorting, and search
- Product specifications and plain-language explanations
- Rule-based performance scoring
- Rule-based alternatives engine
- Honest comparison endpoint for 2-4 phones
- Cart for authenticated users and guest sessions
- Orders, mock payments, reviews, favorites
- Swagger at `/docs`
- Dockerfile and `docker-compose.yml`
- Prisma migration and seed data
- Unit tests for the main rule-based services
- E2E-style HTTP tests for key endpoints

## Main modules

- `AuthModule`
- `UsersModule`
- `ProductsModule`
- `BrandsModule`
- `CategoriesModule`
- `CharacteristicsModule`
- `CharacteristicExplanationsModule`
- `PerformanceScoresModule`
- `ComparisonsModule`
- `AlternativesModule`
- `CartModule`
- `OrdersModule`
- `ReviewsModule`
- `FavoritesModule`
- `PaymentsModule`
- `AdminModule`
- `ImagesModule`
- `HealthModule`

## Environment variables

Copy `.env.example` to `.env`.

```env
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/phone_shop?schema=public
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=change-me-access-secret
JWT_REFRESH_SECRET=change-me-refresh-secret
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
SWAGGER_TITLE=Phone Shop API
SWAGGER_DESCRIPTION=REST API for a mobile phone e-commerce backend
SWAGGER_VERSION=1.0.0
```

## Local run

1. Install dependencies:

```bash
pnpm install
```

2. Generate Prisma client:

```bash
pnpm exec prisma generate
```

3. Run migrations:

```bash
pnpm prisma:deploy
```

For local development with a fresh database you can also use:

```bash
pnpm prisma:migrate
```

4. Seed the database:

```bash
pnpm prisma:seed
```

5. Start the API:

```bash
pnpm start:dev
```

6. Open:

- API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/docs`
- Health: `http://localhost:3000/api/health`

## Docker

Run the full stack:

```bash
docker-compose up --build
```

Services:

- app: `localhost:3000`
- postgres: `localhost:5432`
- redis: `localhost:6379`

## Important endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Catalog

- `GET /api/brands`
- `GET /api/categories`
- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/products/slug/:slug`

### Diploma features

- `GET /api/products/:id/specifications/explained`
- `GET /api/products/:id/performance-score`
- `GET /api/products/:id/alternatives`
- `POST /api/products/compare`

### Commerce

- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:itemId`
- `DELETE /api/cart/items/:itemId`
- `DELETE /api/cart/clear`
- `POST /api/cart/merge`
- `POST /api/orders`
- `GET /api/orders/my`
- `GET /api/orders/:id`
- `POST /api/products/:productId/reviews`
- `GET /api/products/:productId/reviews`
- `GET /api/favorites`
- `POST /api/favorites`
- `DELETE /api/favorites`
- `POST /api/payments/orders/:orderId/mock-success`

## Seeded accounts

- Admin: `admin@phoneshop.dev` / `Password123!`
- User: `user@phoneshop.dev` / `Password123!`

## Testing

Unit tests:

```bash
pnpm test
```

E2E-style endpoint tests:

```bash
pnpm test:e2e
```

Type check:

```bash
node node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/tsc.js --noEmit
```

## Notes

- Redis is used through a lightweight cache wrapper with in-memory fallback if Redis is unavailable.
- BullMQ is included in dependencies for future background jobs, but no queue flow is required for the current scope.
- Product deletion is soft delete through `deletedAt` and `isActive = false`.
- Comparison and alternative features are fully rule-based, not AI-based.
