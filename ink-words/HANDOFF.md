# 墨語 Ink Words — handoff

Last updated: 2026-11-12 (Asia/Macau)

## 摘要（繁體中文）

「墨語」是一個單檔 HTML 互動水墨頁面，給學生在互動白板上用。輸入或點選一個字（繁體、簡體、拼音、英文皆可），那個字先以毛筆字落在紙上，化成流動的墨，再變成對應的水墨畫；手指拖動可以攪動墨水。字庫有 22 個手工畫的字。在 Claude 裡打開時，字庫以外的字會由 Claude 當場一筆一筆畫出來（AI 作畫）。尚未在真實白板上測過流暢度，也尚未用真正的 Claude 回應測過 AI 作畫的品質和等待時間。

## What it is

A single self-contained HTML page (`index.html`, about 54 KB, no build tooling needed to run it). The user is a teacher in Macau who wants it on a classroom interactive board for students.

- Type or tap a word. It is written as a brush character, dissolves as fluid ink, and the painting for that word forms.
- Dragging on the paper stirs the ink (multi-touch).
- UI is Traditional Chinese; each word button keeps a small English label.
- Published as a Claude artifact titled "墨語 Ink Words" (private to the owner): https://claude.ai/artifact/7ZL9s76kYAEeXeVp15BpXT

## Files

| Path | What it holds |
| --- | --- |
| `index.html` | The built page. This is the deliverable; open it directly in a browser. |
| `src/head.html` | HTML shell, CSS, and all UI text. |
| `src/mid.js` | Brush engine (`stroke`, `leaf`, `wash`, `dot`) and the original 15 painters (bamboo, mountain, moon, sun, bird, fish, pine, plum, rain, boat, water, rock, grass, lotus, willow). |
| `src/gens.js` | Newer painters: snow, butterfly, dragon, thunder, fire; mist and wind are fluid-only. |
| `src/tail.js` | Word bank, GPU fluid simulation, sprite/animation engine, AI painting, UI wiring. |
| `build.py` | Concatenates `src/*` into `index.html`. Run `python3 build.py`. |

Edit the files in `src/`, then rebuild. Do not edit `index.html` by hand.

## How it works

Three stacked canvases inside `#stage`:

1. `#paper` (2D): rice-paper texture. Also uploaded to the GPU as the fluid's background.
2. `#fluid` (WebGL2): stable-fluids simulation (curl, vorticity confinement, pressure solve, advection, light blur). The dye texture stores how much red/green/blue light the ink absorbs; the display shader renders `paper * exp(-dye)` with a slight dark rim.
3. `#ink` (2D, transparent): the paintings, drawn above the fluid.

Each word is an element of one of three types:

- **Sprite** (bamboo, mountain, pine, plum, willow, lotus, grass, rock, sun, boat, rain, fire logs): brushed once into its own offscreen canvas over about 110 frames. Plants are redrawn each frame in 3 px horizontal slices with a travelling sine offset, which is the wind sway (`SWAY` table). Rain scrolls its sprite; the boat bobs.
- **Live** (fish, bird, water, butterfly, dragon, snow, moon, thunder bolt): regenerated from the same seed every frame with time as a parameter (`LIVE` table). `stroke()` uses a private random stream so a changing path length does not shift the element's other random values.
- **Fluid effects** (`FX` table): fire, mist, wind and thunder inject dye and velocity into the fluid every frame. Fish and the dragon stir it.

Word entry flow (`paint()` in `tail.js`): look up the word in `BANK`/`ALIAS`, pick a position (tapped spot, else the `DEF` range for that kind), stamp the glyph into the dye texture (`dropGlyph`), queue two vortex impulses, and start the element about 0.9 s later.

Fallbacks: without WebGL2 the fluid canvas is hidden and the paintings still work. With `prefers-reduced-motion` nothing animates.

## AI painting (words outside the bank)

Only active when the page runs as the Claude artifact, which declares the `sample` capability (runtime contract 0.2.96). The standalone `index.html` has no `window.claude`, so it falls back to "the ink drifts away".

