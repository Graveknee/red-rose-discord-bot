import type { sheets_v4 } from "googleapis";
import { normalize } from "../util/text.js";
import { COLS, type RegistryRow } from "./schema.js";

function tabRange(sheetTab: string, a1: string) {
  // always quote tab name to survive spaces/special chars
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

  const rows = values.slice(1); // skip header row
  return rows
    .map((r, i) => {
      const rowIndex = i + 2;
      const raw = r;

      const main = (r[0] ?? "").trim();
      const alt1 = (r[1] ?? "").trim();
      const alt2 = (r[2] ?? "").trim();
      const alt3 = (r[3] ?? "").trim();
      const discordUser = (r[4] ?? "").trim();
      const discordUserId = (r[5] ?? "").trim();
      const registeredAt = (r[6] ?? "").trim();
      const comment = (r[7] ?? "").trim();

      return { rowIndex, main, alt1, alt2, alt3, discordUser, discordUserId, registeredAt, comment, raw };
    })
    .filter(r => r.main.length > 0);
}

function altsOf(row: RegistryRow): string[] {
  return [row.alt1, row.alt2, row.alt3].filter(Boolean);
}

export async function registerAlt(params: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetTab: string;
  main: string;
  alt: string;
  discordUser: string;
  discordUserId: string;
}): Promise<{ ok: boolean; message: string }> {
  const { sheets, spreadsheetId, sheetTab } = params;
  const main = params.main.trim();
  const alt = params.alt.trim();

  if (!main || !alt) return { ok: false, message: "❌ Main and alt must be provided." };

  const all = await readAllRows({ sheets, spreadsheetId, sheetTab });

  // We treat "same discord user + same main name" as the same record.
  const existingRow = all.find(
    r => r.discordUserId === params.discordUserId && normalize(r.main) === normalize(main)
  );

  const now = new Date().toISOString();

  if (!existingRow) {
    // Create a new row: main + alt in ALT1
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: tabRange(sheetTab, "A:H"),
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[main, alt, "", "", params.discordUser, params.discordUserId, now, ""]],
      },
    });

    return { ok: true, message: `✅ Registered **${alt}** under **${main}** (Alt1).` };
  }

  const existingAlts = altsOf(existingRow).map(normalize);
  if (existingAlts.includes(normalize(alt))) {
    return { ok: true, message: `ℹ️ **${alt}** is already registered under **${main}**.` };
  }

  const currentAlts = altsOf(existingRow);
  if (currentAlts.length >= 3) {
    return { ok: false, message: `❌ **${main}** already has 3 alts registered. No more allowed.` };
  }

  // Find first empty slot among B/C/D
  const slot = !existingRow.alt1 ? 1 : !existingRow.alt2 ? 2 : 3;
  const col = slot === 1 ? COLS.ALT1 : slot === 2 ? COLS.ALT2 : COLS.ALT3;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: tabRange(sheetTab, `${col}${existingRow.rowIndex}`),
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[alt]] },
  });

  return { ok: true, message: `✅ Added **${alt}** under **${main}** (Alt${slot}).` };
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
    return `• **${r.main}** → ${alts.length ? alts.join(", ") : "(no alts yet)"}`;
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
  const row = all.find(r => r.discordUserId === discordUserId && altsOf(r).map(normalize).includes(altN));

  if (!row) return { ok: false, message: `❌ Could not find alt **${params.alt}** for that user.` };

  const slots = [row.alt1, row.alt2, row.alt3].map(normalize);
  const idx = slots.findIndex(s => s === altN);

  const col = idx === 0 ? COLS.ALT1 : idx === 1 ? COLS.ALT2 : COLS.ALT3;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: tabRange(sheetTab, `${col}${row.rowIndex}`),
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[""]] },
  });

  return { ok: true, message: `✅ Removed alt **${params.alt}** from **${row.main}**.` };
}