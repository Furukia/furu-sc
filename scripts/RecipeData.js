import { MODULE, DATA_DEFAULT_FOLDER, RECIPES, DEFAULT_RECIPES_DATA, DEFAULT_RECIPE_SETTINGS } from "./const.js";
import { CraftMenu } from "./CraftMenu.js";
import { getCorrectQuantityPathForItem, processCompendiumSource, compareItems, localize, checkEditRights } from "./helpers.js";
import { socketNotification, socketSaveFile } from "./sockets.js";

/**
 * @typedef {Object} Recipe
 * @property {string} id - The unique identifier for the recipe.
 * @property {string} name - The name of the recipe.
 * @property {string} description - The description of the recipe.
 * @property {string} type - A type of a recipe. (text, items, tags)
 * @property {bool} isVisible - Is a recipe visible right now?
 * @property {bool} editMode - Are we editing this recipe text or not?
 * @property {Object} settings - An object that contains various settings of this recipe
 * @property {bool} settings.opened - Is this recipe settings block is open.
 * @property {bool} settings.isTargetList - If this recipe should consider target as a list, of target items, instead of a singular item
TODO: @property {bool} settings.allowDismantling - If this recipe should allow dismantling. Effectively creating ingredients from target(s)
TODO: @property {bool} settings.isSecret - Make this recipe a secret for the players. They won't be able to craft it until they found out the ingredients for it.
 * @property {bool} settings.allowForceCraft - Allow players to force craft by recipe so they can create items even if they lack ingredients.
TODO: @property {bool} settings.isOneTime - Makes the recipe one use. Hiding it from players after that.
 * @property {bool} settings.isHidden - Is a recipe hidden right now? Which is more important than visibility, and triggered by GM/One time recipes
TODO: @property {bool} settings.sendCraftRequest - Whether to send a craft request to the GM or just craft immediately
TODO: @property {Object} settings.macros - The object that contains macros that should be activated before(open craft table) or after crafting
TODO: @property {Object} settings.macros.openMacros - The macro that should be activated before(open craft table)
TODO: @property {Object} settings.macros.craftMacros - The macro that should be activated after crafting
TODO: @property {bool} settings.macros.activateAsGM - Activate macros as GM
 * @property {Object} target - The object that we want to craft. Only used if settings.isTargetList is false
 * @property {Object} targetList - The objects that we want to craft. Only used if settings.isTargetList is true
 * @property {Object} ingredients - The list of key/value id/ingredient objects we use to craft the target.(Items recipe type) 
 * @property {Object} tags - The list of key/value tags/quantity pairs we use to craft the target.(Tags recipe type) 
 */

/*
 * RecipeData class
 * contains functions to create/update/delete/clear recipes
 */
export class RecipeData {

    /**
     * Creates a new recipe.
     */
    static async createRecipe() {
        const newRecipe = {
            id: foundry.utils.randomID(16),
            name: localize("FURU-SC.NEW_RECIPE"),
            description: localize("FURU-SC.DEFAULT_DESCRIPTION"),
            type: "text",
            isVisible: true,
            editMode: false,
            settings: DEFAULT_RECIPE_SETTINGS,
            target: undefined,
            targetList: undefined,
            ingredients: undefined,
            tags: undefined
        };
        let allRecipes = CraftMenu.craftMenu.object || {};
        allRecipes[newRecipe.id] = newRecipe;
        CraftMenu.craftMenu.object = allRecipes;
    }

