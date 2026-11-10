// Lab shell: stage nav + current-page marker. Frozen after Phase 1.
const STAGES = [
  ['/', 'home'],
  ['/stage-0/', '0'], ['/stage-1/', '1'], ['/stage-2/', '2'], ['/stage-3/', '3'], ['/stage-4/', '4'],
  ['/stage-5/', '5'], ['/stage-6/', '6'], ['/stage-7/', '7'], ['/stage-8/', '8'],
];
const nav = document.querySelector('nav.stages');
if (nav) {
  const here = location.pathname.replace(/index\.html$/, '').replace(/([^/])$/, '$1/');
  for (const [href, text] of STAGES) {
    const a = document.createElement('a');
    a.href = href; a.textContent = text;
    a.setAttribute('aria-label', href === '/' ? 'Lab index' : `Stage ${text}`);
    if (href === here) a.setAttribute('aria-current', 'page');
    nav.appendChild(a);
  }
}
