import { Client, GatewayIntentBits } from "discord.js";
import { config } from "./config.js";
import { registerSlashCommands } from "./discord/registerCommands.js";
import { handleInteraction } from "./discord/handlers.js";

async function main() {
  await registerSlashCommands();

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.on("interactionCreate", async (interaction) => {
    try {
      if (!interaction.isChatInputCommand()) return;
      await handleInteraction(interaction);
    } catch (err) {
      console.error(err);
      if (interaction.isRepliable()) {
        await interaction.reply({
          content: "❌ Something went wrong.",
        }).catch(() => {});
      }
    }
  });

  await client.login(config.discord.token);
  console.log("Bot logged in.");
}

main().catch(console.error);