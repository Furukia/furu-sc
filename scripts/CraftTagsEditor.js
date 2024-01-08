import { CRAFT_TAGS_EDITOR_TEMPLATE, CRAFT_TAGS_EDITOR_ID, MODULE } from "./const.js";
import { TagData } from "./crafting.js";
import { checkTagsPresence, localize } from "./helpers.js";

export class CraftTagsEditor extends FormApplication {
    constructor(object, options) {
        super(object, options);
        this.object.apps[this.appId] = this;
    }

    /**
     * Returns the default options for the App.
     *
     * @return {Object} The default options object.
     */
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.submitOnClose = true;
        options.closeOnSubmit = false;
        options.submitOnUnfocus = true;
        options.submitOnChange = true;
        options.scrollY = [".sc-tag-editor-main-block"];
        options.id = CRAFT_TAGS_EDITOR_ID;
        options.template = CRAFT_TAGS_EDITOR_TEMPLATE;
        options.height = "auto";
        options.width = 500;
        options.title = localize("FURU-SC.TAGS_EDITOR_TITLE");
        return options;
    }

    /**
     * Activate event listeners for the provided HTML element.
     *
     * @param {HTMLElement} html - The HTML element to activate listeners on.
     */
    activateListeners(html) {
        super.activateListeners(html);
        html.on('click', "[data-action]", this._handleButtonClick.bind(this));
        html.on('keydown', "[data-input]", this._handleInputEnter.bind(this));
        html.find('.sc-tag-editor-tag').keyup(this._handleInputKeyUp.bind(this));
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
        let currentTags = this.object.getFlag(MODULE, "craftTags");
        const selectedTag = $(input).parents('[data-tag]')?.data()?.tag;
        switch (action) {
            case 'search-tags':
                this.searchQuery = value;
                this.render();
                break;
            case "change-tag":
                if (value === selectedTag) return;
                if (currentTags[value]) {
                    ui.notifications.warn(localize("FURU-SC.NOTIFICATIONS.TAG_EXISTS"));
                    return;
                }
                Object.defineProperty(currentTags, value, Object.getOwnPropertyDescriptor(currentTags, selectedTag));
                delete currentTags[selectedTag];
                await this.object.unsetFlag(MODULE, "craftTags");
                await this.object.setFlag(MODULE, "craftTags", currentTags);
                this.render();
                break;
            case "change-tag-quantity":
                if (isNaN(value)) {
                    ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.INVALID_NUMBER"));
                    return;
                }
                currentTags[selectedTag] = value;
                await this.object.unsetFlag(MODULE, "craftTags");
                await this.object.setFlag(MODULE, "craftTags", currentTags);
                this.render();
                break;
            default:
                console.warn(`${MODULE} | Invalid action detected:`, { action, value });
                break;
        }
    }

    /**
     * Handles saving the value for the tag input field to change the tag later.
     * Note to myself: This is a strange and probably a bad way to do it. 
     * TODO: Later i should refactor it... 
     */
    async _handleInputKeyUp(event) {
        const input = event.currentTarget;
        this.tagChangeValue = input.value;
        this.tagToChangeOnUpdate = $(input).parents('[data-tag]')?.data()?.tag;
    }
    /**
     * Handles the click event on a button.
     *
     * @param {Object} event - The click event object.
     */
    async _handleButtonClick(event) {
        const clickedElement = $(event.currentTarget);
        const action = clickedElement.data().action;
        const selectedTag = clickedElement.parents('[data-tag]')?.data()?.tag;
        let currentTags = this.object.getFlag(MODULE, "craftTags");
        if (!currentTags) currentTags = {};
        switch (action) {
            case "add-tag":
                let tag = await Dialog.prompt({
                    title: localize("FURU-SC.DIALOGS.TAG_CREATION.title"),
                    content: `<label for="nameInput">${localize("FURU-SC.DIALOGS.TAG_CREATION.content")}</label>
                    <input name="nameInput" type="text" 
                    style="margin-top:6px; margin-bottom:6px;" 
                    placeholder="${localize("FURU-SC.DIALOGS.TAG_CREATION.placeholder")}">`,
                    callback: (html) => html.find('input').val()
                });
                if (!tag) return;
                if (currentTags[tag]) {
                    ui.notifications.warn(localize("FURU-SC.NOTIFICATIONS.TAG_EXISTS"));
                    return;
                }
                currentTags[tag] = 1;
                this.object.setFlag(MODULE, "craftTags", currentTags);
                this.render()
                break;
            case "reload-window":
                delete this["searchQuery"];
                this.render()
                break;
            case "remove-tag":
                delete currentTags[selectedTag];
                await this.object.unsetFlag(MODULE, "craftTags");
                if (Object.values(currentTags).length)
                    await this.object.setFlag(MODULE, "craftTags", currentTags);
                this.render()
                break;
            case "clear-tags":
                const confirmation = await Dialog.confirm({
                    title: localize("FURU-SC.DIALOGS.CLEAR_TAGS.title"),
                    content: localize("FURU-SC.DIALOGS.CLEAR_TAGS.content"),
                });
                if (!confirmation)
                    return;
                await this.object.unsetFlag(MODULE, "craftTags");
                this.render();
                break;
            default:
                console.warn(`${MODULE} | Invalid action detected:`, { action });
                break;
        }
    }

    /*
    * Updates the tag if it's value changed on de-focus.
    * Updates the searchQuery on de-focus from search input.
    */
    async _updateObject(event, formData) {
        // Set tags
        let currentTags = this.object.getFlag(MODULE, "craftTags");
        const value = this.tagChangeValue;
        const selectedTag = this.tagToChangeOnUpdate;
        if (value !== selectedTag) {
            if (currentTags[value]) {
                await this.render();
                return;
            }
            Object.defineProperty(currentTags, value, Object.getOwnPropertyDescriptor(currentTags, selectedTag));
            delete currentTags[selectedTag];
            await this.object.unsetFlag(MODULE, "craftTags");
            await this.object.setFlag(MODULE, "craftTags", currentTags);
        }
        // Set search query
        const searchInput = document.getElementById('sc-search-tags');
        this.searchQuery = searchInput.value;
        await this.render();
    }

    /**
     * Returns the data for the GUI of the Tags Editor.
     */
    getData() {
        let tags = checkTagsPresence(this.object) ? this.object.getFlag(MODULE, "craftTags") : {};
        let tagObjectArray = [];
        let tagObjectArrayVisible = [];
        //TagData creation here also handle's the search
        for (const [key, value] of Object.entries(tags)) {
            const tagObject = new TagData(key, value, this.searchQuery);
            tagObjectArray.push(tagObject);
            if (!tagObject.visible)
                continue;
            tagObjectArrayVisible.push(tagObject);
        }
        return {
            searchQuery: this.searchQuery ?? "",
            item: this.object,
            tags: tagObjectArrayVisible.length ? tagObjectArrayVisible : tagObjectArray
        }
    }
}
