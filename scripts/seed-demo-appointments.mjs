/**
 * Demo appointments for filter / funnel / sort UI testing.
 * Safe to re-run: deletes prior rows with customerEmail ending in @seed.example
 *
 * Local (with staging DB URL):
 *   $env:DATABASE_URL="..."; npm run seed:demo
 *
 * On staging Fly machine:
 *   flyctl ssh console -a booking-service-app-staging -C "node scripts/seed-demo-appointments.mjs"
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_DOMAIN = "@seed.example";

function hoursFromNow(h) {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

function daysFromNow(d) {
  return new Date(Date.now() + d * 24 * 60 * 60 * 1000);
}

const productsAima = JSON.stringify([
  { name: "AIMA Sport", type: "test_ride", quantity: 1 },
]);
const productsMax = JSON.stringify([
  { name: "AIMA Max", type: "test_ride", quantity: 1 },
]);

/** @type {import('@prisma/client').Prisma.AppointmentCreateManyInput[]} */
const rows = [
  {
    customerName: "Alice Booked",
    customerEmail: `alice${SEED_DOMAIN}`,
    customerPhone: "+1-555-0101",
    dealerEmail: "dealer.west@aima.example",
    storeId: "store-la",
    storeName: "AIMA Los Angeles",
    storeAddress: "100 Sunset Blvd, LA",
    serviceType: "test_ride",
    appointmentDate: daysFromNow(2),
    duration: 60,
    notes: "SEED: pending / Booked",
    products: productsAima,
    status: "pending",
  },
  {
    customerName: "Bob Arrived",
    customerEmail: `bob${SEED_DOMAIN}`,
    customerPhone: "+1-555-0102",
    dealerEmail: "dealer.west@aima.example",
    storeId: "store-la",
    storeName: "AIMA Los Angeles",
    storeAddress: "100 Sunset Blvd, LA",
    serviceType: "test_ride",
    appointmentDate: hoursFromNow(-1),
    duration: 60,
    notes: "SEED: arrived",
    products: productsMax,
    status: "arrived",
    arrivedAt: hoursFromNow(-1),
  },
  {
    customerName: "Cara Legacy Confirmed",
    customerEmail: `cara${SEED_DOMAIN}`,
    customerPhone: "+1-555-0103",
    dealerEmail: "dealer.east@aima.example",
    storeId: "store-nyc",
    storeName: "AIMA New York",
    storeAddress: "200 Broadway, NYC",
    serviceType: "test_ride",
    appointmentDate: hoursFromNow(-3),
    duration: 45,
    notes: "SEED: legacy confirmed (counts as Arrived)",
    products: productsAima,
    status: "confirmed",
    arrivedAt: hoursFromNow(-3),
  },
  {
    customerName: "Dan Completed",
    customerEmail: `dan${SEED_DOMAIN}`,
    customerPhone: "+1-555-0104",
    dealerEmail: "dealer.east@aima.example",
    storeId: "store-nyc",
    storeName: "AIMA New York",
    storeAddress: "200 Broadway, NYC",
    serviceType: "test_ride",
    appointmentDate: daysFromNow(-1),
    duration: 60,
    notes: "SEED: completed",
    products: productsMax,
    status: "completed",
    arrivedAt: daysFromNow(-1),
    completedAt: hoursFromNow(-20),
  },
  {
    customerName: "Eve Voucher Issued",
    customerEmail: `eve${SEED_DOMAIN}`,
    customerPhone: "+1-555-0105",
    dealerEmail: "dealer.south@aima.example",
    storeId: "store-mia",
    storeName: "AIMA Miami",
    storeAddress: "300 Ocean Dr, Miami",
    serviceType: "test_ride",
    appointmentDate: daysFromNow(-2),
    duration: 60,
    notes: "SEED: voucher_issued",
    products: productsAima,
    status: "voucher_issued",
    arrivedAt: daysFromNow(-2),
    completedAt: daysFromNow(-2),
    voucherIssuedAt: hoursFromNow(-30),
  },
  {
    customerName: "Frank Redeemed",
    customerEmail: `frank${SEED_DOMAIN}`,
    customerPhone: "+1-555-0106",
    dealerEmail: "dealer.south@aima.example",
    storeId: "store-mia",
    storeName: "AIMA Miami",
    storeAddress: "300 Ocean Dr, Miami",
    serviceType: "test_ride",
    appointmentDate: daysFromNow(-5),
    duration: 60,
    notes: "SEED: voucher_redeemed",
    products: productsMax,
    status: "voucher_redeemed",
    arrivedAt: daysFromNow(-5),
    completedAt: daysFromNow(-5),
    voucherIssuedAt: daysFromNow(-4),
    voucherRedeemedAt: daysFromNow(-3),
  },
  {
    customerName: "Grace Cancelled",
    customerEmail: `grace${SEED_DOMAIN}`,
    customerPhone: "+1-555-0107",
    dealerEmail: "dealer.west@aima.example",
    storeId: "store-sf",
    storeName: "AIMA San Francisco",
    storeAddress: "400 Market St, SF",
    serviceType: "test_ride",
    appointmentDate: daysFromNow(5),
    duration: 30,
    notes: "SEED: cancelled (not in funnel cards)",
    products: productsAima,
    status: "cancelled",
  },
  {
    customerName: "Hank Sort Early",
    customerEmail: `hank${SEED_DOMAIN}`,
    customerPhone: "+1-555-0108",
    dealerEmail: "dealer.west@aima.example",
    storeId: "store-sf",
    storeName: "AIMA San Francisco",
    storeAddress: "400 Market St, SF",
    serviceType: "test_ride",
    appointmentDate: daysFromNow(10),
    duration: 60,
    notes: "SEED: far future date for sort asc/desc",
    products: productsAima,
    status: "pending",
  },
];

async function main() {
  const deleted = await prisma.appointment.deleteMany({
    where: { customerEmail: { endsWith: SEED_DOMAIN } },
  });
  console.log(`Removed ${deleted.count} previous seed rows (*${SEED_DOMAIN})`);

  const created = await prisma.appointment.createMany({ data: rows });
  console.log(`Created ${created.count} demo appointments`);

  const ids = await prisma.appointment.findMany({
    where: { customerEmail: { endsWith: SEED_DOMAIN } },
    select: { id: true, customerName: true, status: true, customerEmail: true },
    orderBy: { customerName: "asc" },
  });
  console.log("\nSeed IDs (for confirm/redeem URLs):");
  for (const row of ids) {
    console.log(`  ${row.status.padEnd(18)} ${row.id}  ${row.customerEmail}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
