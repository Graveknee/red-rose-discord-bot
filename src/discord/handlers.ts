import type { ChatInputCommandInteraction } from "discord.js";
import { MessageFlags } from "discord.js";
import { config } from "../config.js";
import { getSheetsClient } from "../sheets/client.js";
import { listAltsForUser, fixAltName, fixMainName, removeAltForUser, registerAltsBulk, whoisCharacter, searchCharacters } from "../sheets/registry.js";
import { auditGuildAndColor } from "../sheets/audit.js";
import { sendAltInviteRequest } from "./request.js";

async function deferEphemeral(interaction: ChatInputCommandInteraction) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }
}

async function finish(interaction: ChatInputCommandInteraction, content: string) {
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content });
  } else {
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
  }
}

export async function handleInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
  await deferEphemeral(interaction);

  const sheets = getSheetsClient(config.google.serviceAccountJsonPath);

  if (interaction.commandName === "auditguild") {
    const stats = await auditGuildAndColor({
      sheets,
      spreadsheetId: config.google.sheetId,
      sheetTab: config.google.sheetTab,
      guildName: config.tibia.guildName,
      throttleMs: config.tibia.auditThrottleMs,
    });

    await finish(
      interaction,
      `✅ Audit complete.\nChecked: **${stats.total}** cells\n` +
        `🟩 In guild: **${stats.green}**\n🟥 Not in guild / missing: **${stats.red}**\n⬜ Unknown/error: **${stats.gray}**`
    );
    return;
  }

  if (interaction.commandName === "request") {
    const main = interaction.options.getString("maincharacter", true).trim();
    const alt = interaction.options.getString("alt", true).trim();

    await sendAltInviteRequest({
      client: interaction.client,
      adminChannelId: config.discord.adminChannelId,
      main,
      alt,
      requesterId: interaction.user.id,
    });

    await finish(interaction, `✅ Request sent to admins: **${main}** wants **${alt}** invited as an alt.`);
    return;
  }

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

    await finish(interaction, result.message);
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
    await finish(interaction, text);
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
    await finish(interaction, text);
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

    await finish(interaction, result.message);
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

    await finish(interaction, result.message);
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

    await finish(interaction, text);
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

    await finish(interaction, result.message);
    return;
  }

  await finish(interaction, "Unknown command.");
}