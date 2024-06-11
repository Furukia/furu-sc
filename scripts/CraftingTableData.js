import { MODULE } from "./const.js";
import { CraftMenu } from "./CraftMenu.js";
import { CraftTable } from "./CraftTable.js";
import { getCorrectQuantityPathForItem, processCompendiumSource, processItemCompatibility, localize, isAllowedForceCraft } from "./helpers.js";

/**
 * @typedef {Object} ingredientInfo
 * @property {string} sourceId - The unique identifier of this ingredient's source item.
 * @property {string} name - The name of the ingredient.
 * @property {string} img - The image URL of the ingredient.
 * @property {string} type - A type of an original item.
 * @property {string} quantityPath - A path to the quantity of an original item.
 * @property {string} currentReqQuantity - A number value representing the current quantity required for this ingredient.
 * @property {number} requiredQuantity - A number value representing the full required quantity of this ingredient to craft with.
 */

/*
 * CraftingTableData class
 * contains functions needed for the actual crafting process
 */
export class CraftingTableData {

    /**
     * Opens the craft table and sets the selected recipe.
     */
    static async openCraftTable(recipeID) {
        const allRecipes = CraftMenu.craftMenu.object;
        const recipe = allRecipes[recipeID];
        const recipeType = recipe.type;
        //Check if we allow force crafting
        if (isAllowedForceCraft(recipe)) {
            CraftTable.craftTable.forceCraft = false;
        }
        // Store the original recipe in the craft table
        CraftTable.craftTable.object = { ...recipe };
        delete CraftTable.craftTable.object.id;
        CraftTable.craftTable.ingredients = {};
        const userActorsObject = await CraftingTableData.getPlayerActorList();
        if (!userActorsObject)
            return;
        CraftTable.craftTable.userActorsData = userActorsObject;
        let options = {};
        // Have some plans to add more types in the future, hence the switch/case instead of a simple ternary/if
        switch (recipeType) {
            case "text":
                options = {
                    height: 250
                }
                break;
            case "items":
                options = {
                    height: 700
                }
                //Create an ingredientsInfo object's with the necessary information
                CraftTable.craftTable.ingredients = await this.getIngredientInfo(recipe.ingredients);
                await CraftingTableData.checkIngredients();
                break;
            case "tags":
                options = {
                    height: 520
                }
                // Create a copy from the recipe tags, to track if the actor has enough to craft with.
                CraftTable.craftTable.tags = foundry.utils.duplicate(recipe.tags);
                // Check actors items and make a list of items that have at least one of the necessary tags
                await CraftingTableData.checkTags();
                break;
            default:
                options = {
                    height: 700
                }
                break;
        }
        CraftTable.craftTable.render(true, options);
    }

    /**
     * Retrieves condensed information about ingredients.
     *
     * @param {Object} ingredients - The ingredients object.
     * @return {Object} - The information about the ingredients.
     */
    static async getIngredientInfo(ingredients) {
        if (!ingredients) return {};
        let ingredientsArray = Object.values(ingredients);
        let ingredientsInfo = {};
        ingredientsArray.forEach(ingredient => {
            const sourceId = processCompendiumSource(ingredient);
            const pathObject = getCorrectQuantityPathForItem(ingredient.type);
            const path = pathObject.path;
            const currentQuantity = foundry.utils.getProperty(ingredient, path);
            ingredientsInfo[sourceId] = {
                sourceId: sourceId,
                name: ingredient.name,
                img: ingredient.img,
                type: ingredient.type,
                quantityPath: path,
                currentReqQuantity: currentQuantity,
                requiredQuantity: currentQuantity
            }
        })
        return ingredientsInfo;
    }

    /**
     * Retrieves a list of player actors.
     *
     * @return {Object} - An object containing the current active actor and the list of owned actors.
     */
    static async getPlayerActorList() {
        const userID = game.user.id;
        let activeActor = game.user.character;
        let actorList = game.actors;
        let ownedActorList = {};
        actorList.forEach(actor => {
            let owners = actor.ownership;
            if (owners && owners.hasOwnProperty(userID)) {
                ownedActorList[actor.id] = actor;
            }
        });
        if (!Object.keys(ownedActorList).length) {
            ui.notifications.error(localize("FURU-SC.NOTIFICATIONS.NO_OWNED_ACTOR"));
            return null;
        }
        if (!activeActor) {
            activeActor = ownedActorList[Object.keys(ownedActorList)[0]];
        }
        return { selectedActor: activeActor, ownedActors: ownedActorList };
    }

