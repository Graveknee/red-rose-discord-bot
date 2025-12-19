import type { sheets_v4 } from "googleapis";
import { normalize } from "../util/text.js";
import { COLS, type RegistryRow } from "./schema.js";

function tabRange(sheetTab: string, a1: string) {
  return `'${sheetTab}'!${a1}`;
}

async function readAllRows(params: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetTab: string;
}): Promise<RegistryRow[]> {
  const { sheets, spreadsheetId, sheetTab } = params;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: tabRange(sheetTab, "A:H"),
  });

  const values = (res.data.values ?? []) as string[][];
  if (values.length <= 1) return [];

  const rows = values.slice(1);
  return rows
    .map((r, i) => {
      const rowIndex = i + 2;
      const main = (r[0] ?? "").trim();
      const alt1 = (r[1] ?? "").trim();
      const alt2 = (r[2] ?? "").trim();
      const alt3 = (r[3] ?? "").trim();
      const discordUser = (r[4] ?? "").trim();
      const discordUserId = (r[5] ?? "").trim();
      const registeredAt = (r[6] ?? "").trim();
      const comment = (r[7] ?? "").trim();
      return { rowIndex, main, alt1, alt2, alt3, discordUser, discordUserId, registeredAt, comment, raw: r };
    })
    .filter(r => r.main.length > 0);
}

function altsOf(row: RegistryRow): string[] {
  return [row.alt1, row.alt2, row.alt3].filter(Boolean);
}

function allCharacterNames(row: RegistryRow): string[] {
  return [row.main, ...altsOf(row)].filter(Boolean);
}

function findCharacterOwner(all: RegistryRow[], name: string): { row: RegistryRow; kind: "main" | "alt" } | null {
  const n = normalize(name);

  for (const r of all) {
    if (normalize(r.main) === n) return { row: r, kind: "main" };
    if (altsOf(r).map(normalize).includes(n)) return { row: r, kind: "alt" };
  }
  return null;
}

function uniqueNonEmpty(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names.map(s => s.trim()).filter(Boolean)) {
    const key = normalize(n);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(n);
    }
  }
  return out;
}

export async function registerAltsBulk(params: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetTab: string;
  main: string;
  alts: string[];
  discordUser: string;
  discordUserId: string;
}): Promise<{ ok: boolean; message: string }> {
  const { sheets, spreadsheetId, sheetTab } = params;

  const main = params.main.trim();
  const altsInput = uniqueNonEmpty(params.alts);

  if (!main) return { ok: false, message: "Main must be provided." };
  if (altsInput.length === 0) return { ok: false, message: "Provide at least one alt." };

  const all = await readAllRows({ sheets, spreadsheetId, sheetTab });

  const row = all.find(r => r.discordUserId === params.discordUserId && normalize(r.main) === normalize(main));

  const existingMainOwner = findCharacterOwner(all, main);
  if (existingMainOwner && (!row || existingMainOwner.row.rowIndex !== row.rowIndex)) {
    return {
      ok: false,
      message: `**${main}** is already registered under **${existingMainOwner.row.main}** (owner <@${existingMainOwner.row.discordUserId}>).`,
    };
  }

  for (const a of altsInput) {
    const owner = findCharacterOwner(all, a);
    if (owner && (!row || owner.row.rowIndex !== row.rowIndex)) {
      return {
        ok: false,
        message: `**${a}** is already registered under **${owner.row.main}** (owner <@${owner.row.discordUserId}>).`,
      };
    }
  }

  const now = new Date().toISOString();

  if (!row) {
    const [a1 = "", a2 = "", a3 = ""] = altsInput.slice(0, 3);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: tabRange(sheetTab, "A:H"),
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[main, a1, a2, a3, params.discordUser, params.discordUserId, now, ""]],
      },
    });

    const used = [a1, a2, a3].filter(Boolean);
    const ignored = altsInput.length > 3 ? altsInput.slice(3) : [];
    return {
      ok: true,
      message:
        `✅ Registered under **${main}**: ${used.map(x => `**${x}**`).join(", ")}.` +
        (ignored.length ? `\nIgnored (max 3): ${ignored.map(x => `**${x}**`).join(", ")}` : ""),
    };
  }

  const existing = altsOf(row).map(normalize);
  const toAdd = altsInput.filter(a => !existing.includes(normalize(a)));

  if (toAdd.length === 0) {
    return { ok: true, message: `All provided alts are already registered under **${main}**.` };
  }

  const slots = [
    { col: COLS.ALT1, value: row.alt1 },
    { col: COLS.ALT2, value: row.alt2 },
    { col: COLS.ALT3, value: row.alt3 },
  ];

  const free = slots.filter(s => !s.value).map(s => s.col);
  if (free.length === 0) {
    return { ok: false, message: `**${main}** already has 3 alts registered. No more allowed.` };
  }

  const willWrite = toAdd.slice(0, free.length);
  const overflow = toAdd.slice(free.length);

  for (let i = 0; i < willWrite.length; i++) {
    const col = free[i];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: tabRange(sheetTab, `${col}${row.rowIndex}`),
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[willWrite[i]]] },
    });
  }

  return {
    ok: true,
    message:
      `Added under **${main}**: ${willWrite.map(x => `**${x}**`).join(", ")}.` +
      (overflow.length ? `\nNot added (no free slots): ${overflow.map(x => `**${x}**`).join(", ")}` : ""),
  };
}

