import { MODULE } from "./const.js"; //import the const variables
import { RecipeData } from "./RecipeData.js";
import { localize } from "./helpers.js";


/**
 * Handles a socket event.
 *
 * @param {Object} payload - The payload for the socket event.
 * @param {type} payload.data - The data of the payload.
 * @param {string} payload.action - The action of the payload.
 * @param {string} payload.userId - The id of the user who called the event.
 */
export function handleSocketEvent(payload) {
    const data = payload.data;

    const responsibleGM = game.users.filter(user => user.isGM && user.active)[0].id;
    const isResponsibleGM = game.user.id === responsibleGM;

    switch (payload.action) {
        case "saveJSON":
            if (!isResponsibleGM) return;
            RecipeData.saveDataToFile(
                data.folder,
                data.file,
                data.saveData,
                {
                    userId: payload.userId,
                    fileInfo: data.fileInfo,
                }
            );
            break;
        case "notifyClient":
            if (payload.userId !== game.user.id) return;
            // Types of notification: "info", "warning" or "error".
            ui.notifications.notify(data.message, data.type);
            break;
        default:
            throw new Error('unknown type');
    }
}

/**
 * Sends a socket notification to a specific user.
 * If the user is the caller, instead just sends a notification to him.
 * 
 * @param {string} action - The action to be performed.
 * @param {string} userId - The ID of the user to send the notification to.
 * @param {object} data - The data associated with the notification.
 *    - {string} type (optional) - The type of the notification. Defaults to "info".
 *    - {string} message (optional) - The message content of the notification. Defaults to "Invalid message!".
 * @return {undefined}
 */
export function socketNotification(userId, data) {
    const { type = "info", message = localize("FURU-SC.NOTIFICATIONS.INVALID_MESSAGE") } = data;
    if (userId === game.user.id) {
        ui.notifications.notify(message, type);
        return;
    }
    game.socket.emit(`module.${MODULE}`, {
        action: "notifyClient",
        userId: userId,
        data: data
    });
}

/**
 * Saves a file using a socket connection.
 * If the user is the GM, instead just saves it.
 *
 * @param {string} userId - The ID of the user calling the saving.
 * @param {object} data - The data object containing required info.
 *   @property {string} folder - The folder where the file should be saved. Default is null.
 *   @property {string} file - The name of the file. Default is null.
 *   @property {string} saveData - The data to be saved. Default is null.
 *   @property {object} fileInfo - The file information object.
 *     @property {string} system - The ID of the game system. Default is the current game system ID.
 *     @property {string} world - The ID of the game world. Default is the current game world ID.
 * @return {Promise<void>} A Promise that resolves when the file is saved.
 */
export async function socketSaveFile(userId, data) {
    const {
        folder = null,
        file = null,
        saveData = null,
        fileInfo = { system: game.system.id, world: game.world.id }
    } = data
    if (game.user.isGM) {
        await RecipeData.saveDataToFile(folder, file, saveData, { userId: game.user.id, fileInfo: fileInfo });
        return;
    }
    game.socket.emit(`module.${MODULE}`, {
        action: "saveJSON",
        userId: userId,
        data: data
    });
}