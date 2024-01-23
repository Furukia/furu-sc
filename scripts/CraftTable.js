
import { MODULE, CRAFT_TABLE_TEMPLATE, CRAFT_TABLE_ID } from "./const.js"; //import the const variables
import { CraftingTableData } from "./crafting.js";
import { getPercentForAllIngredients, getPercentForAllTags, checkQuantity, localize, getCorrectQuantityPathForItem } from "./helpers.js";
/** 
 * This application works with a single recipe as it's object and handles the crafting process.
 */
export class CraftTable extends FormApplication {

    /**
     * Activate event listeners for the provided HTML element.
     *
     * @param {HTMLElement} html - The HTML element to activate listeners on.
     */
    activateListeners(html) {
        super.activateListeners(html);
        html.on('click', "[data-select]", this._handleSelectClick.bind(this));
        html.on('click', "[data-action]", this._handleButtonClick.bind(this));
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
            height: 700,
            width: 600,
            resizable: true,
            id: CRAFT_TABLE_ID,
            template: CRAFT_TABLE_TEMPLATE,
            scrollY: [".sc-table-ingredients-block",
                ".sc-table-tags-block",
                ".sc-table-dynamic-tag-container"],
            title: localize("FURU-SC.CRAFT_TABLE"),
        };

        const mergedOptions = foundry.utils.mergeObject(defaults, overrides);

        return mergedOptions;
    }

    /**
     * Initializes the Craft Table.
     */
    static async initialize() {
        console.log(`${MODULE} | initializing Craft Table.`);
        this.craftTable = new CraftTable({});
    }

    /**
     * Update an object based on the event and form data.
     *
     * @param {Event} event - The event triggering the update.
     * @param {Object} formData - The data from the form.
     * @return {Promise<void>} A promise that resolves after the object is updated.
     */
    async _updateObject(event, formData) {
        // This prevents _updateObject interrupting selectors
        if (event?.target?.tagName?.toLowerCase() === "select") return;

        const expandedData = foundry.utils.expandObject(formData);
        const recipe = this.object;
        if (recipe.type === "tags") {
            Object.keys(expandedData).forEach((key) => {
                const consumeQuantity = expandedData[key].consumeQuantity;
                if (!consumeQuantity) return;
                const ingredient = this.ingredients[key].ingredient;
                if (!checkQuantity(ingredient, consumeQuantity)) {
                    ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.INSUFFICIENT_ITEM_QUANTITY"));
                    const pathObject = getCorrectQuantityPathForItem(ingredient.type);
                    let currentQuantity = foundry.utils.getProperty(ingredient, pathObject.path);
                    this.ingredients[key].consumeQuantity = currentQuantity ?? 1;
                    return;
                }
                this.ingredients[key].consumeQuantity = Math.max(0, Number(consumeQuantity));
            })
        }
        this.render();
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
        const { selectedActor, ownedActors } = this.userActorsData;
        switch (action) {
            case "select-actor":
                if (selectedActor.id === value) return;
                if (!ownedActors.hasOwnProperty(value)) {
                    ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.ACTOR_NOT_FOUND"));
                    return;
                }
                this.userActorsData.selectedActor = ownedActors[value];
                switch (this.object.type) {
                    case "items":
                        this.ingredients = await CraftingTableData.getIngredientInfo(this.object.ingredients);
                        await CraftingTableData.checkIngredients();
                        break;
                    case "tags":
                        this.tags = foundry.utils.duplicate(this.object.tags);
                        await CraftingTableData.checkTags();
                        break;
                    default:
                        break;
                }
                this.render();
                break;
            default:
                console.warn(`${MODULE} | Invalid action detected:`, { action });
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
        const ingredientID = clickedElement.parents('[data-ingredient-id]')?.data()?.ingredientId;
        const ingredientInfo = this.ingredients[ingredientID];
        let updatedQuantity = 0;
        switch (action) {
            case "craft-item":
                //TODO tag support
                // Process ingredients
                if (this.object.type === "items" && getPercentForAllIngredients() === 100)
                    await CraftingTableData.processIngredientsQuantityOnCraft();
                // Try to craft the item
                await CraftingTableData.craftItem();
                // Then reset ingredients
                this.ingredients = await CraftingTableData.getIngredientInfo(this.object.ingredients);
                await CraftingTableData.checkIngredients();
                this.render();
                break;
            case "reload-window":
                // Reset the ingredients
                switch (this.object.type) {
                    case "items":
                        this.ingredients = await CraftingTableData.getIngredientInfo(this.object.ingredients);
                        await CraftingTableData.checkIngredients();
                        break;
                    case "tags":
                        this.tags = foundry.utils.duplicate(this.object.tags);
                        await CraftingTableData.checkTags();
                        break;
                    default:
                        break;
                }
                this.render();
                ui.notifications.notify(localize("FURU-SC.NOTIFICATIONS.CRAFT_TABLE_RELOADED"));
                break;
            case "not-enough-ingredients":
                ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.NOT_ENOUGH_INGREDIENTS"));
                break;
            case "select-item":
                if (!ingredientInfo) return;
                ingredientInfo.selected = !ingredientInfo.selected;
                this.render();
                break;
            case "substract-quantity-tagItem":
                if (!ingredientInfo) return;
                updatedQuantity = ingredientInfo.consumeQuantity - 1;
                ingredientInfo.consumeQuantity = Math.max(updatedQuantity, 0);
                this.render();
                break;
            case "add-quantity-tagItem":
                if (!ingredientInfo) return;
                updatedQuantity = ingredientInfo.consumeQuantity + 1;
                if (!checkQuantity(ingredientInfo.ingredient, updatedQuantity)) {
                    ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.INSUFFICIENT_ITEM_QUANTITY"));
                    return;
                }
                ingredientInfo.consumeQuantity = Math.max(updatedQuantity, 0);
                this.render();
                break;
            case "enough-tags":
                ui.notifications.info(localize("FURU-SC.NOTIFICATIONS.ENOUGH_TAGS"));
                break;
            case "not-enough-tags":
                ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.NOT_ENOUGH_TAGS"));
                break;
            default:
                console.warn(`${MODULE} | Invalid action detected:`, { action });
                break;
        }
    }

    getData() {
        console.log(this);
        const isEnoughTags = this.object.type === "tags" ? this.isEnoughTags : true;
        let completionPercent = 0;
        switch (this.object.type) {
            case "items":
                completionPercent = getPercentForAllIngredients();
                break;
            case "tags":
                completionPercent = getPercentForAllTags();
                break;
            default:
                break;
        }
        let data = {
            recipe: this.object,
            isEnoughTags: isEnoughTags,
            completionPercent: completionPercent,
            ingredients: this.ingredients,
            selectedActor: this.userActorsData.selectedActor,
            ownedActors: this.userActorsData.ownedActors
        }
        console.log(data);
        return data;
    }
}