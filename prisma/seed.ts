import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("password", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@adgen.com" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@adgen.com",
      password: hashedPassword,
    },
  });

  console.log("Seeded demo user:", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
