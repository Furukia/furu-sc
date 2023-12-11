

import { MODULE, CRAFT_MENU_TEMPLATE, CRAFT_MENU_ID } from "./const.js"; //import the const variables
import { RecipeData } from "./crafting.js";
import { getFileNames, getFullFilePath } from "./helpers.js";
export class CraftMenu extends FormApplication {

    /**
     * Activate event listeners for the provided HTML element.
     *
     * @param {HTMLElement} html - The HTML element to activate listeners on.
     */
    activateListeners(html) {
        super.activateListeners(html);
        html.on('click', "[data-select]", this._handleSelectClick.bind(this));
        html.on('click', "[data-action]", this._handleButtonClick.bind(this));
        html.on('keydown', "[data-input]", this._handleInputEnter.bind(this));
    }

    /**
     * Returns the default options for the App.
     *
     * @return {Object} The default options object.
     */
    static get defaultOptions() {
        const defaults = super.defaultOptions;

        const overrides = {
            closeOnSubmit: false, // do not close when submitted
            submitOnChange: true, // submit when any input changes
            height: 800,
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
     * Initializes the Craft Menu.
     */
    static async initialize() {
        console.log(`${MODULE} | initializing Craft Menu.`);
        const dataPath = await getFullFilePath();
        let data = await RecipeData.loadDataFromJSONFile(dataPath);
        let fileInfo = {
            system: game.system.id,
            world: game.world.id
        };
        if (!data) {
            console.warn(`${MODULE} | Failed to load data for the Craft Menu on initialization! The file is probably empty.`);
            data = {};
        }
        else {
            fileInfo = data.fileInfo;
            delete data["fileInfo"];
        }
        this.craftMenu = new CraftMenu(data);
        this.craftMenu.fileInfo = fileInfo;
        this.craftMenu.searchQuery = null;
    }

    /**
     * Updates the object asynchronously.
     *
     * @param {Object} event - the event object
     * @param {Object} formData - the form data object
     * @return {Promise} a promise that resolves when the object is updated
     */
    async _updateObject(event, formData) {
        const expandedData = foundry.utils.expandObject(formData);
        const searchInput = document.getElementById('sc-search');
        // Handle search
        if (this.searchQuery !== searchInput.value)
            await RecipeData.searchRecipe(searchInput.value);
        await RecipeData.updateRecipes(expandedData);
        await this.render();
    }

    /**
     * Handles the event when the Enter key is pressed in the input field.
     *
     * @param {Event} event - The event object representing the key press event.
     */
    async _handleInputEnter(event) {
        if (event.key !== "Enter") return;
        const input = event.currentTarget;
        const action = input.dataset.input;
        const value = input.value;
        const recipeID = $(input).parents('[data-recipe-id]').data('recipeId');
        switch (action) {
            case 'search_recipe':
                await RecipeData.searchRecipe(value);
                this.render();
                break;
            case `change_quantity_target`:
                if (isNaN(value)) {
                    ui.notifications.error("Please enter a valid number");
                    return;
                }
                RecipeData.ProcessQuantity(recipeID, value, { rewrite: true, isTarget: true });
                break;
            case 'change_quantity':
                const itemID = $(input).parents('[data-item-id]').data('itemId');
                if (isNaN(value)) {
                    ui.notifications.error("Please enter a valid number");
                    return;
                }
                RecipeData.ProcessQuantity(recipeID, value, { originalItemId: itemID, rewrite: true, isTarget: false });
                break;
            default:
                console.log(`${MODULE} | Invalid action detected:`, { action, value });
                break;
        }
    }

    /**
     * Handles the click event on the select element.
     *
     * @param {Event} event - The click event.
     */
    async _handleSelectClick(event) {
        const clickedElement = event.currentTarget;
        const action = clickedElement.dataset.select;
        const value = clickedElement.value;
        switch (action) {
            case 'select_file':
                const currentFile = game.settings.get(MODULE, 'current-file');
                if (currentFile === value) return;
                // Save the data of the current file
                await RecipeData.saveDataToFile(true);
                // Change settings and load the data for the chosen file
                game.settings.set(MODULE, 'current-file', value);
                const dataPath = await getFullFilePath();
                let data = await RecipeData.loadDataFromJSONFile(dataPath);
                // Handling important file info
                this.fileInfo = data.fileInfo;
                delete data.fileInfo;
                this.object = data;
                this.render();
                break;
            default:
                console.log(`${MODULE} | Invalid action detected:`, { action, value });
                break;
        }
    }

    /**
     * Handles the click event on a button.
     *
     * @param {Object} event - The click event object.
     */
    async _handleButtonClick(event) {
        const clickedElement = $(event.currentTarget);
        const action = clickedElement.data().action;
        const recipeID = clickedElement.parents('[data-recipe-id]')?.data()?.recipeId;
        let itemID;
        switch (action) {
            case 'add_recipe':
                await RecipeData.createRecipe(this);
                this.render();
                break;
            case 'add_quantity_target':
                RecipeData.ProcessQuantity(recipeID, 1, { isTarget: true });
                break;
            case 'substract_quantity_target':
                RecipeData.ProcessQuantity(recipeID, -1, { isTarget: true });
                break;
            case 'add_quantity':
                itemID = clickedElement.closest('[data-item-id]')?.data()?.itemId;
                RecipeData.ProcessQuantity(recipeID, 1, { originalItemId: itemID, isTarget: false });
                break;
            case 'substract_quantity':
                itemID = clickedElement.closest('[data-item-id]')?.data()?.itemId;
                RecipeData.ProcessQuantity(recipeID, -1, { originalItemId: itemID, isTarget: false });
                break;
            case 'save-recipe-file':
                await RecipeData.saveDataToFile();
                this.render();
                break;
            case 'create-recipe-file':
                await RecipeData.createRecipeFile();
                this.render();
                break;
            case 'clear-recipe-file':
                await RecipeData.clearAllRecipes();
                this.render();
                break;
            case 'craft_from_recipe':
                //TODO:
                break;
            case 'edit_recipe':
                if (!game.user.isGM) return;
                await RecipeData.editRecipe(recipeID);
                this.render();
                break;
            case 'save_recipe':
                if (!game.user.isGM) return;
                let container = clickedElement.parents('div.recipe-card');
                let editorContent = container.find('iframe.tox-edit-area__iframe');
                let bodyElement = editorContent[0].contentDocument.body.innerHTML;
                let updateData = {
                    description: bodyElement,
                    editMode: false
                }
                await RecipeData.updateRecipe(recipeID, updateData);
                this.render();
                break;
            case 'delete_recipe':
                if (!game.user.isGM) return;
                const confirmedDeletion = await Dialog.confirm({
                    title: 'Confirm Deletion',
                    content: 'Are you sure you want to delete this recipe? This action cannot be undone.'
                });
                if (confirmedDeletion) {
                    await RecipeData.deleteRecipe(recipeID);
                    this.render();
                }
                break;
            case 'delete_item':
                if (!game.user.isGM) return;
                itemID = clickedElement.closest('[data-item-id]')?.data()?.itemId;
                await RecipeData.deleteIngredient(recipeID, itemID);
                this.render();
                break;
            default:
                console.log(`${MODULE} | Invalid action detected:`, { action, recipeID });
                break;
        }
    }

    /**
     * Executes when a drop event occurs.
     *
     * @param {Event} event - The drop event object.
     */
    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);
        const element = event.target.closest("[data-recipe-id]");
        const recipeID = element ? element.dataset.recipeId : null;
        let dropTargetClass = event.target.className.split(" ")[0]; //Important! DragDrop classes should always be the first class
        let dropType = "target";
        if (dropTargetClass !== "target-item-container" && dropTargetClass !== "target-image")
            dropType = "ingredient";
        const item = await Item.implementation.fromDropData(data);
        switch (dropType) {
            case 'target':
                const itemObject = { ...item.toObject(), _id: undefined };
                const updateData = {
                    target: itemObject
                };
                await RecipeData.updateRecipe(recipeID, updateData);
                await RecipeData.tryRecipeNameChange(recipeID, item.name);
                this.render();
                break;
            case 'ingredient':
                const itemSourceID = item.flags.core.sourceId;
                const itemName = item.name;
                const targetItem = this.object[recipeID].target;
                if (targetItem && (targetItem.name === itemName || targetItem.flags.core.sourceId === itemSourceID)) {
                    const confirmation = await Dialog.confirm({
                        title: 'Warning!',
                        content: `<p>Target item and your dragged item have the same name or source item! It's not very logical to craft the item from itself.</p>
                        <p>Are you sure?</p>`,
                    });
                    if (!confirmation)
                        return;
                }
                RecipeData.ProcessIngredient(item, recipeID);
                break;
            default:
                break;
        }
    }

    /**
    * This code get's called on the Craft Menu closing.
    */
    async close() {
        let confirmation = await Dialog.confirm({
            title: 'Save',
            content: `<p>Save your progress?</p>`,
        });
        if (confirmation)
            RecipeData.saveDataToFile();
        super.close();
    }

    /**
     * Returns the data for the GUI of the Craft Menu.
     */
    async getData() {
        const worldInfo = {
            system: game.system.id,
            world: game.world.id
        }
        const fileNames = await getFileNames();
        return {
            searchQuery: this.searchQuery,
            recipes: this.object,
            fileInfo: this.fileInfo,
            worldInfo: worldInfo,
            fileNames: fileNames
        };
    }
}


