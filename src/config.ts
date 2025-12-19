import "dotenv/config";

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const config = {
  discord: {
    token: must("DISCORD_TOKEN"),
    appId: must("DISCORD_APP_ID"),
    guildId: process.env.GUILD_ID,
    adminChannelId: process.env.ADMIN_CHANNEL_ID ?? "",
  },
  google: {
    sheetId: must("SHEET_ID"),
    sheetTab: process.env.SHEET_TAB ?? "registrations",
    serviceAccountJsonPath: must("GOOGLE_SERVICE_ACCOUNT_JSON"),
  },
  tibia: {
    guildName: process.env.GUILD_NAME ?? "Red Rose",
    auditThrottleMs: Number(process.env.AUDIT_THROTTLE_MS ?? "350"),
  },
  admin: {
    roleIds: (process.env.ADMIN_ROLE_IDS ?? "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean),
  },
};