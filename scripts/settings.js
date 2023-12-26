import { MODULE, DATA_DEFAULT_FOLDER, RECIPES } from "./const.js"; //import the const variables
import { getFileNames } from "./helpers.js";
import { QuantityConfig } from "./QuantityConfig.js";


/**
 * Registers the settings for the module.
 *
 * @async
 * @function RegisterSettings
 * 
 */
export async function RegisterSettings() {

    game.settings.register(MODULE, 'save-path', {
        name: game.i18n.localize("FURU-SC.SETTINGS.SAVEPATH.name"),
        hint: game.i18n.localize("FURU-SC.SETTINGS.SAVEPATH.hint"),
        scope: 'world',
        config: true,
        type: String,
        default: DATA_DEFAULT_FOLDER
    });

    game.settings.register(MODULE, 'current-file', {
        name: game.i18n.localize("FURU-SC.SETTINGS.CURRENTFILE.name"),
        hint: game.i18n.localize("FURU-SC.SETTINGS.CURRENTFILE.hint"),
        scope: 'client',
        config: false,
        type: String,
        default: RECIPES
    });
    /*
     * Maybe will implement later
    let dataHandlingType = {
        'all': game.i18n.localize("FURU-SC.SETTINGS.DATAHANDLING.types.all"),
        'reference': game.i18n.localize("FURU-SC.SETTINGS.DATAHANDLING.types.reference")
    };

    game.settings.register(MODULE, "data-handling", {
        name: game.i18n.localize("FURU-SC.SETTINGS.DATAHANDLING.name"),
        hint: game.i18n.localize("FURU-SC.SETTINGS.DATAHANDLING.hint"),
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

    game.settings.registerMenu(MODULE, "quantity-config", {
        name: game.i18n.localize("FURU-SC.SETTINGS.QUANTITY.name"),
        hint: game.i18n.localize("FURU-SC.SETTINGS.QUANTITY.hint"),
        label: "Configure",
        icon: "fas fa-list-radio",
        type: QuantityConfig,
        restricted: true
    });
}
/**
 * Validates the settings of the module. And fixes them as needed.
 * Called on initialization.
 */
export async function ValidateSettings() {
    let fileNames = await getFileNames();
    if (!fileNames.includes(game.settings.get(MODULE, 'current-file'))) {
        game.settings.set(MODULE, 'current-file', fileNames[0]);
        console.log(`${MODULE} | Setting up the "current-file" setting`);
        console.log(`${MODULE} | File:`, fileNames[0]);
    }
    let quantitySetting = game.settings.get(MODULE, `quantity-path`);
    if (!quantitySetting || quantitySetting.length === 0) {
        let itemTypes = CONFIG.Item.typeLabels;
        delete itemTypes['base'];
        let itemTypesArray = Object.keys(itemTypes);
        let quantityArray = [];
        itemTypesArray.forEach(itemType => {
            quantityArray.push({
                type: itemType,
                path: null
            })
        })
        game.settings.set(MODULE, `quantity-path`, quantityArray);
        console.log(`${MODULE} | Setting up the "quantity-path" setting`);
        console.log(`${MODULE} | Data:`, quantityArray);
    }
};