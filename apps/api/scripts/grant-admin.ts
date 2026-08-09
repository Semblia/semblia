import { pathToFileURL } from "node:url";
import { prisma } from "@workspace/database/prisma";

type GrantAdminArgs = {
  email: string;
  clerkUserId: string;
};

type AdminGrantPrisma = Pick<typeof prisma, "adminUser" | "adminAuditLog">;

function parseGrantAdminArgs(argv: string[]): GrantAdminArgs {
  const flags = new Map<string, string>();

  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) {
      flags.set(match[1], match[2]);
    }
  }

  const email = flags.get("email")?.trim().toLowerCase();
  const clerkUserId = flags.get("clerk-user-id")?.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Missing or invalid --email flag");
  }

  if (!clerkUserId) {
    throw new Error("Missing --clerk-user-id flag");
  }

  return { email, clerkUserId };
}

async function grantAdmin(prisma: AdminGrantPrisma, args: GrantAdminArgs) {
  const existing = await prisma.adminUser.findUnique({
    where: { clerkUserId: args.clerkUserId },
  });

  if (existing) {
    console.log(`Admin ${args.email} already exists.`);
    return existing;
  }

  const adminUser = await prisma.adminUser.create({
    data: {
      email: args.email,
      clerkUserId: args.clerkUserId,
      isActive: true,
      grantedByEmail: null,
    },
  });

  await prisma.adminAuditLog.create({
    data: {
      adminUserId: adminUser.id,
      action: "seed_bootstrap",
      targetType: "admin_user",
      targetId: adminUser.id,
      metadata: {
        email: adminUser.email,
        clerkUserId: adminUser.clerkUserId,
      },
    },
  });

  console.log(`Granted admin access to ${adminUser.email}.`);
  return adminUser;
}

async function main() {
  const args = parseGrantAdminArgs(process.argv.slice(2));

  try {
    await grantAdmin(prisma, args);
  } finally {
    await prisma.$disconnect();
  }
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
