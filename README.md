# Playground — Circuit Lab

A standalone, Traditional Chinese physics workbench for learning circuit symbols, series and parallel circuits, and Ohm’s law.

## Open

Open `index.html` in a modern browser. No installation, build step, or network connection is required. Keep the bundled `assets` directory beside `index.html`.

## Use

- Browse the four modules with the tabs; arrow keys, Home, and End navigate tabs.
- Toggle preset switches with a click, Enter, or Space.
- In the builder, select a component then tap a slot, or drag a component into a slot.
- Select **操作開關** to toggle switches and **移除元件** to erase components. Delete/Backspace and right-click also erase a focused slot.
- **載入範例** loads a working circuit. Up to two branches can be placed across main slots 2 and 3.
- Adjust the labeled voltage and resistance sliders in the Ohm’s law module.

## Model

The source is an ideal 6 V battery. Bulbs have fixed 3 Ω resistance and resistors 5 Ω. Wires, closed switches, and ammeters are ideal zero-resistance components; voltmeters and open switches have infinite resistance. Each builder branch is parallel to exactly one main component, matching the drawing. Brightness represents power relative to 12 W and saturates at full brightness. Real filament temperature and battery internal resistance are not modeled. Ideal short-circuit current has no finite value.

## Verification

Run `node test.cjs` for circuit regression checks and embedded JavaScript syntax validation. These cover series/parallel calculations, open circuits, short circuits, branch bypasses, stale brightness, and meter behavior.

The published GitHub Pages site has been checked in the browser: the page loads, the sample circuit draws 2 A, and opening its switch reduces current to 0 A. The classroom theme adds colorful learning cards, prediction questions, and an illustrated introduction.

## Illustration

`assets/circuit-explorer.png` was created with the built-in image generation tool. It is decorative artwork, not a wiring diagram. The generation prompt is saved in `assets/illustration-prompt.txt`.

Live site: https://jinnamcyber.github.io/playground/