    /**
    * Searches for recipes based on a search query and updates their visibility in the Craft Menu.
    TODO - TargetList Support
    * @param {string} searchQuery - The search query used to filter the recipes.
    */
    static async searchRecipe(searchQuery) {
        const lowerCaseSearchQuery = searchQuery.toLowerCase();
        const allRecipes = { ...CraftMenu.craftMenu.object };
        let isVisible = false;

        Object.values(allRecipes).forEach(recipe => {
            // We don't need to search for hidden recipes
            const isHidden = (recipe.settings?.isHidden ?? false) && !checkEditRights();
            if (isHidden) {
                return;
            }
            const searchFields = [
                recipe.name,
                recipe.target?.name,
                recipe.target?.img,
                recipe.description,
                ...(Object.values(recipe.ingredients ?? {}).map(ingredient => ingredient.name)),
                ...(Object.values(recipe.ingredients ?? {}).map(ingredient => ingredient.img)),
                ...(Object.keys(recipe.tags ?? {}))
            ];

            const recipeIsVisible = searchFields.some(field =>
                field?.toLowerCase().includes(lowerCaseSearchQuery)
            );

            recipe.isVisible = recipeIsVisible;
            isVisible = isVisible || recipeIsVisible;
        });

        if (!isVisible) {
            Object.values(allRecipes).forEach(recipe => {
                recipe.isVisible = true;
            });
            ui.notifications.notify(localize("FURU-SC.NOTIFICATIONS.FOUND_NO_RECIPES"));
        }

        CraftMenu.craftMenu.searchQuery = searchQuery;
        CraftMenu.craftMenu.object = allRecipes;
    }

    /**
     * Updates a recipe with the given recipe ID and update data.
     *
     * @param {string} recipeID - The ID of the recipe to update.
     * @param {Object} updateData - The data to update the recipe with.
     */
    static async updateRecipe(recipeID, updateData) {
        const allRecipes = CraftMenu.craftMenu.object;
        if (!allRecipes.hasOwnProperty(recipeID)) {
            console.error(`Recipe with id ${recipeID} not found`);
            return;
        }
        const updatedRecipe = foundry.utils.mergeObject(allRecipes[recipeID], updateData, {
            overwrite: true,
            insertKeys: true,
            insertValues: true
        });
        allRecipes[recipeID] = updatedRecipe;
        CraftMenu.craftMenu.object = allRecipes;
    }

    /**
     * Updates the recipes in the CraftMenu object based on the provided update data.
     *
     * @param {object} updateData - An object containing the recipe IDs as keys and the update data as values.
     */
    static async updateRecipes(updateData) {
        for (const recipeID in updateData) {
            if (updateData.hasOwnProperty(recipeID)) {
                await this.updateRecipe(recipeID, updateData[recipeID]);
            }
        }
    }

    /**
     * Updates the name of a recipe if the current name is either "New Recipe" or empty.
     *
     * @param {number} recipeID - The ID of the recipe to update.
     * @param {string} newName - The new name for the recipe.
     */
    static async tryRecipeNameChange(recipeID, newName) {
        // get all existing recipes
        const allRecipes = CraftMenu.craftMenu.object;
        let currentName = allRecipes[recipeID].name;
        if (currentName !== localize("FURU-SC.NEW_RECIPE") && !!currentName) {
            return;
        }
        const updateData = {
            name: newName
        }
        await this.updateRecipe(recipeID, updateData);
    }

    /**
     * Toggle's recipe edit mode on or off.
     *
     * @param {number} recipeID - The ID of the recipe to edit.
     */
    static async toggleEditMode(recipeID) {
        // get all existing recipes
        const allRecipes = CraftMenu.craftMenu.object;
        // turn the edit mode on/off
        let _editMode = !allRecipes[recipeID].editMode;
        const updateData = {
            editMode: _editMode
        }
        await this.updateRecipe(recipeID, updateData);
    }
    /**
     * Toggle's recipe settings menu on or off.
     *
     * @param {number} recipeID - The ID of the recipe.
     */
    static async toggleSettingsMenu(recipeID) {
        // get all existing recipes
        const allRecipes = CraftMenu.craftMenu.object;
        // turn the settings menu on/off
        let _settingsOppened = !allRecipes[recipeID].settings?.opened;
        const updateData = {
            settings: { opened: _settingsOppened }
        }
        await this.updateRecipe(recipeID, updateData);
    }

    /**
     * Process all hidden recipes and update their visibility status.
     *
     * @return {Promise<void>} A promise that resolves once all hidden recipes have been processed.
     */
    static async processHiddenRecipes() {
        const allRecipes = CraftMenu.craftMenu.object;
        for (const recipeID in allRecipes) {
            const recipe = allRecipes[recipeID];
            if ((recipe.settings?.isHidden ?? false) && !checkEditRights()) {
                await this.updateRecipe(recipeID, { isVisible: false });
            }
        }
    }

