import { MODULE, DATA_DEFAULT_FOLDER } from "./const.js"; //import the const variables
import { RecipeData } from "./crafting.js";

/**
 * Creating a folder if we don't have one
 * @async
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
 * Checks for all file's in the recipes path and returns their names
 * @async
 * @returns {Array}
 */
export async function getFileNames() {
    let folderPath = game.settings.get(MODULE, 'save-path');
    let files = await FilePicker.browse('data', folderPath);
    files = files.files;
    let fileNames = [];
    const re = /(?:\.([^.]+))?$/;
    await files.forEach(path => {
        //console.log("path:", path);
        let ext = re.exec(path)[1];
        if (ext !== "json")
            return;
        //console.log("ext:", ext);
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
 * Get's the full path for the current file from the settings.
 *
 * @export
 * @async
 * @returns {string}
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
 * Gets the path for an item's quantity field according to the setting.
 * Returns an object with a path and a type of the path - system or flag.
 * @export
 * @param {Object} item
 * @returns {Object}
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

export function getNestedValue(obj, key) {
    return key.split(".").reduce(function (result, key) {
        return result[key]
    }, obj);
}

export function setNestedValue(obj, key, value) {
    let keys = key.split(".");
    let lastKey = keys.pop();
    let nestedObj = keys.reduce((obj, key) => obj[key] ??= {}, obj);
    nestedObj[lastKey] = value;
    console.log("object after setNestedValue", obj);
    return obj;
}

export function processSourceId(id, restore = false) {
    if (!id) return null;
    if (restore) {
        return "Item." + id;
    }
    else {
        return id.split('.')[1];
    }
}