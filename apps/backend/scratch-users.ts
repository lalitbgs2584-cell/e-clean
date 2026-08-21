import { prisma } from "db/client";
const users = await prisma.user.findMany({ select: { id: true, image: true } });
console.log(JSON.stringify(users));
await prisma.$disconnect();