    /**
     * Resets the recipes mode.
     *
     * This function iterates through all recipes in the craft menu and updates their properties to:
     * disable edit mode
     * hide the settings menu 
     * and make the recipe visible.
     * It calls the `updateRecipe` function for each recipe to perform the update.
     *
     * @return {Promise} A promise that resolves when all the recipes have been updated.
     */
    static async resetRecipesMode() {
        const recipes = CraftMenu.craftMenu.object;
        for (const recipeID in recipes) {
            const updateData = {
                editMode: false,
                isVisible: true,
                settings: { opened: false }
            };
            await this.updateRecipe(recipeID, updateData, { allRecipes: recipes });
        }
    }

    /**
     * Processes an ingredient for a given recipe.
     *
     * @param {Object} item - The ingredient item.
     * @param {string} recipeID - The ID of the recipe.
     */
    static async ProcessIngredient(item, recipeID) {
        let allRecipes = CraftMenu.craftMenu.object;
        let ingredients = allRecipes[recipeID].ingredients;
        let sourceId = processCompendiumSource(item);
        if (!ingredients) {
            // No ingredients. Making it an empty object to fill in later
            ingredients = {};
        }
        else if (ingredients.hasOwnProperty(sourceId)) {
            // Already got that ingredient here. Just change it's quantity
            this.ProcessQuantity(recipeID, 1, { originalItemId: sourceId, isTarget: false });
            return; //And leave
        }
        // Adding a new ingredient
        let itemObject = { ...item.toObject(), _id: undefined, folder: undefined, ownership: undefined };
        ingredients[sourceId] = itemObject;
        const pathObject = getCorrectQuantityPathForItem(item.type);
        if (pathObject.type === "flag") {
            foundry.utils.setProperty(itemObject, pathObject.path, 1);
        }
        allRecipes[recipeID].ingredients = ingredients;
        CraftMenu.craftMenu.object = allRecipes;
        CraftMenu.craftMenu.render();
    }

    /**
     * Process a target list for a given item and recipe ID.
     *
     * @param {type} item - The target item.
     * @param {type} recipeID - The ID of the recipe.
     */
    static async ProcessTargetListItem(item, recipeID) {
        let allRecipes = CraftMenu.craftMenu.object;
        let targetList = allRecipes[recipeID].targetList;
        let sourceId = processCompendiumSource(item);
        if (!targetList) {
            // No target's in the list. Making it an empty object to fill in later
            targetList = {};
        }
        else if (targetList.hasOwnProperty(sourceId)) {
            // Already got that target here. Just change it's quantity
            this.ProcessQuantity(recipeID, 1, { originalItemId: sourceId, isTargetList: true });
            return; //And leave
        }
        // Adding a new target
        let itemObject = { ...item.toObject(), _id: undefined, folder: undefined, ownership: undefined };
        targetList[sourceId] = itemObject;
        const pathObject = getCorrectQuantityPathForItem(item.type);
        if (pathObject.type === "flag") {
            foundry.utils.setProperty(itemObject, pathObject.path, 1);
        }
        allRecipes[recipeID].targetList = targetList;
        CraftMenu.craftMenu.object = allRecipes;
        CraftMenu.craftMenu.render();
    }


