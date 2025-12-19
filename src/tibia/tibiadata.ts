export type GuildCheckResult =
  | { ok: true; exists: true; guildName: string | null }
  | { ok: true; exists: false; guildName: null }
  | { ok: false; exists: false; guildName: null; error: string };

function extractGuildName(json: any): string | null {
  const candidates = [
    json?.character?.character?.guild?.name,
    json?.characters?.data?.guild?.name,
    json?.characters?.character?.guild?.name,
    json?.character?.data?.guild?.name,
    json?.data?.character?.guild?.name,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

function characterExists(json: any): boolean {
  const hasSomeCharacterData =
    !!json?.character?.character ||
    !!json?.characters?.data ||
    !!json?.character?.data ||
    !!json?.characters?.character;

  return hasSomeCharacterData;
}

export async function checkCharacterGuild(name: string): Promise<GuildCheckResult> {
  const encoded = encodeURIComponent(name.trim());
  const url = `https://api.tibiadata.com/v4/character/${encoded}`; 
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });

    if (!res.ok) {
      return { ok: true, exists: false, guildName: null };
    }

    const json = await res.json();

    if (!characterExists(json)) {
      return { ok: true, exists: false, guildName: null };
    }

    const guildName = extractGuildName(json);
    return { ok: true, exists: true, guildName };
  } catch (e: any) {
    return { ok: false, exists: false, guildName: null, error: e?.message ?? "Unknown error" };
  }
}