import { prisma } from "db/client";

const ext = await prisma.$queryRawUnsafe<
  Array<{ extname: string }>
>(
  "SELECT extname FROM pg_extension WHERE extname='postgis'",
);
console.log("postgis extension:", JSON.stringify(ext));

const reports = await prisma.report.count();
const users = await prisma.user.count();
const cleanups = await prisma.cleanup.count();
const notifications = await prisma.notification.count();
console.log(
  JSON.stringify({ reports, users, cleanups, notifications }),
);

try {
  const sample = await prisma.$queryRawUnsafe<
    Array<{ id: string; status: string }>
  >(
    "SELECT id, status FROM reports ORDER BY \"createdAt\" DESC LIMIT 3",
  );
  console.log("latest reports:", JSON.stringify(sample));
} catch (e) {
  console.log("query error:", (e as Error).message);
}

const tables = await prisma.$queryRawUnsafe<
  Array<{ tablename: string }>
>(
  "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
);
console.log("tables:", JSON.stringify(tables.map((t) => t.tablename)));

await prisma.$disconnect();