    /**
     * Validate if the item exists as a target in the recipe.
     *
     * @param {type} item - The item that we check
     * @param {type} recipeID - The ID of the recipe
     * @return {type} true if the item exists as a target, false otherwise
     */
    static async validateIfItemExistsAsTarget(item, recipeID) {
        const allRecipes = CraftMenu.craftMenu.object;
        const recipe = allRecipes[recipeID];
        const isTargetList = recipe.settings.isTargetList;
        if (isTargetList) {
            const targetList = recipe.targetList;
            const targetsArray = Object.values(targetList);
            if (!targetsArray?.length) return true;
            for (const targetItem of targetsArray) {
                if (compareItems(targetItem, item)) {
                    const confirmation = await Dialog.confirm({
                        title: localize("FURU-SC.DIALOGS.INGREDIENT_EQUALS_TARGET.title"),
                        content: localize("FURU-SC.DIALOGS.INGREDIENT_EQUALS_TARGET.content"),
                    });
                    if (!confirmation)
                        return false;
                    break;
                }
            }
        }
        else {
            const targetItem = recipe.target;
            if (targetItem && compareItems(targetItem, item)) {
                const confirmation = await Dialog.confirm({
                    title: localize("FURU-SC.DIALOGS.INGREDIENT_EQUALS_TARGET.title"),
                    content: localize("FURU-SC.DIALOGS.INGREDIENT_EQUALS_TARGET.content"),
                });
                if (!confirmation)
                    return false;
            }
        }
        return true;
    }

    /**
    * Process the quantity of an item in a recipe or target.
    * @param {string} recipeId - The recipe ID.
    * @param {number} value - The value to add to the item's quantity.
    * @param {Object} options - Additional options.
    * @param {string} options.originalItemId - The original item ID.
    * @param {boolean} options.rewrite - Whether to rewrite the item's quantity instead of adding to it.
    * @param {boolean} options.isTarget - Whether the item is a target or a recipe ingredient.
    * @param {boolean} options.isTargetList - Whether the item is a target list.
    */
    static async ProcessQuantity(recipeId, value, options = {}) {
        const allRecipes = CraftMenu.craftMenu.object;
        const { originalItemId = null, rewrite = false, isTarget = true, isTargetList = false } = options;
        let item;
        if (isTargetList) {
            item = allRecipes[recipeId].targetList[originalItemId];
        } else if (isTarget) {
            item = allRecipes[recipeId].target;
        } else {
            item = allRecipes[recipeId].ingredients[originalItemId];
        }
        const pathObject = getCorrectQuantityPathForItem(item.type);
        const path = pathObject.path;
        const currentQuantity = foundry.utils.getProperty(item, path);
        const numericValue = Number(value);
        const numericCurrentQuantity = Number(currentQuantity);
        const updatedQuantity = rewrite ? numericValue : numericCurrentQuantity + numericValue;
        await foundry.utils.setProperty(item, path, Math.max(1, updatedQuantity));
        if (isTargetList) {
            allRecipes[recipeId].targetList[originalItemId] = item;
        } else if (isTarget) {
            allRecipes[recipeId].target = item;
        } else {
            allRecipes[recipeId].ingredients[originalItemId] = item;
        }
        CraftMenu.craftMenu.object = allRecipes;
        CraftMenu.craftMenu.render();
    }

    /**
     * Deletes an ingredient from a recipe.
     *
     * @param {string} recipeID - The ID of the recipe.
     * @param {string} itemID - The ID of the ingredient to be deleted.
     */
    static async deleteIngredient(recipeID, itemID) {
        const allRecipes = CraftMenu.craftMenu.object;
        const ingredients = allRecipes[recipeID].ingredients;
        delete ingredients[itemID];
        allRecipes[recipeID].ingredients = ingredients;
        CraftMenu.craftMenu.object = allRecipes;
    }

    /**
     * Deletes a target item from a target list in a recipe.
     *
     * @param {string} recipeID - The ID of the recipe.
     * @param {string} itemID - The ID of the target to be deleted.
     */
    static async deleteTargetListItem(recipeID, itemID) {
        const allRecipes = CraftMenu.craftMenu.object;
        const targets = allRecipes[recipeID].targetList;
        delete targets[itemID];
        allRecipes[recipeID].targetList = targets;
        CraftMenu.craftMenu.object = allRecipes;
    }

    /**
     * Adds a new tag to a recipe.
     *
     * @param {number} recipeID - The ID of the recipe.
     * @param {string} tag - The tag to be added.
     */
    static async addRecipeTag(recipeID, tag) {
        const allRecipes = CraftMenu.craftMenu.object;
        const tags = allRecipes[recipeID].tags ?? {};
        const tagObject = { [tag]: 1 };
        const finalData = foundry.utils.mergeObject(tags, tagObject, { insertKeys: true });
        this.updateRecipe(recipeID, { tags: finalData });
    }

