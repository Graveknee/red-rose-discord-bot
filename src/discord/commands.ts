import { SlashCommandBuilder } from "discord.js";

export const commandData = [
  new SlashCommandBuilder()
    .setName("register")
    .setDescription("Register a main character + up to 3 alts.")
    .addStringOption(o =>
      o.setName("maincharacter").setDescription("Your main character").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("alt1").setDescription("Alt 1").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("alt2").setDescription("Alt 2").setRequired(false)
    )
    .addStringOption(o =>
      o.setName("alt3").setDescription("Alt 3").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("alts")
    .setDescription("Show registered mains and alts.")
    .addUserOption(o =>
      o.setName("user").setDescription("Show alts for a specific user").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("removealt")
    .setDescription("Remove an alt from your registration")
    .addStringOption(o =>
      o.setName("alt").setDescription("Alt character to remove").setRequired(true)
    )
    .addUserOption(o =>
      o.setName("user").setDescription("Remove alt for a specific user").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("whois")
    .setDescription("Find who a character belongs to (main or alt).")
    .addStringOption(o =>
      o.setName("character").setDescription("Character name (main or alt)").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search mains/alts by partial name.")
    .addStringOption(o =>
      o.setName("query").setDescription("Part of a character name").setRequired(true)
    ),

  new SlashCommandBuilder()
  .setName("fixalt")
  .setDescription("Rename one of your alts (typo fix).")
  .addStringOption(o => o.setName("old").setDescription("Old alt name").setRequired(true))
  .addStringOption(o => o.setName("new").setDescription("New alt name").setRequired(true)),

  new SlashCommandBuilder()
    .setName("fixmain")
    .setDescription("Rename one of your mains (typo fix).")
    .addStringOption(o => o.setName("old").setDescription("Old main name").setRequired(true))
    .addStringOption(o => o.setName("new").setDescription("New main name").setRequired(true)),
].map(c => c.toJSON());

