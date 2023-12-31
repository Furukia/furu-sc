import { MODULE, DATA_DEFAULT_FOLDER, RECIPES, DEFAULT_RECIPES_DATA } from "./const.js"; //import the const variables
import { CraftMenu } from "./CraftMenu.js";
import { CraftTable } from "./CraftTable.js";
import { getCorrectQuantityPathForItem, processSourceId, getPercentForAllIngredients, localize } from "./helpers.js";
import { socketNotification, socketSaveFile } from "./sockets.js";

/**
 * @typedef {Object} Recipe
 * @property {string} id - The unique identifier for the recipe.
 * @property {string} name - The name of the recipe.
 * @property {string} description - The description of the recipe.
 * @property {string} type - A type of a recipe
 * @property {bool} isVisible - Is a recipe visible right now?
 * @property {bool} editMode - Are we editing this recipe text or not?
 * @property {Object} target - The object that we want to craft.
 * @property {Array<Object>} ingredients - The list of objects we use to craft the target.
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
            target: undefined,
            ingredients: undefined
        };
        let allRecipes = CraftMenu.craftMenu.object || {};
        allRecipes[newRecipe.id] = newRecipe;
        CraftMenu.craftMenu.object = allRecipes;
    }

    /**
    * Searches for recipes based on a search query and updates their visibility in the Craft Menu.
    *
    * @param {string} searchQuery - The search query used to filter the recipes.
    */
    static async searchRecipe(searchQuery) {
        const lowerCaseSearchQuery = searchQuery.toLowerCase();
        const allRecipes = { ...CraftMenu.craftMenu.object };
        let isVisible = false;

        Object.values(allRecipes).forEach(recipe => {
            const searchFields = [
                recipe.name,
                recipe.target?.name,
                recipe.target?.img,
                recipe.description,
                ...(Object.values(recipe.ingredients ?? {}).map(ingredient => ingredient.name)),
                ...(Object.values(recipe.ingredients ?? {}).map(ingredient => ingredient.img))
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

        if (updateData.hasOwnProperty("target")) {
            allRecipes[recipeID].target = updateData.target;
        } else {
            const updatedRecipe = mergeObject(allRecipes[recipeID], updateData, {
                overwrite: true,
                insertKeys: true,
                insertValues: true
            });
            allRecipes[recipeID] = updatedRecipe;
        }

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
     * Resets the recipes mode.
     *
     * This function iterates through all recipes in the craft menu and updates their properties to disable edit mode and make them visible.
     * It calls the `updateRecipe` function for each recipe to perform the update.
     *
     * @return {Promise} A promise that resolves when all the recipes have been updated.
     */
    static async resetRecipesMode() {
        const recipes = CraftMenu.craftMenu.object;
        for (const recipeID in recipes) {
            const updateData = {
                editMode: false,
                isVisible: true
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
        let sourceId = processSourceId(item.flags.core.sourceId);
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
        let itemObject = { ...item.toObject(), _id: undefined, _stats: undefined, folder: undefined, ownership: undefined };
        ingredients[sourceId] = itemObject;
        allRecipes[recipeID].ingredients = ingredients;
        CraftMenu.craftMenu.object = allRecipes;
        CraftMenu.craftMenu.render();
    }

    /**
    * Process the quantity of an item in a recipe or target.
    * @param {string} recipeId - The recipe ID.
    * @param {number} value - The value to add to the item's quantity.
    * @param {Object} options - Additional options.
    * @param {string} options.originalItemId - The original item ID.
    * @param {boolean} options.rewrite - Whether to rewrite the item's quantity instead of adding to it.
    * @param {boolean} options.isTarget - Whether the item is a target or a recipe ingredient.
    */
    static async ProcessQuantity(recipeId, value, options = {}) {
        const allRecipes = CraftMenu.craftMenu.object;
        const { originalItemId = null, rewrite = false, isTarget = true } = options;
        let item;
        if (isTarget) {
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
        if (isTarget) {
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
                content: localize("FURU-SC.DIALOGS.FILE_CREATION.content"),
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
        console.log("fileInfo", fileInfo);
        const finalData = mergeObject({ fileInfo: fileInfo }, updateData, { insertKeys: true });
        const safeName = filename.replace(/[^ a-z0-9-_()[\]<>]/gi, '_');
        const fileName = encodeURI(`${safeName}.json`);
        const file = new File([JSON.stringify(finalData, null, ' ')], fileName, { type: 'application/json' });
        const response = await FilePicker.upload("data", path, file, {}, { notify: false });
        if (!response.path) {
            console.error(`Could not create recipes JSON: ${safeName}.json\nReason: ${response}`);
            throw new Error('Could not upload recipes data to the server!');
        }
        const message = `${localize("FURU-SC.NOTIFICATIONS.SUCCESSFULL_SAVE")} "${path}/${filename}"`;
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

/**
 * @typedef {Object} ingredientInfo
 * @property {string} sourceId - The unique identifier of this ingredient's source item.
 * @property {string} name - The name of the ingredient.
 * @property {string} img - The image URL of the ingredient.
 * @property {string} type - A type of an original item.
 * @property {string} quantityPath - A path to the quantity of an original item.
 * @property {string} currentReqQuantity - A number value representing the current quantity required for this ingredient.
 * @property {number} requiredQuantity - A number value representing the full required quantity of this ingredient to craft with.
 * @property {number} modifier - A number value representing a bonus value we can add/substract from a quantity, to get to the required quantity.
 */

/*
 * CraftingTableData class
 * contains functions needed for the actual crafting process
 */
export class CraftingTableData {

    /**
     * Opens the craft table and sets the selected recipe.
     */
    static async openCraftTable(recipeID) {
        const allRecipes = CraftMenu.craftMenu.object;
        const recipe = allRecipes[recipeID];
        const recipeType = recipe.type;
        // Store the original recipe in the craft table
        CraftTable.craftTable.object = { ...recipe };
        delete CraftTable.craftTable.object.id;
        CraftTable.craftTable.ingredients = {};
        const userActorsObject = await CraftingTableData.getPlayerActorList();
        if (!userActorsObject)
            return;
        CraftTable.craftTable.userActorsData = userActorsObject;
        let options = {};
        // Have some plans to add more types in the future, hence the switch/case instead of a simple ternary/if
        switch (recipeType) {
            case "text":
                options = {
                    height: 250
                }
                break;
            case "items":
                options = {
                    height: 700
                }
                //Create an ingredientsInfo object's with the necessary information
                CraftTable.craftTable.ingredients = await this.getIngredientInfo(recipe.ingredients);
                await CraftingTableData.checkIngredients();
                break;
            default:
                options = {
                    height: 700
                }
                break;
        }
        CraftTable.craftTable.render(true, options);
    }

    /**
     * Retrieves condensed information about ingredients.
     *
     * @param {Object} ingredients - The ingredients object.
     * @return {Object} - The information about the ingredients.
     */
    static async getIngredientInfo(ingredients) {
        if (!ingredients) return {};
        let ingredientsArray = Object.values(ingredients);
        let ingredientsInfo = {};
        ingredientsArray.forEach(ingredient => {
            let sourceId = processSourceId(ingredient.flags.core.sourceId);
            const pathObject = getCorrectQuantityPathForItem(ingredient.type);
            const path = pathObject.path;
            const currentQuantity = foundry.utils.getProperty(ingredient, path);
            ingredientsInfo[sourceId] = {
                sourceId: sourceId,
                name: ingredient.name,
                img: ingredient.img,
                type: ingredient.type,
                quantityPath: path,
                currentReqQuantity: currentQuantity,
                requiredQuantity: currentQuantity,
                modifier: 0
            }
        })
        return ingredientsInfo;
    }

    /**
     * Retrieves a list of player actors.
     *
     * @return {Object} - An object containing the current active actor and the list of owned actors.
     */
    static async getPlayerActorList() {
        const userID = game.user.id;
        let activeActor = game.user.character;
        let actorList = game.actors;
        let ownedActorList = {};
        actorList.forEach(actor => {
            let owners = actor.ownership;
            if (owners && owners.hasOwnProperty(userID)) {
                ownedActorList[actor.id] = actor;
            }
        });
        if (!Object.keys(ownedActorList).length) {
            ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.NO_OWNED_ACTOR"));
            return null;
        }
        if (!activeActor) {
            activeActor = ownedActorList[Object.keys(ownedActorList)[0]];
        }
        return { selectedActor: activeActor, ownedActors: ownedActorList };
    }

    /**
    * Checks the ingredients of the specified actor against the recipe at the craft table.
    * Then updates the ingredients of the object accordingly.
    * @param {Object} actor - The actor whose ingredients will be checked.
    */
    static async checkIngredients() {
        const ingredientsInfo = CraftTable.craftTable.ingredients;
        const selectedActor = CraftTable.craftTable.userActorsData.selectedActor;
        const actorItems = selectedActor.items;
        // Why change "length" to "size" foundry...
        if (!actorItems.size) {
            ui.notifications.error(`"${selectedActor.name}" - ${localize("FURU-SC.NOTIFICATIONS.ACTOR_NO_ITEMS")}`);
            return;
        }
        actorItems.forEach(item => {
            // if we don't have a source, we just use the actual item's id
            // Because most of the system allow's creating item's directly in the actor's sheet
            // Those item's can be considered the source if they were used while creating a recipe
            const sourceId = item.flags?.core?.sourceId ? processSourceId(item.flags.core.sourceId) : item.id;
            if (ingredientsInfo.hasOwnProperty(sourceId)) {
                const pathObject = getCorrectQuantityPathForItem(item.type);
                const currentQuantity = foundry.utils.getProperty(item, pathObject.path);
                const requiredQuantity = ingredientsInfo[sourceId].requiredQuantity;
                const quantityModifier = ingredientsInfo[sourceId].modifier;
                const finalQuantity = Math.max(0, requiredQuantity - currentQuantity - quantityModifier);
                ingredientsInfo[sourceId].currentReqQuantity = finalQuantity;
            }
        })
    }


    /**
     * Crafts an item based on the selected actor and recipe.
     *
     * @return {Promise<void>} This function does not return a value.
     */
    static async craftItem() {
        const recipe = CraftTable.craftTable.object;
        if (recipe.type !== "items" && getPercentForAllIngredients() !== 100)
            return;
        const selectedActor = CraftTable.craftTable.userActorsData.selectedActor;
        let craftedItem = recipe.target;
        const actorItems = selectedActor.items;
        const pathObject = getCorrectQuantityPathForItem(craftedItem.type);
        const craftedItemSourceId = processSourceId(craftedItem.flags.core.sourceId);
        // Check if the actor has the craftedItem and if it has, modify it's quantity, else craft it anew
        // if we already have that type of item in the inventory, we don't need to create it
        // if we use the "flag" quantity handling type tho, we need to.
        let craftNewItem = true;
        if (pathObject.type === "system") {
            actorItems.forEach(async function (item) {
                if (item.type !== craftedItem.type) return;
                const sourceId = item.flags?.core?.sourceId ? processSourceId(item.flags.core.sourceId) : item.id;
                if (sourceId !== craftedItemSourceId) return;
                craftNewItem = false;
                const currentQuantity = foundry.utils.getProperty(item, pathObject.path);
                const addQuantity = foundry.utils.getProperty(craftedItem, pathObject.path);
                let finalQuantity = currentQuantity + addQuantity;
                await item.update({ [pathObject.path]: finalQuantity });
            })
        }
        if (craftNewItem) {
            await getDocumentClass("Item").create(craftedItem, { parent: selectedActor });
        }
        ui.notifications.info(`${localize("FURU-SC.NOTIFICATIONS.CRAFTED")} ${craftedItem.name}!`);
    }

    /**
     * Process the quantity of ingredients on craft.
     *
     * @return {Promise<void>} This function does not return a value.
     */
    static async processIngredientsQuantityOnCraft() {
        const selectedActor = CraftTable.craftTable.userActorsData.selectedActor;
        const recipe = CraftTable.craftTable.object;
        // Get all the items that match recipe.ingredients in actor, and lower it's quantity according to recipe.ingredients quantity.
        // If it becomes 0 delete it.
        const actorItems = selectedActor.items.map(a => a);
        for (let i = 0; i < actorItems.length; i++) {
            const item = actorItems[i];
            // if we don't have a source, we just use the actual item's id
            // Because most of the system allow's creating item's directly in the actor's sheet
            // Those item's can be considered the source if they were used while creating a recipe
            const sourceId = item.flags?.core?.sourceId ? processSourceId(item.flags.core.sourceId) : item.id;
            if (recipe.ingredients.hasOwnProperty(sourceId)) {
                const pathObject = getCorrectQuantityPathForItem(item.type);
                const currentQuantity = foundry.utils.getProperty(item, pathObject.path);
                const requiredQuantity = foundry.utils.getProperty(recipe.ingredients[sourceId], pathObject.path);
                let finalQuantity = Math.max(0, currentQuantity - requiredQuantity);
                await item.update({ [pathObject.path]: finalQuantity });
                if (finalQuantity === 0) {
                    item.delete();
                }
            }
        }
    }
}