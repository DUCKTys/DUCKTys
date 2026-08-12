(() => {
  const cfg = window.NAO_MD_CONFIG || {};
  const site = cfg.site || {};
  const releases = cfg.releases || [];
  const features = cfg.features || [];
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));

  document.title = `${site.title || "Nao MD"} · Download`;
  $("#eyebrow").textContent = site.eyebrow || "NAO MD";
  $("#tagline").textContent = site.tagline || "";
  $("#description").textContent = site.description || "";
  ["githubHero","githubCredit","githubFooter"].forEach(id => $( "#" + id ).href = site.github || "https://github.com/DUCKTys");
  if (releases[0]) $("#latestVersion").textContent = `v${releases[0].version}`;

  $("#features").innerHTML = features.map(f => `
    <article class="feature">
      <div class="feature-icon">${esc(f.icon)}</div>
      <h3>${esc(f.title)}</h3>
      <p>${esc(f.description)}</p>
    </article>`).join("");

  $("#releases").innerHTML = releases.length ? releases.map((r, i) => {
    const latest = i === 0 || r.label === "Latest";
    const hasUrl = Boolean(r.downloadUrl);
    return `<article class="release">
      <div class="release-main">
        <div class="release-icon"><img src="${esc(site.icon || "assets/nao_nao_mark.png")}" alt=""></div>
        <div><h3>Nao MD v${esc(r.version)}${latest ? " <span>Latest</span>" : ""}</h3>
        <p>${esc(r.description)}</p><div class="release-meta">${esc(r.size || "Size not set")} · Android APK</div></div>
      </div>
      <div class="release-action">
        ${r.changelogUrl ? `<a class="button secondary small" href="${esc(r.changelogUrl)}" target="_blank" rel="noopener">Changes ↗</a>` : ""}
        <a class="button primary small ${hasUrl ? "" : "disabled"}" href="${hasUrl ? esc(r.downloadUrl) : "#"}"
          ${hasUrl ? 'download target="_blank" rel="noopener"' : 'aria-disabled="true"'}>${hasUrl ? "Download APK ↓" : "Set download URL"}</a>
      </div>
    </article>`;
  }).join("") : `<div class="release"><div><h3>No release configured.</h3></div></div>`;

  function inline(text) {
    let s = esc(text);
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return s;
  }

  function renderMarkdown(md) {
    const lines = md.split(/\r?\n/), out = [];
    let paragraph = [], badges = [];
    const flush = () => { if (paragraph.length) { out.push(`<p>${inline(paragraph.join(" "))}</p>`); paragraph=[]; } };
    const flushBadges = () => { if (badges.length) { out.push(`<div class="badge-row">${badges.join("")}</div>`); badges=[]; } };

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { flush(); flushBadges(); continue; }
      if (line === "---") { flush(); flushBadges(); out.push("<hr>"); continue; }
      const img = line.match(/^<img\s+([^>]+)>$/i);
      if (img) {
        flush(); flushBadges();
        const src = (img[1].match(/src="([^"]+)"/i) || [])[1];
        const alt = (img[1].match(/alt="([^"]*)"/i) || [])[1] || "";
        const cls = src && src.includes("readme-typing-svg") ? "typing-image" : (src && src.includes("github.com/DUCKTys.png") ? "profile-image" : "");
        if (src) out.push(`<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy">`);
        continue;
      }
      if (/^<p\b/i.test(line)) {
        flush(); flushBadges();
        const inner = line.replace(/^<p[^>]*>/i, "").replace(/<\/p>$/i, "").trim();
        const imageMatches = [...inner.matchAll(/<img\s+([^>]+)>/gi)];
        if (imageMatches.length) {
          for (const m of imageMatches) {
            const src = (m[1].match(/src="([^"]+)"/i) || [])[1];
            const alt = (m[1].match(/alt="([^"]*)"/i) || [])[1] || "";
            if (src) badges.push(`<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy">`);
          }
        } else if (inner) out.push(`<p>${inline(inner)}</p>`);
        continue;
      }
      const h = line.match(/^(#{1,3})\s+(.+)$/);
      if (h) { flush(); flushBadges(); const tag = h[1].length === 1 ? "h1" : "h3"; out.push(`<${tag}>${inline(h[2])}</${tag}>`); continue; }
      if (line.startsWith("<i>") && line.endsWith("</i>")) { flush(); flushBadges(); out.push(`<p><em>${inline(line.slice(3,-4))}</em></p>`); continue; }
      paragraph.push(line);
    }
    flush(); flushBadges();
    return out.join("\n");
  }

  fetch("/api/readme", { cache: "no-store" }).catch(() => fetch("/credits/DUCKTys_README.md", { cache: "no-store" }))
    .then(r => { if (!r.ok) throw new Error("README HTTP " + r.status); return r.text(); })
    .then(md => { $("#readmeContent").innerHTML = renderMarkdown(md); })
    .catch(() => { $("#readmeContent").innerHTML = `<p>README tidak dapat dimuat.</p><p><a href="https://github.com/DUCKTys/DUCKTys" target="_blank" rel="noopener">Buka README di GitHub ↗</a></p>`; });

  const links = [...document.querySelectorAll(".floating-nav a")];
  const sections = links.map(a => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  const update = () => {
    const y = scrollY + innerHeight * .35;
    let active = sections[0];
    sections.forEach(s => { if (s.offsetTop <= y) active = s; });
    links.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + active.id));
  };
  addEventListener("scroll", update, { passive: true });
  update();
})();