    /**
     * Removes a tag from a recipe.
     *
     * @param {string} recipeID - The ID of the recipe.
     * @param {string} tag - The tag to be removed.
     */
    static async removeTag(recipeID, tag) {
        const allRecipes = CraftMenu.craftMenu.object;
        const tags = allRecipes[recipeID].tags;
        delete tags[tag];
        allRecipes[recipeID].tags = tags;
        CraftMenu.craftMenu.object = allRecipes;
    }

    /**
     * Change the tag of a recipe.
     *
     * @param {string} recipeID - The ID of the recipe.
     * @param {string} tag - The new tag for the recipe.
     */
    static async changeTag(recipeID, tag, value) {
        const allRecipes = CraftMenu.craftMenu.object;
        const tags = allRecipes[recipeID].tags;
        const tagQuantity = tags[tag];
        delete tags[tag];
        const tagObject = { [value]: tagQuantity };
        const finalData = foundry.utils.mergeObject(tags, tagObject, { insertKeys: true });
        this.updateRecipe(recipeID, { tags: finalData });
    }

    /**
     * Changes the quantity of a recipe tag for a given recipe ID.
     *
     * @param {string} recipeID - The ID of the recipe.
     * @param {string} tag - The tag which quantity we are changing.
     * @param {Object} options - The options for changing the quantity.
     * @param {number} [options.quantity=1] - The quantity to add or overwrite the recipe tag with.
     * @param {boolean} [options.overwrite=false] - Whether to overwrite the existing quantity or not.
     */
    static async changeTagQuantity(recipeID, tag, options) {
        const { quantity = 1, overwrite = false } = options;
        const allRecipes = CraftMenu.craftMenu.object;
        const tags = allRecipes[recipeID].tags;
        let finalQuantity;
        if (overwrite) {
            finalQuantity = quantity;
        } else {
            const currentQuantity = tags[tag];
            finalQuantity = currentQuantity + quantity;
        }
        const tagObject = { [tag]: Number(finalQuantity) };
        const finalData = foundry.utils.mergeObject(tags, tagObject, { overwrite: true });
        this.updateRecipe(recipeID, { tags: finalData });
    }

    /**
     * Delete a recipe from the CraftMenu object.
     *
     * @param {string} recipeID - The ID of the recipe to be deleted.
     */
    static async deleteRecipe(recipeID) {
        const allRecipes = CraftMenu.craftMenu.object;
        delete allRecipes[recipeID];
        CraftMenu.craftMenu.object = allRecipes;
    }

    /**
     * Clear all recipes from the file.
     */
    static async clearAllRecipes() {
        const shouldDeleteData = await Dialog.confirm({
            title: localize("FURU-SC.DIALOGS.CLEAR_FILE.title"),
            content: localize("FURU-SC.DIALOGS.CLEAR_FILE.content"),
        });
        if (!shouldDeleteData)
            return;
        const currentFolder = game.settings.get(MODULE, 'save-path');
        const currentFile = game.settings.get(MODULE, 'current-file');
        CraftMenu.craftMenu.object = {};
        socketSaveFile(game.user.id, { folder: currentFolder, file: currentFile, saveData: {}, fileInfo: {} });
    }

    /**
     * Creates a new recipe file.
     *
     * @param {string} path - The path where the file will be created. If not provided, the default data folder will be used.
     * @param {string} fileName - The name of the new file. If not provided, a prompt will be shown to the user to enter the name.
     */
    static async createRecipeFile(path, fileName) {
        let jsonPath = !path ? DATA_DEFAULT_FOLDER : path;
        if (!fileName) {
            fileName = await Dialog.prompt({
                title: localize("FURU-SC.DIALOGS.FILE_CREATION.title"),
                content: `<label for="nameInput">${localize("FURU-SC.DIALOGS.FILE_CREATION.content")}</label><input name="nameInput" type="text" style="margin-top:6px; margin-bottom:6px;" placeholder="${localize("FURU-SC.DIALOGS.FILE_CREATION.placeholder")}">`,
                callback: (html) => html.find('input').val()
            })
            if (!fileName)
                return;
        }
        await RecipeData.saveDataToJSONFile({}, jsonPath, fileName);
        game.settings.set(MODULE, 'current-file', fileName);
        let allFiles = game.settings.get(MODULE, 'recipe-files');
        allFiles.push(fileName);
        game.settings.set(MODULE, 'recipe-files', allFiles);
        if (CraftMenu.craftMenu) {
            CraftMenu.craftMenu.object = {};
            CraftMenu.craftMenu.fileInfo = { system: game.system.id, world: game.world.id };
        }
    }