- At load the page calls `claude.use("sample")`. If it resolves to a function, `AI.on` is set, an "AI 作畫" badge appears and the placeholder changes.
- `paint()` splits the input on punctuation into phrases. A phrase made only of bank words paints each word; anything else is sent to Claude as one phrase (`aiPaint`).
- `aiPrompt(word)` asks for one JSON object per line on a 100×100 canvas: a meta line `{"zh","motion"}`, then strokes `{"p":[[x,y]…],"w","c","t","sharp"}`, washes `{"wash":[x,y,r],"c"}` and dots `{"dot":[x,y,r],"c"}`. `{"no":1}` means "cannot or should not paint this".
- The reply is streamed (`onText`), so each stroke is brushed as soon as its line arrives (`aiAdd` → `shapeOps`, using the same `stroke()` brush as the bank paintings). While waiting, the dropped word keeps swirling (`AI.pending`).
- `motion: "sway"` bends the sprite like a plant; `"float"` bobs it like the boat.
- Results are cached per word in memory and `localStorage` (`inkwords.ai.v1`, 60 entries) so a repeated word is instant and costs nothing.
- At most two AI paintings run at once. Each one spends the signed-in viewer's Claude usage, and the first one in a view shows a consent prompt.
- **Model switch:** tap the red 墨 seal three times. Options: Haiku (`quick`), Sonnet (`default`, the default choice), Opus and Fable (`complex`), all with `effort: "low"` except Haiku. The panel shows the last word's time and which model actually answered; if a named model is unavailable the platform silently falls back to the tier. The choice is saved in `localStorage` (`inkwords.model`).

## Adding a word

1. Write `G.<kind> = function(P, ax, ay){…}` in `src/gens.js`. `ax, ay` are the anchor in CSS pixels; use `P.R(a,b)` for random values, `P.S` for scale, `P.t` for time (live kinds only).
2. Add it to `BANK` in `src/tail.js`: `kind: ['字', 'english pinyin 繁 简 aliases']`.
3. Add a default position range to `DEF`.
4. If it should animate every frame add it to `LIVE`; if it is a plant add it to `SWAY`; if it should affect the fluid add an `FX` entry. Optional glyph colour goes in `GCOL`.
5. `python3 build.py`.

## Verified

Tested in headless Chrome (software WebGL) at 1280×720 and 390×780:

- All 22 words paint without script errors, in English, Traditional, Simplified and pinyin.
- Fluid glyph dissolve, stirring by drag, Undo, Clear, unknown-word message.
- No-WebGL fallback paints correctly.
- AI painting against a **simulated** Claude reply: streaming strokes, the `{"no":1}` path, a rate-limit error, the cache, phrase splitting (`bubble tea, 竹 月`), and the model panel.

## Not verified / known gaps

- **Frame rate on real hardware.** The test machine had no GPU (about 5 fps in software), so smoothness on the actual board is unknown. If it is slow, lower `sShort` (sim resolution, 128) and `dShort` (dye resolution, 512/640) in `F.resize`, or reduce pressure iterations (14) in `F.step`.
- **Fonts.** `LXGW WenKai TC` and `Ma Shan Zheng` load from Google Fonts; the test machine was offline, so their real appearance was not seen. Ma Shan Zheng lacks many Traditional glyphs, so the dropped character falls back to WenKai for those.
- **Emitter strength** (fire, mist, thunder cloud, dragon wake) was tuned in slow motion and may need adjusting at 60 fps.
- **Dragon** is the weakest painting: a stylised serpent.
- **"yu" pinyin** maps to fish; rain needs "rain" or 雨.
- **No sound.** The reference video the user liked has a sound toggle.
- **AI painting has not been run against the real Claude.** The test used a hand-written reply. Unknown until tried in the artifact: how recognisable the paintings are, how long each model takes, and whether Fable can be selected from a page. The prompt in `aiPrompt` is the first thing to tune.
- **Open-day practicalities:** the board must be online and signed in to the owner's Claude account, each new word spends that account's usage, and visitors may type anything. The prompt asks Claude to decline words unsuitable for children, but that is not a guarantee.
- **Full screen** may be refused inside the Claude artifact viewer; it should work when `index.html` is opened directly.

## History

1. Static ink brush page, 16 words, red seal for unknown words.
2. Added per-frame animation (sway, swimming fish, birds, rain).
3. Rebuilt after the user shared a reference recording: GPU fluid ink, glyph-to-ink entrance, drag to stir, six new words, board-friendly layout.
4. Switched UI and bank to Traditional Chinese; renamed to 墨語.
5. Added AI painting for words outside the bank (the user wants a real-time AI demo for a school open day), with a hidden model switch.

## Open questions for the user

- How does it run on the classroom board?
- Which model gives the best balance of speed and quality for AI painting? (Try the same words on each.)
- When is the open day? Voice input (`dictation`), an AI-written couplet, and reading it aloud (`tts`) were proposed but not built.
- Keep or remove the English labels under each character?
- Which words do the students need next?
- Is sound wanted?
