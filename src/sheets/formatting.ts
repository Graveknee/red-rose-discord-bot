import type { sheets_v4 } from "googleapis";

type RGB = { red: number; green: number; blue: number };

const LIGHT_GREEN: RGB = { red: 0.85, green: 0.95, blue: 0.85 };
const LIGHT_RED: RGB = { red: 0.98, green: 0.85, blue: 0.85 };
const LIGHT_GRAY: RGB = { red: 0.92, green: 0.92, blue: 0.92 };
const WHITE: RGB = { red: 1, green: 1, blue: 1 };

async function getSheetIdByTitle(params: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetTab: string;
}): Promise<number> {
  const meta = await params.sheets.spreadsheets.get({ spreadsheetId: params.spreadsheetId });
  const sheet = meta.data.sheets?.find(s => s.properties?.title === params.sheetTab);
  const id = sheet?.properties?.sheetId;
  if (typeof id !== "number") throw new Error(`Could not find sheet tab "${params.sheetTab}"`);
  return id;
}

export type CellColor = "green" | "red" | "gray" | "clear";

function a1ToGrid(a1: string): { col: number; row: number } {
  const match = /^([A-Z]+)(\d+)$/i.exec(a1.trim());
  if (!match) throw new Error(`Invalid A1: ${a1}`);

  const letters = match[1]!.toUpperCase();
  const rowNum = parseInt(match[2]!, 10);

  let colNum = 0;
  for (let i = 0; i < letters.length; i++) colNum = colNum * 26 + (letters.charCodeAt(i) - 64);

  return { col: colNum - 1, row: rowNum - 1 };
}

export async function createCellFormatter(params: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetTab: string;
}) {
  const sheetId = await getSheetIdByTitle(params);

  async function setCellBackground(a1: string, color: CellColor) {
    const { row, col } = a1ToGrid(a1);
    const rgb = 
      color === "green" ? LIGHT_GREEN : 
      color === "red" ? LIGHT_RED : 
      color === "gray" ? LIGHT_GRAY : 
      color === "clear" ? WHITE : 
      WHITE ;

    await params.sheets.spreadsheets.batchUpdate({
      spreadsheetId: params.spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: row,
                  endRowIndex: row + 1,
                  startColumnIndex: col,
                  endColumnIndex: col + 1,
                },
                cell: { userEnteredFormat: { backgroundColor: rgb } },
                fields: "userEnteredFormat.backgroundColor",
              },
            },
          ],
        },
      });
    }

  return { setCellBackground };
}

export async function setCellBackground(params: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetTab: string;
  a1: string;
  color: "green" | "red" | "gray" | "clear";
}) {
  const formatter = await createCellFormatter({
    sheets: params.sheets,
    spreadsheetId: params.spreadsheetId,
    sheetTab: params.sheetTab,
  });

  await formatter.setCellBackground(params.a1, params.color);
}
