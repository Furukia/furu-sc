import { MODULE, DATA_DEFAULT_FOLDER, RECIPES } from "./const.js"; //import the const variables
import { getFileNames } from "./helpers.js";
/**
 * Registering settings
 */

export async function RegisterSettings() {

    game.settings.register(MODULE, 'SavePath', {
        name: game.i18n.localize("FURU-SC.SETTINGS.SAVEPATH.name"),
        hint: game.i18n.localize("FURU-SC.SETTINGS.SAVEPATH.hint"),
        scope: 'world',
        config: true,
        type: String,
        default: DATA_DEFAULT_FOLDER
    });

    //TODO:make this setting actually important
    game.settings.register(MODULE, 'CurrentFile', {
        name: game.i18n.localize("FURU-SC.SETTINGS.CURRENTFILE.name"),
        hint: game.i18n.localize("FURU-SC.SETTINGS.CURRENTFILE.hint"),
        scope: 'client',
        config: false,
        type: String,
        default: RECIPES
    });

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
    game.settings.register(MODULE, "quantity-path", {
        name: game.i18n.localize("FURU-SC.SETTINGS.QUANTITY.name"),
        hint: game.i18n.localize("FURU-SC.SETTINGS.QUANTITY.hint"),
        scope: "world",
        default: null,
        type: String,
        config: true
    });

}
/**
 * Validating if settings data is correct. And fixing them as needed.
 * Called on initialization.
 */
export async function ValidateSettings() {
    let fileNames = await getFileNames();
    if (!fileNames.includes(game.settings.get(MODULE, 'CurrentFile'))) {
        game.settings.set(MODULE, 'CurrentFile', fileNames[0]);
    }
};