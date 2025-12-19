import type { Client } from "discord.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { config } from "../config.js";

function safeShort(s: string) {
  return s.replaceAll("|", " ").trim().slice(0, 29);
}

export async function postRequestToAdmins(params: {
  client: Client;
  requesterId: string;
  main: string;
  alt: string;
  rowIndex: number;
  col: "B" | "C" | "D";
}) {
  if (!config.discord.adminChannelId) throw new Error("ADMIN_CHANNEL_ID not set.");

  const ch = await params.client.channels.fetch(config.discord.adminChannelId);
  if (!ch || !("isTextBased" in ch) || !ch.isTextBased() || !("send" in ch)) {
    throw new Error("Admin channel not sendable / not accessible.");
  }
  const sendable = ch as unknown as { send: (msg: any) => Promise<any> };

  const main = safeShort(params.main);
  const alt = safeShort(params.alt);

  const acceptId = `req|accept|${params.requesterId}|${params.rowIndex}|${params.col}|${alt}`;
  const denyId   = `req|deny|${params.requesterId}|${params.rowIndex}|${params.col}|${alt}`;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(acceptId).setLabel("Accept").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(denyId).setLabel("Deny").setStyle(ButtonStyle.Danger),
  );

  await sendable.send({
    content:
      `**Alt invite request**\n` +
      `Main: **${main}**\n` +
      `Alt: **${alt}**\n` +
      `Requested by: <@${params.requesterId}>`,
    components: [row],
  });
}