export async function whoisCharacter(params: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetTab: string;
  character: string;
}): Promise<string> {
  const { sheets, spreadsheetId, sheetTab } = params;
  const needle = normalize(params.character);

  const all = await readAllRows({ sheets, spreadsheetId, sheetTab });

  const match = all.find(r => normalize(r.main) === needle || altsOf(r).map(normalize).includes(needle));
  if (!match) return `No match found for **${params.character}**.`;

  const alts = altsOf(match);
  const isMain = normalize(match.main) === needle;
  const role = isMain ? "Main" : "Alt";

  return [
    `**${params.character}** [${role}]`,
    `Main: **${match.main}**`,
    `Auxiliarius: ${alts.length ? alts.map(a => `**${a}**`).join(", ") : "(none)"}`,
    `Discord Name: **${match.discordUser || "Unknown"}** (<@${match.discordUserId}>)`,
  ].join("\n");
}

export async function searchCharacters(params: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetTab: string;
  query: string;
  limit?: number;
}): Promise<string> {
  const { sheets, spreadsheetId, sheetTab } = params;
  const q = normalize(params.query);
  const limit = params.limit ?? 10;

  if (!q) return "Provide a search query.";

  const all = await readAllRows({ sheets, spreadsheetId, sheetTab });

  // Build searchable entries
  const entries: Array<{ main: string; name: string; discordUserId: string; discordUser: string }> = [];
  for (const r of all) {
    entries.push({ main: r.main, name: r.main, discordUserId: r.discordUserId, discordUser: r.discordUser });
    for (const a of altsOf(r)) {
      entries.push({ main: r.main, name: a, discordUserId: r.discordUserId, discordUser: r.discordUser });
    }
  }

  const hits = entries
    .filter(e => normalize(e.name).includes(q) || normalize(e.main).includes(q))
    .slice(0, limit);

  if (hits.length === 0) return `No results for **${params.query}**.`;

  const byMain = new Map<string, typeof hits>();
  for (const h of hits) {
    const key = normalize(h.main);
    const arr = byMain.get(key) ?? [];
    arr.push(h);
    byMain.set(key, arr);
  }

  const lines: string[] = [];
  for (const [, group] of byMain) {
    const main = group[0]!.main;
    const owner = group[0]!;
    const names = group.map(g => g.name);
    lines.push(`• **${main}** (owner <@${owner.discordUserId}>): ${names.map(n => `**${n}**`).join(", ")}`);
  }

  return lines.join("\n");
}

