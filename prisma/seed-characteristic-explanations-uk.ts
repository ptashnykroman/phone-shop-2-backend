import { PrismaClient } from '@prisma/client';
import { characteristicExplanationSeeds } from './characteristic-explanations.uk';

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(
    characteristicExplanationSeeds.map((item) =>
      prisma.characteristicExplanation.upsert({
        where: { specificationKey: item.specificationKey },
        update: {
          label: item.label,
          shortExplanation: item.shortExplanation,
          detailedExplanation: item.detailedExplanation,
          practicalImpact: item.practicalImpact,
          example: item.example,
        },
        create: item,
      }),
    ),
  );

  console.log(
    `Upserted ${characteristicExplanationSeeds.length} characteristic explanations in Ukrainian.`,
  );
}

void main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
