# 墨語 Ink Words

An interactive ink-painting page for a classroom board. Type or tap a word (繁體、简体, pinyin or English) and it is written in ink, dissolves into flowing water, and becomes a painting. Drag to stir the ink.

- Open `index.html` in a modern browser. No server or install needed.
- 22 words: 山 月 日 竹 松 梅 柳 荷 草 石 水 舟 魚 鳥 蝶 龍 風 霧 雨 雪 雷 火.
- Opened as the Claude artifact, words outside the bank are painted live by Claude. Opened as a plain file, only the 22 bank words paint.
- To change it, edit `src/` and run `python3 build.py`.

See [HANDOFF.md](HANDOFF.md) for how it works, what has been tested, and what is still open.
