#!/usr/bin/env python3
"""Generate German speech files with macOS Anna (de_DE).

These files ship with the app. Playback does not use the visitor's
system language or browser voices.
"""

import re
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data.js"
AUDIO = ROOT / "audio"
VOICE = "Anna"
RATE = "150"

LETTER_SAY = {
    "A": "A",
    "B": "Be",
    "C": "Ce",
    "D": "De",
    "E": "E",
    "F": "Ef",
    "G": "Ge",
    "H": "Ha",
    "I": "I",
    "J": "Jot",
    "K": "Ka",
    "L": "El",
    "M": "Em",
    "N": "En",
    "O": "O",
    "P": "Pe",
    "Q": "Ku",
    "R": "Er",
    "S": "Es",
    "T": "Te",
    "U": "U",
    "V": "Vau",
    "W": "We",
    "X": "Iks",
    "Y": "Ypsilon",
    "Z": "Zett",
    "Ä": "Ä",
    "Ö": "Ö",
    "Ü": "Ü",
    "AU": "Au",
    "EI": "Ei",
    "EU": "Eu",
    "SCH": "sch",
    "CH": "ch",
    "PF": "pf",
    "SP": "sp",
    "ST": "st",
}


def slug(text: str) -> str:
    lowered = text.lower()
    for src, dst in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        lowered = lowered.replace(src, dst)
    cleaned = re.sub(r"[^a-z0-9]+", "-", lowered).strip("-")
    if not cleaned:
        raise ValueError(f"empty slug for {text!r}")
    return cleaned


def synth(out: Path, spoken: str) -> str:
    # Never remove a live clip before its replacement exists.
    # Write beside the file, then replace in one step.
    if out.exists() and out.stat().st_size >= 800:
        return "skip " + str(out.relative_to(ROOT))
    out.parent.mkdir(parents=True, exist_ok=True)
    aiff = out.with_suffix(".aiff")
    tmp = out.with_suffix(".m4a.tmp")
    subprocess.run(
        ["say", "-v", VOICE, "-r", RATE, "-o", str(aiff), spoken],
        check=True,
        capture_output=True,
    )
    subprocess.run(
        ["afconvert", "-f", "m4af", "-d", "aac", "-b", "64000", str(aiff), str(tmp)],
        check=True,
        capture_output=True,
    )
    aiff.unlink(missing_ok=True)
    if not tmp.exists() or tmp.stat().st_size < 800:
        tmp.unlink(missing_ok=True)
        raise RuntimeError(f"bad audio file: {out}")
    tmp.replace(out)
    return str(out.relative_to(ROOT))


def load_items():
    text = DATA.read_text(encoding="utf-8")
    items = re.findall(r'letter:\s*"([^"]+)",\s*word:\s*"([^"]+)"', text)
    if len(items) < 40:
        raise SystemExit(f"expected Laut items in data.js, found {len(items)}")
    return items


def jobs():
    seen_words = set()
    for letter, word in load_items():
        if letter not in LETTER_SAY:
            raise SystemExit(f"no spoken form for letter {letter}")
        spoken_letter = LETTER_SAY[letter]
        key = slug(word)
        if key in seen_words:
            continue
        seen_words.add(key)
        yield AUDIO / "words" / f"{key}.m4a", word
        yield AUDIO / "lines" / f"karte-{key}.m4a", f"{word}. {spoken_letter} wie {word}."
        yield AUDIO / "lines" / f"richtig-{key}.m4a", f"Richtig. {word} beginnt mit [[slnc 280]] {spoken_letter}."
        yield AUDIO / "lines" / f"fast-{key}.m4a", f"Fast. {word} beginnt mit [[slnc 280]] {spoken_letter}."
        yield AUDIO / "lines" / f"schau-{key}.m4a", f"Schau noch mal. {word} beginnt mit [[slnc 280]] {spoken_letter}."
        yield AUDIO / "lines" / f"ja-{key}.m4a", f"Richtig. {word}."
        yield AUDIO / "lines" / f"beginnt-{key}.m4a", f"{word} beginnt mit [[slnc 280]] {spoken_letter}."

    for letter, spoken in LETTER_SAY.items():
        yield AUDIO / "letters" / f"{slug(letter)}.m4a", spoken

    yield AUDIO / "lines" / "super.m4a", "Super gemacht. Neue Runde."


def main():
    tasks = list(jobs())
    print(f"generating {len(tasks)} clips with {VOICE}")
    done = 0
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(synth, path, text) for path, text in tasks]
        for fut in as_completed(futures):
            rel = fut.result()
            done += 1
            if done % 25 == 0 or done == len(tasks):
                print(f"{done}/{len(tasks)} {rel}")
    print("ok")


if __name__ == "__main__":
    main()
