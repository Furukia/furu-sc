import { SPECIAL_SYMBOLS_REGEX } from "./const.js";
import { localize, checkTagVisibility } from "./helpers.js";

/*
 * TagUiData class.
 * Used to quickly create and check the tag data for the ui.
 */
export class TagUiData {

    constructor(tag, quantity, query) {
        this.tag = tag;
        this.quantity = quantity;
        this.visible = checkTagVisibility(tag, query);
    }
}


/**
 * TagsData class.
 * Contains functions related to item tags
 */
export class TagsData {

    /**
     * Asynchronously tries to create a new tag.
     *
     * @param {Array} tagList - The list of tags in key/value format
     * @return {String} The added tag, or null if the tag already exists or contains special symbols.
     */
    static async tryAddTag(tagList) {
        let tag = await Dialog.prompt({
            title: localize("FURU-SC.DIALOGS.TAG_CREATION.title"),
            content: `<label for="nameInput">${localize("FURU-SC.DIALOGS.TAG_CREATION.content")}</label>
            <input name="nameInput" type="text" 
            style="margin-top:6px; margin-bottom:6px;" 
            placeholder="${localize("FURU-SC.DIALOGS.TAG_CREATION.placeholder")}">`,
            callback: (html) => html.find('input').val()
        });
        if (!tag) return null;
        // Check if the tag already exists
        if (tagList && tagList[tag]) {
            ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.TAG_EXISTS"));
            return null;
        }
        // Check if any of the tagStrings contains special symbols
        if (SPECIAL_SYMBOLS_REGEX.test(tag)) {
            ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.SPECIAL_SYMBOLS"));
            return null;
        }
        return tag;
    }

    /**
     * Reformats the provided tags data.
     * updateData must be provided in a [oldtag]: {tag, quantity} format from the ui
     * this function will reformat and apply changes if all the checks are passed.
     * The return value is formatted as key/value - tag/quantity pair.
     *
     * @param {object} updateData - The updated tag data.
     * @param {string} updateData.oldtag - The old tag string as a key.
     * @param {string} updateData.oldtag.tag - The tag string.
     * @param {string|number} updateData.oldtag.quantity - the tag quantity.
     * @return {object} The updated tag data object or null if checks were not passed.
     */
    static async tryReformatTagsData(updateData) {
        if (!updateData) return null;

        const oldTags = Object.keys(updateData);
        // Form a list of tag strings from the formData
        let tagStrings = [];
        for (const tagObject of Object.values(updateData)) {
            //Check if any of the quantity is NaN 
            if (isNaN(tagObject.quantity)) {
                ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.INVALID_NUMBER"));
                return null;
            }
            tagStrings.push(tagObject.tag);
        }
        // Check if there is two or more similar tags in new tags
        if (tagStrings.length !== new Set(tagStrings).size) {
            ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.TAG_EXISTS"));
            return null;
        }
        // Check if any of the tagStrings contains special symbols
        for (const tag of tagStrings) {
            if (SPECIAL_SYMBOLS_REGEX.test(tag)) {
                ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.SPECIAL_SYMBOLS"));
                return null;
            }
        }
        // Update tags.
        let updateObject = {};
        // Update never deletes, nor creates any new tags. So we just rewrite values for every old tag.
        for (const tag of oldTags) {
            let updateTag = updateData[tag];
            updateObject[updateTag?.tag ?? tag] = Math.max(1, Number(updateTag?.quantity));
        }
        return updateObject;
    }
}