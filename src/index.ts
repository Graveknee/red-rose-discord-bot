import { Client, GatewayIntentBits } from "discord.js";
import { config } from "./config.js";
import { registerSlashCommands } from "./discord/registerCommands.js";
import { handleInteraction } from "./discord/handlers.js";
import { handleButton } from "./discord/buttons.js";

async function main() {
  await registerSlashCommands();

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.on("interactionCreate", async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        await handleInteraction(interaction);
        return;
      }

      if (interaction.isButton()) {
        await handleButton(interaction);
        return;
      }
    } catch (err) {
      console.error("interactionCreate error:", err);

      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "❌ Something went wrong." }).catch(() => {});
      }
    }
  });

  await client.login(config.discord.token);
  console.log("Bot logged in.");
}

main().catch(console.error);