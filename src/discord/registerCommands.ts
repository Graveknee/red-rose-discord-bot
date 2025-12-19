import { REST, Routes } from "discord.js";
import { commandData } from "./commands.js";
import { config } from "../config.js";

export async function registerSlashCommands(): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(config.discord.token);

  if (config.discord.guildId) {
    await rest.put(
      Routes.applicationGuildCommands(config.discord.appId, config.discord.guildId),
      { body: commandData }
    );
    console.log("Registered guild slash commands.");
  } else {
    await rest.put(Routes.applicationCommands(config.discord.appId), { body: commandData });
    console.log("Registered global slash commands (can take time to appear).");
  }
}