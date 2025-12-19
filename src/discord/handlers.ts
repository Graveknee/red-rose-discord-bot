import type { ChatInputCommandInteraction } from "discord.js";
import { MessageFlags } from "discord.js";
import { config } from "../config.js";
import { getSheetsClient } from "../sheets/client.js";
import { registerAlt, listAltsForUser, removeAltForUser } from "../sheets/registry.js";
import { isAdmin } from "./admin.js";

function replyEphemeral(interaction: ChatInputCommandInteraction, content: string) {
  return interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

export async function handleInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
  const sheets = getSheetsClient(config.google.serviceAccountJsonPath);

  if (interaction.commandName === "register") {
    const main = interaction.options.getString("maincharacter", true);
    const alt = interaction.options.getString("alt", true);

    const discordUserId = interaction.user.id;
    const discordUser = interaction.user.tag ?? interaction.user.username;

    const result = await registerAlt({
      sheets,
      spreadsheetId: config.google.sheetId,
      sheetTab: config.google.sheetTab,
      main,
      alt,
      discordUser,
      discordUserId,
    });

    await replyEphemeral(interaction, result.message);
    return;
  }

  if (interaction.commandName === "alts") {
    const target = interaction.options.getUser("user", false);

    const userId = (target ?? interaction.user).id;
    const text = await listAltsForUser({
      sheets,
      spreadsheetId: config.google.sheetId,
      sheetTab: config.google.sheetTab,
      discordUserId: userId,
    });

    await replyEphemeral(interaction, text);
    return;
  }

  if (interaction.commandName === "removealt") {
    const alt = interaction.options.getString("alt", true);
    const target = interaction.options.getUser("user", false);

    // If removing for someone else, require admin
    if (target && !isAdmin(interaction)) {
      await replyEphemeral(interaction, "Admin only: you can't remove alts for other users.");
      return;
    }

    const userId = (target ?? interaction.user).id;

    const result = await removeAltForUser({
      sheets,
      spreadsheetId: config.google.sheetId,
      sheetTab: config.google.sheetTab,
      discordUserId: userId,
      alt,
    });

    await replyEphemeral(interaction, result.message);
    return;
  }

  await replyEphemeral(interaction, "Unknown command.");
}