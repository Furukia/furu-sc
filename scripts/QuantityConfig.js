import { MODULE, QUANTITY_CONFIG_ID, QUANTITY_CONFIG_TEMPLATE } from "./const.js"; //import the const variables
import { localize } from "./helpers.js";

export class QuantityConfig extends FormApplication {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = QUANTITY_CONFIG_ID;
        options.template = QUANTITY_CONFIG_TEMPLATE;
        options.height = "auto";
        options.width = 550;
        options.title = localize("FURU-SC.QUANTITY_CONFIG_TITLE");
        return options;
    }

    /**
     * Returns the data for the GUI of the Quantity Config.
     */
    getData() {
        let context = super.getData();
        context = game.settings.get(MODULE, `quantity-path`);
        let data = {
            paths: context,
            showHelp: this.object
        }
        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.on('click', "[data-action]", this._handleButtonClick.bind(this));
    }

    /**
     * Handles the button click event.
     *
     * @param {Object} event - The button click event object.
     */
    async _handleButtonClick(event) {
        const clickedElement = $(event.currentTarget);
        const action = clickedElement.data().action;
        if (action === "open_help")
            this.object = !this.object;
        this.render();
    }

    render(force, options) {
        if (Object.values(this.object).length === 0 && this.object.constructor === Object)
            this.object = false;
        super.render(force, options);
    }

    /**
     * Updates the object based on the provided event and formData.
     *
     * @param {Event} event - The event that triggered the update.
     * @param {Object} formData - The form data used to update the object.
     */
    async _updateObject(event, formData) {
        const settingsArray = Object.entries(formData).map(([key, value]) => ({ type: key.split(".")[0], path: value ? value : null }));
        game.settings.set(MODULE, `quantity-path`, settingsArray);
    }
}
