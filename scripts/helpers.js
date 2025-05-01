import { MODULE, DATA_DEFAULT_FOLDER, MODULE_NAME } from "./const.js"; //import the const variables
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
    const compendiumSource = processCompendiumSource(item);
    if (getFoundryVersionShort() === 11 && !item.flags?.core?.sourceId) {
        foundry.utils.setProperty(item, "flags.core.sourceId", compendiumSource);
    }
    if (getFoundryVersionShort() >= 12 && !item._stats?.compendiumSource) {
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

    Object.keys(ingredientsInfo).forEach(function (key) {
        const ingredientInfo = ingredientsInfo[key];
        remainingQuantity += ingredientInfo.currentReqQuantity;
        fullQuantity += ingredientInfo.requiredQuantity;
    });
    return ((fullQuantity - remainingQuantity) / fullQuantity) * 100;
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

/**
 * Sends a notification to the chat with the specified message and options.
 *
 * @param {string} message - The message to be sent to the chat.
 * @param {object} [options] - The options for customizing the notification.
 * @param {boolean} [options.GmOnly=true] - Whether to send the notification only to GMs.
 * @param {string} [options.playerName=null] - The name of the player to be replaced in the message.
 * @param {string} [options.recipeName=null] - The name of the recipe to be replaced in the message.
 * @param {boolean} [options.localize=true] - Whether to localize the message.
 * @param {string} [options.speaker=MODULE_NAME] - The alias of the speaker in the chat.
 * @return {void}
 */
export function sendNotificationToChat(message, options) {
    const {
        GmOnly = true,
        playerName = null,
        recipeName = null,
        actorName = null,
        localizeMessage = false,
        speaker = MODULE_NAME
    } = options;
    let GmList = GmOnly ? game.users.filter(user => user.isGM) : null;
    if (localizeMessage) message = localize(message);
    if (playerName) message = message.replace("\%p", playerName);
    if (recipeName) message = message.replace("\%r", recipeName);
    if (actorName) message = message.replace("\%a", actorName);
    let messageData = {
        content: message,
    }
    if (GmList) messageData.whisper = GmList;
    if (speaker) messageData.speaker = {
        alias: speaker
    };
    ChatMessage.create(messageData);
}

/**
 * Checks if force crafting is allowed for a given recipe.
 *
 * @param {Object} recipe - The recipe to check.
 * @return {boolean} Returns true if force crafting is allowed, otherwise false.
 */
export function isAllowedForceCraft(recipe) {
    return recipe.settings.allowForceCraft || game.settings.get(MODULE, "allow-force-crafting")
}

/**
 * Gets the short single number version of the current Foundry VTT installation.
 *
 * @return {number} The short version of the Foundry VTT installation.
 */
export function getFoundryVersionShort() {
    const foundryVersion = game.world.coreVersion;
    return Number(foundryVersion.split('.')[0]);
}