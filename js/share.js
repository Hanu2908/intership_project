/* Rangmarg — Shared itinerary view (read-only) */
(function(){
  const card = document.getElementById("share-card");
  if(!card) return;

  const hash = location.hash.slice(1);
  if(!hash){
    card.innerHTML = `
      <div class="share-empty">
        <h2>No itinerary found</h2>
        <p>This link doesn't contain a valid itinerary. Ask your friend to share a new link.</p>
        <a href="index.html" class="btn-primary">Explore destinations</a>
      </div>`;
    return;
  }

  let items;
  try {
    const json = decodeURIComponent(escape(atob(hash)));
    items = JSON.parse(json);
    if(!Array.isArray(items) || items.length === 0) throw new Error("empty");
  } catch(e){
    card.innerHTML = `
      <div class="share-empty">
        <h2>Invalid itinerary link</h2>
        <p>This link appears to be corrupted. Ask your friend to share a new one.</p>
        <a href="index.html" class="btn-primary">Explore destinations</a>
      </div>`;
    return;
  }

  /* Stats */
  const parseDays = s => { const m = s.match(/(\d+)/); return m ? parseInt(m[1],10) : 2; };
  const totalDays = items.reduce((s,d) => s + parseDays(d.d), 0);
  const regions = [...new Set(items.map(d => d.r))];

  let dayCounter = 1;
  const rows = items.map(d => {
    const dur = parseDays(d.d);
    const dayEnd = dayCounter + dur - 1;
    const dayLabel = `Day ${dayCounter}${dur > 1 ? '–' + dayEnd : ''}`;
    dayCounter = dayEnd + 1;
    return { dayLabel, ...d };
  });

  document.title = `Rangmarg — ${items.length} destinations, ${totalDays}+ days`;

  card.innerHTML = `
    <div class="share-header">
      <div class="share-brand">
        <span class="share-dot">●</span> rangmarg
      </div>
      <span class="share-badge">Shared itinerary</span>
    </div>

    <h1 class="share-title">${items.length}-stop India trip</h1>
    <p class="share-subtitle">${totalDays}+ days across ${regions.length} region${regions.length > 1 ? 's' : ''} · ${regions.join(', ')}</p>

    <div class="share-stats">
      <div class="share-stat">
        <span class="share-stat-num">${items.length}</span>
        <span class="share-stat-label">destinations</span>
      </div>
      <div class="share-stat">
        <span class="share-stat-num">${totalDays}+</span>
        <span class="share-stat-label">days</span>
      </div>
      <div class="share-stat">
        <span class="share-stat-num">${regions.length}</span>
        <span class="share-stat-label">regions</span>
      </div>
    </div>

    <div class="share-timeline">
      ${rows.map((r,i) => `
        <div class="share-node">
          <div class="share-rail">
            <div class="share-dot-accent"></div>
            ${i < rows.length - 1 ? '<div class="share-line"></div>' : ''}
          </div>
          <div class="share-content">
            <div class="share-day">${r.dayLabel}</div>
            <div class="share-dest">
              <div class="share-postmark">${r.c}</div>
              <div class="share-dest-info">
                <b>${r.n}</b>
                <span>${r.r} · ${r.s} · ${r.d}</span>
                <p>${r.t}</p>
              </div>
            </div>
          </div>
        </div>`).join('')}
    </div>

    <div class="share-cta">
      <p class="share-cta-text">Plan your own trip</p>
      <a href="index.html" class="btn-primary">Explore destinations</a>
    </div>

    <div class="share-actions">
      <button class="share-btn" id="share-copy" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy link
      </button>
      <button class="share-btn" id="share-native" type="button" style="display:none">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Share
      </button>
    </div>

    <div class="share-footer">
      rangmarg.in · Your travel passport
    </div>`;

  /* Share/copy buttons */
  if(navigator.share){
    document.getElementById("share-native").style.display = "";
  }
  document.getElementById("share-copy")?.addEventListener("click", () => {
    navigator.clipboard?.writeText(location.href).then(() => {
      const btn = document.getElementById("share-copy");
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
      setTimeout(() => {
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy link`;
      }, 2000);
    });
  });
  document.getElementById("share-native")?.addEventListener("click", () => {
    navigator.share({ title: document.title, url: location.href }).catch(() => {});
  });
})();
