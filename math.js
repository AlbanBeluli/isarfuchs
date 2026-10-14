/* Mathe Klasse 1 (LehrplanPLUS Bayern): Zahlen bis 20, Plus/Minus, Zahlenhaus, Vergleichen. */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const hub = () => window.IsarFuchs;

  const KINDS = ["count", "plus10", "minus10", "plus20", "minus20", "house", "compare"];
  const LABELS = {
    mix: "Gemischt",
    count: "Zählen bis 20",
    plus10: "Plus bis 10",
    minus10: "Minus bis 10",
    plus20: "Plus bis 20",
    minus20: "Minus bis 20",
    house: "Zahlenhaus",
    compare: "< > =",
  };
  const PROMPTS = {
    count: ["Wie viele siehst du?", "wie-viele"],
    plus10: ["Rechne aus.", "rechne"],
    minus10: ["Rechne aus.", "rechne"],
    plus20: ["Rechne aus.", "rechne"],
    minus20: ["Rechne aus.", "rechne"],
    house: ["Wie viele fehlen im Zahlenhaus?", "zahlenhaus"],
    compare: ["Was passt? Größer, kleiner oder gleich?", "vergleiche"],
  };
  const THINGS = ["🍎", "🐞", "⭐", "🐟", "🍓", "🌼", "🎈", "🐥"];

  const state = { kind: "mix", round: 0, size: 10, task: null, answered: false, started: false, last: "" };
  let els = null;

  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const clip = (name) => `audio/math/${name}.m4a`;

  function makeTask(kind) {
    switch (kind) {
      case "count": {
        const n = rnd(1, 20);
        return { kind, n, answer: String(n), thing: pick(THINGS) };
      }
      case "plus10": {
        const a = rnd(0, 9), b = rnd(1, 10 - a);
        return { kind, a, b, op: "+", answer: String(a + b) };
      }
      case "minus10": {
        const a = rnd(2, 10), b = rnd(1, a);
        return { kind, a, b, op: "−", answer: String(a - b) };
      }
      case "plus20": {
        const a = rnd(2, 15), b = rnd(1, 20 - a);
        return { kind, a, b, op: "+", answer: String(a + b) };
      }
      case "minus20": {
        const a = rnd(11, 20), b = rnd(1, a - 1);
        return { kind, a, b, op: "−", answer: String(a - b) };
      }
      case "house": {
        const n = rnd(3, 10), a = rnd(1, n - 1);
        return { kind, n, a, answer: String(n - a), left: Math.random() < 0.5 };
      }
      default: {
        const a = rnd(0, 20);
        const b = Math.random() < 0.2 ? a : rnd(Math.max(0, a - 6), Math.min(20, a + 6));
        return { kind: "compare", a, b, answer: a < b ? "<" : a > b ? ">" : "=" };
      }
    }
  }

  /* Zehnerfeld: rows of 5, a new field per 10 (like a Rechenrahmen). */
  function tenFrames(items) {
    const wrap = document.createElement("div");
    wrap.className = "ten-frames";
    const fields = Math.max(1, Math.ceil(items.length / 10));
    for (let f = 0; f < fields; f++) {
      const field = document.createElement("div");
      field.className = "ten-frame";
      for (let i = 0; i < 10; i++) {
        const cell = document.createElement("span");
        cell.className = "tf-cell";
        const it = items[f * 10 + i];
        if (it) {
          const dot = document.createElement("span");
          dot.className = "tf-dot " + (it.cls || "");
          if (it.text) dot.textContent = it.text;
          cell.appendChild(dot);
        }
        field.appendChild(cell);
      }
      wrap.appendChild(field);
    }
    return wrap;
  }

  const dots = (n, cls, text) => Array.from({ length: n }, () => ({ cls, text }));

  function renderStage(t) {
    const stage = els.stage;
    stage.replaceChildren();
    if (t.kind === "count") {
      stage.appendChild(tenFrames(dots(t.n, "is-thing", t.thing)));
      return;
    }
    if (t.op) {
      const eq = document.createElement("p");
      eq.className = "math-eq";
      eq.innerHTML = `<span>${t.a}</span> <span class="op">${t.op}</span> <span>${t.b}</span> <span class="op">=</span> <span class="q">?</span>`;
      stage.appendChild(eq);
      const items = t.op === "+"
        ? dots(t.a, "is-red").concat(dots(t.b, "is-blue"))
        : dots(t.a - t.b, "is-red").concat(dots(t.b, "is-gone"));
      stage.appendChild(tenFrames(items));
      return;
    }
    if (t.kind === "house") {
      const house = document.createElement("div");
      house.className = "zahlenhaus";
      const known = `<span class="zh-cell">${t.a}</span>`;
      const gap = `<span class="zh-cell is-q">?</span>`;
      house.innerHTML = `
        <div class="zh-roof"><span>${t.n}</span></div>
        <div class="zh-floor">${t.left ? gap + known : known + gap}</div>`;
      stage.appendChild(house);
      return;
    }
    const cmp = document.createElement("div");
    cmp.className = "compare";
    const side = (n) => {
      const box = document.createElement("div");
      box.className = "compare-side";
      const num = document.createElement("span");
      num.className = "compare-num";
      num.textContent = String(n);
      box.appendChild(num);
      box.appendChild(tenFrames(dots(n, "is-red")));
      return box;
    };
    const mid = document.createElement("span");
    mid.className = "compare-sign q";
    mid.id = "compare-sign";
    mid.textContent = "?";
    cmp.append(side(t.a), mid, side(t.b));
    stage.appendChild(cmp);
  }

  function renderChoices(t) {
    const row = els.choices;
    row.replaceChildren();
    const isCmp = t.kind === "compare";
    row.hidden = !isCmp;
    els.answerRow.hidden = isCmp;
    if (!isCmp) return;
    ["<", "=", ">"].forEach((sign) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice";
      btn.textContent = sign;
      btn.dataset.sign = sign;
      btn.addEventListener("click", () => check(sign));
      row.appendChild(btn);
    });
  }

  function updateProgress() {
    const pct = (state.round / state.size) * 100;
    els.fill.style.width = `${Math.max(8, pct)}%`;
    els.label.textContent = `${Math.min(state.round + 1, state.size)} / ${state.size}`;
  }

  function load() {
    let kind = state.kind === "mix" ? pick(KINDS) : state.kind;
    let t = makeTask(kind);
    for (let i = 0; i < 5 && JSON.stringify(t) === state.last; i++) t = makeTask(kind);
    state.last = JSON.stringify(t);
    state.task = t;
    state.answered = false;
    els.prompt.textContent = PROMPTS[t.kind][0];
    renderStage(t);
    renderChoices(t);
    els.input.value = "";
    els.input.disabled = false;
    els.input.classList.remove("is-ok", "is-bad");
    els.check.disabled = false;
    els.next.disabled = true;
    hub().clearFeedback(els.feedback);
    updateProgress();
    hub().playUrl(clip(PROMPTS[t.kind][1]));
    if (t.kind !== "compare") els.input.focus({ preventScroll: true });
  }

  function next(advance) {
    if (advance) {
      state.round += 1;
      if (state.round >= state.size) {
        state.round = 0;
        hub().burstConfetti();
        loadQuiet();
        return;
      }
    }
    load();
  }

  function loadQuiet() {
    const play = hub().playUrl;
    hub().playUrl = () => {};
    try { load(); } finally { hub().playUrl = play; }
    play("audio/lines/super.m4a");
  }

  function solutionText(t) {
    if (t.kind === "count") return `${t.n} ${t.thing}`;
    if (t.op) return `${t.a} ${t.op} ${t.b} = ${t.answer}`;
    if (t.kind === "house") return `${t.n} = ${t.a} + ${t.answer}`;
    return `${t.a} ${t.answer} ${t.b}`;
  }

  function check(value) {
    const t = state.task;
    if (!t || state.answered) return;
    const raw = String(value != null ? value : els.input.value).trim();
    if (!raw) { els.input.focus(); return; }
    const ok = raw === t.answer || (t.kind !== "compare" && String(parseInt(raw, 10)) === t.answer);
    state.answered = true;
    els.input.disabled = true;
    els.check.disabled = true;
    els.next.disabled = false;
    const q = $(".q", els.stage) || $(".zh-cell.is-q", els.stage);
    if (q) { q.textContent = t.answer; q.classList.add(ok ? "is-ok" : "is-bad-fix"); }
    $$(".choice", els.choices).forEach((b) => {
      b.disabled = true;
      if (b.dataset.sign === t.answer) b.classList.add("is-ok");
      else if (b.dataset.sign === raw) b.classList.add("is-bad");
    });
    const sol = solutionText(t);
    let audio;
    if (t.kind === "compare") audio = clip(ok ? "richtig" : "fast");
    else audio = clip(`${ok ? "richtig" : "fast"}-${t.answer}`);
    if (ok) {
      els.input.classList.add("is-ok");
      hub().showFeedback(els.feedback, true, `Richtig! ${sol}`, audio);
      hub().cheer();
    } else {
      els.input.classList.add("is-bad");
      hub().showFeedback(els.feedback, false, `Fast! ${sol}`, audio);
    }
    hub().playUrl(audio);
    hub().award(ok);
    hub().keepDockInView(els.dock);
    els.next.focus({ preventScroll: true });
  }

  function setKind(kind) {
    state.kind = kind;
    state.round = 0;
    $$("#math-filters .chip").forEach((c) => c.classList.toggle("is-active", c.dataset.math === kind));
    $("#math-summary").textContent = LABELS[kind];
    load();
  }

  function bind() {
    els = {
      stage: $("#math-stage"), prompt: $("#math-prompt"), input: $("#math-input"),
      check: $("#math-check"), next: $("#math-next"), choices: $("#math-choices"),
      answerRow: $("#math-answer-row"), feedback: $("#math-feedback"), dock: $("#math-dock"),
      fill: $("#math-progress-fill"), label: $("#math-progress-label"),
    };
    els.check.addEventListener("click", () => check());
    els.next.addEventListener("click", () => { els.next.blur(); next(true); });
    els.input.addEventListener("input", () => {
      els.input.value = els.input.value.replace(/[^0-9]/g, "");
      els.input.classList.remove("is-ok", "is-bad");
    });
    els.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); state.answered ? next(true) : check(); }
    });
    document.addEventListener("keydown", (e) => {
      if ($("#mode-math").hidden || !state.task) return;
      if (e.target && e.target.tagName === "SUMMARY") return;
      if (state.task.kind === "compare" && !state.answered && ["<", ">", "="].includes(e.key)) {
        e.preventDefault(); check(e.key);
      } else if (e.key === "Enter" && state.answered && e.target !== els.input && e.target !== els.next) {
        e.preventDefault(); next(true);
      }
    });
    $("#math-speak").addEventListener("click", () => {
      if (state.task) hub().playUrl(clip(PROMPTS[state.task.kind][1]));
    });
    $("#replay-math").addEventListener("click", () => hub().playUrl($("#replay-math").dataset.clip));
    $$("#math-filters .chip").forEach((c) => c.addEventListener("click", () => setKind(c.dataset.math)));
  }

  window.IsarMathe = {
    start() {
      if (!els) bind();
      if (!state.started) { state.started = true; load(); }
      else if (state.task && state.task.kind !== "compare" && !state.answered) els.input.focus({ preventScroll: true });
    },
  };
})();
