
import { MODULE, CRAFT_TABLE_TEMPLATE, CRAFT_TABLE_ID } from "./const.js"; //import the const variables
import { CraftingTableData } from "./crafting.js";
import { localize } from "./helpers.js";
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
                this.ingredients = await CraftingTableData.getIngredientInfo(this.object.ingredients);
                await CraftingTableData.checkIngredients();
                this.render();
                break;
            default:
                console.warn(`${MODULE} | Invalid action detected:`, { action });
                break;
        }
    }

    async _handleButtonClick(event) {
        const clickedElement = $(event.currentTarget);
        const action = clickedElement.data().action;
        switch (action) {
            case "craft-item":
                // Process ingredients
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
                this.ingredients = await CraftingTableData.getIngredientInfo(this.object.ingredients);
                await CraftingTableData.checkIngredients();
                this.render();
                ui.notifications.notify(localize("FURU-SC.NOTIFICATIONS.CRAFT_TABLE_RELOADED"));
                break;
            case "not-enough-ingredients":
                ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.NOT_ENOUGH_INGREDIENTS"));
                break;
            default:
                console.warn(`${MODULE} | Invalid action detected:`, { action });
                break;
        }
    }

    getData() {
        let data = {
            recipe: this.object,
            ingredients: this.ingredients,
            selectedActor: this.userActorsData.selectedActor,
            ownedActors: this.userActorsData.ownedActors
        }
        return data;
    }
}