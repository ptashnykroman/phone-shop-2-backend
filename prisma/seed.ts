import {
  AlternativeReasonType,
  AlternativeRuleType,
  DeliveryType,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  PrismaClient,
  Role,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface SeedSpecificationInput {
  groupName: string;
  key: string;
  label: string;
  value: string;
  numericValue?: number;
  unit?: string;
  importance?: number;
  isComparable?: boolean;
}

interface SeedProductInput {
  name: string;
  slug: string;
  sku: string;
  price: number;
  oldPrice?: number;
  stock: number;
  color: string;
  brandSlug: string;
  categorySlug: string;
  description: string;
  shortDescription: string;
  images: string[];
  specifications: SeedSpecificationInput[];
}

const productInputs: SeedProductInput[] = [
  {
    name: 'Apple iPhone 15',
    slug: 'apple-iphone-15',
    sku: 'APL-IP15-128-BLK',
    price: 899,
    oldPrice: 949,
    stock: 14,
    color: 'Black',
    brandSlug: 'apple',
    categorySlug: 'smartphones',
    description:
      'Balanced flagship smartphone with strong camera quality, long software support, and a smooth everyday experience.',
    shortDescription: 'Reliable flagship with strong camera and ecosystem.',
    images: ['https://example.com/images/iphone-15-front.jpg'],
    specifications: [
      spec('Performance', 'processor_score', 'Processor score', '86', 86, 'pts', 10),
      spec('Memory', 'ram_gb', 'RAM', '6', 6, 'GB', 8),
      spec('Battery', 'battery_mah', 'Battery capacity', '3349', 3349, 'mAh', 8),
      spec('Display', 'refresh_rate', 'Refresh rate', '60', 60, 'Hz', 7),
      spec('Storage', 'storage_type', 'Storage type', 'NVMe', undefined, undefined, 8),
      spec('Storage', 'storage_gb', 'Storage', '128', 128, 'GB', 7),
      spec('Camera', 'camera_main_mp', 'Main camera', '48', 48, 'MP', 9),
      spec('Camera', 'camera_ultrawide_mp', 'Ultra-wide camera', '12', 12, 'MP', 7),
      spec('Camera', 'camera_zoom_optical', 'Optical zoom', '0', 0, 'x', 5),
      spec('Camera', 'ois', 'Optical stabilization', 'true', 1, undefined, 8),
      spec('Camera', 'sensor_size', 'Sensor size', '1/1.56', 0.64, undefined, 8),
      spec('Display', 'display_brightness_nits', 'Peak brightness', '2000', 2000, 'nits', 8),
      spec('Display', 'display_resolution_score', 'Display resolution score', '88', 88, 'pts', 7),
      spec('Display', 'display_type', 'Display type', 'OLED', undefined, undefined, 8),
      spec('Battery', 'charging_watts', 'Charging speed', '20', 20, 'W', 6),
      spec('Longevity', 'software_support_years', 'Software support', '6', 6, 'years', 9),
    ],
  },
  {
    name: 'Samsung Galaxy S24',
    slug: 'samsung-galaxy-s24',
    sku: 'SMS-S24-256-ONYX',
    price: 849,
    oldPrice: 899,
    stock: 18,
    color: 'Onyx Black',
    brandSlug: 'samsung',
    categorySlug: 'smartphones',
    description:
      'Compact Android flagship with 120 Hz AMOLED display, strong performance, and versatile cameras.',
    shortDescription: 'Compact flagship with smooth display and balanced camera stack.',
    images: ['https://example.com/images/galaxy-s24-front.jpg'],
    specifications: [
      spec('Performance', 'processor_score', 'Processor score', '90', 90, 'pts', 10),
      spec('Memory', 'ram_gb', 'RAM', '8', 8, 'GB', 8),
      spec('Battery', 'battery_mah', 'Battery capacity', '4000', 4000, 'mAh', 8),
      spec('Display', 'refresh_rate', 'Refresh rate', '120', 120, 'Hz', 9),
      spec('Storage', 'storage_type', 'Storage type', 'UFS 4.0', undefined, undefined, 8),
      spec('Storage', 'storage_gb', 'Storage', '256', 256, 'GB', 7),
      spec('Camera', 'camera_main_mp', 'Main camera', '50', 50, 'MP', 9),
      spec('Camera', 'camera_ultrawide_mp', 'Ultra-wide camera', '12', 12, 'MP', 7),
      spec('Camera', 'camera_zoom_optical', 'Optical zoom', '3', 3, 'x', 8),
      spec('Camera', 'ois', 'Optical stabilization', 'true', 1, undefined, 8),
      spec('Camera', 'sensor_size', 'Sensor size', '1/1.56', 0.64, undefined, 8),
      spec('Display', 'display_brightness_nits', 'Peak brightness', '2600', 2600, 'nits', 8),
      spec('Display', 'display_resolution_score', 'Display resolution score', '90', 90, 'pts', 7),
      spec('Display', 'display_type', 'Display type', 'AMOLED', undefined, undefined, 8),
      spec('Battery', 'charging_watts', 'Charging speed', '25', 25, 'W', 6),
      spec('Longevity', 'software_support_years', 'Software support', '7', 7, 'years', 9),
    ],
  },
  {
    name: 'Google Pixel 8',
    slug: 'google-pixel-8',
    sku: 'GGL-PX8-128-OBS',
    price: 699,
    oldPrice: 749,
    stock: 12,
    color: 'Obsidian',
    brandSlug: 'google',
    categorySlug: 'smartphones',
    description:
      'Camera-first Android phone with clean software, long support, and dependable daily performance.',
    shortDescription: 'Camera-focused Android with clean software.',
    images: ['https://example.com/images/pixel-8-front.jpg'],
    specifications: [
      spec('Performance', 'processor_score', 'Processor score', '78', 78, 'pts', 10),
      spec('Memory', 'ram_gb', 'RAM', '8', 8, 'GB', 8),
      spec('Battery', 'battery_mah', 'Battery capacity', '4575', 4575, 'mAh', 8),
      spec('Display', 'refresh_rate', 'Refresh rate', '120', 120, 'Hz', 9),
      spec('Storage', 'storage_type', 'Storage type', 'UFS 3.1', undefined, undefined, 8),
      spec('Storage', 'storage_gb', 'Storage', '128', 128, 'GB', 7),
      spec('Camera', 'camera_main_mp', 'Main camera', '50', 50, 'MP', 9),
      spec('Camera', 'camera_ultrawide_mp', 'Ultra-wide camera', '12', 12, 'MP', 7),
      spec('Camera', 'camera_zoom_optical', 'Optical zoom', '0', 0, 'x', 5),
      spec('Camera', 'ois', 'Optical stabilization', 'true', 1, undefined, 8),
      spec('Camera', 'sensor_size', 'Sensor size', '1/1.31', 0.76, undefined, 8),
      spec('Display', 'display_brightness_nits', 'Peak brightness', '2000', 2000, 'nits', 8),
      spec('Display', 'display_resolution_score', 'Display resolution score', '89', 89, 'pts', 7),
      spec('Display', 'display_type', 'Display type', 'OLED', undefined, undefined, 8),
      spec('Battery', 'charging_watts', 'Charging speed', '27', 27, 'W', 6),
      spec('Longevity', 'software_support_years', 'Software support', '7', 7, 'years', 9),
    ],
  },
  {
    name: 'Xiaomi Redmi Note 13 Pro 5G',
    slug: 'xiaomi-redmi-note-13-pro-5g',
    sku: 'XMI-RN13PRO-256-BLK',
    price: 389,
    stock: 30,
    color: 'Midnight Black',
    brandSlug: 'xiaomi',
    categorySlug: 'smartphones',
    description:
      'Value-oriented phone with high-refresh display, huge battery, and generous storage for the price.',
    shortDescription: 'Aggressive value option with lots of storage.',
    images: ['https://example.com/images/redmi-note-13-pro-front.jpg'],
    specifications: [
      spec('Performance', 'processor_score', 'Processor score', '70', 70, 'pts', 10),
      spec('Memory', 'ram_gb', 'RAM', '8', 8, 'GB', 8),
      spec('Battery', 'battery_mah', 'Battery capacity', '5100', 5100, 'mAh', 8),
      spec('Display', 'refresh_rate', 'Refresh rate', '120', 120, 'Hz', 9),
      spec('Storage', 'storage_type', 'Storage type', 'UFS 2.2', undefined, undefined, 8),
      spec('Storage', 'storage_gb', 'Storage', '256', 256, 'GB', 7),
      spec('Camera', 'camera_main_mp', 'Main camera', '200', 200, 'MP', 9),
      spec('Camera', 'camera_ultrawide_mp', 'Ultra-wide camera', '8', 8, 'MP', 6),
      spec('Camera', 'camera_zoom_optical', 'Optical zoom', '0', 0, 'x', 5),
      spec('Camera', 'ois', 'Optical stabilization', 'true', 1, undefined, 8),
      spec('Camera', 'sensor_size', 'Sensor size', '1/1.4', 0.71, undefined, 8),
      spec('Display', 'display_brightness_nits', 'Peak brightness', '1800', 1800, 'nits', 8),
      spec('Display', 'display_resolution_score', 'Display resolution score', '87', 87, 'pts', 7),
      spec('Display', 'display_type', 'Display type', 'AMOLED', undefined, undefined, 8),
      spec('Battery', 'charging_watts', 'Charging speed', '67', 67, 'W', 7),
      spec('Longevity', 'software_support_years', 'Software support', '4', 4, 'years', 8),
    ],
  },
  {
    name: 'OnePlus 12R',
    slug: 'oneplus-12r',
    sku: 'ONE-12R-256-GRN',
    price: 599,
    stock: 16,
    color: 'Cool Blue',
    brandSlug: 'oneplus',
    categorySlug: 'smartphones',
    description:
      'Performance-focused phone with fast charging, 120 Hz LTPO AMOLED panel, and flagship-class speed.',
    shortDescription: 'Performance-focused pick with excellent charging.',
    images: ['https://example.com/images/oneplus-12r-front.jpg'],
    specifications: [
      spec('Performance', 'processor_score', 'Processor score', '93', 93, 'pts', 10),
      spec('Memory', 'ram_gb', 'RAM', '16', 16, 'GB', 9),
      spec('Battery', 'battery_mah', 'Battery capacity', '5500', 5500, 'mAh', 9),
      spec('Display', 'refresh_rate', 'Refresh rate', '120', 120, 'Hz', 9),
      spec('Storage', 'storage_type', 'Storage type', 'UFS 4.0', undefined, undefined, 8),
      spec('Storage', 'storage_gb', 'Storage', '256', 256, 'GB', 7),
      spec('Camera', 'camera_main_mp', 'Main camera', '50', 50, 'MP', 8),
      spec('Camera', 'camera_ultrawide_mp', 'Ultra-wide camera', '8', 8, 'MP', 6),
      spec('Camera', 'camera_zoom_optical', 'Optical zoom', '0', 0, 'x', 5),
      spec('Camera', 'ois', 'Optical stabilization', 'true', 1, undefined, 8),
      spec('Camera', 'sensor_size', 'Sensor size', '1/1.56', 0.64, undefined, 7),
      spec('Display', 'display_brightness_nits', 'Peak brightness', '4500', 4500, 'nits', 9),
      spec('Display', 'display_resolution_score', 'Display resolution score', '91', 91, 'pts', 8),
      spec('Display', 'display_type', 'Display type', 'LTPO AMOLED', undefined, undefined, 9),
      spec('Battery', 'charging_watts', 'Charging speed', '100', 100, 'W', 9),
      spec('Longevity', 'software_support_years', 'Software support', '4', 4, 'years', 8),
    ],
  },
];

async function main() {
  await clearDatabase();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const [admin, user] = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@phoneshop.dev',
        passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        phone: '+380500000001',
        role: Role.ADMIN,
      },
    }),
    prisma.user.create({
      data: {
        email: 'user@phoneshop.dev',
        passwordHash,
        firstName: 'Regular',
        lastName: 'Customer',
        phone: '+380500000002',
        role: Role.USER,
      },
    }),
  ]);

  const brands = await Promise.all(
    [
      brandData('Apple', 'apple', 'Premium iPhone lineup'),
      brandData('Samsung', 'samsung', 'Galaxy smartphones and ecosystem'),
      brandData('Google', 'google', 'Pixel phones with clean Android'),
      brandData('Xiaomi', 'xiaomi', 'Value-focused Android phones'),
      brandData('OnePlus', 'oneplus', 'Performance-led Android phones'),
    ].map((brand) => prisma.brand.create({ data: brand })),
  );

  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Smartphones',
        slug: 'smartphones',
        description: 'Mobile phones and flagship smartphones',
      },
    }),
  ]);

  const brandMap = new Map(brands.map((brand) => [brand.slug, brand.id]));
  const categoryMap = new Map(categories.map((category) => [category.slug, category.id]));

  const products = [];

  for (const productInput of productInputs) {
    const performanceScore = buildPerformanceScore(productInput.specifications);
    const product = await prisma.product.create({
      data: {
        name: productInput.name,
        slug: productInput.slug,
        sku: productInput.sku,
        price: new Prisma.Decimal(productInput.price),
        oldPrice:
          productInput.oldPrice !== undefined
            ? new Prisma.Decimal(productInput.oldPrice)
            : null,
        stock: productInput.stock,
        color: productInput.color,
        brandId: brandMap.get(productInput.brandSlug)!,
        categoryId: categoryMap.get(productInput.categorySlug)!,
        description: productInput.description,
        shortDescription: productInput.shortDescription,
        images: productInput.images,
        specifications: {
          create: productInput.specifications.map((specification) => ({
            groupName: specification.groupName,
            key: specification.key,
            label: specification.label,
            value: specification.value,
            numericValue:
              specification.numericValue !== undefined
                ? new Prisma.Decimal(specification.numericValue)
                : null,
            unit: specification.unit,
            importance: specification.importance ?? 5,
            isComparable: specification.isComparable ?? true,
          })),
        },
        performanceScore: {
          create: performanceScore,
        },
      },
    });

    products.push(product);
  }

  await prisma.characteristicExplanation.createMany({
    data: [
      explanation(
        'processor_score',
        'Processor score',
        'Higher processor score usually means the phone feels faster in demanding tasks.',
        'This score summarizes raw chipset capability. It affects gaming, multitasking, and how future-proof the phone feels after a few years.',
        'Strong processors help with gaming, camera processing, and keeping the interface responsive under load.',
        'If you jump between many apps or play heavy games, this matters a lot.',
      ),
      explanation(
        'ram_gb',
        'RAM',
        'More RAM helps the phone keep more apps open without refreshing them.',
        'RAM is short-term memory. A larger amount improves app switching and reduces reloads when you move between browser tabs, chat apps, and camera.',
        'Useful for multitasking and long sessions with many apps.',
        '8 GB is usually comfortable; 12 GB or more is helpful for heavy users.',
      ),
      explanation(
        'battery_mah',
        'Battery capacity',
        'A larger battery can help the phone last longer between charges.',
        'Battery size is not the only thing that matters, but it gives a useful first approximation of stamina when combined with chipset and screen efficiency.',
        'Important if you travel often, use navigation, or spend long hours away from a charger.',
        '5000 mAh is common on endurance-focused Android phones.',
      ),
      explanation(
        'refresh_rate',
        'Refresh rate',
        '120 Hz usually makes scrolling and animations look smoother than 60 Hz.',
        'Refresh rate describes how often the screen updates each second. Higher values improve perceived smoothness, especially in scrolling-heavy apps and games.',
        'Useful for gaming, social apps, and generally smoother UI motion.',
        'A 120 Hz panel can feel much more fluid than a 60 Hz panel.',
      ),
      explanation(
        'storage_type',
        'Storage type',
        'Faster storage helps apps open faster and improves general snappiness.',
        'Storage speed affects install times, game loading, large file operations, and how quick the system feels during updates or heavy multitasking.',
        'Important if you care about launch speed and long-term responsiveness.',
        'UFS 4.0 is noticeably faster than older UFS 2.2 storage.',
      ),
      explanation(
        'camera_main_mp',
        'Main camera resolution',
        'More megapixels can help detail, but sensor quality and stabilization matter too.',
        'Megapixel count alone is not equal to camera quality. Bigger sensors, good stabilization, and strong image processing often matter more than raw resolution.',
        'Helpful for cropping and daytime detail, but not the whole camera story.',
        'A 50 MP camera with a better sensor can beat a 200 MP camera in difficult light.',
      ),
      explanation(
        'ois',
        'Optical image stabilization',
        'OIS helps reduce blur from shaky hands, especially at night.',
        'Optical stabilization physically compensates for small hand movements. This improves photos in low light and makes handheld video more stable.',
        'Useful if you shoot night photos or take a lot of video while moving.',
        'Phones with OIS often produce cleaner night shots.',
      ),
      explanation(
        'display_type',
        'Display type',
        'OLED and AMOLED screens usually offer deeper blacks and stronger contrast than basic LCD panels.',
        'The panel technology affects contrast, brightness behavior, color punch, and power use depending on the content shown.',
        'Important for media viewing and perceived screen quality.',
        'LTPO AMOLED panels can also adapt refresh rate to save battery.',
      ),
    ],
  });

  await prisma.alternativeRule.createMany({
    data: [
      rule('Cheaper Similar', AlternativeRuleType.CHEAPER_SIMILAR),
      rule(
        'Slightly More Expensive Better',
        AlternativeRuleType.SLIGHTLY_MORE_EXPENSIVE_BETTER,
      ),
      rule('Better Camera', AlternativeRuleType.BETTER_CAMERA),
      rule('Better Battery', AlternativeRuleType.BETTER_BATTERY),
      rule('Better Performance', AlternativeRuleType.BETTER_PERFORMANCE),
      rule('Best Value', AlternativeRuleType.BEST_VALUE),
    ],
  });

  const [iphone, galaxy, pixel, redmi, oneplus] = products;

  await prisma.review.createMany({
    data: [
      {
        userId: user.id,
        productId: galaxy.id,
        rating: 5,
        text: 'Very smooth display and balanced camera setup.',
        isApproved: true,
      },
      {
        userId: admin.id,
        productId: pixel.id,
        rating: 4,
        text: 'Great point-and-shoot camera, but charging could be faster.',
        isApproved: true,
      },
    ],
  });

  await prisma.product.update({
    where: { id: galaxy.id },
    data: {
      ratingAverage: new Prisma.Decimal('5.00'),
      reviewCount: 1,
    },
  });

  await prisma.product.update({
    where: { id: pixel.id },
    data: {
      ratingAverage: new Prisma.Decimal('4.00'),
      reviewCount: 1,
    },
  });

  await prisma.favorite.create({
    data: {
      userId: user.id,
      productId: oneplus.id,
    },
  });

  const cart = await prisma.cart.create({
    data: {
      userId: user.id,
      items: {
        create: [
          {
            productId: redmi.id,
            quantity: 1,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      userId: user.id,
      status: 'PROCESSING',
      totalPrice: new Prisma.Decimal('849.00'),
      deliveryType: DeliveryType.COURIER,
      deliveryAddress: 'Kyiv, Example Street 1',
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.MOCK,
      items: {
        create: [
          {
            productId: galaxy.id,
            productName: galaxy.name,
            price: new Prisma.Decimal('849.00'),
            quantity: 1,
          },
        ],
      },
    },
  });

  await prisma.productAlternative.createMany({
    data: [
      {
        sourceProductId: iphone.id,
        alternativeProductId: galaxy.id,
        reasonType: AlternativeReasonType.SLIGHTLY_MORE_EXPENSIVE_BETTER,
        score: new Prisma.Decimal('82.50'),
        title: 'Comparable flagship with smoother screen',
        explanation:
          'Galaxy S24 offers a 120 Hz screen and more RAM while staying in a similar flagship tier.',
      },
      {
        sourceProductId: pixel.id,
        alternativeProductId: oneplus.id,
        reasonType: AlternativeReasonType.BETTER_PERFORMANCE,
        score: new Prisma.Decimal('88.00'),
        title: 'Faster choice for heavy use',
        explanation:
          'OnePlus 12R is stronger in sustained performance and battery endurance.',
      },
    ],
  });

  console.log(`Seeded users: ${admin.email}, ${user.email}`);
  console.log(`Seeded products: ${products.length}`);
  console.log(`Created cart: ${cart.id}`);
}

function brandData(name: string, slug: string, description: string) {
  return {
    name,
    slug,
    description,
    logoUrl: `https://example.com/logos/${slug}.svg`,
  };
}

function rule(name: string, type: AlternativeRuleType) {
  return {
    name,
    type,
    description: `${name} rule for alternatives module`,
    isActive: true,
  };
}

function explanation(
  specificationKey: string,
  label: string,
  shortExplanation: string,
  detailedExplanation: string,
  practicalImpact: string,
  example: string,
) {
  return {
    specificationKey,
    label,
    shortExplanation,
    detailedExplanation,
    practicalImpact,
    example,
  };
}

function spec(
  groupName: string,
  key: string,
  label: string,
  value: string,
  numericValue?: number,
  unit?: string,
  importance = 5,
  isComparable = true,
): SeedSpecificationInput {
  return {
    groupName,
    key,
    label,
    value,
    numericValue,
    unit,
    importance,
    isComparable,
  };
}

function buildPerformanceScore(specifications: SeedSpecificationInput[]) {
  const getNumeric = (key: string) =>
    specifications.find((item) => item.key === key)?.numericValue ?? null;
  const getText = (key: string) =>
    specifications.find((item) => item.key === key)?.value.toLowerCase() ?? null;
  const getBool = (key: string) =>
    ['true', 'yes', '1'].includes(
      specifications.find((item) => item.key === key)?.value.toLowerCase() ?? '',
    );

  const scale = (value: number | null, min: number, max: number) => {
    if (value === null) {
      return 50;
    }
    if (value <= min) {
      return 0;
    }
    if (value >= max) {
      return 100;
    }
    return ((value - min) / (max - min)) * 100;
  };

  const storageTypeScore = () => {
    const value = getText('storage_type');
    if (!value) {
      return 60;
    }
    if (value.includes('ufs 4')) return 100;
    if (value.includes('ufs 3.1')) return 88;
    if (value.includes('nvme')) return 92;
    if (value.includes('ufs 2.2')) return 68;
    return 60;
  };

  const panelTypeScore = () => {
    const value = getText('display_type');
    if (!value) return 70;
    if (value.includes('ltpo')) return 100;
    if (value.includes('amoled') || value.includes('oled')) return 92;
    if (value.includes('ips')) return 72;
    return 60;
  };

  const everydayUseScore = Math.round(
    scale(getNumeric('processor_score'), 0, 100) * 0.4 +
      scale(getNumeric('ram_gb'), 4, 16) * 0.2 +
      storageTypeScore() * 0.25 +
      scale(getNumeric('refresh_rate'), 60, 144) * 0.15,
  );
  const gamingScore = Math.round(
    scale(getNumeric('processor_score'), 0, 100) * 0.5 +
      scale(getNumeric('ram_gb'), 6, 18) * 0.2 +
      scale(getNumeric('refresh_rate'), 60, 144) * 0.2 +
      scale(getNumeric('battery_mah'), 3500, 6000) * 0.1,
  );
  const cameraScore = Math.round(
    scale(getNumeric('camera_main_mp'), 12, 108) * 0.35 +
      (getBool('ois') ? 100 : 30) * 0.2 +
      scale(getNumeric('sensor_size'), 0.5, 1.0) * 0.2 +
      scale(getNumeric('camera_ultrawide_mp'), 8, 50) * 0.1 +
      scale(getNumeric('camera_zoom_optical'), 0, 5) * 0.15,
  );
  const multitaskingScore = Math.round(
    scale(getNumeric('processor_score'), 0, 100) * 0.45 +
      scale(getNumeric('ram_gb'), 4, 16) * 0.35 +
      storageTypeScore() * 0.2,
  );
  const batteryScore = Math.round(
    scale(getNumeric('battery_mah'), 3500, 6000) * 0.7 +
      scale(getNumeric('charging_watts'), 15, 120) * 0.15 +
      (100 - scale(getNumeric('refresh_rate'), 60, 144)) * 0.15,
  );
  const displayScore = Math.round(
    scale(getNumeric('refresh_rate'), 60, 144) * 0.3 +
      scale(getNumeric('display_brightness_nits'), 500, 3000) * 0.25 +
      scale(getNumeric('display_resolution_score'), 0, 100) * 0.2 +
      panelTypeScore() * 0.25,
  );
  const longTermUseScore = Math.round(
    scale(getNumeric('processor_score'), 0, 100) * 0.35 +
      scale(getNumeric('ram_gb'), 4, 16) * 0.2 +
      storageTypeScore() * 0.2 +
      scale(getNumeric('software_support_years'), 2, 7) * 0.15 +
      scale(getNumeric('battery_mah'), 3500, 6000) * 0.1,
  );
  const overallScore = Math.round(
    everydayUseScore * 0.15 +
      gamingScore * 0.15 +
      cameraScore * 0.15 +
      multitaskingScore * 0.12 +
      batteryScore * 0.15 +
      displayScore * 0.13 +
      longTermUseScore * 0.15,
  );

  return {
    everydayUseScore,
    gamingScore,
    cameraScore,
    multitaskingScore,
    batteryScore,
    displayScore,
    longTermUseScore,
    overallScore,
    explanation: `Auto-seeded score. Overall ${overallScore}/100.`,
  };
}

async function clearDatabase() {
  await prisma.productAlternative.deleteMany();
  await prisma.alternativeRule.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.performanceScore.deleteMany();
  await prisma.productSpecification.deleteMany();
  await prisma.product.deleteMany();
  await prisma.characteristicExplanation.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
}

void main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
