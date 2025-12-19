import type { ButtonInteraction } from "discord.js";
import { MessageFlags } from "discord.js";
import { config } from "../config.js";
import { getSheetsClient } from "../sheets/client.js";
import { createCellFormatter } from "../sheets/formatting.js";

function tabRange(sheetTab: string, a1: string) {
  return `'${sheetTab}'!${a1}`;
}

async function dmUser(client: any, userId: string, content: string) {
  try {
    const user = await client.users.fetch(userId);
    await user.send(content);
  } catch {
  }
}

export async function handleButton(interaction: ButtonInteraction) {
  if (!interaction.customId.startsWith("req|")) return;

  const parts = interaction.customId.split("|");
  const action = parts[1];
  const requesterId = parts[2];
  const rowIndex = Number(parts[3]);
  const col = parts[4] as "B" | "C" | "D";
  const alt = parts.slice(5).join("|");

  if ((action !== "accept" && action !== "deny") || !requesterId || !rowIndex || !col) {
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Invalid request button." });
    return;
  }

  await interaction.deferUpdate();

  const sheets = getSheetsClient(config.google.serviceAccountJsonPath);
  const formatter = await createCellFormatter({
    sheets,
    spreadsheetId: config.google.sheetId,
    sheetTab: config.google.sheetTab,
  });

  const a1 = `${col}${rowIndex}`;

  if (action === "accept") {
    await formatter.setCellBackground(a1, "green");
    await dmUser(
      interaction.client,
      requesterId,
      `**${interaction.user.username}** accepted your request to invite **${alt}** to the guild.`
    );
    await interaction.followUp({ flags: MessageFlags.Ephemeral, content: `Accepted. Marked ${a1} green.` });
    return;
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.google.sheetId,
    range: tabRange(config.google.sheetTab, a1),
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[""]] },
  });

  await formatter.setCellBackground(a1, "clear");

  await dmUser(
    interaction.client,
    requesterId,
    `**${interaction.user.username}** denied your request to invite **${alt}** to the guild.`
  );

  await interaction.followUp({ flags: MessageFlags.Ephemeral, content: `Denied. Removed ${alt} from ${a1}.` });
}