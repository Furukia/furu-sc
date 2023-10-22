

import { MODULE, CRAFT_MENU_TEMPLATE, CRAFT_MENU_ID } from "./const.js"; //import the const variables
import { RecipeData } from "./crafting.js";
import { getFileNames, getFullFilePath } from "./helpers.js";
export class CraftMenu extends FormApplication {

    activateListeners(html) {
        super.activateListeners(html);
        html.on('click', "[data-select]", this._handleSelectClick.bind(this));
        html.on('click', "[data-action]", this._handleButtonClick.bind(this));
        html.on('keydown', "[data-input]", this._handleSearchInput.bind(this));
    }

    static get defaultOptions() {
        const defaults = super.defaultOptions;

        const overrides = {
            closeOnSubmit: false, // do not close when submitted
            submitOnChange: true, // submit when any input changes
            height: 600,
            width: 800,
            resizable: true,
            id: CRAFT_MENU_ID,
            template: CRAFT_MENU_TEMPLATE,
            title: 'Craft menu',
            dragDrop: [{
                dropSelector: `.target-item-container, 
        .target-item-container .target-image, 
        .items-container .required-item-container,
        .items-container .required-item-container .required-image,
        .items-container .required-item-container > p`
            }]
        };

        const mergedOptions = foundry.utils.mergeObject(defaults, overrides);

        return mergedOptions;
    }

    /**
     * Initializes the CraftMenu
     *
     * @static
     * @async
     * @returns {void}
     */
    static async initialize() {
        console.log(`${MODULE} | initializing Craft Menu.`);
        const dataPath = await getFullFilePath();
        console.log("CraftMenu - dataPath:", dataPath);
        const data = await RecipeData.loadDataFromJSONFile(dataPath);
        console.log("CraftMenu - data:", data);
        if (!data) {
            ui.notifications.error(`Failed to load data for the Craft Menu on initialization!`);
            return;
        }
        this.craftMenu = new CraftMenu(data);
    }

    async _updateObject(event, formData) {
        const expandedData = foundry.utils.expandObject(formData);
        console.log("_updateObject - expandedData", expandedData);
        await RecipeData.updateRecipes(expandedData);
        this.render();
    }

    async _handleSearchInput(event) {
        if (event.key !== "Enter")
            return;
        const clickedElement = event.currentTarget;
        const action = clickedElement.dataset.input;
        console.log("action", action);
        const value = clickedElement.value.toLowerCase();
        console.log("value", value);
        await RecipeData.searchRecipe(value);
        this.render();
    }
    async _handleSelectClick(event) {
        const clickedElement = event.currentTarget;
        const action = clickedElement.dataset.select;
        console.log("action", action);
        const value = clickedElement.value;
        console.log("value", value);
        switch (action) {
            case 'select_file':
                {
                    const currentFile = game.settings.get(MODULE, 'CurrentFile');
                    console.log("currentFile", currentFile);
                    if (currentFile === value) return;
                    //First - save the data of the current file
                    await RecipeData.saveDataToFile(true);
                    //Only after that we change settings and load the data for the chosen file
                    game.settings.set(MODULE, 'CurrentFile', value);
                    const dataPath = await getFullFilePath();
                    console.log("_handleSelectClick - dataPath", dataPath);
                    this.object = await RecipeData.loadDataFromJSONFile(dataPath);
                    this.render();
                    break;
                }
            default:
                {
                    console.log('Invalid action detected', { action, value });
                    break;
                }
        }
    }