    /**
    * Checks the ingredients of the specified actor against the recipe at the craft table.
    * Then updates the ingredients of the object accordingly.
    * @param {Object} actor - The actor whose ingredients will be checked.
    */
    static async checkIngredients() {
        const ingredientsInfo = CraftTable.craftTable.ingredients;
        const selectedActor = CraftTable.craftTable.userActorsData.selectedActor;
        const actorItems = selectedActor.items;
        if (!actorItems.size) {
            ui.notifications.error(`"${selectedActor.name}" - ${localize("FURU-SC.NOTIFICATIONS.ACTOR_NO_ITEMS")}`);
            return;
        }
        let ingredientInstanceCount = {};
        actorItems.forEach(item => {
            const sourceId = processCompendiumSource(item);
            const pathObject = getCorrectQuantityPathForItem(item.type);
            if (ingredientsInfo.hasOwnProperty(sourceId)) {
                if (pathObject.type === "system") {
                    ingredientInstanceCount[sourceId] = (ingredientInstanceCount[sourceId] || 0) + foundry.utils.getProperty(item, pathObject.path);
                }
                else {
                    ingredientInstanceCount[sourceId] = (ingredientInstanceCount[sourceId] || 0) + 1;
                }
                let currentQuantity = ingredientInstanceCount[sourceId];
                const requiredQuantity = ingredientsInfo[sourceId].requiredQuantity;
                const finalQuantity = Math.max(0, requiredQuantity - currentQuantity);
                ingredientsInfo[sourceId].currentReqQuantity = finalQuantity;
            }
        })
    }

    /**
     * Check if the selected actor has the required tags for crafting,
     * and update the craft table accordingly.
     *
     * @return {void} 
     */
    static async checkTags() {
        const tags = CraftTable.craftTable.tags;
        const tagKeys = Object.keys(tags);
        const selectedActor = CraftTable.craftTable.userActorsData.selectedActor;
        const actorItems = selectedActor.items;

        if (!actorItems.size) {
            ui.notifications.error(`"${selectedActor.name}" - ${localize("FURU-SC.NOTIFICATIONS.ACTOR_NO_ITEMS")}`);
            return;
        }

        const tagInstanceCount = {};
        const suitableIngredients = {};
        for (const item of actorItems) {
            const itemTags = item.getFlag(MODULE, "craftTags");
            if (!itemTags) {
                continue;
            }
            const itemTagsKeys = Object.keys(itemTags);

            if (tagKeys.some(tag => itemTagsKeys.includes(tag))) {
                suitableIngredients[item.id] = {
                    selected: false,
                    consumeQuantity: 0,
                    ingredient: item
                };
            }

            for (const tag of tagKeys) {
                const currentTagQuantity = itemTags[tag];
                if (!currentTagQuantity) continue;
                tagInstanceCount[tag] = (tagInstanceCount[tag] || 0) + currentTagQuantity;
            }
        }

        const isEnoughTags = tagKeys.every(tag => tagInstanceCount[tag] >= tags[tag]);

        CraftTable.craftTable.isEnoughTags = isEnoughTags;
        CraftTable.craftTable.ingredients = suitableIngredients;
    }


    /**
     * Asynchronously crafts targetItems.
     *
     * @return {Promise<void>} This function does not return a value.
     */
    static async craftItem() {
        const recipe = CraftTable.craftTable.object;

        //check recipe setting for multiple targets
        const isTargetsMultiple = recipe.settings.isTargetList;
        let craftedItem = recipe.target;
        let targetList = recipe.targetList;

        if (isTargetsMultiple) {
            const targetsArray = Object.values(targetList);
            for (const target of targetsArray) {
                this._craftItem(processItemCompatibility(target));
            }
        }
        else {
            this._craftItem(processItemCompatibility(craftedItem));
        }
    }

    /**
     * Crafts an item by either updating its quantity in the actor's inventory or creating new items.
     * Get's called by craftItems()
     * @param {Object} itemToCraft - The item to be crafted.
     * @return {Promise<void>} - This function does not return a value.
     */
    static async _craftItem(itemToCraft) {
        const pathObject = getCorrectQuantityPathForItem(itemToCraft.type);
        const selectedActor = CraftTable.craftTable.userActorsData.selectedActor;
        if (pathObject.type === "system") {
            let quantityUpdated = await this.tryUpdateActorItemQuantity(selectedActor, itemToCraft, pathObject);
            if (!quantityUpdated) {
                await getDocumentClass("Item").create(itemToCraft, { parent: selectedActor });
            }
        }
        else {
            const currentQuantity = foundry.utils.getProperty(itemToCraft, pathObject.path);
            for (let i = 0; i < currentQuantity; i++) {
                await getDocumentClass("Item").create(itemToCraft, { parent: selectedActor });
            }
        }
        ui.notifications.info(`${localize("FURU-SC.NOTIFICATIONS.CRAFTED")} ${itemToCraft.name}!`);
    }

