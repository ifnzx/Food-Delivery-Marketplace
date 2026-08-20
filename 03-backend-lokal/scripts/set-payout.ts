import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.setting.update({
    where: { id: "business" },
    data: {
      payoutBankName: "BCA",
      payoutAccountNumber: "1234567890",
      payoutAccountName: "Founder ANTARQ",
    },
  });
  console.log("OK", updated.payoutBankName, updated.payoutAccountNumber);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
