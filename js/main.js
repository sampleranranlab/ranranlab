/* らんらんラボ — 設定ファイル(data/config.js)をページに反映する */
(function () {
  "use strict";

  var S = window.SITE || {};
  var email = S.email || "";

  var STATUS = {
    open:    { label: "募集中",               note: "現在、お申し込みを受け付けています" },
    few:     { label: "残りわずか",           note: "定員に近づいています。お早めにお申し込みください" },
    waiting: { label: "満員（空き待ち受付中）", note: "現在は定員に達しています。空きが出た際にご連絡します" },
    closed:  { label: "受付停止中",           note: "次回の募集は、このページでお知らせします" }
  };
  var key = STATUS[S.status] ? S.status : "open";
  var st = STATUS[key];

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function mailto(subject) { return "mailto:" + email + "?subject=" + encodeURIComponent(subject); }

  document.body.setAttribute("data-status", key);
  if (S.showDraftMarks !== false) { document.body.classList.add("show-draft"); }

  /* 募集状況 */
  $$("[data-site='status-label']").forEach(function (el) { el.textContent = st.label; });
  $$("[data-site='status-note']").forEach(function (el) { el.textContent = st.note; });

  /* 申込ボタン（状況に合わせて文言と行き先を切り替える） */
  var applyHref, applyLabel, showMin = false, external = false;
  if (key === "open" || key === "few") {
    applyHref = S.formUrl; applyLabel = "申し込む"; showMin = true; external = true;
  } else if (key === "waiting") {
    applyHref = mailto("学習支援 らんらんラボ 空き待ち登録"); applyLabel = "空き待ちに登録する";
  } else {
    applyHref = mailto("学習支援 らんらんラボ 次回募集のお知らせ希望"); applyLabel = "次回のお知らせを希望する";
  }
  $$("[data-cta='apply']").forEach(function (a) {
    a.setAttribute("href", applyHref);
    var l = $(".cta-label", a); if (l) { l.textContent = applyLabel; }
    var m = $(".cta-min", a);
    if (m) { m.textContent = (showMin && S.formMinutes) ? "（約" + S.formMinutes + "分）" : ""; }
    if (external) { a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener"); }
    else { a.removeAttribute("target"); a.removeAttribute("rel"); }
  });
  $$("[data-cta='consult']").forEach(function (a) { a.setAttribute("href", mailto("学習支援 らんらんラボ ご相談")); });
  $$("[data-cta='student']").forEach(function (a) { a.setAttribute("href", mailto("学生カウンセラー 応募・お問い合わせ")); });
  $$("[data-cta='contact']").forEach(function (a) { a.setAttribute("href", mailto("お問い合わせ")); });
  $$("[data-site='email']").forEach(function (el) { el.textContent = email; });
  $$("[data-site='formmin']").forEach(function (el) { el.textContent = S.formMinutes || ""; });

  /* 募集要項 */
  if (S.facts) {
    $$("[data-fact]").forEach(function (el) {
      var v = S.facts[el.getAttribute("data-fact")];
      if (v) { el.textContent = v; }
    });
  }

  /* 活動報告 */
  var list = $("#news-list");
  if (list && S.news && S.news.length) {
    list.textContent = "";
    S.news.forEach(function (n) {
      var li = document.createElement("li"); li.className = "news-item";
      var meta = document.createElement("div"); meta.className = "meta";
      var t = document.createElement("time"); t.textContent = String(n.date || "").replace(/-/g, ".");
      meta.appendChild(t);
      if (n.tag) { var g = document.createElement("span"); g.className = "tagname"; g.textContent = n.tag; meta.appendChild(g); }
      var h = document.createElement("h3"); h.textContent = n.title || "";
      var p = document.createElement("p"); p.textContent = n.body || "";
      li.appendChild(meta); li.appendChild(h); li.appendChild(p);
      list.appendChild(li);
    });
  }

  /* メニュー（スマホ） */
  var header = $(".site-header"), toggle = $(".nav-toggle");
  if (header && toggle) {
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$(".site-nav a").forEach(function (a) {
      a.addEventListener("click", function () {
        header.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* 画面下の固定ボタン（トップの申込ボタンが見えなくなったら出す。申込欄では隠す） */
  var bar = $(".sticky-cta"), heroCta = $("#hero-cta"), applySec = $("#apply");
  if (bar && heroCta && "IntersectionObserver" in window) {
    document.body.classList.add("has-sticky");
    var heroSeen = true, applySeen = false;
    var update = function () { bar.classList.toggle("is-on", !heroSeen && !applySeen); };
    new IntersectionObserver(function (e) { heroSeen = e[0].isIntersecting; update(); }).observe(heroCta);
    if (applySec) {
      new IntersectionObserver(function (e) { applySeen = e[0].isIntersecting; update(); }, { threshold: 0.15 }).observe(applySec);
    }
  }

  /* 文節で折り返す
     CSS（word-break: auto-phrase）に対応していないブラウザ（Safari・Firefoxなど）では、
     ブラウザ標準の Intl.Segmenter で文を区切り、語の途中で改行されないようにする。 */
  var supportsPhrase = window.CSS && CSS.supports && CSS.supports("word-break", "auto-phrase");
  if (!supportsPhrase && window.Intl && Intl.Segmenter) {
    var seg = new Intl.Segmenter("ja", { granularity: "word" });
    var OPEN = /^[「『（(［\[【〈《]$/;
    var SMALL_KANA = /^[\u3041-\u309F]{1,3}$/; // 助詞・語尾（ひらがな1〜3文字）は前の語にくっつける
    var phrasesOf = function (text) {
      var out = [], hold = "";
      Array.from(seg.segment(text)).forEach(function (x) {
        var w = x.segment;
        if (OPEN.test(w)) { hold += w; return; }
        if (out.length && (!x.isWordLike || SMALL_KANA.test(w))) { out[out.length - 1] += hold + w; hold = ""; return; }
        out.push(hold + w); hold = "";
      });
      if (hold) { if (out.length) { out[out.length - 1] += hold; } else { out.push(hold); } }
      return out;
    };
    var walker = document.createTreeWalker($("main"), NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var t = n.parentNode.nodeName;
        if (t === "SCRIPT" || t === "STYLE" || !n.nodeValue.trim()) { return NodeFilter.FILTER_REJECT; }
        // flex / grid の直下の文字は、分割すると隙間ができるので対象外
        var d = getComputedStyle(n.parentNode).display;
        return /flex|grid/.test(d) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) { nodes.push(walker.currentNode); }
    nodes.forEach(function (n) {
      var frag = document.createDocumentFragment();
      phrasesOf(n.nodeValue).forEach(function (ph) {
        if (ph.length > 9 || /^\s+$/.test(ph)) { frag.appendChild(document.createTextNode(ph)); return; }
        var sp = document.createElement("span"); sp.style.whiteSpace = "nowrap"; sp.textContent = ph; frag.appendChild(sp);
      });
      if (frag.childNodes.length) { n.parentNode.replaceChild(frag, n); }
    });
  }
})();
