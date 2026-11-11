"""Assemble index.html from the parts in src/.  Usage: python3 build.py"""
from pathlib import Path
src = Path(__file__).parent / "src"
out = "".join((src / n).read_text(encoding="utf-8") for n in ("head.html", "mid.js", "gens.js", "tail.js"))
out += "\n</script>\n</body>\n</html>\n"
(Path(__file__).parent / "index.html").write_text(out, encoding="utf-8")
print("index.html", len(out), "bytes")
