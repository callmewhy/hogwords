/* Hogwords Vocabulary — public static SPA */
const App = (() => {
  const PAGE_SIZE = 80;
  let data = null;
  let flat = [];
  let browseState = { query: "", book: "all", letter: "", page: 1 };
  let flash = { deck: [], index: 0, revealed: false, know: 0, dont: 0 };
  let quiz = { items: [], index: 0, score: 0, mode: "mc", answered: false };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const t = (key, vars) => (window.I18N ? window.I18N.t(key, vars) : key);

  async function init() {
    if (window.I18N) window.I18N.init();
    else console.warn('[Hogwords] i18n missing');
    document.addEventListener("hogwords:lang", () => {
      populateSelects();
      renderHome();
      buildAzBar();
      renderBrowse();
      updateFlashUI();
      if (!$("#quiz-panel").classList.contains("hidden") && quiz.items.length) {
        // keep quiz state; only refresh static chrome already handled by i18n
      }
    });
    try {
      const res = await fetch("/data/words.json");
      if (!res.ok) throw new Error("Failed to load words.json");
      data = await res.json();
    } catch (err) {
      document.getElementById("app").innerHTML =
        `<div class="hero"><h1>${escapeHtml(t("load.error"))}</h1><p class="lead">${escapeHtml(err.message)}</p></div>`;
      return;
    }
    buildFlat();
    bindNav();
    renderHome();
    populateSelects();
    buildAzBar();
    bindBrowse();
    bindFlash();
    bindQuiz();
    bindDownload();
    renderBrowse();
    resetFlash();
  }

  function buildFlat() {
    flat = [];
    for (const b of data.books) {
      for (const w of b.words) {
        flat.push({
          word: w,
          bookId: b.id,
          bookEn: b.titleEn,
          bookZh: b.titleZh,
        });
      }
    }
  }

  function bindNav() {
    $$(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => showView(btn.dataset.view));
    });
  }

  function showView(name) {
    $$(".view").forEach((v) => v.classList.remove("active"));
    $$(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
    const el = document.getElementById(`view-${name}`);
    if (el) el.classList.add("active");
    if (name === "flash" && flash.deck.length === 0) resetFlash();
  }

  function renderHome() {
    $("#stat-books").textContent = data.stats.bookCount;
    $("#stat-total").textContent = data.stats.totalWordOccurrences.toLocaleString();
    $("#stat-unique").textContent = data.stats.uniqueWords.toLocaleString();
    const grid = $("#book-grid");
    grid.innerHTML = data.books
      .map(
        (b) => `
      <button type="button" class="book-card" data-book="${b.id}">
        <div class="book-num">${escapeHtml(t("book.n", { n: b.id }))}</div>
        <h3>${escapeHtml(b.titleEn)}</h3>
        <p class="book-zh">${escapeHtml(b.titleZh)}</p>
        <div class="book-count">${escapeHtml(t("home.bookWords", { n: b.wordCount.toLocaleString() }))}</div>
      </button>`
      )
      .join("");
    grid.querySelectorAll(".book-card").forEach((card) => {
      card.addEventListener("click", () => {
        browseState.book = card.dataset.book;
        browseState.page = 1;
        browseState.letter = "";
        $("#filter-book").value = browseState.book;
        clearAzActive();
        showView("browse");
        renderBrowse();
      });
    });
  }

  function bookOptionLabel(b, preferZh) {
    const lang = window.I18N ? I18N.getLang() : "en";
    const useZh = preferZh || lang === "zh-CN" || lang === "zh-TW";
    const title = useZh ? b.titleZh : b.titleEn;
    return `Book ${b.id} · ${title}`;
  }

  function populateSelects() {
    const allLabel = t("browse.allBooks");
    const filterOpts =
      `<option value="all">${escapeHtml(allLabel)}</option>` +
      data.books
        .map(
          (b) =>
            `<option value="${b.id}">${escapeHtml(bookOptionLabel(b, true))} (${b.wordCount})</option>`
        )
        .join("");
    const practiceOpts =
      `<option value="all">${escapeHtml(allLabel)}</option>` +
      data.books
        .map((b) => `<option value="${b.id}">${escapeHtml(bookOptionLabel(b, false))} (${b.wordCount})</option>`)
        .join("");
    const dlOpts = data.books
      .map((b) => `<option value="${b.id}">${escapeHtml(bookOptionLabel(b, false))}</option>`)
      .join("");

    const keep = {
      filter: $("#filter-book").value,
      flash: $("#flash-book").value,
      quiz: $("#quiz-book").value,
      dl: $("#dl-book").value,
    };
    $("#filter-book").innerHTML = filterOpts;
    $("#flash-book").innerHTML = practiceOpts;
    $("#quiz-book").innerHTML = practiceOpts;
    $("#dl-book").innerHTML = dlOpts;
    if (keep.filter) $("#filter-book").value = keep.filter;
    if (keep.flash) $("#flash-book").value = keep.flash;
    if (keep.quiz) $("#quiz-book").value = keep.quiz;
    if (keep.dl) $("#dl-book").value = keep.dl;

    // refresh mode option labels
    const mode = $("#quiz-mode");
    const curMode = mode.value;
    mode.innerHTML = `
      <option value="mc">${escapeHtml(t("quiz.modeMc"))}</option>
      <option value="type">${escapeHtml(t("quiz.modeType"))}</option>`;
    mode.value = curMode;
  }

  function buildAzBar() {
    const bar = $("#az-bar");
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const prevLetter = browseState.letter;
    bar.innerHTML =
      `<button type="button" data-letter="" class="${prevLetter ? "" : "active"}">${escapeHtml(t("browse.azAll"))}</button>` +
      letters
        .map(
          (L) =>
            `<button type="button" data-letter="${L}" class="${prevLetter === L ? "active" : ""}">${L}</button>`
        )
        .join("");
    bar.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        browseState.letter = btn.dataset.letter;
        browseState.page = 1;
        clearAzActive();
        btn.classList.add("active");
        renderBrowse();
      });
    });
  }

  function clearAzActive() {
    $$("#az-bar button").forEach((b) => b.classList.remove("active"));
    const all = $('#az-bar button[data-letter=""]');
    if (!browseState.letter && all) all.classList.add("active");
    else if (browseState.letter) {
      const target = $(`#az-bar button[data-letter="${browseState.letter}"]`);
      if (target) target.classList.add("active");
    }
  }

  function filteredWords() {
    const q = browseState.query.trim().toLowerCase();
    return flat.filter((row) => {
      if (browseState.book !== "all" && String(row.bookId) !== String(browseState.book)) return false;
      if (browseState.letter && !row.word.toUpperCase().startsWith(browseState.letter)) return false;
      if (q && !row.word.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function bindBrowse() {
    let timer = null;
    $("#search-input").addEventListener("input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        browseState.query = e.target.value;
        browseState.page = 1;
        renderBrowse();
      }, 120);
    });
    $("#filter-book").addEventListener("change", (e) => {
      browseState.book = e.target.value;
      browseState.page = 1;
      renderBrowse();
    });
    $("#page-prev").addEventListener("click", () => {
      if (browseState.page > 1) {
        browseState.page--;
        renderBrowse();
      }
    });
    $("#page-next").addEventListener("click", () => {
      browseState.page++;
      renderBrowse();
    });
  }

  function renderBrowse() {
    const rows = filteredWords();
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if (browseState.page > totalPages) browseState.page = totalPages;
    const start = (browseState.page - 1) * PAGE_SIZE;
    const pageRows = rows.slice(start, start + PAGE_SIZE);
    $("#list-count").textContent = t("browse.words", { n: rows.length.toLocaleString() });
    $("#page-info").textContent = `${browseState.page} / ${totalPages}`;
    $("#page-prev").disabled = browseState.page <= 1;
    $("#page-next").disabled = browseState.page >= totalPages;
    const tbody = $("#word-tbody");
    const lang = window.I18N ? I18N.getLang() : "en";
    const useZh = lang === "zh-CN" || lang === "zh-TW";
    tbody.innerHTML = pageRows
      .map(
        (r, i) => `
      <tr>
        <td>${start + i + 1}</td>
        <td><strong>${escapeHtml(r.word)}</strong></td>
        <td>B${r.bookId} · ${escapeHtml(useZh ? r.bookZh : r.bookEn)}</td>
        <td><button type="button" class="speak-btn" data-word="${escapeAttr(r.word)}" title="Speak">🔊</button></td>
      </tr>`
      )
      .join("");
    tbody.querySelectorAll(".speak-btn").forEach((btn) => {
      btn.addEventListener("click", () => speak(btn.dataset.word));
    });
  }

  function wordsForBook(bookVal) {
    if (bookVal === "all") {
      const seen = new Set();
      const out = [];
      for (const row of flat) {
        const k = row.word.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(row);
      }
      return out;
    }
    return flat.filter((r) => String(r.bookId) === String(bookVal));
  }

  function bindFlash() {
    $("#flash-book").addEventListener("change", resetFlash);
    $("#flash-shuffle").addEventListener("click", resetFlash);
    $("#flash-card").addEventListener("click", revealFlash);
    $("#flash-card").addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        revealFlash();
      }
    });
    $("#flash-speak").addEventListener("click", () => {
      const cur = flash.deck[flash.index];
      if (cur) speak(cur.word);
    });
    $("#flash-know-btn").addEventListener("click", () => gradeFlash(true));
    $("#flash-dont-btn").addEventListener("click", () => gradeFlash(false));
  }

  function resetFlash() {
    const pool = wordsForBook($("#flash-book").value);
    flash.deck = shuffle(pool.slice());
    flash.index = 0;
    flash.revealed = false;
    flash.know = 0;
    flash.dont = 0;
    updateFlashUI();
  }

  function revealFlash() {
    if (!flash.deck.length) return;
    flash.revealed = true;
    updateFlashUI();
    if ($("#flash-tts").checked) {
      const cur = flash.deck[flash.index];
      if (cur) speak(cur.word);
    }
  }

  function gradeFlash(know) {
    if (!flash.deck.length) return;
    if (!flash.revealed) {
      revealFlash();
      return;
    }
    if (know) flash.know++;
    else flash.dont++;
    flash.index++;
    flash.revealed = false;
    if (flash.index >= flash.deck.length) {
      flash.index = 0;
      flash.deck = shuffle(flash.deck.slice());
    }
    updateFlashUI();
  }

  function updateFlashUI() {
    const total = flash.deck.length;
    const cur = flash.deck[flash.index];
    $("#flash-progress").textContent = total
      ? `${Math.min(flash.index + 1, total)} / ${total}`
      : "0 / 0";
    $("#flash-know").textContent = flash.know;
    $("#flash-dont").textContent = flash.dont;
    const front = $("#flash-card .front");
    const back = $("#flash-card .back");
    if (!cur) {
      $("#flash-word").textContent = t("flash.empty");
      $("#flash-word-back").textContent = "—";
      $("#flash-book-tag").textContent = "";
      front.classList.remove("hidden");
      back.classList.add("hidden");
      return;
    }
    $("#flash-word").textContent = cur.word;
    $("#flash-word-back").textContent = cur.word;
    $("#flash-book-tag").textContent = `Book ${cur.bookId} · ${cur.bookEn} · ${cur.bookZh}`;
    if (flash.revealed) {
      front.classList.add("hidden");
      back.classList.remove("hidden");
    } else {
      front.classList.remove("hidden");
      back.classList.add("hidden");
    }
  }

  function bindQuiz() {
    $("#quiz-start").addEventListener("click", startQuiz);
    $("#quiz-restart").addEventListener("click", startQuiz);
    $("#quiz-submit").addEventListener("click", submitType);
    $("#quiz-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitType();
    });
  }

  function startQuiz() {
    const mode = $("#quiz-mode").value;
    const count = Math.min(parseInt($("#quiz-count").value, 10) || 20, 100);
    const pool = wordsForBook($("#quiz-book").value);
    if (pool.length < 4) {
      alert(t("quiz.notEnough"));
      return;
    }
    quiz.mode = mode;
    quiz.items = shuffle(pool.slice()).slice(0, Math.min(count, pool.length));
    quiz.index = 0;
    quiz.score = 0;
    quiz.answered = false;
    $("#quiz-panel").classList.remove("hidden");
    $("#quiz-result").classList.add("hidden");
    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    const item = quiz.items[quiz.index];
    const total = quiz.items.length;
    quiz.answered = false;
    $("#quiz-qnum").textContent = `${quiz.index + 1} / ${total}`;
    $("#quiz-score").textContent = quiz.score;
    $("#quiz-bar").style.width = `${(quiz.index / total) * 100}%`;
    $("#quiz-feedback").textContent = "";
    $("#quiz-feedback").style.color = "";

    if (quiz.mode === "mc") {
      $("#quiz-prompt-label").textContent = t("quiz.promptMc");
      const scrambled = scrambleWord(item.word);
      $("#quiz-target").textContent = t("quiz.letters", { s: scrambled });
      $("#quiz-choices").classList.remove("hidden");
      $("#quiz-type-wrap").classList.add("hidden");
      speak(item.word);
      const pool = wordsForBook($("#quiz-book").value);
      const distractors = shuffle(
        pool.filter((w) => w.word.toLowerCase() !== item.word.toLowerCase())
      )
        .slice(0, 3)
        .map((w) => w.word);
      while (distractors.length < 3 && pool.length > distractors.length + 1) {
        const extra = pool[Math.floor(Math.random() * pool.length)].word;
        if (extra.toLowerCase() !== item.word.toLowerCase() && !distractors.includes(extra)) {
          distractors.push(extra);
        } else break;
      }
      const choices = shuffle([item.word, ...distractors]);
      $("#quiz-choices").innerHTML =
        choices
          .map((c) => `<button type="button" data-choice="${escapeAttr(c)}">${escapeHtml(c)}</button>`)
          .join("") +
        `<button type="button" class="btn ghost" id="quiz-replay" style="grid-column:1/-1">${escapeHtml(t("quiz.replay"))}</button>`;
      $("#quiz-choices").querySelectorAll("button[data-choice]").forEach((btn) => {
        btn.addEventListener("click", () => answerMC(btn, item.word));
      });
      const replay = $("#quiz-replay");
      if (replay) replay.addEventListener("click", () => speak(item.word));
    } else {
      $("#quiz-prompt-label").textContent = t("quiz.promptType");
      const hint = item.word[0] + "·".repeat(Math.max(0, item.word.length - 1));
      $("#quiz-target").textContent =
        `${hint}  ${t("quiz.lettersCount", { n: item.word.length, b: item.bookId })}`;
      $("#quiz-choices").classList.add("hidden");
      $("#quiz-type-wrap").classList.remove("hidden");
      $("#quiz-input").value = "";
      $("#quiz-input").disabled = false;
      $("#quiz-submit").disabled = false;
      $("#quiz-input").focus();
      speak(item.word);
    }
  }

  function answerMC(btn, correct) {
    if (quiz.answered) return;
    quiz.answered = true;
    const ok = btn.dataset.choice.toLowerCase() === correct.toLowerCase();
    $$("#quiz-choices button").forEach((b) => {
      b.disabled = true;
      if (b.dataset.choice && b.dataset.choice.toLowerCase() === correct.toLowerCase()) {
        b.classList.add("correct");
      }
    });
    if (ok) {
      btn.classList.add("correct");
      quiz.score++;
      $("#quiz-feedback").textContent = t("quiz.correct");
      $("#quiz-feedback").style.color = "#9fd4b0";
    } else {
      btn.classList.add("wrong");
      $("#quiz-feedback").textContent = t("quiz.wrong", { w: correct });
      $("#quiz-feedback").style.color = "#f0a0a0";
    }
    $("#quiz-score").textContent = quiz.score;
    setTimeout(nextQuiz, 850);
  }

  function submitType() {
    if (quiz.answered) return;
    const item = quiz.items[quiz.index];
    const val = $("#quiz-input").value.trim();
    if (!val) return;
    quiz.answered = true;
    $("#quiz-input").disabled = true;
    $("#quiz-submit").disabled = true;
    const ok = val.toLowerCase() === item.word.toLowerCase();
    if (ok) {
      quiz.score++;
      $("#quiz-feedback").textContent = t("quiz.correct");
      $("#quiz-feedback").style.color = "#9fd4b0";
    } else {
      $("#quiz-feedback").textContent = t("quiz.wrong", { w: item.word });
      $("#quiz-feedback").style.color = "#f0a0a0";
    }
    $("#quiz-score").textContent = quiz.score;
    setTimeout(nextQuiz, 900);
  }

  function nextQuiz() {
    quiz.index++;
    if (quiz.index >= quiz.items.length) {
      finishQuiz();
      return;
    }
    renderQuizQuestion();
  }

  function finishQuiz() {
    $("#quiz-panel").classList.add("hidden");
    $("#quiz-result").classList.remove("hidden");
    const total = quiz.items.length;
    $("#quiz-final-score").textContent = quiz.score;
    $("#quiz-final-total").textContent = total;
    const pct = total ? Math.round((quiz.score / total) * 100) : 0;
    $("#quiz-final-pct").textContent = t("quiz.accuracy", { p: pct });
    $("#quiz-bar").style.width = "100%";
  }

  function bindDownload() {
    $("#dl-book-txt").addEventListener("click", () => {
      const id = $("#dl-book").value;
      const book = data.books.find((b) => String(b.id) === String(id));
      downloadText(`hp-book${id}-${slug(book.titleEn)}.txt`, book.words.join("\n") + "\n");
    });
    $("#dl-book-csv").addEventListener("click", () => {
      const id = $("#dl-book").value;
      const book = data.books.find((b) => String(b.id) === String(id));
      const lines = [
        "book,title,word",
        ...book.words.map((w) => `${book.id},"${book.titleEn}",${csvEscape(w)}`),
      ];
      downloadText(`hp-book${id}-${slug(book.titleEn)}.csv`, lines.join("\n") + "\n");
    });
    $("#dl-all-txt").addEventListener("click", () => {
      const chunks = data.books.map(
        (b) => `# Book ${b.id} — ${b.titleEn} (${b.titleZh})\n` + b.words.join("\n")
      );
      downloadText("hp-all-books.txt", chunks.join("\n\n") + "\n");
    });
    $("#dl-all-csv").addEventListener("click", () => {
      const lines = ["book,title,word"];
      for (const b of data.books) {
        for (const w of b.words) {
          lines.push(`${b.id},"${b.titleEn}",${csvEscape(w)}`);
        }
      }
      downloadText("hp-all-books.csv", lines.join("\n") + "\n");
    });
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function speak(word) {
    if (!window.speechSynthesis || !word) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  }

  function scrambleWord(word) {
    if (word.length <= 2) return word;
    const mid = word.slice(1, -1).split("");
    for (let i = mid.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mid[i], mid[j]] = [mid[j], mid[i]];
    }
    let out = word[0] + mid.join("") + word[word.length - 1];
    if (out === word && mid.length > 1) {
      [mid[0], mid[mid.length - 1]] = [mid[mid.length - 1], mid[0]];
      out = word[0] + mid.join("") + word[word.length - 1];
    }
    return out;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function csvEscape(s) {
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function slug(s) {
    return String(s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  return { init, showView };
})();

document.addEventListener("DOMContentLoaded", () => App.init());
