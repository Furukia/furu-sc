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
        let fileName = decodeURI(path.split("/").pop().split(".").slice(0, -1).join("."));
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
DELETE - sourceId was changed from flags.core.sourceId to _stats.compendiumSource
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
 * Processes the compendium source from item's "_stats.compendiumSource" and extracts the source ID.
 *
 * @param {Object} item - The item object.
 * @return {string} The extracted source ID.
 */
export function processCompendiumSource(item) {
    // version 11 compatibility
    let compendiumSource = item.flags?.core?.sourceId;
    // version 12+
    if (!compendiumSource) {
        compendiumSource = item._stats?.compendiumSource ?? item.id;
    }
    const splitSource = compendiumSource.split('.');
    const sourceId = splitSource[splitSource.length - 1];
    return sourceId;
}
/**
 * Compares two items based on their name, type, and compendium source.
 *
 * @param {Object} item1 - The first item to compare.
 * @param {Object} item2 - The second item to compare.
 * @return {boolean} Returns true if the items are similar, false otherwise.
 */
export function compareItems(item1, item2) {
    const equalNames = item1.name === item2.name;
    const equalTypes = item1.type === item2.type;
    const equalSource = processCompendiumSource(item1) === processCompendiumSource(item2);
    return (equalNames && equalTypes) || equalSource;
}

/**
 * Processes item compatibility for different Foundry versions.
 * In v12 sourceId was moved from flags.core.sourceId to _stats.compendiumSource
 * I want to provide compatibility for v11+
 * Which is why we need this function
 *
 * @param {Object} item - The item to process compatibility for.
 * @return {Object} The processed item.
 */
export function processItemCompatibility(item) {
    const foundryVersion = game.world.coreVersion;
    const shortVersion = Number(foundryVersion.split('.')[0]);
    const compendiumSource = processCompendiumSource(item);
    if (shortVersion === 11 && !item.flags?.core?.sourceId) {
        foundry.utils.setProperty(item, "flags.core.sourceId", compendiumSource);
    }
    if (shortVersion >= 12 && !item._stats?.compendiumSource) {
        foundry.utils.setProperty(item, "_stats.compendiumSource", compendiumSource);
    }
    return item;
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

/**
 * Checks if the specified item has the craftTags flag set.
 *
 * @param {type} item - The item to check.
 * @return {type} Returns true if the craftTags flag is set, false otherwise.
 */
export function checkTagsPresence(item) {
    return !!item.getFlag(MODULE, "craftTags");
}

/**
 * Checks if a given tag is visible based on a query.
 *
 * @param {string} tag - The tag to check visibility for.
 * @param {string} query - The query to match against the tag.
 * @return {boolean} Returns true if the tag matches the query, false otherwise.
 */
export function checkTagVisibility(tag, query) {
    return query ? tag.toLowerCase().includes(query.toLowerCase()) : true;
}

/**
 * Calculate the percentage of available tags compared to required tags.
 *
 * @return {number} The percentage of available tags compared to required tags
 */
export function getPercentForAllTags() {
    const ingredientsInfo = CraftTable.craftTable.ingredients;
    const requiredTags = CraftTable.craftTable.tags;
    if (!requiredTags || !ingredientsInfo) return;
    let tagQuantity = {};

    Object.keys(ingredientsInfo).forEach(function (key) {
        const ingredient = ingredientsInfo[key].ingredient;
        const consumeQuantity = ingredientsInfo[key].consumeQuantity;
        const tags = ingredient.getFlag(MODULE, "craftTags");
        if (!tags) return;
        for (let i = 0; i < consumeQuantity; i++) {
            Object.keys(tags).forEach(function (key) {
                const quantity = tags[key];
                const currentQuantity = tagQuantity[key] ?? 0;
                tagQuantity[key] = currentQuantity + quantity;
            })
        }
    });
    let maxQuantity = 0;
    let remainder = 0;

    Object.keys(requiredTags).forEach(function (key) {
        const requiredQuantity = requiredTags[key];
        const quantity = tagQuantity[key] ?? 0;
        maxQuantity += requiredQuantity;
        remainder += Math.max(0, requiredQuantity - quantity);
    })
    return ((maxQuantity - remainder) / maxQuantity) * 100
}

/**
 * Checks if the given quantity is less than or equal to the current quantity for the specified item type.
 *
 * @param {Object} item - The item object to check the quantity for
 * @param {number} quantity - The quantity to compare
 * @return {boolean} Returns true if the quantity is less than or equal to the current quantity, otherwise false
 */
export function checkQuantity(item, quantity) {
    if (!item) return false;
    if (!quantity) return false;
    const pathObject = getCorrectQuantityPathForItem(item.type);
    let currentQuantity = foundry.utils.getProperty(item, pathObject.path);
    if (!currentQuantity) currentQuantity = 1;
    return quantity <= currentQuantity
}