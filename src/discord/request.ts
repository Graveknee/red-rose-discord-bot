import type { Client } from "discord.js";

export async function sendAltInviteRequest(params: {
  client: Client;
  adminChannelId: string;
  main: string;
  alt: string;
  requesterId: string;
}) {
  if (!params.adminChannelId) throw new Error("ADMIN_CHANNEL_ID is not set.");

  const ch = await params.client.channels.fetch(params.adminChannelId);
  if (!ch) throw new Error("Admin channel not found.");

  if (!("isTextBased" in ch) || !ch.isTextBased() || !("send" in ch)) {
    throw new Error("Admin channel is not a sendable text channel or not accessible.");
  }

  const sendable = ch as unknown as { send: (content: string) => Promise<unknown> };

  await sendable.send(
    `**Alt invite request**\n` +
      `Main: **${params.main}**\n` +
      `Alt: **${params.alt}**\n` +
      `Requested by: <@${params.requesterId}>`
  );
}
