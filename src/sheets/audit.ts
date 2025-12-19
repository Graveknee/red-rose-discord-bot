import type { sheets_v4 } from "googleapis";
import { createCellFormatter } from "./formatting.js";
import { checkCharacterGuild } from "../tibia/tibiadata.js";

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function tabRange(sheetTab: string, a1: string) {
  return `'${sheetTab}'!${a1}`;
}

type Row = {
  rowIndex: number;
  main: string;
  alt1: string;
  alt2: string;
  alt3: string;
};

async function readCharacterRows(params: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetTab: string;
}): Promise<Row[]> {
  const res = await params.sheets.spreadsheets.values.get({
    spreadsheetId: params.spreadsheetId,
    range: tabRange(params.sheetTab, "A:D"),
  });

  const values = (res.data.values ?? []) as string[][];
  if (values.length <= 1) return [];

  return values.slice(1).map((r, i) => ({
    rowIndex: i + 2,
    main: (r[0] ?? "").trim(),
    alt1: (r[1] ?? "").trim(),
    alt2: (r[2] ?? "").trim(),
    alt3: (r[3] ?? "").trim(),
  })).filter(r => r.main.length > 0);
}

export async function auditGuildAndColor(params: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetTab: string;
  guildName: string;
  throttleMs: number;
}): Promise<{ total: number; green: number; red: number; gray: number }> {
  const formatter = await createCellFormatter(params);
  const rows = await readCharacterRows(params);

  const cache = new Map<string, "green" | "red" | "gray">();

  let total = 0, green = 0, red = 0, gray = 0;

  async function colorForName(name: string): Promise<"green" | "red" | "gray"> {
    const key = normalize(name);
    if (cache.has(key)) return cache.get(key)!;

    const result = await checkCharacterGuild(name);
    let color: "green" | "red" | "gray" = "gray";

    if (result.ok && result.exists) {
      const inGuild = normalize(result.guildName ?? "") === normalize(params.guildName);
      color = inGuild ? "green" : "red";
    } else if (result.ok && !result.exists) {
      color = "red";
    } else {
      color = "gray";
    }

    cache.set(key, color);
    return color;
  }

  async function processCell(a1: string, name: string) {
    if (!name) return;
    total++;

    const color = await colorForName(name);
    await formatter.setCellBackground(a1, color);

    if (color === "green") green++;
    else if (color === "red") red++;
    else gray++;

    await sleep(params.throttleMs);
  }

  for (const r of rows) {
    await processCell(`A${r.rowIndex}`, r.main);
    await processCell(`B${r.rowIndex}`, r.alt1);
    await processCell(`C${r.rowIndex}`, r.alt2);
    await processCell(`D${r.rowIndex}`, r.alt3);
  }

  return { total, green, red, gray };
}