export type RegistryRow = {
  rowIndex: number;
  main: string;
  alt1: string;
  alt2: string;
  alt3: string;
  discordUser: string;
  discordUserId: string;
  registeredAt: string;
  comment: string;
  raw: string[];
};

// columns: A..H
export const COLS = {
  MAIN: "A",
  ALT1: "B",
  ALT2: "C",
  ALT3: "D",
  DISCORD_USER: "E",
  DISCORD_USER_ID: "F",
  REGISTERED_AT: "G",
  COMMENT: "H",
} as const;