import { MODULE, MODULE_NAME } from "./const.js"; //import the const variables
import { createFolderIfMissing } from "./helpers.js";
import { RegisterSettings, ValidateSettings } from "./settings.js";
import { CraftMenu } from "./CraftMenu.js";

/**
 * Adds a button to open a Craft Menu
 * @param {Object} controls
 */
function addButton(controls) {
  let buttonControls = controls.find(control => control.name === 'token');
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
  try {
    CraftMenu.craftMenu.bringToTop();
  } catch (e) {
    console.error(e);
  }
}

/*
 * Initialization(Hooks)
 */

Hooks.once("init", async function () {
  console.log(`${MODULE} | initializing ${MODULE_NAME} module.`);
  createFolderIfMissing();
  await RegisterSettings();
  await ValidateSettings();
  CraftMenu.initialize();
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
  return game.settings.get(MODULE, 'CurrentFile');
});
