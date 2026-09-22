import { PrismaClient } from "@prisma/client";

const id = process.argv[2] || "cmucau5py0004qfn6dl9nt8t5";
const prisma = new PrismaClient();

const apt = await prisma.appointment.update({
  where: { id },
  data: {
    status: "voucher_issued",
    voucherRedeemedAt: null,
  },
});

console.log(`Unredeemed ${apt.id} -> ${apt.status}`);
await prisma.$disconnect();
