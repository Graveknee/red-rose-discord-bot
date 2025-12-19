# Guild Registry Discord Bot

A Discord bot for guild management.

---

## Project Structure

src

- index.ts — Bot entry point
- config.ts — Environment configuration

src/discord

- commands.ts — Slash command definitions
- registerCommands.ts — Registers slash commands with Discord
- handlers.ts — Slash command handlers
- buttons.ts — Button interactions (Accept / Deny)
- request_simple.ts — Admin request message and buttons

src/sheets

- client.ts — Google Sheets client setup
- registry.ts — Core registry logic (read, write, validate)
- formatting.ts — Cell coloring utilities
- schema.ts — Column mapping and row types
- audit.ts — Guild audit logic (optional)

src/tibia

- tibiadata.ts — Tibia Data API wrapper

src/util

- text.ts — String normalization helpers

---

## Discord Commands

/register  
Registers a main character with up to three alts.

/request  
Requests an alt to be invited to the guild.  
Admins can accept or deny using buttons.

/whois  
Finds who owns a character.

/list  
Lists all characters registered by you.

/removealt  
Removes one of your alts.

/fixalt  
Renames one of your alts.

/fixmain  
Renames your main character.

/auditguild  
Re-checks all characters against the guild and recolors cells.

---
