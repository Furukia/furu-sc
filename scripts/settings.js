import { MODULE, DATA_DEFAULT_FOLDER, RECIPES, MODULE_NAME, QUANTITY_PATH_DEFAULTS } from "./const.js"; //import the const variables
import { getFileNames, localize } from "./helpers.js";
import { QuantityConfig } from "./QuantityConfig.js";
import { RecipeData } from "./RecipeData.js";


/**
 * Registers the settings for the module.
 *
 * @async
 * @function RegisterSettings
 * 
 */
export function RegisterSettings() {
    game.settings.register(MODULE, 'save-path', {
        name: localize("FURU-SC.SETTINGS.SAVE_PATH.name"),
        hint: localize("FURU-SC.SETTINGS.SAVE_PATH.hint"),
        requiresReload: true,
        scope: 'world',
        config: true,
        type: String,
        default: DATA_DEFAULT_FOLDER
    });
    game.settings.register(MODULE, 'allow-player-edit', {
        name: localize("FURU-SC.SETTINGS.PLAYER_CAN_EDIT.name"),
        hint: localize("FURU-SC.SETTINGS.PLAYER_CAN_EDIT.hint"),
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    })
    //Even tho this settings are not visible in the UI, they are still localized just in case.
    game.settings.register(MODULE, 'current-file', {
        name: localize("FURU-SC.SETTINGS.CURRENT_FILE.name"),
        hint: localize("FURU-SC.SETTINGS.CURRENT_FILE.hint"),
        scope: 'client',
        config: false,
        type: String,
        default: RECIPES
    });
    game.settings.register(MODULE, 'recipe-files', {
        name: localize("FURU-SC.SETTINGS.RECIPE_FILES.name"),
        hint: localize("FURU-SC.SETTINGS.RECIPE_FILES.hint"),
        scope: 'world',
        config: false,
        type: Array,
        default: []
    });
    /*
     * Maybe will implement later
     *
    let dataHandlingType = {
        'all': localize("FURU-SC.SETTINGS.DATA_HANDLING.types.all"),
        'reference': localize("FURU-SC.SETTINGS.DATA_HANDLING.types.reference")
    };

    game.settings.register(MODULE, "data-handling", {
        name: localize("FURU-SC.SETTINGS.DATA_HANDLING.name"),
        hint: localize("FURU-SC.SETTINGS.DATA_HANDLING.hint"),
        scope: "world",
        default: 'reference',
        type: String,
        choices: dataHandlingType,
        config: true
    });
    */
    game.settings.register(MODULE, "quantity-path", {
        scope: "world",
        config: false,
        default: null,
        type: Array
    });
    game.settings.register(MODULE, "quantity-path-is-set", {
        scope: "world",
        config: false,
        default: false,
        type: Boolean
    });

    game.settings.registerMenu(MODULE, "quantity-config", {
        name: localize("FURU-SC.SETTINGS.QUANTITY.name"),
        hint: localize("FURU-SC.SETTINGS.QUANTITY.hint"),
        label: "Configure",
        icon: "fas fa-list-radio",
        type: QuantityConfig,
        restricted: true
    });

    game.settings.register(MODULE, 'hideLabel', {
        name: localize("FURU-SC.SETTINGS.HIDE_TAGS_LABEL.name"),
        hint: localize("FURU-SC.SETTINGS.HIDE_TAGS_LABEL.hint"),
        scope: "world",
        config: true,
        default: false,
        type: Boolean
    });
}
/**
 * Validates the settings of the module. And fixes them as needed.
 * Called on initialization.
 */
export async function ValidateSettings() {
    console.log(`${MODULE} | Validating settings...`);
    let folderPath = game.settings.get(MODULE, 'save-path');
    let fileNames;

    if (game.user.isGM) {
        fileNames = await getFileNames();
        if (!fileNames || !fileNames.length) {
            console.warn(`${MODULE} | No files in the directory!`);
            console.log(`${MODULE} | Creating a new file: ${game.world.id}.json`);
            await RecipeData.createRecipeFile(folderPath, game.world.id);
            fileNames.push(game.world.id);
            game.settings.set(MODULE, 'current-file', game.world.id);
        }
        game.settings.set(MODULE, 'recipe-files', fileNames);
    } else {
        fileNames = await game.settings.get(MODULE, 'recipe-files');
    }

    let currentFile = game.settings.get(MODULE, 'current-file');
    if (fileNames && !fileNames.includes(currentFile)) {
        game.settings.set(MODULE, 'current-file', fileNames[0]);
        console.log(`${MODULE} | Setting up the "current-file" setting`);
        console.log(`${MODULE} | File:`, fileNames[0]);
    }

    const isSet = game.settings.get(MODULE, 'quantity-path-is-set');
    if (!isSet) {
        const systemId = game.system.id;
        const quantityPath = QUANTITY_PATH_DEFAULTS[systemId];
        if (quantityPath) {
            ui.notifications.info(`${MODULE_NAME} - ${localize("FURU-SC.NOTIFICATIONS.FOUND_QUANTITY_PATH_DEFAULT")}`);
            game.settings.set(MODULE, 'quantity-path', quantityPath);
        }
        game.settings.set(MODULE, 'quantity-path-is-set', true);
    }
    let quantitySetting = game.settings.get(MODULE, 'quantity-path');
    if (!quantitySetting || quantitySetting.length === 0) {
        let itemTypes = CONFIG.Item.typeLabels;
        delete itemTypes['base'];
        let itemTypesArray = Object.keys(itemTypes);
        let quantityArray = itemTypesArray.map(itemType => ({
            type: itemType,
            path: null
        }));
        game.settings.set(MODULE, 'quantity-path', quantityArray);
        console.log(`${MODULE} | Setting up the "quantity-path" setting`);
        console.log(`${MODULE} | Data:`, quantityArray);
    }

    console.log(`${MODULE} | Settings successfully validated.`);
}
