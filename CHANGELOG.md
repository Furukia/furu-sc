# Changelog

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
