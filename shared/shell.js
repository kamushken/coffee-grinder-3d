// Lab shell: stage nav + current-page marker (Phase 1), prev/next links (Phase 3.6).
const STAGES = [
  ['/', 'home'],
  ['/stage-0/', '0'], ['/stage-1/', '1'], ['/stage-2/', '2'], ['/stage-3/', '3'], ['/stage-4/', '4'],
  ['/stage-5/', '5'], ['/stage-6/', '6'], ['/stage-7/', '7'], ['/stage-8/', '8'],
];
const TITLES = ['slop baseline', 'direction', 'lighting', 'materials', 'composition', 'motion', 'explainer', 'degradation', 'final'];
const here = location.pathname.replace(/index\.html$/, '').replace(/([^/])$/, '$1/');
const nav = document.querySelector('nav.stages');
if (nav) {
  for (const [href, text] of STAGES) {
    const a = document.createElement('a');
    a.href = href; a.textContent = text;
    // home: the visible text is the accessible name (Phase 3.5: aria-label "Lab index" failed
    // label-content-name-mismatch); stage links keep "Stage N", which contains the visible "N"
    if (href !== '/') a.setAttribute('aria-label', `Stage ${text}`);
    if (href === here) a.setAttribute('aria-current', 'page');
    nav.appendChild(a);
  }
}

// Phase 3.6: prev/next with stage titles, at the end of the stage caption (the bottom block)
const m = here.match(/^\/stage-(\d)\/$/);
const caption = document.querySelector('.caption');
if (m && caption) {
  const n = +m[1];
  const link = (i, dir) => {
    const a = document.createElement('a');
    if (i < 0 || i > 8) { a.href = '/'; a.textContent = dir === 'prev' ? '← lab index' : 'lab index →'; }
    else { a.href = `/stage-${i}/`; a.textContent = dir === 'prev' ? `← Stage ${i} · ${TITLES[i]}` : `Stage ${i} · ${TITLES[i]} →`; }
    a.rel = dir; a.className = dir;
    return a;
  };
  const pn = document.createElement('nav');
  pn.className = 'prevnext'; pn.setAttribute('aria-label', 'Previous and next stage');
  pn.append(link(n - 1, 'prev'), link(n + 1, 'next'));
  caption.appendChild(pn);
}