    /**
     * Saves data to a file after validating it.
     *
     * @param {string} folder - The folder where the file will be saved.
     * @param {string} file - The name of the file.
     * @param {object} recipes - The data to be saved.
     * @param {object} options - Additional options.
     * @param {string} options.userId - The user making the saving request.
     * @param {object} options.fileInfo - Information about the file.
     */
    static async saveDataToFile(folder, file, recipes, options = {}) {
        const { userId = game.user.id, fileInfo = { system: game.system.id, world: game.world.id } } = options;
        if (!folder || !file) {
            const notificationData = {
                type: "error",
                message: `${localize("FURU-SC.NOTIFICATIONS.NO_FOLDER_OR_FILE")} | FolderPath = "${folder}" | FilePath = "${file}" |`
            }
            socketNotification(userId, notificationData);
            return;
        }
        if (!recipes) {
            const notificationData = {
                type: "error",
                message: localize("FURU-SC.NOTIFICATIONS.NO_DATA")
            }
            socketNotification(userId, notificationData);
            return;
        }
        await RecipeData.saveDataToJSONFile(recipes, folder, file, { userId: userId, fileInfo: fileInfo });
    }

    /**
     * Saves data to a JSON file.
     *
     * @param {Object} updateData - the data to be saved
     * @param {string} [path=DATA_DEFAULT_FOLDER] - the path of the JSON file
     * @param {string} [filename=RECIPES] - the name of the JSON file
     * @param {Object} [fileInfo={ system: game.system.id, world: game.world.id }] - additional information to be included in the saved data
     * @return {Promise<bool>} This function return's true if saving was successfull.
     */
    static async saveDataToJSONFile(updateData, path = DATA_DEFAULT_FOLDER, filename = RECIPES, options = {}) {
        const { userId = game.user.id, fileInfo = { system: game.system.id, world: game.world.id } } = options;
        const finalData = foundry.utils.mergeObject({ fileInfo: fileInfo }, updateData, { insertKeys: true });
        const safeName = filename.replace(/[\\\/ .,:*?"<>|+\-\%!@]/gi, '_') + ".json";
        const file = new File([JSON.stringify(finalData, null, ' ')], safeName, { type: 'application/json' });
        const response = await FilePicker.upload("data", path, file, {}, { notify: false });
        if (!response.path) {
            console.error(`Could not create recipes JSON: ${safeName}.json\nReason: ${response}`);
            throw new Error('Could not upload recipes data to the server!');
        }
        const message = `${localize("FURU-SC.NOTIFICATIONS.SUCCESSFULL_SAVE")} "${path}/${safeName}"`;
        const notificationData = {
            type: "info",
            message: message
        }
        socketNotification(userId, notificationData);
    }

    /**
     * Retrieves data from a JSON file located at the specified path.
     *
     * @param {string} path - The path to the JSON file. If not provided, a default path will be used.
     * @return {Promise<object|null>} The JSON data retrieved from the file, or null if the data is empty.
     */
    static async loadDataFromJSONFile(path) {
        let jsonPath = path === undefined ? DEFAULT_RECIPES_DATA : path;
        let response;
        try {
            response = await foundry.utils.fetchJsonWithTimeout(jsonPath);
            if (response.error) return ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.FAILED_LOAD") + " " + response.error);
        }
        catch (e) {
            return ui.notifications.error(e);
        }
        if (!response)
            return null;
        return response;
    }
}