import { MODULE, MODULE_NAME } from "./const.js"; //import the const variables
import { checkEditRights, checkTagsPresence, createFolderIfMissing, getCorrectQuantityPathForItem, getPercentForAllIngredients, localize } from "./helpers.js";
import { RegisterSettings, ValidateSettings } from "./settings.js";
import { CraftMenu } from "./CraftMenu.js";
import { CraftTable } from "./CraftTable.js";
import { CraftTagsEditor } from "./CraftTagsEditor.js";
import { handleSocketEvent } from "./sockets.js";

/**
 * Adds a button to open a Craft Menu
 * @param {Object} controls
 */
function addButton(controls) {
  let buttonControls = controls.find(control => control.name === 'notes');
  buttonControls.tools.push({
    name: 'craftmenu',
    title: localize("FURU-SC.CRAFT_MENU"),
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

Hooks.once("init", function () {
  console.log(`${MODULE} | initializing ${MODULE_NAME} module.`);
  RegisterSettings();
});

Hooks.once("ready", async function () {
  game.socket.on(`module.${MODULE}`, request => {
    handleSocketEvent(request)
  });
  console.log(`${MODULE} | Setting up...`);
  await createFolderIfMissing(game.settings.get(MODULE, 'save-path'));
  await ValidateSettings();
  CraftMenu.initialize();
  CraftTable.initialize();
});

Hooks.on('getSceneControlButtons', addButton);


Hooks.on(`getItemSheetHeaderButtons`, function (app, buttons) {
  // If user can edit
  if (!checkEditRights()) return;

  // If app has document
  if (!app?.document) return;

  const appsItem = app.document;

  let hasTags = checkTagsPresence(appsItem);

  buttons.unshift({
    label: localize("FURU-SC.CRAFT_TAGS"),
    class: `sc-craft-tags-button${hasTags ? '-active' : ''}`,
    get icon() {
      return `fas fa-tags`;
    },
    onclick: () => {
      new CraftTagsEditor(appsItem).render(true);
    }
  });

});

/*
 * Handlebars helpers
 */
Handlebars.registerHelper('equals', function (a, b) {
  return a === b;
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
Handlebars.registerHelper('checkEditRights', checkEditRights);
Handlebars.registerHelper('noEditRights', function () {
  return !checkEditRights();
});
Handlebars.registerHelper('getPercentForAllIngredients', getPercentForAllIngredients);