import { MODULE, MODULE_NAME } from "./const.js"; //import the const variables
import { createFolderIfMissing, getCorrectQuantityPathForItem, getNestedValue } from "./helpers.js";
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

Handlebars.registerHelper('getCorrectQuantityValue', function (item) {
  let pathObject = getCorrectQuantityPathForItem(item);
  let path = pathObject.path;
  let currentQuantity = getNestedValue(item, path);
  return currentQuantity;
});

Handlebars.registerHelper('getCurrentFile', function () {
  return game.settings.get(MODULE, 'current-file');
});
