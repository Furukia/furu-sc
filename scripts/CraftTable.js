
import { MODULE, CRAFT_TABLE_TEMPLATE, CRAFT_TABLE_ID } from "./const.js"; //import the const variables
/** 
 * This application works with a single recipe as it's object and handles the crafting process.
 */
export class CraftTable extends FormApplication {

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
            width: 600,
            resizable: true,
            id: CRAFT_TABLE_ID,
            template: CRAFT_TABLE_TEMPLATE,
            title: 'Craft table'//,
            //dragDrop: [{}]
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
        console.log("craftTable", this.craftTable);
    }
    getData() {
        let data = {
            recipe: this.object
        }
        return data;
    }
}