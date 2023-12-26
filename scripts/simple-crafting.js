import { MODULE, MODULE_NAME } from "./const.js"; //import the const variables
import { createFolderIfMissing, getCorrectQuantityPathForItem, getPercentForAllIngredients } from "./helpers.js";
import { RegisterSettings, ValidateSettings } from "./settings.js";
import { CraftMenu } from "./CraftMenu.js";
import { CraftTable } from "./CraftTable.js";

/**
 * Adds a button to open a Craft Menu
 * @param {Object} controls
 */
function addButton(controls) {
  let buttonControls = controls.find(control => control.name === 'notes');
  buttonControls.tools.push({
    name: 'craftmenu',
    title: 'Craft menu',
    icon: 'fas fa-hammer-crash',
    visible: true,
    onClick: openMenu,
    button: true
  });
}

/**
 * Opens a Craft Menu
 */
function openMenu() {
  CraftMenu.craftMenu.render(true);
}

/*
 * Initialization(Hooks)
 */

Hooks.once("init", async function () {
  //TODO - V Не забудь убрать это в конце работы над модулем
  // CONFIG.debug.hooks = true 
  console.log(`${MODULE} | initializing ${MODULE_NAME} module.`);
  createFolderIfMissing();
  await RegisterSettings();
});

Hooks.once("ready", async function () {
  console.log(`${MODULE} | Setting up settings and initializing craft menu.`);
  await ValidateSettings();
  CraftMenu.initialize();
  CraftTable.initialize();
});

Hooks.on('getSceneControlButtons', addButton);

/*
 * Handlebars helpers
 */
Handlebars.registerHelper('equals', function (a, b) {
  return a === b;
});

Handlebars.registerHelper('notGM', function () {
  return !game.user.isGM;
});

Handlebars.registerHelper('getCurrentFile', function () {
  return game.settings.get(MODULE, 'current-file');
});

Handlebars.registerHelper('getCorrectQuantityValue', function (item) {
  const pathObject = getCorrectQuantityPathForItem(item.type);
  const path = pathObject.path;
  const currentQuantity = foundry.utils.getProperty(item, path);
  return currentQuantity;
});

/** 
 * These 2 percents are different not only in the ingredient count
 * but also in the way the percent is given. The `getPercentForItem` helper
 * returns the bigger percent the more currentReqQuantity and requiredQuantity are equal
 * while the `getPercentForAllIngredients` 
 * returns the bigger percent the more currentReqQuantity and requiredQuantity are far apart
 * basically meaning that if all `currentReqQuantity` === 0 then we get 100%
 * TLDR: 
 * "getPercentForItem": currentReqQuantity === requiredQuantity -> 100%
 * "getPercentForAllIngredients": all of `currentReqQuantity` === 0 -> 100%
 */
Handlebars.registerHelper('getPercentForItem', function (ingredientInfo) {
  return ((ingredientInfo.currentReqQuantity + ingredientInfo.modifier) / ingredientInfo.requiredQuantity) * 100;
});
Handlebars.registerHelper('getPercentForAllIngredients', getPercentForAllIngredients);