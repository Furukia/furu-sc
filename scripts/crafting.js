import { MODULE, DATA_DEFAULT_FOLDER, RECIPES, DEFAULT_RECIPES_DATA } from "./const.js"; //import the const variables
import { CraftMenu } from "./CraftMenu.js";
import { getCorrectQuantityPathForItem, getNestedValue, setNestedValue, processSourceId } from "./helpers.js";

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
            name: "New recipe",
            description: "Fill me in!",
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
            ui.notifications.notify("Found no recipes for the search query");
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
        if (currentName !== "New recipe" && !!currentName) {
            return;
        }
        const updateData = {
            name: newName
        }
        await this.updateRecipe(recipeID, updateData);
    }

    /**
     * Edits a recipe by toggling its edit mode on or off.
     *
     * @param {number} recipeID - The ID of the recipe to edit.
     */
    static async editRecipe(recipeID) {
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
        let itemObject = { ...item.toObject(), _id: undefined };
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
    * @returns {Promise<void>} - A promise that resolves once the quantity has been processed.
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
        const pathObject = getCorrectQuantityPathForItem(item);
        const path = pathObject.path;
        const currentQuantity = getNestedValue(item, path);
        const numericValue = Number(value);
        const numericCurrentQuantity = Number(currentQuantity);
        const updatedQuantity = rewrite ? numericValue : numericCurrentQuantity + numericValue;
        item = await setNestedValue(item, path, Math.max(1, updatedQuantity));
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
            title: 'Confirm',
            content: `<p>This will delete all the data from the file. Are you sure?</p>`,
        });
        if (!shouldDeleteData)
            return;

        CraftMenu.craftMenu.object = {};
        this.saveDataToFile();
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
                title: 'File creation',
                content: `<p>Please name a new file.</p>
            <input type="text" style="margin-top:6px; margin-bottom:6px;">`,
                callback: (html) => html.find('input').val()
            })
            if (!fileName)
                return;
        }
        RecipeData.saveDataToJSONFile({}, jsonPath, fileName);
        game.settings.set(MODULE, 'current-file', fileName);
        if (CraftMenu.craftMenu)
            CraftMenu.craftMenu.object = {};
    }

    /**
     * Saves data to a file.
     *
     * @param {boolean} isQuiet - indicates whether to display notifications or not (default: false)
     */
    static async saveDataToFile(isQuiet = false) {
        const folder = game.settings.get(MODULE, 'save-path');
        const file = game.settings.get(MODULE, 'current-file');

        if (!folder || !file) {
            ui.notification.error(`Can't get the current folder and/or file. | FolderPath = ${folder} | FilePath = ${file} |`);
            return;
        }

        const recipes = CraftMenu.craftMenu.object;
        for (const recipeID in recipes) {
            const updateData = {
                editMode: false,
                isVisible: true
            };
            await RecipeData.updateRecipe(recipeID, updateData);
        }

        await RecipeData.saveDataToJSONFile(recipes, folder, file, isQuiet, CraftMenu.craftMenu.fileInfo);
    }

    /**
     * Saves data to a JSON file.
     *
     * @param {Object} updateData - the data to be saved
     * @param {string} [path=DATA_DEFAULT_FOLDER] - the path of the JSON file
     * @param {string} [filename=RECIPES] - the name of the JSON file
     * @param {boolean} [isQuiet=false] - indicates whether to display notifications
     * @param {Object} [fileInfo={ system: game.system.id, world: game.world.id }] - additional information to be included in the saved data
     */
    static async saveDataToJSONFile(updateData, path = DATA_DEFAULT_FOLDER, filename = RECIPES, isQuiet = false, fileInfo = { system: game.system.id, world: game.world.id }) {
        const finalData = mergeObject({ fileInfo: fileInfo }, updateData, { insertKeys: true });
        const safeName = filename.replace(/[^ a-z0-9-_()[\]<>]/gi, '_');
        const fileName = encodeURI(`${safeName}.json`);
        const file = new File([JSON.stringify(finalData, null, ' ')], fileName, { type: 'application/json' });
        const response = await FilePicker.upload("data", path, file, {}, { notify: false });
        if (!response.path) {
            console.error(`Could not create recipes JSON: ${safeName}.json\nReason: ${response}`);
            throw new Error('Could not upload recipes data to the server!');
        }
        if (!isQuiet) {
            ui.notifications.notify(`Successfully saved file: "${path}/${fileName}"`);
        }
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
            if (response.error) return ui.notifications.error(response.error);
        }
        catch (e) {
            return ui.notifications.error(e);
        }
        let jsonData = response;
        if (!jsonData)
            return null;
        return jsonData;
    }
}