export const MODULE = "furu-sc"; //module name
export const MODULE_NAME = 'Furukai\'s simple crafting'; //module full name
export const MODULE_DIR = `modules/${MODULE}`; //module folder
export const RECIPES = "recipes";
export const DATA_DEFAULT_FOLDER = `/Crafting_Data`;
export const DEFAULT_RECIPES_DATA = `${DATA_DEFAULT_FOLDER}/${RECIPES}.json`; //recipes json file
export const CRAFT_MENU_TEMPLATE = `${MODULE_DIR}/templates/craft-menu.hbs`;
export const CRAFT_TABLE_TEMPLATE = `${MODULE_DIR}/templates/craft-table.hbs`;
export const QUANTITY_CONFIG_TEMPLATE = `${MODULE_DIR}/templates/quantity-config.hbs`;
export const CRAFT_TAGS_EDITOR_TEMPLATE = `${MODULE_DIR}/templates/tags-editor.hbs`;
export const CRAFT_MENU_ID = `${MODULE}-craft-menu`;
export const CRAFT_TABLE_ID = `${MODULE}-craft-table`;
export const QUANTITY_CONFIG_ID = `${MODULE}-quantity-config`;
export const CRAFT_TAGS_EDITOR_ID = `${MODULE}-craft-tags-editor`;
export const SPECIAL_SYMBOLS_REGEX = /[\\\/ .,:*?"<>|+\-\%!@]/gi;
export const DEFAULT_RECIPE_SETTINGS = {
    opened: false,
    isTargetList: false,
    allowDismantling: false,
    isSecret: false,
    allowForceCraft: false,
    isOneTime: false,
    isHidden: false,
    sendCraftRequest: false,
    macros: {
        openMacros: undefined,
        craftMacros: undefined,
        activateAsGM: false
    }
};
// this constant is an object that contains
// the default value for the quantity path setting of different game systems
export const QUANTITY_PATH_DEFAULTS = {
    dnd5e: [
        {
            "type": "weapon",
            "path": "system.quantity"
        },
        {
            "type": "equipment",
            "path": "system.quantity"
        },
        {
            "type": "consumable",
            "path": "system.quantity"
        },
        {
            "type": "tool",
            "path": "system.quantity"
        },
        {
            "type": "loot",
            "path": "system.quantity"
        },
        {
            "type": "race",
            "path": null
        },
        {
            "type": "background",
            "path": null
        },
        {
            "type": "class",
            "path": null
        },
        {
            "type": "subclass",
            "path": null
        },
        {
            "type": "spell",
            "path": null
        },
        {
            "type": "feat",
            "path": null
        },
        {
            "type": "container",
            "path": "system.quantity"
        },
        {
            "type": "backpack",
            "path": null
        }
    ],
    pf2e: [
        {
            "type": "action",
            "path": null
        },
        {
            "type": "ancestry",
            "path": null
        },
        {
            "type": "armor",
            "path": "system.quantity"
        },
        {
            "type": "background",
            "path": null
        },
        {
            "type": "backpack",
            "path": "system.quantity"
        },
        {
            "type": "book",
            "path": "system.quantity"
        },
        {
            "type": "campaignFeature",
            "path": null
        },
        {
            "type": "class",
            "path": null
        },
        {
            "type": "condition",
            "path": null
        },
        {
            "type": "consumable",
            "path": "system.quantity"
        },
        {
            "type": "deity",
            "path": null
        },
        {
            "type": "effect",
            "path": null
        },
        {
            "type": "equipment",
            "path": "system.quantity"
        },
        {
            "type": "feat",
            "path": null
        },
        {
            "type": "heritage",
            "path": null
        },
        {
            "type": "kit",
            "path": null
        },
        {
            "type": "lore",
            "path": null
        },
        {
            "type": "melee",
            "path": null
        },
        {
            "type": "shield",
            "path": "system.quantity"
        },
        {
            "type": "spell",
            "path": null
        },
        {
            "type": "spellcastingEntry",
            "path": null
        },
        {
            "type": "treasure",
            "path": "system.quantity"
        },
        {
            "type": "weapon",
            "path": "system.quantity"
        }
    ],
    worldbuilding: [
        {
            "type": "item",
            "path": "system.quantity"
        }
    ],
    D35E: [
        {
            "type": "weapon",
            "path": "system.quantity"
        },
        {
            "type": "equipment",
            "path": "system.quantity"
        },
        {
            "type": "consumable",
            "path": "system.quantity"
        },
        {
            "type": "loot",
            "path": "system.quantity"
        },
        {
            "type": "class",
            "path": null
        },
        {
            "type": "alignment",
            "path": null
        },
        {
            "type": "spell",
            "path": null
        },
        {
            "type": "feat",
            "path": null
        },
        {
            "type": "buff",
            "path": null
        },
        {
            "type": "aura",
            "path": null
        },
        {
            "type": "attack",
            "path": null
        },
        {
            "type": "race",
            "path": null
        },
        {
            "type": "enhancement",
            "path": null
        },
        {
            "type": "damage-type",
            "path": null
        },
        {
            "type": "material",
            "path": null
        },
        {
            "type": "full-attack",
            "path": null
        },
        {
            "type": "card",
            "path": null
        },
        {
            "type": "valuable",
            "path": "system.quantity"
        }
    ],
    TheWitcherTRPG: [
        {
            "type": "weapon",
            "path": "system.quantity"
        },
        {
            "type": "armor",
            "path": "system.quantity"
        },
        {
            "type": "enhancement",
            "path": "system.quantity"
        },
        {
            "type": "mount",
            "path": "system.quantity"
        },
        {
            "type": "valuable",
            "path": "system.quantity"
        },
        {
            "type": "alchemical",
            "path": "system.quantity"
        },
        {
            "type": "component",
            "path": "system.quantity"
        },
        {
            "type": "diagrams",
            "path": "system.quantity"
        },
        {
            "type": "mutagen",
            "path": "system.quantity"
        },
        {
            "type": "spell",
            "path": null
        },
        {
            "type": "profession",
            "path": null
        },
        {
            "type": "note",
            "path": null
        },
        {
            "type": "race",
            "path": null
        },
        {
            "type": "effect",
            "path": null
        }
    ],
    yzecoriolis: [
        {
            "type": "weapon",
            "path": "system.quantity"
        },
        {
            "type": "armor",
            "path": "system.quantity"
        },
        {
            "type": "gear",
            "path": "system.quantity"
        },
        {
            "type": "talent",
            "path": null
        },
        {
            "type": "injury",
            "path": null
        },
        {
            "type": "shipProblem",
            "path": null
        },
        {
            "type": "shipModule",
            "path": "system.quantity"
        },
        {
            "type": "shipFeature",
            "path": "system.quantity"
        },
        {
            "type": "shipCriticalDamage",
            "path": null
        },
        {
            "type": "shipLogbook",
            "path": null
        },
        {
            "type": "energyPointToken",
            "path": null
        }
    ]
}