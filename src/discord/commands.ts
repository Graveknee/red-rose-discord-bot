import { SlashCommandBuilder } from "discord.js";

export const commandData = [
  new SlashCommandBuilder()
    .setName("register")
    .setDescription("Register a main character + an alt (up to 3 alts).")
    .addStringOption(o =>
      o.setName("maincharacter").setDescription("Your main character").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("alt").setDescription("Your alt character").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("alts")
    .setDescription("Show registered main and alts.")
    .addUserOption(o =>
      o.setName("user").setDescription("Admin: show alts for a specific user").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("removealt")
    .setDescription("Remove an alt from your registration (or admin remove for another user).")
    .addStringOption(o =>
      o.setName("alt").setDescription("Alt character to remove").setRequired(true)
    )
    .addUserOption(o =>
      o.setName("user").setDescription("Admin: remove alt for a specific user").setRequired(false)
    ),
].map(c => c.toJSON());