    /**
     * Try to update the quantity of an item in the actor's inventory.
     *
     * @param {Array} actorItems - The array of items in the actor's inventory.
     * @param {Object} craftedItem - The item that was crafted.
     * @param {Object} [pathObject=null] - The path object for the quantity property.
     * @return {boolean} - Returns false if the item was not found, true otherwise.
     */
    static async tryUpdateActorItemQuantity(selectedActor, craftedItem, pathObject = null) {
        const actorItems = selectedActor.items;
        if (!pathObject)
            pathObject = getCorrectQuantityPathForItem(craftedItem.type);
        const craftedItemSourceId = processCompendiumSource(craftedItem);
        for (const item of actorItems) {
            if (item.type !== craftedItem.type)
                continue;
            const sourceId = processCompendiumSource(item);
            if (sourceId !== craftedItemSourceId)
                continue;
            const currentQuantity = foundry.utils.getProperty(item, pathObject.path);
            const addQuantity = foundry.utils.getProperty(craftedItem, pathObject.path);
            //check if we are working with strings
            let quantityType = "number"
            if (typeof currentQuantity !== "number" || typeof addQuantity !== "number") {
                quantityType = "string"
            }
            const finalQuantity = Number(currentQuantity) + Number(addQuantity);
            await item.update({ [pathObject.path]: quantityType === "string" ? finalQuantity.toString() : finalQuantity });
            return true
        }
        return false;
    }

    /**
     * Process the quantity of ingredients on craft.
     *
     * @return {Promise<void>} This function does not return a value.
     */
    static async processIngredientsQuantityOnCraft() {
        const selectedActor = CraftTable.craftTable.userActorsData.selectedActor;
        const recipe = CraftTable.craftTable.object;
        // Get all the items that match recipe.ingredients in actor, and lower it's quantity according to recipe.ingredients quantity.
        // If it becomes 0 delete it.
        const actorItems = selectedActor.items.map(a => a);
        let ingredientInstanceCount = {};
        for (let i = 0; i < actorItems.length; i++) {
            const item = actorItems[i];
            const sourceId = processCompendiumSource(item);
            const pathObject = getCorrectQuantityPathForItem(item.type);
            if (recipe.ingredients.hasOwnProperty(sourceId)) {
                if (pathObject.type === "system") {
                    ingredientInstanceCount[sourceId] = (ingredientInstanceCount[sourceId] || 0) + foundry.utils.getProperty(item, pathObject.path);
                }
                else {
                    ingredientInstanceCount[sourceId] = (ingredientInstanceCount[sourceId] || 0) + 1;
                }
                const currentQuantity = ingredientInstanceCount[sourceId];
                const requiredQuantity = foundry.utils.getProperty(recipe.ingredients[sourceId], pathObject.path);
                let finalQuantity = Math.max(0, Number(currentQuantity) - Number(requiredQuantity));
                await item.update({ [pathObject.path]: finalQuantity });
                if (finalQuantity === 0) {
                    item.delete();
                }
            }
        }
    }

    /**
     * Process the quantity of tags on the craft by consuming the required ingredients.
     *
     * @return {Promise<void>} A promise that resolves when the quantity processing is completed.
     */
    static async processTagsQuantityOnCraft() {
        const ingredientsInfo = CraftTable.craftTable.ingredients;
        // Sort the ingredients by consumeQuantity to get only the items we want to affect.
        let usedIngredientsInfo = {};
        for (const key of Object.keys(ingredientsInfo)) {
            if (ingredientsInfo[key].consumeQuantity > 0) {
                usedIngredientsInfo[key] = ingredientsInfo[key];
            }
        }
        // Process the items
        for (const key of Object.keys(usedIngredientsInfo)) {
            const ingredient = usedIngredientsInfo[key].ingredient;
            const consumeQuantity = usedIngredientsInfo[key].consumeQuantity;
            const pathObject = getCorrectQuantityPathForItem(ingredient.type);
            const currentQuantity = foundry.utils.getProperty(ingredient, pathObject.path);
            const finalQuantity = Math.max(0, Number(currentQuantity) - Number(consumeQuantity));
            await ingredient.update({ [pathObject.path]: finalQuantity });
            if (finalQuantity === 0) {
                ingredient.delete();
            }
        }
    }
}