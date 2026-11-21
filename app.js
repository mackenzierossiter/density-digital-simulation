(function () {
  "use strict";

  var DATA = window.LAB_DATA;
  var PLASTICS = DATA.plastics;
  var LIQUIDS = DATA.liquids;
  var plasticById = {};
  PLASTICS.forEach(function (p) { plasticById[p.id] = p; });
  var liquidById = {};
  LIQUIDS.forEach(function (l) { liquidById[l.id] = l; });

  // ---------- Language ----------
  var I18N = window.I18N;
  var LANG_KEY = "density-sim-lang";
  var lang = pickInitialLang();

  function pickInitialLang() {
    var saved = null;
    try { saved = window.localStorage.getItem(LANG_KEY); } catch (e) { /* storage unavailable */ }
    if (saved && I18N[saved]) return saved;
    var nav = (navigator.language || "en").toLowerCase();
    if (nav.indexOf("es") === 0) return "es";
    if (nav.indexOf("zh") === 0) return "zh";
    return "en";
  }

  // Look up a translation; functions are called with the extra arguments.
  function t(key) {
    var v = I18N[lang][key];
    if (v === undefined) v = I18N.en[key];
    if (typeof v === "function") return v.apply(null, Array.prototype.slice.call(arguments, 1));
    return v;
  }
  function plasticText(id) { return (I18N[lang].plastics[id] || I18N.en.plastics[id]); }
  function liquidName(id) { return I18N[lang].liquids[id] || I18N.en.liquids[id]; }
  function trayName(id) { return id === 0 ? t("mixedPile") : t("trayN", id); }

  function applyStaticText() {
    document.documentElement.lang = lang === "zh" ? "zh-Hans" : lang;
    document.title = t("pageTitle");
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (node) {
      node.textContent = t(node.getAttribute("data-i18n"));
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-html]"), function (node) {
      node.innerHTML = t(node.getAttribute("data-i18n-html"));
    });
    document.getElementById("lang-select").value = lang;
  }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- State ----------
  var state;
  var history = []; // snapshots taken before each pour, for Undo

  function freshState() {
    return {
      trays: [{ id: 0, plastics: PLASTICS.map(function (p) { return p.id; }) }],
      nextTrayNum: 1,
      selectedTrayId: 0,
      selectedLiquidId: null,
      beaker: null, // { fromTrayId, plastics, liquidId, floaters, sinkers }
      tests: 0
    };
  }

  function snapshot() { return JSON.parse(JSON.stringify(state)); }

  // ---------- Helpers ----------
  function fmt(n) { return n.toFixed(2); }
  function sortByDensity(ids) {
    return ids.slice().sort(function (a, b) { return plasticById[a].density - plasticById[b].density; });
  }
  function listNames(ids) {
    if (ids.length === 0) return t("none");
    return sortByDensity(ids).join(t("sep"));
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function findTray(id) {
    for (var i = 0; i < state.trays.length; i++) if (state.trays[i].id === id) return state.trays[i];
    return null;
  }
  function isSolved() {
    return !state.beaker && state.trays.length === PLASTICS.length &&
      state.trays.every(function (tr) { return tr.plastics.length === 1; });
  }

  // The core rule from the worksheet.
  function pourInto(plasticIds, liquid) {
    var floaters = [], sinkers = [];
    plasticIds.forEach(function (id) {
      if (plasticById[id].density < liquid.density) floaters.push(id); else sinkers.push(id);
    });
    return { floaters: floaters, sinkers: sinkers };
  }

  // ---------- Static tables ----------
  function renderTables() {
    var pt = document.getElementById("plastic-table");
    pt.innerHTML = "";
    PLASTICS.forEach(function (p) {
      var tr = el("tr");
      var td1 = el("td");
      var sw = el("span", "swatch"); sw.style.background = p.color;
      td1.appendChild(sw);
      td1.appendChild(document.createTextNode(p.id + " — " + plasticText(p.id).name));
      tr.appendChild(td1);
      tr.appendChild(el("td", null, plasticText(p.id).product));
      tr.appendChild(el("td", "dens", fmt(p.density)));
      pt.appendChild(tr);
    });
    var lt = document.getElementById("liquid-table");
    lt.innerHTML = "";
    LIQUIDS.forEach(function (l) {
      var tr = el("tr");
      var td1 = el("td");
      var sw = el("span", "swatch"); sw.style.background = l.tint;
      td1.appendChild(sw);
      td1.appendChild(document.createTextNode(liquidName(l.id)));
      tr.appendChild(td1);
      tr.appendChild(el("td", "dens", fmt(l.density)));
      lt.appendChild(tr);
    });
  }

  // ---------- Liquid shelf ----------
  var liquidButtons = {};
  function renderLiquids() {
    var wrap = document.getElementById("liquids");
    wrap.innerHTML = "";
    liquidButtons = {};
    LIQUIDS.forEach(function (l) {
      var b = el("button", "liquid");
      b.type = "button";
      b.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-label", t("liquidAria", liquidName(l.id), fmt(l.density)));
      var mini = el("div", "mini-beaker");
      var fill = el("span"); fill.style.background = l.tint;
      mini.appendChild(fill);
      b.appendChild(mini);
      b.appendChild(el("span", "liquid-name", liquidName(l.id)));
      b.appendChild(el("span", "liquid-dens", fmt(l.density) + " g/mL"));
      b.addEventListener("click", function () {
        if (state.beaker) return;
        state.selectedLiquidId = l.id;
        update();
      });
      liquidButtons[l.id] = b;
      wrap.appendChild(b);
    });
  }

  // ---------- Trays ----------
  function renderTrays() {
    var wrap = document.getElementById("trays");
    wrap.innerHTML = "";
    if (state.trays.length === 0) {
      wrap.appendChild(el("p", "empty-note", t("allInBeaker")));
      return;
    }
    state.trays.forEach(function (tr) {
      var b = el("button", "tray");
      b.type = "button";
      var sorted = tr.plastics.length === 1;
      if (sorted) b.classList.add("sorted");
      if (tr.id === state.selectedTrayId) b.classList.add("selected");
      b.setAttribute("aria-pressed", tr.id === state.selectedTrayId ? "true" : "false");
      b.disabled = !!state.beaker;

      var head = el("div", "tray-head");
      head.appendChild(el("span", null, trayName(tr.id)));
      head.appendChild(el("span", "tray-tag", sorted ? t("sorted") : t("nPlastics", tr.plastics.length)));
      b.appendChild(head);

      var contents = el("div", "tray-contents");
      sortByDensity(tr.plastics).forEach(function (id) {
        var p = plasticById[id];
        var chip = el("span", "chip-label");
        var dot = el("span", "chip-dot"); dot.style.background = p.color;
        chip.appendChild(dot);
        chip.appendChild(document.createTextNode(p.id));
        contents.appendChild(chip);
      });
      b.appendChild(contents);
      b.setAttribute("aria-label", trayName(tr.id) + ": " + listNames(tr.plastics) + (sorted ? ". " + t("sortedAria") : ""));

      b.addEventListener("click", function () {
        if (state.beaker) return;
        state.selectedTrayId = tr.id;
        update();
      });
      wrap.appendChild(b);
    });
  }

  // ---------- Beaker ----------
  function rand(min, max) { return min + Math.random() * (max - min); }

  function drawBeaker(animate) {
    var beaker = document.getElementById("beaker");
    var fill = document.getElementById("liquid-fill");
    var piecesEl = document.getElementById("pieces");
    piecesEl.innerHTML = "";

    if (!state.beaker) {
      fill.style.backgroundColor = "transparent";
      fill.classList.remove("filled");
      beaker.classList.remove("has-liquid");
      return;
    }
    var liquid = liquidById[state.beaker.liquidId];
    fill.style.backgroundColor = liquid.tint;
    fill.classList.add("filled");
    beaker.classList.add("has-liquid");

    var pieces = [];
    state.beaker.plastics.forEach(function (id) {
      for (var i = 0; i < DATA.piecesPerPlastic; i++) pieces.push(id);
    });
    // Shuffle so the pile looks mixed.
    for (var i = pieces.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = pieces[i]; pieces[i] = pieces[j]; pieces[j] = tmp;
    }

    var nodes = pieces.map(function (id) {
      var p = plasticById[id];
      var floats = state.beaker.floaters.indexOf(id) !== -1;
      var d = el("div", "piece " + p.shape, p.id);
      d.style.background = p.color;
      d.style.left = rand(12, 88) + "%";
      var finalTop = floats ? rand(13, 19) : rand(83, 89);
      var finalRot = rand(-35, 35);
      if (animate && !reduceMotion) {
        d.style.top = rand(-4, 6) + "%";
        d.style.transform = "rotate(" + rand(-60, 60) + "deg)";
        d.style.transitionDelay = rand(0, 0.5) + "s";
      } else {
        d.style.top = finalTop + "%";
        d.style.transform = "rotate(" + finalRot + "deg)";
      }
      piecesEl.appendChild(d);
      return { node: d, top: finalTop, rot: finalRot };
    });

    if (animate && !reduceMotion) {
      void piecesEl.offsetHeight; // force layout so the transition runs
      requestAnimationFrame(function () {
        nodes.forEach(function (n) {
          n.node.style.top = n.top + "%";
          n.node.style.transform = "rotate(" + n.rot + "deg)";
        });
      });
    }
  }

  // ---------- Status / result text ----------
  function setResult(html) { document.getElementById("result").innerHTML = html; }

  function renderStatus() {
    var s = document.getElementById("station-status");
    if (state.beaker) {
      var l = liquidById[state.beaker.liquidId];
      s.textContent = t("statusPoured", trayName(state.beaker.fromTrayId), liquidName(l.id), fmt(l.density));
      return;
    }
    var tray = findTray(state.selectedTrayId);
    var liquid = state.selectedLiquidId ? liquidById[state.selectedLiquidId] : null;
    if (isSolved()) { s.textContent = t("statusSolved"); return; }
    if (!tray && !liquid) s.textContent = t("statusPickBoth");
    else if (!tray) s.textContent = t("statusPickTray", liquidName(liquid.id));
    else if (!liquid) s.textContent = t("statusPickLiquid", trayName(tray.id));
    else s.textContent = t("statusReady", trayName(tray.id), listNames(tray.plastics), liquidName(liquid.id), fmt(liquid.density));
  }

  function renderResult() {
    if (!state.beaker) { setResult(""); return; }
    var b = state.beaker;
    if (b.floaters.length === 0) {
      setResult('<span class="warn">' + t("everythingSank") + '</span> ' + t("tryAgain"));
    } else if (b.sinkers.length === 0) {
      setResult('<span class="warn">' + t("everythingFloated") + '</span> ' + t("tryAgain"));
    } else {
      setResult('<span class="float-word">' + t("floated") + '</span> ' + listNames(b.floaters) +
        ' &nbsp;|&nbsp; <span class="sink-word">' + t("sank") + '</span> ' + listNames(b.sinkers));
    }
  }

  // ---------- Win ----------
  function renderWin() {
    var w = document.getElementById("win");
    if (!isSolved()) { w.hidden = true; w.innerHTML = ""; return; }
    w.hidden = false;
    w.innerHTML = "";
    w.appendChild(el("h2", null, t("winTitle", PLASTICS.length, state.tests)));
    w.appendChild(el("p", null, t("finalCheck")));
    var ul = el("ul");
    state.trays.slice().sort(function (a, b) {
      return plasticById[a.plastics[0]].density - plasticById[b.plastics[0]].density;
    }).forEach(function (tr) {
      var p = plasticById[tr.plastics[0]];
      ul.appendChild(el("li", null, p.id + " (" + fmt(p.density) + " g/cm³) → " + trayName(tr.id)));
    });
    w.appendChild(ul);
  }

  // ---------- Buttons ----------
  var pourBtn = document.getElementById("pour-btn");
  var collectBtn = document.getElementById("collect-btn");
  var undoBtn = document.getElementById("undo-btn");
  var resetBtn = document.getElementById("reset-btn");

  function renderButtons() {
    var tray = findTray(state.selectedTrayId);
    pourBtn.hidden = !!state.beaker;
    collectBtn.hidden = !state.beaker;
    pourBtn.disabled = !(tray && state.selectedLiquidId) || isSolved();
    if (state.beaker) {
      var nothing = state.beaker.floaters.length === 0 || state.beaker.sinkers.length === 0;
      collectBtn.textContent = nothing ? t("pourBack", trayName(state.beaker.fromTrayId)) : t("collect");
    }
    undoBtn.disabled = history.length === 0;
    Object.keys(liquidButtons).forEach(function (id) {
      var b = liquidButtons[id];
      var sel = id === state.selectedLiquidId;
      b.classList.toggle("selected", sel);
      b.setAttribute("aria-pressed", sel ? "true" : "false");
      b.disabled = !!state.beaker;
    });
  }

  function update(animateBeaker) {
    renderTrays();
    renderButtons();
    renderStatus();
    renderResult();
    renderWin();
    if (animateBeaker !== undefined) drawBeaker(animateBeaker);
  }

  pourBtn.addEventListener("click", function () {
    var tray = findTray(state.selectedTrayId);
    var liquid = liquidById[state.selectedLiquidId];
    if (!tray || !liquid || state.beaker) return;
    history.push(snapshot());
    var r = pourInto(tray.plastics, liquid);
    state.beaker = {
      fromTrayId: tray.id,
      plastics: tray.plastics.slice(),
      liquidId: liquid.id,
      floaters: r.floaters,
      sinkers: r.sinkers
    };
    state.trays = state.trays.filter(function (tr) { return tr.id !== tray.id; });
    state.selectedTrayId = null;
    state.tests += 1;
    update(true);
    collectBtn.focus();
  });

  collectBtn.addEventListener("click", function () {
    var b = state.beaker;
    if (!b) return;
    if (b.floaters.length === 0 || b.sinkers.length === 0) {
      state.trays.push({ id: b.fromTrayId, plastics: b.plastics.slice() });
      state.selectedTrayId = b.fromTrayId;
    } else {
      var fTray = { id: state.nextTrayNum, plastics: b.floaters.slice() };
      state.nextTrayNum++;
      var sTray = { id: state.nextTrayNum, plastics: b.sinkers.slice() };
      state.nextTrayNum++;
      state.trays.push(fTray, sTray);
      var next = state.trays.filter(function (tr) { return tr.plastics.length > 1; })[0];
      state.selectedTrayId = next ? next.id : null;
    }
    state.trays.sort(function (x, y) { return x.id - y.id; });
    state.beaker = null;
    state.selectedLiquidId = null;
    update(false);
  });

  undoBtn.addEventListener("click", function () {
    if (!history.length) return;
    state = history.pop();
    update(false);
  });

  resetBtn.addEventListener("click", function () {
    if (state.tests > 0 && !window.confirm(t("confirmReset"))) return;
    state = freshState();
    history = [];
    update(false);
  });

  // ---------- Init ----------
  document.getElementById("lang-select").addEventListener("change", function (e) {
    if (!I18N[e.target.value]) return;
    lang = e.target.value;
    try { window.localStorage.setItem(LANG_KEY, lang); } catch (err) { /* storage unavailable */ }
    applyStaticText();
    renderTables();
    renderLiquids();
    update(); // keep the beaker as it is
  });

  state = freshState();
  applyStaticText();
  renderTables();
  renderLiquids();
  update(false);
})();
