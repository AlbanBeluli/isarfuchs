(() => {
  "use strict";

  const data = window.LAUT_DATA || [];
  const tableEntries = window.TABLE_ENTRIES || [];

  const state = {
    score: 0,
    streak: 0,
    round: 0,
    roundSize: 10,
    current: null,
    answered: false,
    filter: "all",
    practiceFilter: "all",
    selectedLetters: [],
    helpMode: false,
    listenCurrent: null,
    listenAnswered: false,
    recentIds: [],
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const els = {
    score: $("#score"),
    streak: $("#streak"),
    progressFill: $("#progress-fill"),
    progressLabel: $("#progress-label"),
    emoji: $("#emoji-display"),
    input: $("#letter-input"),
    checkBtn: $("#check-btn"),
    nextBtn: $("#next-btn"),
    skipBtn: $("#skip-btn"),
    speakBtn: $("#speak-word"),
    feedback: $("#feedback"),
    lautGrid: $("#laut-grid"),
    confetti: $("#confetti"),
    listenInput: $("#listen-input"),
    listenCheck: $("#listen-check"),
    listenNext: $("#listen-next"),
    listenSkip: $("#listen-skip"),
    listenSpeak: $("#speak-listen"),
    listenFeedback: $("#listen-feedback"),
    listenHint: $("#listen-hint"),
  };

  /* ---------- Bundled German audio (not the device voice) ---------- */
  let player = null;

  function slug(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function playUrl(url) {
    if (!url) return;
    if (player) {
      player.pause();
      player.src = "";
    }
    player = new Audio(url);
    player.play().catch(() => {});
  }

  function playWord(word) {
    playUrl(`audio/words/${slug(word)}.m4a`);
  }

  function lineUrl(kind, word) {
    return `audio/lines/${kind}-${slug(word)}.m4a`;
  }

  function playLine(kind, word) {
    playUrl(lineUrl(kind, word));
  }

  /* ---------- helpers ---------- */
  function normalizeAnswer(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/SS/g, "ß"); // kids sometimes type ss; we don't require ß as Anlaut
  }

  function answersMatch(input, expected) {
    const a = normalizeAnswer(input);
    const b = normalizeAnswer(expected);
    if (!a) return false;
    if (a === b) return true;
    // tolerate ae/oe/ue
    const fold = (s) =>
      s
        .replace(/Ä/g, "AE")
        .replace(/Ö/g, "OE")
        .replace(/Ü/g, "UE")
        .replace(/ß/g, "SS");
    return fold(a) === fold(b);
  }

  function itemId(item) {
    return `${item.letter}|${item.word}`;
  }

  function pickRandom(list, avoid = []) {
    const pool = list.filter((x) => !avoid.includes(itemId(x)));
    const src = pool.length ? pool : list;
    return src[Math.floor(Math.random() * src.length)];
  }

  function updateStats() {
    els.score.textContent = String(state.score);
    els.streak.textContent = String(state.streak);
  }

  function updateProgress() {
    const n = Math.min(state.round + 1, state.roundSize);
    const pct = ((state.round) / state.roundSize) * 100;
    els.progressFill.style.width = `${Math.max(8, pct)}%`;
    els.progressLabel.textContent = `${Math.min(state.round + 1, state.roundSize)} / ${state.roundSize}`;
  }

  function cheer() {
    const box = $("#cheer");
    if (!box) return;
    box.replaceChildren();
    const span = document.createElement("span");
    span.textContent = "🎉";
    box.appendChild(span);
    setTimeout(() => {
      if (span.parentNode === box) span.remove();
    }, 1200);
  }

  function burstConfetti() {
    if (!els.confetti) return;
    const bits = ["⭐", "✨", "🎉", "🌟", "💛", "🔵", "🟢"];
    for (let i = 0; i < 18; i++) {
      const span = document.createElement("span");
      span.textContent = bits[i % bits.length];
      span.style.left = `${Math.random() * 100}%`;
      span.style.animationDelay = `${Math.random() * 0.25}s`;
      span.style.fontSize = `${1 + Math.random()}rem`;
      els.confetti.appendChild(span);
      setTimeout(() => span.remove(), 1600);
    }
  }

  /* ---------- Practice mode ---------- */
  function showFeedback(el, ok, message, clip) {
    const row = el.closest(".feedback-row");
    if (row) row.hidden = false;
    el.hidden = false;
    el.className = "feedback " + (ok ? "ok" : "bad");
    el.textContent = message;
    const btn = row && row.querySelector(".replay");
    if (btn) btn.dataset.clip = clip || "";
  }

  function clearFeedback(el) {
    const row = el.closest(".feedback-row");
    if (row) row.hidden = true;
    el.hidden = true;
    el.textContent = "";
    el.className = "feedback";
  }

  function loadPracticeItem(item) {
    state.current = item;
    state.answered = false;
    els.emoji.textContent = item.emoji;
    els.input.value = "";
    els.input.classList.remove("is-ok", "is-bad");
    els.input.disabled = false;
    els.checkBtn.disabled = false;
    els.nextBtn.hidden = true;
    clearFeedback(els.feedback);
    updateProgress();
    if (state.helpMode) showChoices();
    else hideChoices();
    playWord(item.speak);
  }

  function uniqueLetters(list) {
    const seen = new Set();
    const out = [];
    for (const item of list) {
      if (seen.has(item.letter)) continue;
      seen.add(item.letter);
      out.push(item.letter);
    }
    return out;
  }

  function shuffle(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function pickChoices(correct) {
    const same = uniqueLetters(practicePool()).filter((letter) => letter !== correct);
    const rest = uniqueLetters(data).filter((letter) => letter !== correct && !same.includes(letter));
    const distractors = shuffle(same.concat(rest)).slice(0, 2);
    return shuffle([correct].concat(distractors));
  }

  function hideChoices() {
    const row = $("#choice-row");
    row.hidden = true;
    row.innerHTML = "";
  }

  function markChoices(picked) {
    $$("#choice-row .choice").forEach((btn) => {
      btn.disabled = true;
      if (btn.textContent === state.current.letter) btn.classList.add("is-ok");
      else if (btn.textContent === picked) btn.classList.add("is-bad");
    });
  }

  function showChoices() {
    if (!state.current || state.answered) return;
    const row = $("#choice-row");
    row.hidden = false;
    row.innerHTML = "";
    pickChoices(state.current.letter).forEach((letter) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice" + (letter.length > 1 ? " is-wide" : "");
      btn.textContent = letter;
      btn.addEventListener("click", () => {
        if (state.answered) return;
        els.input.value = letter;
        checkPractice();
      });
      row.appendChild(btn);
    });
  }

  function setHelpMode(on) {
    state.helpMode = on;
    const toggle = $("#help-toggle");
    toggle.classList.toggle("is-active", on);
    toggle.setAttribute("aria-pressed", on ? "true" : "false");
    try {
      sessionStorage.setItem("laut-help", on ? "1" : "0");
    } catch (err) {
      /* ignore private mode */
    }
    if (!state.current || state.answered) return;
    if (on) showChoices();
    else hideChoices();
  }

  const LETTER_ORDER = [
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
    "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
    "Ä", "Ö", "Ü", "AU", "EI", "EU", "SCH", "PF", "SP", "ST",
  ];

  function practicePool() {
    if (state.selectedLetters.length) {
      return data.filter((item) => state.selectedLetters.includes(item.letter));
    }
    if (state.practiceFilter === "all") return data;
    return data.filter((item) => item.group === state.practiceFilter);
  }

  function updateSetupSummary() {
    const el = $("#setup-summary");
    if (!el) return;
    if (state.selectedLetters.length) {
      el.textContent = state.selectedLetters.join(" ");
      return;
    }
    const labels = {
      all: "Alle",
      vowel: "Vokale",
      umlaut: "Umlaute",
      diphthong: "Zwielaute",
      consonant: "Konsonanten",
      special: "sch / ch",
    };
    el.textContent = labels[state.practiceFilter] || "Alle";
  }

  function syncLetterChips() {
    const selected = new Set(state.selectedLetters);
    $$("#letter-filters .chip").forEach((chip) => {
      const letter = chip.dataset.letter;
      const on = letter === "all" ? selected.size === 0 : selected.has(letter);
      chip.classList.toggle("is-active", on);
      chip.setAttribute("aria-pressed", on ? "true" : "false");
    });
    updateSetupSummary();
  }

  function renderLetterFilters() {
    const box = $("#letter-filters");
    const present = new Set(data.map((item) => item.letter));
    LETTER_ORDER.filter((letter) => present.has(letter)).forEach((letter) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.dataset.letter = letter;
      btn.textContent = letter;
      btn.setAttribute("aria-pressed", "false");
      box.appendChild(btn);
    });
  }

  function resetPracticeRound() {
    state.recentIds = [];
    state.round = 0;
    nextPractice(false);
  }

  function setPracticeGroup(group) {
    state.practiceFilter = group;
    state.selectedLetters = [];
    $$("#practice-filters .chip").forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.practiceFilter === group);
    });
    syncLetterChips();
    resetPracticeRound();
  }

  function togglePracticeLetter(letter) {
    if (letter === "all") {
      state.selectedLetters = [];
    } else {
      const next = new Set(state.selectedLetters);
      if (next.has(letter)) next.delete(letter);
      else next.add(letter);
      state.selectedLetters = LETTER_ORDER.filter((item) => next.has(item));
      state.practiceFilter = "all";
      $$("#practice-filters .chip").forEach((chip) => {
        chip.classList.toggle("is-active", chip.dataset.practiceFilter === "all");
      });
    }
    syncLetterChips();
    resetPracticeRound();
  }

  function nextPractice(advanceRound = true) {
    if (advanceRound) {
      state.round += 1;
      if (state.round >= state.roundSize) {
        state.round = 0;
        burstConfetti();
        playUrl("audio/lines/super.m4a");
      }
    }
    const pool = practicePool();
    const avoid = state.recentIds.slice(-5);
    const item = pickRandom(pool, avoid);
    state.recentIds.push(itemId(item));
    if (state.recentIds.length > 12) state.recentIds.shift();
    loadPracticeItem(item);
    els.input.focus();
  }

  function checkPractice() {
    if (!state.current || state.answered) return;
    const ok = answersMatch(els.input.value, state.current.letter);
    state.answered = true;
    els.input.disabled = true;
    els.checkBtn.disabled = true;
    els.nextBtn.hidden = false;

    if (ok) {
      els.input.classList.add("is-ok");
      state.score += 1;
      state.streak += 1;
      const richtigClip = lineUrl("richtig", state.current.word);
      showFeedback(
        els.feedback,
        true,
        `Richtig! ${state.current.emoji} ${state.current.word} beginnt mit ${state.current.letter}`,
        richtigClip
      );
      playUrl(richtigClip);
      cheer();
      if (state.streak > 0 && state.streak % 5 === 0) burstConfetti();
    } else {
      els.input.classList.add("is-bad");
      state.streak = 0;
      const fastClip = lineUrl("fast", state.current.word);
      showFeedback(
        els.feedback,
        false,
        `Fast! ${state.current.emoji} ${state.current.word} beginnt mit ${state.current.letter}`,
        fastClip
      );
      playUrl(fastClip);
    }
    markChoices(normalizeAnswer(els.input.value));
    updateStats();
  }

  /* ---------- Listen mode ---------- */
  function loadListenItem(item) {
    state.listenCurrent = item;
    state.listenAnswered = false;
    els.listenHint.textContent = "Drücke den Lautsprecher und rate den Anlaut.";
    els.listenInput.value = "";
    els.listenInput.classList.remove("is-ok", "is-bad");
    els.listenInput.disabled = false;
    els.listenCheck.disabled = false;
    els.listenNext.hidden = true;
    clearFeedback(els.listenFeedback);
  }

  function nextListen() {
    const item = pickRandom(data, state.listenCurrent ? [itemId(state.listenCurrent)] : []);
    loadListenItem(item);
    playWord(item.speak);
    els.listenInput.focus();
  }

  function checkListen() {
    if (!state.listenCurrent || state.listenAnswered) return;
    const ok = answersMatch(els.listenInput.value, state.listenCurrent.letter);
    state.listenAnswered = true;
    els.listenInput.disabled = true;
    els.listenCheck.disabled = true;
    els.listenNext.hidden = false;

    if (ok) {
      els.listenInput.classList.add("is-ok");
      state.score += 1;
      state.streak += 1;
      const jaClip = lineUrl("ja", state.listenCurrent.word);
      showFeedback(
        els.listenFeedback,
        true,
        `Richtig! Es war ${state.listenCurrent.emoji} ${state.listenCurrent.word} → ${state.listenCurrent.letter}`,
        jaClip
      );
      playUrl(jaClip);
      cheer();
    } else {
      els.listenInput.classList.add("is-bad");
      state.streak = 0;
      const fastClip = lineUrl("fast", state.listenCurrent.word);
      showFeedback(
        els.listenFeedback,
        false,
        `Fast! ${state.listenCurrent.emoji} ${state.listenCurrent.word} beginnt mit ${state.listenCurrent.letter}`,
        fastClip
      );
      playUrl(fastClip);
    }
    updateStats();
  }

  /* ---------- Table mode ---------- */
  function renderTable() {
    const filter = state.filter;
    const list =
      filter === "all" ? tableEntries : tableEntries.filter((x) => x.group === filter);

    els.lautGrid.innerHTML = "";
    list.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "laut-card";
      btn.setAttribute(
        "aria-label",
        `${item.letter} wie ${item.word}. Antippen zum Anhören.`
      );
      btn.innerHTML = `
        <span class="emoji">${item.emoji}</span>
        <span class="letter">${item.letter}</span>
        <span class="word">${item.word}</span>
        <span class="speak-mini" aria-hidden="true">🔊</span>
      `;
      btn.addEventListener("click", () => {
        playLine("karte", item.word);
      });
      els.lautGrid.appendChild(btn);
    });
  }

  /* ---------- Tabs ---------- */
  function setMode(mode) {
    $$(".tab").forEach((tab) => {
      const on = tab.dataset.mode === mode;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
    });
    $$(".panel").forEach((panel) => {
      const on = panel.id === `mode-${mode}`;
      panel.hidden = !on;
      panel.classList.toggle("is-visible", on);
    });
    if (mode === "listen" && !state.listenCurrent) nextListen();
    if (mode === "table") renderTable();
  }

  /* ---------- wire up ---------- */
  function bind() {
    $$(".tab").forEach((tab) => {
      tab.addEventListener("click", () => setMode(tab.dataset.mode));
    });

    els.speakBtn.addEventListener("click", () => {
      if (state.current) playWord(state.current.speak);
    });

    $("#replay-feedback").addEventListener("click", () => {
      playUrl($("#replay-feedback").dataset.clip);
    });
    $("#replay-listen").addEventListener("click", () => {
      playUrl($("#replay-listen").dataset.clip);
    });

    els.checkBtn.addEventListener("click", checkPractice);
    $("#help-toggle").addEventListener("click", () => setHelpMode(!state.helpMode));
    els.nextBtn.addEventListener("click", () => nextPractice(true));
    els.skipBtn.addEventListener("click", () => {
      state.streak = 0;
      updateStats();
      nextPractice(true);
    });

    els.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (state.answered) nextPractice(true);
        else checkPractice();
      }
    });

    els.input.addEventListener("input", () => {
      els.input.value = els.input.value.toUpperCase();
      els.input.classList.remove("is-ok", "is-bad");
    });

    els.listenSpeak.addEventListener("click", () => {
      if (state.listenCurrent) playWord(state.listenCurrent.speak);
    });
    els.listenCheck.addEventListener("click", checkListen);
    els.listenNext.addEventListener("click", nextListen);
    els.listenSkip.addEventListener("click", () => {
      state.streak = 0;
      updateStats();
      nextListen();
    });
    els.listenInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (state.listenAnswered) nextListen();
        else checkListen();
      }
    });
    els.listenInput.addEventListener("input", () => {
      els.listenInput.value = els.listenInput.value.toUpperCase();
      els.listenInput.classList.remove("is-ok", "is-bad");
    });

    $$("#mode-table .chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        $$("#mode-table .chip").forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");
        state.filter = chip.dataset.filter;
        renderTable();
      });
    });

    $$("#practice-filters .chip").forEach((chip) => {
      chip.addEventListener("click", () => setPracticeGroup(chip.dataset.practiceFilter));
    });

    $("#letter-filters").addEventListener("click", (event) => {
      const chip = event.target.closest("[data-letter]");
      if (!chip || !$("#letter-filters").contains(chip)) return;
      togglePracticeLetter(chip.dataset.letter);
    });
  }

  function init() {
    bind();
    renderLetterFilters();
    renderTable();
    updateStats();
    try {
      if (sessionStorage.getItem("laut-help") === "1") setHelpMode(true);
    } catch (err) {
      /* ignore */
    }
    nextPractice(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
