# Lauttabelle

A small web app for Klasse 1. The child sees an emoji, hears the German word, and writes the starting sound (Anlaut). Built for Druckschrift practice, in the spirit of *Mit der Lauttabelle schreiben lernen*. It is not a copy of that book. The pictures are emojis, and the word list is a normal Klasse-1 set.

Plain HTML, CSS, and JavaScript. No framework, no build step, no login.

## Open it

Open `index.html` in a browser, or serve the folder:

```bash
cd /Users/akira/WEB/school
python3 -m http.server 8080
```

Then go to http://localhost:8080

On a server, upload the whole folder, including `audio/`. Speech does not come from the visitor's Mac or phone.

Do not add a query string to audio paths (`file.m4a?v=2`). Opened as a local file, that makes the clip fail even when the file is there.

## What the child can do

**Üben.** The picture is on the left. The speaker sits to the right of it, so the card stays short and the button is easy to tap. The child types the Anlaut with the laptop or phone keyboard. There is no on-screen keyboard.

**Übung einstellen** is a closed bar above the exercise. Open it to pick a group (Alle, Vokale, Umlaute, Zwielaute, Konsonanten, sch / ch / …) or exact letters, for example S, N, U, and W. The closed bar shows the current set. Selected letters override the group. Alle clears the selection. Changing the set starts a new round of 10.

**Hilfe: 3 Buchstaben.** Stays on. Every card shows three letters. One is the right Anlaut. The other two are decoys. The order changes each time.

**Nicht sicher?** Shows those three letters for the current card only.

A right answer is green. A party popper pops in the middle of the screen, then fades. A wrong answer is red, and the correct letter stays green. The speaker next to "Richtig!" or "Fast!" replays that sentence.

**Tabelle.** One card per letter. Tap a card to hear "Affe. A wie Affe."

**Hören.** No picture. Only the speaker, then the child types the Anlaut.

Stars and the streak sit in the header. They reset when the page is reloaded. The 3-letter help switch is remembered for this browser tab.

## Speech

German audio is bundled in `audio/`. The voice is Anna (macOS, de_DE). The browser does not use the device language. An English Mac still hears German.

| Folder | What it says |
| --- | --- |
| `audio/words/` | The word only. Affe. |
| `audio/lines/karte-*.m4a` | Affe. A wie Affe. |
| `audio/lines/richtig-*.m4a` | Richtig. Affe beginnt mit A. |
| `audio/lines/fast-*.m4a` | Fast. Affe beginnt mit A. |
| `audio/lines/schau-*.m4a` | Schau noch mal. Affe beginnt mit A. |
| `audio/lines/ja-*.m4a` | Richtig. Affe. |
| `audio/lines/beginnt-*.m4a` | Affe beginnt mit A. |
| `audio/letters/` | Letter names. Not used by the current screens. |

"beginnt mit" has a short pause before the letter. Without it, Anna glues "mit" and "En" into "mitten", and the N disappears. The same trap hits L ("Mittel") and M.

If a new word has no clip, that speaker stays silent. Generate the missing file. Do not delete the old clip first.

## Words

All cards live in `data.js` as `window.LAUT_DATA`.

Each entry has:

- `letter`: what the child must write. This is the Anlaut, never a sound at the end of the word.
- `word` / `speak`: the word Anna says.
- `emoji`: the picture. A child must name that picture with this word. A chair is not a table. An olive is not oil. A piano is not a xylophone.
- `group`: `vowel`, `umlaut`, `diphthong`, `consonant`, or `special`.

Rules that already bit us:

- Buch is B, not CH. CH at the end of Buch is not an Anlaut.
- Eimer is EI, like Eis and Ei. It is not E like Ente.
- Pferd and Pfeil are PF. Schaf and Schuh are SCH. Spinne is SP. Stern is ST.
- Clown, Computer, Cowboy, Cupcake, and Croissant are German loanwords spelled with C.
- X is left out. There is no xylophone emoji.
- Y is only Yoga. A bison is not a yak. A sailboat is not a yacht.
- Q is only Qualle. A fountain is a Brunnen, not a Quelle.

The table shows the first word for each letter. Practice and Hören use every word.

Current set: 138 words, 35 letters.

| Letter | Words |
| --- | --- |
| A | Affe, Apfel, Ameise, Ampel, Ananas, Angel, Anker |
| E | Ente, Esel, Elefant, Erdbeere, Engel |
| I | Igel, Insel, Inliner, Iris |
| O | Oma, Opa, Orange, Ohr, Oktopus |
| U | Uhr, Ufo, U-Bahn |
| Ä Ö Ü | Äpfel, Öl, Übung |
| AU EI EU | Auto, Auge. Eis, Ei, Eimer. Eule, Euro. |
| B | Ball, Baum, Buch, Banane, Bär, Biene, Blume, Bus |
| C | Clown, Computer, Cowboy, Cupcake, Croissant |
| D | Dino, Dose, Delphin, Drachen, Daumen |
| F | Fisch, Fuchs, Fahrrad, Frosch, Feuer, Feder |
| G | Giraffe, Gitarre, Gespenst, Glocke, Geschenk |
| H | Hund, Haus, Hase, Herz, Hut, Honig |
| J | Jacke, Jojo, Junge |
| K | Katze, Kuchen, Kuh, König, Kirsche, Krokodil |
| L | Löwe, Lama, Löffel, Leiter, Lutscher |
| M | Maus, Mond, Mütze, Milch, Motorrad |
| N | Nase, Nest, Nashorn, Nilpferd, Note |
| P | Paket, Pilz, Pinguin, Palme, Pizza, Papagei |
| Q | Qualle |
| R | Rose, Rakete, Regenbogen, Roller, Rutsche |
| S | Sonne, Saft, Socke, Seife, Salat |
| T | Tiger, Tasse, Teddy, Telefon, Tomate, Traktor |
| V | Vogel, Vase, Vampir, Violine |
| W | Wal, Wolke, Wasser, Wurm, Würfel, Welle |
| Y | Yoga |
| Z | Zug, Zebra, Zitrone, Zelt, Ziege |
| SCH PF SP ST | Schaf, Schuh. Pferd, Pfeil. Spinne. Stern. |

Thin on purpose: Q, Y, Ä, Ö, Ü, SP, ST. Do not add a word just to fill the count if the picture would teach the wrong name.

## Add or change a word

1. Add or edit one object in `LAUT_DATA`. The word must actually start with `letter`. The emoji must be that thing.
2. Generate audio. The script skips a clip that already exists and is big enough. It writes the new file beside the old one, then replaces it. It does not delete the live clip first.

```bash
cd /Users/akira/WEB/school
python3 scripts/generate-audio.py
```

If the letter of an existing word changes (Eimer from E to EI), the old line clips are wrong and the script will skip them. Write the new clips to a temp file, confirm they exist, then replace. Never `rm` the live `audio/lines` files before the replacements are ready. That is how Richtig and Fast went silent.

The script needs macOS `say` with the voice Anna, plus `afconvert`. It writes `.m4a` files. Wait until it prints `ok`.

## Files

```
index.html                 page
styles.css                 layout
app.js                     modes, scoring, playback
data.js                    words and letters
scripts/generate-audio.py  Anna clips
audio/                     German speech, ship this with the site
```

## Not in this version

- No login, no saved scores, no accounts.
- No copy of the publisher's Lauttabelle pictures.
- No CH Anlaut card. Add one later only if the picture word really starts with CH.
- No X card.
- Deploy is not set up yet. Any static host works if `audio/` is included.
