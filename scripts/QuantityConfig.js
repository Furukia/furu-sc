import { MODULE, QUANTITY_CONFIG, QUANTITY_CONFIG_TEMPLATE } from "./const.js"; //import the const variables

export class QuantityConfig extends FormApplication {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = QUANTITY_CONFIG;
        options.template = QUANTITY_CONFIG_TEMPLATE;
        options.height = "auto";
        options.width = 550;
        options.title = "Item types quantity path config";
        return options;
    }

    getData() {
        let context = super.getData();
        context = game.settings.get(MODULE, `quantity-path`);
        console.log("context", context);
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

    async _updateObject(event, formData) {
        const settingsArray = Object.entries(formData).map(([key, value]) => ({ type: key.split(".")[0], path: value ? value : null }));
        game.settings.set(MODULE, `quantity-path`, settingsArray);
    }
}
