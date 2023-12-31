

import { MODULE, CRAFT_MENU_TEMPLATE, CRAFT_MENU_ID } from "./const.js"; //import the const variables
import { CraftingTableData, RecipeData } from "./crafting.js";
import { checkEditRights, getFullFilePath, localize } from "./helpers.js";
import { socketSaveFile } from "./sockets.js";
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
            height: 600,
            width: 800,
            resizable: false,
            id: CRAFT_MENU_ID,
            template: CRAFT_MENU_TEMPLATE,
            title: localize("FURU-SC.CRAFT_MENU"),
            scrollY: [".sc-recipe-container"],
            dragDrop: [{
                dropSelector: `.sc-target-item-container, 
        .sc-target-item-container .sc-target-image, 
        .sc-items-container .sc-required-item-container,
        .sc-items-container .sc-required-item-container .sc-required-image,
        .sc-items-container .sc-required-item-container > p`,
                permissions: { drop: this._canDragDrop }
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
        // This prevents _updateObject interrupting selectors
        if (event?.target?.tagName?.toLowerCase() === "select") return;

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
        const allowedActions = [
            "search-recipe"
        ];
        if (!allowedActions.includes(action)) {
            if (!checkEditRights()) {
                ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.NO_RIGHTS"));;
                return;
            }
        }
        switch (action) {
            case 'search-recipe':
                await RecipeData.searchRecipe(value);
                this.render();
                break;
            case `change-quantity-target`:
                if (isNaN(value)) {
                    ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.INVALID_NUMBER"));
                    return;
                }
                RecipeData.ProcessQuantity(recipeID, value, { rewrite: true, isTarget: true });
                break;
            case 'change-quantity':
                const itemID = $(input).parents('[data-item-id]').data('itemId');
                if (isNaN(value)) {
                    ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.INVALID_NUMBER"));
                    return;
                }
                RecipeData.ProcessQuantity(recipeID, value, { originalItemId: itemID, rewrite: true, isTarget: false });
                break;
            default:
                console.warn(`${MODULE} | Invalid action detected:`, { action, value });
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
        const recipeID = $(event.currentTarget).parents('[data-recipe-id]').data('recipeId');
        const allowedActions = [
            "select-file"
        ];
        if (!allowedActions.includes(action)) {
            if (!checkEditRights()) {
                ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.NO_RIGHTS"));
                return;
            }
        }
        switch (action) {
            case 'select-file':
                const currentFolder = game.settings.get(MODULE, 'save-path');
                const currentFile = game.settings.get(MODULE, 'current-file');
                if (currentFile === value) return;
                // Saving preparations
                if (checkEditRights()) {
                    await RecipeData.resetRecipesMode();
                    const saveData = {
                        folder: currentFolder,
                        file: currentFile,
                        saveData: this.object,
                        fileInfo: this.fileInfo
                    }
                    // Saving the previous file
                    socketSaveFile(game.user.id, saveData);
                }
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
            case "select_recipe_type":
                if (this.object[recipeID].type === value) return;
                this.object[recipeID].type = value;
                this.render();
                break;
            default:
                console.warn(`${MODULE} | Invalid action detected:`, { action, value });
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
        const allowedActions = [
            "craft-from-recipe",
            "reload-window"
        ];
        if (!allowedActions.includes(action)) {
            if (!checkEditRights()) {
                ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.NO_RIGHTS"));
                return;
            }
        }
        const recipeID = clickedElement.parents('[data-recipe-id]')?.data()?.recipeId;
        let itemID;
        switch (action) {
            case 'add-recipe':
                await RecipeData.createRecipe(this);
                this.render();
                break;
            case 'add-quantity-target':
                RecipeData.ProcessQuantity(recipeID, 1, { isTarget: true });
                break;
            case 'substract-quantity-target':
                RecipeData.ProcessQuantity(recipeID, -1, { isTarget: true });
                break;
            case 'add-quantity':
                itemID = clickedElement.closest('[data-item-id]')?.data()?.itemId;
                RecipeData.ProcessQuantity(recipeID, 1, { originalItemId: itemID, isTarget: false });
                break;
            case 'substract-quantity':
                itemID = clickedElement.closest('[data-item-id]')?.data()?.itemId;
                RecipeData.ProcessQuantity(recipeID, -1, { originalItemId: itemID, isTarget: false });
                break;
            case 'save-recipe-file':
                const currentFolder = game.settings.get(MODULE, 'save-path');
                const currentFile = game.settings.get(MODULE, 'current-file');
                // Saving preparations
                await RecipeData.resetRecipesMode();
                const saveData = {
                    folder: currentFolder,
                    file: currentFile,
                    saveData: this.object,
                    fileInfo: this.fileInfo
                }
                // Save the data of the current file
                socketSaveFile(game.user.id, saveData);
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
            case 'craft-from-recipe':
                if (this.object[recipeID].type === "items")
                    if (!this.object[recipeID].ingredients || Object.keys(this.object[recipeID].ingredients).length === 0) {
                        ui.notifications.warn(localize("FURU-SC.NOTIFICATIONS.NO_INGREDIENTS"));
                        return;
                    }
                if (!this.object[recipeID].target) {
                    ui.notifications.warn(localize("FURU-SC.NOTIFICATIONS.NO_TARGET"));
                    return;
                }
                await CraftingTableData.openCraftTable(recipeID);
                break;
            case 'edit-description':
                await RecipeData.toggleEditMode(recipeID);
                this.render();
                break;
            case 'save-description':
                let container = clickedElement.parents('div.sc-recipe-card');
                let editorContent = container.find('iframe.tox-edit-area__iframe');
                let bodyElement = await TextEditor.enrichHTML(editorContent[0].contentDocument.body.innerHTML);
                let updateData = {
                    description: bodyElement,
                    editMode: false
                }
                await RecipeData.updateRecipe(recipeID, updateData);
                this.render();
                break;
            case 'delete-recipe':
                const confirmedDeletion = await Dialog.confirm({
                    title: localize("FURU-SC.DIALOGS.DELETE_CONFIRM.title"),
                    content: localize("FURU-SC.DIALOGS.DELETE_CONFIRM.content")
                });
                if (confirmedDeletion) {
                    await RecipeData.deleteRecipe(recipeID);
                    this.render();
                }
                break;
            case 'delete-item':
                itemID = clickedElement.closest('[data-item-id]')?.data()?.itemId;
                await RecipeData.deleteIngredient(recipeID, itemID);
                this.render();
                break;
            case 'reload-window':
                const dataPath = await getFullFilePath();
                let data = await RecipeData.loadDataFromJSONFile(dataPath);
                let fileInfo = {
                    system: game.system.id,
                    world: game.world.id
                };
                if (!data) {
                    console.warn(`${MODULE} | Failed to load data for the Craft Menu! The file is probably empty.`);
                    data = {};
                }
                else {
                    fileInfo = data.fileInfo;
                    delete data["fileInfo"];
                }
                this.object = data;
                this.fileInfo = fileInfo;
                this.searchQuery = null;
                this.render();
                ui.notifications.notify(localize("FURU-SC.NOTIFICATIONS.FILE_RELOADED"));
                break;
            default:
                console.warn(`${MODULE} | Invalid action detected:`, { action, recipeID });
                break;
        }
    }

    /**
     * Check if the user can perform drop actions.
     *
     * @return {boolean} Returns true if the user has edit rights, false otherwise.
     */
    _canDragDrop() {
        return checkEditRights();
    }

    /**
     * Executes when a drop event occurs.
     *
     * @param {Event} event - The drop event object.
     */
    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);
        if (data.type !== "Item") return ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.ITEMS_ONLY"));
        const element = event.target.closest("[data-recipe-id]");
        const recipeID = element ? element.dataset.recipeId : null;
        let dropTargetClass = event.target.className.split(" ")[0];
        let dropType = "target";
        if (dropTargetClass !== "sc-target-item-container" && dropTargetClass !== "sc-target-image")
            dropType = "ingredient";
        const item = await Item.implementation.fromDropData(data);
        switch (dropType) {
            case 'target':
                const itemObject = { ...item.toObject(), _id: undefined, _stats: undefined, folder: undefined, ownership: undefined };
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
                        title: localize("FURU-SC.DIALOGS.INGREDIENT_EQUALS_TARGET.title"),
                        content: localize("FURU-SC.DIALOGS.INGREDIENT_EQUALS_TARGET.content"),
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
        if (!checkEditRights()) {
            super.close();
            return;
        }
        let confirmation = await Dialog.confirm({
            title: localize("FURU-SC.DIALOGS.SAVE_PROGRESS.title"),
            content: localize("FURU-SC.DIALOGS.SAVE_PROGRESS.content"),
        });
        if (confirmation) {
            const currentFolder = game.settings.get(MODULE, 'save-path');
            const currentFile = game.settings.get(MODULE, 'current-file');
            const saveData = {
                folder: currentFolder,
                file: currentFile,
                saveData: CraftMenu.craftMenu.object,
                fileInfo: CraftMenu.craftMenu.fileInfo
            };
            socketSaveFile(game.user.id, saveData);
        }
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
        const fileNames = game.settings.get(MODULE, 'recipe-files');
        return {
            searchQuery: this.searchQuery,
            recipes: this.object,
            fileInfo: this.fileInfo,
            worldInfo: worldInfo,
            fileNames: fileNames
        };
    }
}


