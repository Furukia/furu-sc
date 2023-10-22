import { MODULE, DATA_DEFAULT_FOLDER } from "./const.js"; //import the const variables

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
    let files = await FilePicker.browse('data',
        game.settings.get(MODULE, 'SavePath'));
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
        return;
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
    const folder = game.settings.get(MODULE, 'SavePath');
    const file = game.settings.get(MODULE, 'CurrentFile');
    if (!folder || !file) {
        ui.notification.error(`Can't get the current folder and/or file. | FolderPath = ${folder} | FilePath = ${file} |`);
        return;
    }
    const path = folder + `/` + file + `.json`;
    return path;
}