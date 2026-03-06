export type RaidActivityType = "raid" | "dungeon";

export interface RaidCatalogEntry {
    id: string;
    name: string;
    activityType: RaidActivityType;
    maxPlayers: string;
    levelBand: string;
    tierHint?: string;
    source: "warcrafttavern" | "turtlecraft";
    sourceUrl: string;
}

const LEGACY_WORLD_BOSS_TITLES = [
    "Concavius",
    "Ostarius Of Uldum",
    "Nerubian Overseer",
    "Dark Reaver Of Karazhan",
] as const;

const normalizedWorldBossTitleSet = new Set(
    LEGACY_WORLD_BOSS_TITLES.map((title) => title.trim().toLowerCase()),
);

export function isWorldBossTitle(title: string) {
    return normalizedWorldBossTitleSet.has(title.trim().toLowerCase());
}

export const combinedRaidCatalog: RaidCatalogEntry[] = [
    {
        id: "classic-onyxia",
        name: "Onyxia's Lair",
        activityType: "raid",
        maxPlayers: "40",
        levelBand: "60",
        tierHint: "Tier 1-2",
        source: "warcrafttavern",
        sourceUrl: "https://www.warcrafttavern.com/wow-classic/guides/raids/",
    },
    {
        id: "classic-molten-core",
        name: "Molten Core",
        activityType: "raid",
        maxPlayers: "40",
        levelBand: "60",
        tierHint: "Tier 1",
        source: "warcrafttavern",
        sourceUrl: "https://www.warcrafttavern.com/wow-classic/guides/raids/",
    },
    {
        id: "classic-blackwing-lair",
        name: "Blackwing Lair",
        activityType: "raid",
        maxPlayers: "40",
        levelBand: "60",
        tierHint: "Tier 2",
        source: "warcrafttavern",
        sourceUrl: "https://www.warcrafttavern.com/wow-classic/guides/raids/",
    },
    {
        id: "classic-zulgurub",
        name: "Zul'Gurub",
        activityType: "raid",
        maxPlayers: "20",
        levelBand: "60",
        source: "warcrafttavern",
        sourceUrl: "https://www.warcrafttavern.com/wow-classic/guides/raids/",
    },
    {
        id: "classic-aq20",
        name: "Ruins of Ahn'Qiraj",
        activityType: "raid",
        maxPlayers: "20",
        levelBand: "60",
        source: "warcrafttavern",
        sourceUrl: "https://www.warcrafttavern.com/wow-classic/guides/raids/",
    },
    {
        id: "classic-aq40",
        name: "Temple of Ahn'Qiraj",
        activityType: "raid",
        maxPlayers: "40",
        levelBand: "60",
        tierHint: "Tier 2.5",
        source: "warcrafttavern",
        sourceUrl: "https://www.warcrafttavern.com/wow-classic/guides/raids/",
    },
    {
        id: "classic-naxxramas",
        name: "Naxxramas",
        activityType: "raid",
        maxPlayers: "40",
        levelBand: "60",
        tierHint: "Tier 3",
        source: "warcrafttavern",
        sourceUrl: "https://www.warcrafttavern.com/wow-classic/guides/raids/",
    },
    {
        id: "twow-lower-karazhan-halls",
        name: "Lower Karazhan Halls",
        activityType: "raid",
        maxPlayers: "10",
        levelBand: "60",
        tierHint: "T1",
        source: "turtlecraft",
        sourceUrl: "https://turtlecraft.gg/raids-and-dungeons",
    },
    {
        id: "twow-emerald-sanctum",
        name: "Emerald Sanctum",
        activityType: "raid",
        maxPlayers: "40",
        levelBand: "60",
        tierHint: "T2",
        source: "turtlecraft",
        sourceUrl: "https://turtlecraft.gg/raids-and-dungeons",
    },
    {
        id: "twow-tower-of-karazhan",
        name: "Tower Of Karazhan",
        activityType: "raid",
        maxPlayers: "40",
        levelBand: "60",
        tierHint: "T3.5",
        source: "turtlecraft",
        sourceUrl: "https://turtlecraft.gg/raids-and-dungeons",
    },
    {
        id: "twow-black-morass",
        name: "Black Morass",
        activityType: "dungeon",
        maxPlayers: "5",
        levelBand: "60",
        tierHint: "Dire Maul+",
        source: "turtlecraft",
        sourceUrl: "https://turtlecraft.gg/raids-and-dungeons",
    },
    {
        id: "twow-karazhan-crypt",
        name: "Karazhan Crypt",
        activityType: "dungeon",
        maxPlayers: "5",
        levelBand: "60",
        tierHint: "Dire Maul+",
        source: "turtlecraft",
        sourceUrl: "https://turtlecraft.gg/raids-and-dungeons",
    },
    {
        id: "twow-stormwind-vault",
        name: "Stormwind Vault",
        activityType: "dungeon",
        maxPlayers: "5",
        levelBand: "60",
        tierHint: "Dire Maul+",
        source: "turtlecraft",
        sourceUrl: "https://turtlecraft.gg/raids-and-dungeons",
    },
    {
        id: "twow-hateforge-quarry",
        name: "Hateforge Quarry",
        activityType: "dungeon",
        maxPlayers: "5",
        levelBand: "52-60",
        tierHint: "Early Blackrock Depths",
        source: "turtlecraft",
        sourceUrl: "https://turtlecraft.gg/raids-and-dungeons",
    },
    {
        id: "twow-gilneas-city",
        name: "Gilneas City",
        activityType: "dungeon",
        maxPlayers: "5",
        levelBand: "43-49",
        tierHint: "Zul'Farrak",
        source: "turtlecraft",
        sourceUrl: "https://turtlecraft.gg/raids-and-dungeons",
    },
    {
        id: "twow-stormwrought-ruins",
        name: "Stormwrought Ruins",
        activityType: "dungeon",
        maxPlayers: "5",
        levelBand: "35-42",
        tierHint: "Uldaman",
        source: "turtlecraft",
        sourceUrl: "https://turtlecraft.gg/raids-and-dungeons",
    },
    {
        id: "twow-crescent-grove",
        name: "The Crescent Grove",
        activityType: "dungeon",
        maxPlayers: "5",
        levelBand: "32-38",
        tierHint: "SM: Library",
        source: "turtlecraft",
        sourceUrl: "https://turtlecraft.gg/raids-and-dungeons",
    },
];

export const combinedRaidTitleSuggestions = combinedRaidCatalog
    .filter((entry) => entry.activityType === "raid")
    .map((entry) => entry.name);
