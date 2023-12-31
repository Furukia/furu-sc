import { MODULE, DATA_DEFAULT_FOLDER } from "./const.js"; //import the const variables
import { CraftTable } from "./CraftTable.js";


/**
 * Creates a folder if it is missing at the specified path.
 *
 * @param {string} path - The path where the folder should be created. If not provided, the default path will be used.
 */
export async function createFolderIfMissing(path) {
    if (!game.user.isGM) return;
    let jsonPath = path === undefined ? DATA_DEFAULT_FOLDER : path;
    await FilePicker.browse("data", jsonPath)
        .catch(async _ => {
            if (!await FilePicker.createDirectory("data", jsonPath, {}))
                throw new Error('Could not access the recipes folder: ' + folder);
        });
}

/**
 * Retrieves the names of all files with the ".json" extension in the specified folder.
 *
 * @return {Array} An array containing the names of the JSON files in the folder.
 */
export async function getFileNames() {
    let folderPath = game.settings.get(MODULE, 'save-path');
    let files = await FilePicker.browse('data', folderPath);
    files = files.files;
    let fileNames = [];
    const re = /(?:\.([^.]+))?$/;
    await files.forEach(path => {
        let ext = re.exec(path)[1];
        if (ext !== "json")
            return;
        let fileName = path.split("/").pop().split(".").slice(0, -1).join(".");
        fileNames.push(fileName);
    });
    return fileNames;
};

/**
 * Retrieves the full file path by concatenating the current folder and file name.
 *
 * @return {string} The full file path.
 */
export async function getFullFilePath() {
    const folder = game.settings.get(MODULE, 'save-path');
    const file = game.settings.get(MODULE, 'current-file');
    if (!folder || !file) {
        ui.notification.error(`${localize("FURU-SC.NOTIFICATIONS.NO_FOLDER_OR_FILE")} | FolderPath = ${folder} | FilePath = ${file} |`);
        return;
    }
    const path = folder + `/` + file + `.json`;
    return path;
}

/**
 * Retrieves the correct quantity path for the given item.
 *
 * @param {Object} item - The item object.
 * @return {Object} - An object containing the correct quantity path and quantity handling type.
 */
export function getCorrectQuantityPathForItem(itemType) {
    let quantityPaths = game.settings.get(MODULE, `quantity-path`);
    let path = null;
    quantityPaths.forEach(_path => {
        if (_path.type === itemType) {
            path = _path.path;
        }
    })
    return path ? { path: path, type: "system" } : { path: `flags.${MODULE}.quantity`, type: "flag" };
}

/**
 * Processes the source ID by removing the "Item." prefix and optionally restores it back to the original format.
 *
 * @param {string} sourceId - The source ID to be processed.
 * @param {boolean} [restore=false] - Whether or not to restore the source ID.
 * @return {string} - The processed source ID.
 */
export function processSourceId(sourceId, restore = false) {
    return restore ? "Item." + sourceId : sourceId.split('.')[1];
}

/**
 * Calculates the percentage of remaining ingredients based on the total quantity of ingredients.
 *
 * @return {number} The percentage of remaining ingredients.
 */
export function getPercentForAllIngredients() {
    const ingredientsInfo = CraftTable.craftTable.ingredients;
    let remainingQuantity = 0;
    let fullQuantity = 0;
    let fullModifier = 0;

    Object.keys(ingredientsInfo).forEach(function (key) {
        const ingredientInfo = ingredientsInfo[key];
        remainingQuantity += ingredientInfo.currentReqQuantity;
        fullQuantity += ingredientInfo.requiredQuantity;
        fullModifier += ingredientInfo.modifier;
    });
    return ((fullQuantity - (remainingQuantity + fullModifier)) / fullQuantity) * 100;
}

/**
 * A function to check if the user has the rights to edit recipes and files.
 *
 * @return {boolean} Returns true if the user has edit rights, otherwise false.
 */
export function checkEditRights() {
    if (game.user.isGM || game.settings.get(MODULE, 'allow-player-edit'))
        return true;
    return false;
}

/**
 * Helper to shorten localization syntax.
 *
 * @param {string} key - The key to be localized.
 * @return {string} The localized value of the key.
 */
export function localize(key) {
    return game.i18n.localize(key);
}