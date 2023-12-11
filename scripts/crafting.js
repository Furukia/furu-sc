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
        CraftMenu.craftMenu.searchQuery = searchQuery;
        searchQuery = searchQuery.toLowerCase();
        // Get all existing recipes
        let allRecipes = CraftMenu.craftMenu.object;
        const allRecipesArray = Object.values(allRecipes);

        // Perform the search
        let isVisible = false;
        allRecipesArray.forEach(recipe => {
            let recipeIsVisible = false;
            if (searchQuery === "" || !searchQuery) {
                recipeIsVisible = true;
            } else {
                const searchFields = [
                    recipe.name,
                    recipe.target?.name,
                    recipe.target?.img,
                    recipe.description,
                    ...(Object.values(recipe.ingredients ?? {}) ?? []).map(ingredient => ingredient.name),
                    ...(Object.values(recipe.ingredients ?? {}) ?? []).map(ingredient => ingredient.img)
                ];

                recipeIsVisible = searchFields.some(field =>
                    field?.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }

            recipe.isVisible = recipeIsVisible;
            isVisible = isVisible || recipeIsVisible;
        });
        // Make all elements visible if none of them match the search query
        if (!isVisible) {
            allRecipesArray.forEach(recipe => {
                recipe.isVisible = true;
            });
            ui.notifications.notify("Found no recipes for the search query");
        }
        // Update the data
        CraftMenu.craftMenu.object = allRecipes;
    }

    /**
     * Updates a recipe with the provided recipe ID and update data.
     *
     * @param {string} recipeID - The ID of the recipe to be updated.
     * @param {object} updateData - The data to be updated in the recipe.
     */
    static async updateRecipe(recipeID, updateData) {
        // Get all the recipes
        const allRecipes = CraftMenu.craftMenu.object;
        if (!allRecipes.hasOwnProperty(recipeID)) {
            // If the recipe doesn't exist, log an error message
            console.error(`${MODULE} | Recipe with id ${recipeID} not found`);
            return;
        }
        // Check if the updateData has a "target" property
        if (updateData.hasOwnProperty("target")) {
            // If it does, update the "target" property of the recipe
            allRecipes[recipeID].target = updateData.target;
        } else {
            // If it doesn't, merge the updateData with the existing recipe data
            const updatedRecipe = mergeObject(allRecipes[recipeID], updateData, {
                overwrite: true,
                insertKeys: true,
                insertValues: true
            });
            // Update the recipe with the merged data
            allRecipes[recipeID] = updatedRecipe;
        }
        // Update the CraftMenu object with the updated recipes
        CraftMenu.craftMenu.object = allRecipes;
    }

    static async updateRecipes(updateData) {
        // update each recipe with the provided data
        for (const recipeID in updateData) {
            if (updateData.hasOwnProperty(recipeID)) {
                await this.updateRecipe(recipeID, updateData[recipeID]);
            }
        }
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
        let itemObject = item.toObject();
        delete itemObject["_id"];
        console.log("itemObject", itemObject);
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
        console.log("options", options);
        console.log("originalItemId", originalItemId);
        console.log("rewrite", rewrite);
        console.log("isTarget", isTarget);
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
        item = await setNestedValue(item, path, updatedQuantity);
        if (isTarget) {
            allRecipes[recipeId].target = item;
        } else {
            allRecipes[recipeId].ingredients[originalItemId] = item;
        }
        CraftMenu.craftMenu.object = allRecipes;
        CraftMenu.craftMenu.render();
    }

    static async deleteIngredient(recipeID, itemID) {
        // get all existing recipes
        let allRecipes = CraftMenu.craftMenu.object;
        let ingredients = allRecipes[recipeID].ingredients;
        // deleting the ingredient
        delete ingredients[itemID];
        allRecipes[recipeID].ingredients = ingredients;
        // update the data with the updated ingredient list
        CraftMenu.craftMenu.object = allRecipes;
    }

    static async deleteRecipe(recipeID) {
        // get all existing recipes
        const allRecipes = CraftMenu.craftMenu.object;

        // delete the relevant recipe from the existing recipes
        delete allRecipes[recipeID];

        // update the data with the updated recipe list
        CraftMenu.craftMenu.object = allRecipes;
    }


    static async clearAllRecipes() {
        let confirmation = await Dialog.confirm({
            title: 'Confirm',
            content: `<p>This will delete all the data from the file. Are you sure?</p>`,
        });
        if (!confirmation)
            return;
        CraftMenu.craftMenu.object = {};
        this.saveDataToFile();
    }

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

    static async saveDataToFile(isQuiet = false) {
        const folder = game.settings.get(MODULE, 'save-path');
        const file = game.settings.get(MODULE, 'current-file');
        if (!folder || !file) {
            ui.notification.error(`Can't get the current folder and/or file. | FolderPath = ${folder} | FilePath = ${file} |`);
            return;
        }
        // Turn off editMode for every recipe on saving
        // And make them visible
        for (const recipeID in CraftMenu.craftMenu.object) {
            let updateData = {
                editMode: false,
                isVisible: true
            }
            await RecipeData.updateRecipe(recipeID, updateData);
        }
        await RecipeData.saveDataToJSONFile(CraftMenu.craftMenu.object, folder, file, isQuiet, CraftMenu.craftMenu.fileInfo);
    }

    /**
     * TODO: Description placeholder
     * @static
     * @async
     * @param {object} updateData - The data object we convert to JSON and then save
     * @param {string} path - The path where to save the JSON file
     */
    static async saveDataToJSONFile(updateData, path, filename, isQuiet = false, fileInfo = null) {
        let jsonPath = path === undefined ? DATA_DEFAULT_FOLDER : path;
        let jsonFilename = filename === undefined ? RECIPES : filename

        //delete updateData["searchQuery"]; //TODO: add search query where needed, to track it
        if (!fileInfo) {
            fileInfo = {
                system: game.system.id,
                world: game.world.id
            }
        }
        const finalData = mergeObject({ fileInfo: fileInfo }, updateData, { insertKeys: true });
        console.log("Saving data comparison:", updateData, finalData);
        // Replace special characters in name to underscores
        const safeName = jsonFilename.replace(/[^ a-z0-9-_()[\]<>]/gi, '_');
        // Generate the system safe filename
        const fileName = encodeURI(`${safeName}.json`);
        console.log("saving - dataJSONstring:", JSON.stringify(finalData, null, ' '));
        const file = new File([JSON.stringify(finalData, null, ' ')], fileName, { type: 'application/json' });
        const response = await FilePicker.upload("data", jsonPath, file, {}, { notify: false });
        if (!response.path) {
            console.error(`Could not create recipes JSON: ${safeName}.json\nReason: ${response}`);
            throw new Error('Could not upload recipes data to the server!');
        }
        if (!isQuiet)
            ui.notifications.notify(`Successfully saved file: \"${jsonPath}/${fileName}\"`);
    }
    /**
     * Load's data from the JSON file with the optional path to the file.
     * Load's from the module default path if no path provided. 
     * Return null if no data was loaded.
     * @static
     * @async
     * @param {string} path - An optional path to JSON file
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
        console.log("loadDataFromJSONFile - jsonData:", jsonData);
        return jsonData;

    }
}