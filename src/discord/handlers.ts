import type { ChatInputCommandInteraction } from "discord.js";
import { MessageFlags } from "discord.js";
import { config } from "../config.js";
import { getSheetsClient } from "../sheets/client.js";
import { listAltsForUser, fixAltName, fixMainName, removeAltForUser, registerAltsBulk, whoisCharacter, searchCharacters } from "../sheets/registry.js";

function replyEphemeral(interaction: ChatInputCommandInteraction, content: string) {
  return interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

export async function handleInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
  const sheets = getSheetsClient(config.google.serviceAccountJsonPath);

  if (interaction.commandName === "register") {
    const main = interaction.options.getString("maincharacter", true);
    const alt1 = interaction.options.getString("alt1", true);
    const alt2 = interaction.options.getString("alt2", false) ?? "";
    const alt3 = interaction.options.getString("alt3", false) ?? "";

    const discordUserId = interaction.user.id;
    const discordUser = interaction.user.tag ?? interaction.user.username;

    const result = await registerAltsBulk({
      sheets,
      spreadsheetId: config.google.sheetId,
      sheetTab: config.google.sheetTab,
      main,
      alts: [alt1, alt2, alt3],
      discordUser,
      discordUserId,
    });

    await replyEphemeral(interaction, result.message);
    return;
  }

  if (interaction.commandName === "whois") {
    const character = interaction.options.getString("character", true);
    const text = await whoisCharacter({
      sheets,
      spreadsheetId: config.google.sheetId,
      sheetTab: config.google.sheetTab,
      character,
    });
    await replyEphemeral(interaction, text);
    return;
  }

  if (interaction.commandName === "search") {
    const query = interaction.options.getString("query", true);
    const text = await searchCharacters({
      sheets,
      spreadsheetId: config.google.sheetId,
      sheetTab: config.google.sheetTab,
      query,
      limit: 10,
    });
    await replyEphemeral(interaction, text);
    return;
  }

  if (interaction.commandName === "fixalt") {
    const oldName = interaction.options.getString("old", true);
    const newName = interaction.options.getString("new", true);

    const result = await fixAltName({
      sheets,
      spreadsheetId: config.google.sheetId,
      sheetTab: config.google.sheetTab,
      discordUserId: interaction.user.id,
      oldName,
      newName,
    });

    await replyEphemeral(interaction, result.message);
    return;
  }

  if (interaction.commandName === "fixmain") {
    const oldName = interaction.options.getString("old", true);
    const newName = interaction.options.getString("new", true);

    const result = await fixMainName({
      sheets,
      spreadsheetId: config.google.sheetId,
      sheetTab: config.google.sheetTab,
      discordUserId: interaction.user.id,
      oldName,
      newName,
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