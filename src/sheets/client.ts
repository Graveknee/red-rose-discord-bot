import fs from "node:fs";
import { google } from "googleapis";

export function getSheetsClient(serviceAccountJsonPath: string) {
  const key = JSON.parse(fs.readFileSync(serviceAccountJsonPath, "utf8"));

  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}