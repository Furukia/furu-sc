import { MODULE, DATA_DEFAULT_FOLDER } from "./const.js"; //import the const variables
import { RecipeData } from "./crafting.js";


/**
 * Creates a folder if it is missing at the specified path.
 *
 * @param {string} path - The path where the folder should be created. If not provided, the default path will be used.
 */
export async function createFolderIfMissing(path) {
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
    if (!fileNames.length) {
        console.log(MODULE, " | ", "No files in the directory!");
        console.log(MODULE, " | ", `Creating a new file: ${game.world.id}.json`);
        await RecipeData.createRecipeFile(folderPath, game.world.id);
        fileNames.push(game.world.id);
        game.settings.set(MODULE, 'current-file', game.world.id);
    }
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
        ui.notification.error(`Can't get the current folder and/or file. | FolderPath = ${folder} | FilePath = ${file} |`);
        return;
    }
    const path = folder + `/` + file + `.json`;
    return path;
}


/**
 * Retrieves the correct quantity path for the given item.
 *
 * @param {Object} item - The item object.
 * @return {Object} - An object containing the correct quantity path and type.
 */
export function getCorrectQuantityPathForItem(item) {
    let quantityPaths = game.settings.get(MODULE, `quantity-path`);
    let path = null;
    quantityPaths.forEach(_path => {
        if (_path.type === item.type) {
            path = _path.path;
        }
    })
    return path ? { path: path, type: "system" } : { path: `flags.${MODULE}.quantity`, type: "flag" };
}

/**
 * Retrieves a nested value from an object based on a provided key.
 *
 * @param {Object} obj - The object from which to retrieve the nested value.
 * @param {string} key - The key indicating the path to the nested value.
 * @return {*} - The nested value retrieved from the object.
 */
export function getNestedValue(obj, key) {
    return key.split(".").reduce(function (result, key) {
        return result[key]
    }, obj);
}

/**
 * Sets a nested value in an object.
 *
 * @param {Object} obj - The object in which to set the nested value.
 * @param {string} key - The key representing the nested value.
 * @param {*} value - The value to set.
 * @return {Object} - The modified object with the nested value set.
 */
export function setNestedValue(obj, key, value) {
    let keys = key.split(".");
    let lastKey = keys.pop();
    let nestedObj = keys.reduce((obj, key) => obj[key] ??= {}, obj);
    nestedObj[lastKey] = value;
    console.log("object after setNestedValue", obj);
    return obj;
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