export async function listAltsForUser(params: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetTab: string;
  discordUserId: string;
}): Promise<string> {
  const { sheets, spreadsheetId, sheetTab, discordUserId } = params;

  const all = await readAllRows({ sheets, spreadsheetId, sheetTab });
  const mine = all.filter(r => r.discordUserId === discordUserId);

  if (mine.length === 0) return "No mains/alts registered for that user.";

  const lines = mine.map(r => {
    const alts = altsOf(r);
    return `• **${r.main}**: ${alts.length ? alts.join(", ") : "(no alts yet)"}`;
  });

  return lines.join("\n");
}

export async function removeAltForUser(params: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetTab: string;
  discordUserId: string;
  alt: string;
}): Promise<{ ok: boolean; message: string }> {
  const { sheets, spreadsheetId, sheetTab, discordUserId } = params;
  const altN = normalize(params.alt);

  const all = await readAllRows({ sheets, spreadsheetId, sheetTab });
  const row = all.find(
    r => r.discordUserId === discordUserId && altsOf(r).map(normalize).includes(altN)
  );

  if (!row) return { ok: false, message: `Could not find alt **${params.alt}** for that user.` };

  const slots = [row.alt1, row.alt2, row.alt3].map(normalize);
  const idx = slots.findIndex(s => s === altN);

  const col = idx === 0 ? COLS.ALT1 : idx === 1 ? COLS.ALT2 : COLS.ALT3;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: tabRange(sheetTab, `${col}${row.rowIndex}`),
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[""]] },
  });

  return { ok: true, message: `Removed alt **${params.alt}** from **${row.main}**.` };
}

export async function fixAltName(params: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetTab: string;
  discordUserId: string;
  oldName: string;
  newName: string;
}): Promise<{ ok: boolean; message: string }> {
  const { sheets, spreadsheetId, sheetTab, discordUserId } = params;

  const oldN = normalize(params.oldName);
  const newTrim = params.newName.trim();
  const newN = normalize(newTrim);

  if (!newTrim) return { ok: false, message: "New name can't be empty." };

  const all = await readAllRows({ sheets, spreadsheetId, sheetTab });

  const existing = findCharacterOwner(all, newTrim);
  if (existing) {
    return {
      ok: false,
      message: `**${newTrim}** is already registered under **${existing.row.main}** (owner <@${existing.row.discordUserId}>).`,
    };
  }

  const row = all.find(r => r.discordUserId === discordUserId && altsOf(r).map(normalize).includes(oldN));
  if (!row) return { ok: false, message: `Could not find alt **${params.oldName}** for you.` };

  const idx = [row.alt1, row.alt2, row.alt3].map(normalize).findIndex(x => x === oldN);
  const col = idx === 0 ? COLS.ALT1 : idx === 1 ? COLS.ALT2 : COLS.ALT3;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: tabRange(sheetTab, `${col}${row.rowIndex}`),
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[newTrim]] },
  });

  return { ok: true, message: `Renamed alt **${params.oldName}** → **${newTrim}** (main: **${row.main}**).` };
}

export async function fixMainName(params: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetTab: string;
  discordUserId: string;
  oldName: string;
  newName: string;
}): Promise<{ ok: boolean; message: string }> {
  const { sheets, spreadsheetId, sheetTab, discordUserId } = params;

  const oldN = normalize(params.oldName);
  const newTrim = params.newName.trim();

  if (!newTrim) return { ok: false, message: "New name can't be empty." };

  const all = await readAllRows({ sheets, spreadsheetId, sheetTab });

  const existing = findCharacterOwner(all, newTrim);
  if (existing) {
    return {
      ok: false,
      message: `**${newTrim}** is already registered under **${existing.row.main}** (owner <@${existing.row.discordUserId}>).`,
    };
  }

  const row = all.find(r => r.discordUserId === discordUserId && normalize(r.main) === oldN);
  if (!row) return { ok: false, message: `Could not find main **${params.oldName}** for you.` };

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: tabRange(sheetTab, `${COLS.MAIN}${row.rowIndex}`),
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[newTrim]] },
  });

  return { ok: true, message: `Renamed main **${params.oldName}** → **${newTrim}**.` };
}