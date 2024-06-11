# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project tries to adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Adding more automatic quantity-path configurations for different systems.
- More recipe settings:
  - Allow dismantling - If recipe should allow dismantling. Effectively creating ingredients from target(s)
  - isSecret - Make this recipe a secret for the players. They won't be able to craft it until they found out the ingredients for it.
  - isOneTime - Makes the recipe one use. Hiding it from players after crafting.
  - sendCraftRequest - Whether to send a craft request to the GM or just craft immediately
  - Macro support - Implementing macros support to check if player can craft or just call it in parallel with crafting for whatever...

## [1.2.0] - 11.06.2024

### Added

- v12 support and v11 backwards compatibility. 

#### Recipe settings

- Now every recipe has its own settings. You can change them by clicking the cog button in the header of the recipe. Note that if your player's are allowed to edit recipes, they will be able to edit those settings too.

- Current recipe settings list:
  - Hide recipe - Hides the recipe from the players. Also changes the color of the recipe card, for easy recognition by GM.
  - Allow multiple targets - Allows you to craft multiple target items instead of just one.
  - Allow force crafting - Allows players to force craft any recipe without using ingredients. Can be set up per recipe. GM will receive a chat message about forced crafting.

#### New Settings

- Allow force crafting(World setting) - Allows players to force craft ANY recipe without using ingredients. Overrides the similar recipe setting.
- Hide wrong world notification(Client setting) - Hides the "This recipes file was made in another world" notification in craft menu.

#### Automatic quantity path setup

- Added automatic quantity-path setting setup for:
  - DnD5e
  - DnD3.5e
  - Pathfinder2e
  - Simple Worldbuilding
  - TheWitcherTRPG
  - Coriolis

### Changed

- UI has been tweaked. But just a little. To be more user friendly.
- The "This recipes file was made in another world" notification text now gives a hint about compendia. Also changed it styling from "error" to "warning"

### Fixed

- Handled deprecation warning's in the console.
- Fixed an issue that didn't allow to add a new tag if the tags are empty to old recipes.
- While handling v12 support found and fixed an [issue](https://github.com/Furukia/furu-sc/issues/3) with how simple crafting handled compendium id's. Now they should work correctly. Also using the same compendium's allow's to easily use recipes in other worlds with the same game system.
- Added a String/Number check while updating quantity of actors target's and ingredient's. This should save users from the cases where [1+1 becomes 11...](https://github.com/Furukia/furu-sc/issues/1) (I don't know why DnD 5e handles quantity as string's now 	┐(￣ヘ￣;)┌ ).

### Removed

- Modifiers. You probably didn't know they existed. The main idea was an ability to add "ghost" item quantities to allow crafting an item without all ingredients by replacing them with those "ghost's". Modifiers are replaced with "force crafting". It's' far less complicated and much more easy for me and players this way.

## [1.1.0] - 23.01.2024

### Added

#### New recipe type - "Tags"
  
- This update allows you to add unique tags with quantity to items. Think of them as materials, essence, elements e.t.c of an item. 
- To manage tags, just open your item's window and click "Craft tags" button in the header. It will open a craft editor window, that also support searching for tags in that item. Player's can only view tags, unless they have editing rights.
- Tags recipes require tags instead of items, to craft with. 
  - When you start the crafting process, if your selected actor has enough items, with required tags, you will be able to select which items you want to use. 
  - Item's are shown in a collapsed way. You can expand any item to see what tags it has and to see some extra control buttons.
  - If your item has some extra tags, that are not required for the selected recipe - they will be lost!
  - If you don't have enough items with required tags, you will be notified about it in the Craft table.

#### Other
- Added a new setting "Hide label" that allows you to hide the label of the "Craft tags" button in the item's window header
- The CraftMenu search now also searches by recipe tags

### Fixed
- General code cleanup
- The ingredient's block Y scroll position in CraftMenu window now saves on rerender
- Extending file naming/reading sanitization code, to allow names with symbols other than english letters
- Some general css changes and fixes, including sorting colors in a separate var's
- Changing the way input fields work in all Module FormApplications. Instead of using binding, we work the intended by FormApplication way. It allows the data to be processed even without using the enter button. The enter is still handled but by submitting the form, if it was pressed while writing in the input. 
  - Tldr: The input fields data is now correctly processed without losing data on apps rerender

## [1.0.2] - 02.01.2024

### Added
- This changelog.

### Fixed
- Some bugs with crafting behavior were fixed after refactoring it
- Fixed a bug, where new file creation, always created a file in the default folder, instead of following the setting path

## [1.0.1] - 01.01.2024

### Fixed
- Fixed incorrect ingredient's processing on craft

## [1.0.0] - 01.01.2024

### Added
- Initial Simple Crafting release
