import { CRAFT_TAGS_EDITOR_TEMPLATE, CRAFT_TAGS_EDITOR_ID, MODULE } from "./const.js";
import { TagUiData, TagsData } from "./crafting.js";
import { checkTagsPresence, checkEditRights, localize } from "./helpers.js";

export class CraftTagsEditor extends FormApplication {
    constructor(object, options) {
        super(object, options);
        this.object.apps[this.appId] = this;
        this.searchQuery = '';
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
        html.on('keydown', "input", this._handleInputEnter.bind(this));
        //html.find('.sc-tag-editor-tag').keyup(this._handleInputKeyUp.bind(this));
    }

    /**
     * Submit's the form when enter is pressed in an input field.
     *
     * @param {Event} event - The event object with the key press event.
     */
    async _handleInputEnter(event) {
        if (event.key !== "Enter") return;
        if (!checkEditRights()) return;
        this.submit();
        return;
    }

    /**
     * Handles the click event on a button.
     *
     * @param {Object} event - The click event object.
     */
    async _handleButtonClick(event) {
        if (!checkEditRights()) {
            ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.NO_RIGHTS"));
            return;
        }
        const clickedElement = $(event.currentTarget);
        const action = clickedElement.data().action;
        const selectedTag = clickedElement.parents('[data-tag]')?.data()?.tag;
        let currentTags = this.object.getFlag(MODULE, "craftTags");
        if (!currentTags) currentTags = {};
        switch (action) {
            case "add-tag":
                const newTag = await TagsData.tryAddTag(currentTags);
                if (!newTag) return;
                currentTags[newTag] = 1;
                this.object.setFlag(MODULE, "craftTags", currentTags);
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

    /**
     * Update an object with the provided form data.
     *
     * @param {Event} event - the event object
     * @param {Object} formData - the form data to update the object with
     * @return {void}
     */
    async _updateObject(event, formData) {
        const expandedData = foundry.utils.expandObject(formData);
        const searchQuery = expandedData.searchQuery;
        delete expandedData.searchQuery;
        // If we are performing search we don't need to update tags.
        if (this.searchQuery !== searchQuery) {
            this.searchQuery = searchQuery;
            this.render();
            return;
        }
        if (!checkEditRights()) return;

        const updateObject = await TagsData.tryReformatTagsData(expandedData.tags);
        if (!updateObject) {
            this.render();
            return;
        }

        await this.object.unsetFlag(MODULE, "craftTags");
        await this.object.setFlag(MODULE, "craftTags", updateObject);

        // Clear the search query if we updated tags, to correctly show them all
        this.searchQuery = '';
        this.render();
    }

    /**
     * Returns the data for the GUI of the Tags Editor.
     */
    getData() {
        let tags = checkTagsPresence(this.object) ? this.object.getFlag(MODULE, "craftTags") : {};
        let tagObjectArray = [];
        let tagObjectArrayVisible = [];
        //TagUiData creation here also handle's the search
        for (const [key, value] of Object.entries(tags)) {
            const tagObject = new TagUiData(key, value, this.searchQuery);
            tagObjectArray.push(tagObject);
            if (!tagObject.visible)
                continue;
            tagObject.visible = true;
            tagObjectArrayVisible.push(tagObject);
        }
        return {
            searchQuery: this.searchQuery ?? "",
            item: this.object,
            tags: tagObjectArrayVisible.length ? tagObjectArray : tagObjectArrayVisible
        }
    }
}
