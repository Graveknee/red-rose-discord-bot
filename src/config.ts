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
  },
  google: {
    sheetId: must("SHEET_ID"),
    sheetTab: process.env.SHEET_TAB ?? "registrations",
    serviceAccountJsonPath: must("GOOGLE_SERVICE_ACCOUNT_JSON"),
  },
  admin: {
    roleIds: (process.env.ADMIN_ROLE_IDS ?? "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean),
  },
};