    async _handleButtonClick(event) {
        const clickedElement = $(event.currentTarget);
        const action = clickedElement.data().action;
        const recipeID = clickedElement.parents('[data-recipe-id]')?.data()?.recipeId;
        switch (action) {
            case 'add_recipe':
                {
                    if (!game.user.isGM)
                        return;
                    await RecipeData.createRecipe(this);
                    this.render();
                    break;
                }
            case `save-recipe-file`:
                {
                    await RecipeData.saveDataToFile();
                    this.render();
                    break;
                }
            case "create-recipe-file":
                {
                    await RecipeData.createRecipeFile();
                    this.render();
                    break;
                }
            case "clear-recipe-file":
                {
                    await RecipeData.clearAllRecipes();
                    this.render();
                    break;
                }
            case "craft_from_recipe":
                {
                    //TODO:
                    break;
                }
            case 'edit_recipe':
                {
                    if (!game.user.isGM)
                        return;
                    await RecipeData.editRecipe(recipeID);
                    this.render();
                    break;
                }
            case 'save_recipe':
                {
                    if (!game.user.isGM)
                        return;
                    let container = clickedElement.parents('div.recipe-card');
                    //find the editor
                    let editorContent = container.find('iframe.tox-edit-area__iframe');
                    // Get the data
                    let bodyElement = editorContent[0].contentDocument.body.innerHTML;
                    let updateData = {
                        description: bodyElement,
                        editMode: false
                    }
                    await RecipeData.updateRecipe(recipeID, updateData);
                    this.render();
                    break;
                }
            case 'delete_recipe':
                {
                    if (!game.user.isGM)
                        return;
                    const confirmed = await Dialog.confirm({
                        title: "Confirm Deletion",
                        content: "Are you sure you want to delete this recipe? This action cannot be undone."
                    });

                    if (confirmed) {
                        await RecipeData.deleteRecipe(recipeID);
                        this.render();
                        break;
                    }
                }
            case 'delete_item':
                {
                    if (!game.user.isGM)
                        return;
                    const itemID = clickedElement.closest('[data-item-id]')?.data()?.itemId;
                    await RecipeData.deleteIngredient(recipeID, itemID);
                    this.render();
                    break;
                }
            default: {
                console.log('Invalid action detected', { action, recipeID });
                break;
            }
        }
    }

    async _onDrop(event) {
        //console.log("_onDrop called");
        //console.log(event);
        let data = TextEditor.getDragEventData(event);
        //console.log(data);
        //Getting an actual item data
        //console.log(Item.implementation.fromDropData(data));
        let element = event.target.closest("[data-recipe-id]");
        //console.log("element: ", element);
        // Get the recipe ID from the data attribute
        const recipeID = element ? element.dataset.recipeId : null;
        //console.log("recipeID:", recipeID);
        let dropTargetClass = event.target.className;
        //console.log("dropTargetClass:", dropTargetClass);
        let dropType = "target";
        if (dropTargetClass !== "target-item-container" && dropTargetClass !== "target-image") {
            dropType = "ingredient";
        }
        let updateData;
        switch (dropType) {
            case 'target':
                {
                    updateData = {
                        target: await Item.implementation.fromDropData(data)
                    };
                    await RecipeData.updateRecipe(recipeID, updateData);
                    this.render();
                    break;
                }
            case 'ingredient':
                {
                    let allRecipes = this.object;
                    let ingredientsLoaded = allRecipes[recipeID].ingredients;
                    let ingredients = [];
                    if (ingredientsLoaded !== undefined) {
                        Object.values(ingredientsLoaded).forEach(ingredient => {
                            if (ingredient === undefined || ingredient === null || ingredient.length === 0)
                                return;
                            ingredients.push(ingredient);
                        })
                    }
                    ingredients.push(await Item.implementation.fromDropData(data));
                    updateData = {
                        ingredients: ingredients
                    };
                    await RecipeData.updateRecipe(recipeID, updateData);
                    this.render();
                    break;
                }
            default:
                break;
        }
    }

    async close() {
        // Turn off editMode for every recipe on closing
        for (const recipeID in RecipeData.loadDataFromJSONFile()) {
            let updateData = {
                editMode: false
            }
            RecipeData.updateRecipe(recipeID, updateData);
        }
        let confirmation = await Dialog.confirm({
            title: 'Save',
            content: `<p>Save your progress?</p>`,
        });
        if (confirmation)
            RecipeData.saveDataToFile();
        super.close();
    }

    async getData() {
        const recipes = this.object;
        const fileNames = await getFileNames();
        return {
            recipes: recipes,
            fileNames: fileNames
        };
    }
}


