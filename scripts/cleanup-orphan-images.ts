import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import { del } from "@vercel/blob";
import prisma from "../lib/prisma";

const apply = process.argv.includes("--delete");
const ageArg = process.argv.find((a) => a.startsWith("--min-age-hours="));
const minAgeHours = ageArg ? Number(ageArg.split("=")[1]) : 24;

async function main() {
  if (!Number.isFinite(minAgeHours) || minAgeHours < 0) {
    throw new Error("Use --min-age-hours=<number>");
  }

  const cutoff = new Date(Date.now() - minAgeHours * 60 * 60 * 1000);
  const orphans = await prisma.mediaAsset.findMany({
    where: { createdAt: { lt: cutoff }, questions: { none: {} } },
    select: { id: true, pathname: true, storageUrl: true, sizeBytes: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Unused images older than ${minAgeHours}h: ${orphans.length}`);
  for (const o of orphans) {
    console.log(`  ${o.id}  ${o.pathname}  ${o.sizeBytes} bytes  ${o.createdAt.toISOString()}`);
  }

  if (!apply) {
    console.log("\nDry run. Nothing was deleted. Add --delete to remove them.");
    return;
  }

  let removed = 0;
  for (const o of orphans) {
    try {
      await del(o.storageUrl);
      await prisma.mediaAsset.delete({ where: { id: o.id } });
      removed += 1;
    } catch (error) {
      console.error(`Could not remove ${o.id}:`, error instanceof Error ? error.name : "unknown");
    }
  }
  console.log(`\nRemoved ${removed} of ${orphans.length}.`);
}

main()
  .catch((error) => {
    console.error("Failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });