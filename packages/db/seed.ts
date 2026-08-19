import { prisma } from ".";



async function test() {
  const report = await prisma.report.create({
    data: {
      userId: "test",
      latitude: 20,
      longitude: 85,
    },
  });
}
