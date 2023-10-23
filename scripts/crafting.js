import { MODULE, DATA_DEFAULT_FOLDER, RECIPES, DEFAULT_RECIPES_DATA } from "./const.js"; //import the const variables
import { CraftMenu } from "./CraftMenu.js";

/**
 * @typedef {Object} Recipe
 * @property {string} id - The unique identifier for the recipe.
 * @property {string} name - The name of the recipe.
 * @property {string} description - The description of the recipe.
 * @property {string} type - A type of a recipe
 * @property {bool} isVisible - Is a recipe visible for player's?
 * @property {bool} editMode - Are we editing this recipe or not?
 * @property {Object} target - The object that we want to craft.
 * @property {Array<Object>} ingredients - The list of objects we use to craft the target.
 */

/*
 * RecipeData class
 * contains functions to create/update/delete/clear recipes
 */
export class RecipeData {

    static async createRecipe() {
        // generate a random id for this new data and populate the database
        const newRecipe = {
            id: foundry.utils.randomID(16),
            name: "New recipe",
            description: "Fill me in!",
            type: "text",
            isVisible: true,
            editMode: false,
            target: undefined,
            ingredients: undefined
        }
        // get all existing recipes
        let allRecipes = CraftMenu.craftMenu.object;
        console.log("createRecipe - allRecipes", allRecipes);

        if (allRecipes === null || allRecipes === undefined) {
            allRecipes = {};
            ui.notifications.error('Failed to load recipe list! Creating a new file...');
        }

        // add the new recipe to the existing recipes
        allRecipes[newRecipe.id] = newRecipe;

        // Update the data
        CraftMenu.craftMenu.object = allRecipes;
    }

    static async searchRecipe(searchQuery) {
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
                    ...(recipe.ingredients ?? []).map(ingredient => ingredient.name),
                    ...(recipe.ingredients ?? []).map(ingredient => ingredient.img)
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
        }
        // Update the data
        CraftMenu.craftMenu.object = allRecipes;
    }

    static async updateRecipe(recipeID, updateData) {
        // get all existing recipes
        //const allRecipes = await this.loadDataFromJSONFile();

        const allRecipes = CraftMenu.craftMenu.object;

        // update the recipe with the provided id
        if (allRecipes.hasOwnProperty(recipeID)) {
            let updatedRecipe;
            // merge the existing recipe data with the updated data
            updatedRecipe = mergeObject(allRecipes[recipeID], updateData, { overwrite: true, insertKeys: true, insertValues: true });

            //console.log("updatedRecipe:", updatedRecipe)
            // update the recipe with the merged data
            allRecipes[recipeID] = updatedRecipe;

            // Update the data
            CraftMenu.craftMenu.object = allRecipes;
        } else {
            console.error(`${MODULE} | Recipe with id ${recipeID} not found`);
        }
    }

    static async updateRecipes(updateData) {
        // update each recipe with the provided data
        for (const recipeID in updateData) {
            if (updateData.hasOwnProperty(recipeID)) {
                await this.updateRecipe(recipeID, updateData[recipeID]);
            }
        }
    }

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

    static async deleteIngredient(recipeID, itemID) {
        // get all existing recipes
        //let allRecipes = await this.loadDataFromJSONFile();

        let allRecipes = CraftMenu.craftMenu.object;
        // form a new list of ingredients
        let updateData = {
            ingredients: []
        };
        //("updateData:", updateData);
        allRecipes[recipeID].ingredients.forEach(ingredient => {
            if (ingredient._id !== itemID) {
                updateData.ingredients.push(ingredient);
            }
        });
        allRecipes[recipeID].ingredients = updateData.ingredients;
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

    static async createRecipeFile(path) {
        let jsonPath = path === undefined ? DATA_DEFAULT_FOLDER : path;
        let fileName = await Dialog.prompt({
            title: 'File creation',
            content: `<p>Please name a new file.</p>
            <input type="text" style="margin-top:6px; margin-bottom:6px;">`,
            callback: (html) => html.find('input').val()
        })
        if (!fileName)
            return;
        this.saveDataToJSONFile({}, jsonPath, fileName);
        CraftMenu.craftMenu.object = {};
    }

    static async saveDataToFile(isQuiet = false) {
        const folder = game.settings.get(MODULE, 'SavePath');
        const file = game.settings.get(MODULE, 'CurrentFile');
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
        await RecipeData.saveDataToJSONFile(CraftMenu.craftMenu.object, folder, file, isQuiet);
    }

    /**
     * Description placeholder
     * @static
     * @async
     * @param {object} updateData - The data object we convert to JSON and then save
     * @param {string} path - The path where to save the JSON file
     */
    static async saveDataToJSONFile(updateData, path, filename, isQuiet = false) {
        let jsonPath = path === undefined ? DATA_DEFAULT_FOLDER : path;
        let jsonFilename = filename === undefined ? RECIPES : filename

        const systemID = game.system.id;
        const worldID = game.world.id;
        const finalData = mergeObject({ system: systemID, world: worldID }, updateData, { insertKeys: true });

        // Replace special characters in name to underscores
        const safeName = jsonFilename.replace(/[^ a-z0-9-_()[\]<>]/gi, '_');
        // Generate the system safe filename
        const fileName = encodeURI(`${safeName}.json`);
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
        //console.log(response);
        let jsonData = response;

        if (jsonData !== undefined || foundry.data.validators.isJSON(jsonData)) {
            if (jsonData.system != game.system.id) {
                ui.notifications.error('This recipes file was made in another game system. Item\'s probably won\'t be compatible at all!');
            }
            if (jsonData.world != game.world.id) {
                ui.notifications.error('This recipes file was made in another world. There is a possibility of item conflicts!');
            }
            delete jsonData["system"];
            delete jsonData["world"];
            console.log("loadDataFromJSONFile - jsonData:", jsonData);
            return jsonData;
        }
        return null;
    }
}