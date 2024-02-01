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
    isTargetList: false,
    allowDismantling: false,
    isSecret: false,
    allowModifiers: false,
    isOneTime: false,
    isHidden: false,
    sendCraftRequest: false,
    macros: {
        openMacros: undefined,
        craftMacros: undefined,
        activateAsGM: false
    }
};
