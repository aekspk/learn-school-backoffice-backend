import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.log(e);
    await prisma.$disconnect();
  });
