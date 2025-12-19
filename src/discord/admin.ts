import type { ChatInputCommandInteraction } from "discord.js";
import { config } from "../config.js";

export function isAdmin(interaction: ChatInputCommandInteraction): boolean {
  if (!interaction.inGuild()) return false;
  if (config.admin.roleIds.length === 0) return false;

  const member: any = interaction.member;
  const roles = member?.roles?.cache;
  if (!roles) return false;

  return roles.some((r: any) => config.admin.roleIds.includes(r.id));
}