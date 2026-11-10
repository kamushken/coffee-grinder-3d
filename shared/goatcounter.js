// GoatCounter snippet. GOATCOUNTER_CODE is a named placeholder, not a secret and not a real
// site code. Replace it with your GoatCounter site code to enable counting. While the
// placeholder is in place nothing is loaded, so no request goes to a non-existent counter.
const GOATCOUNTER_CODE = 'GOATCOUNTER_CODE';

if (GOATCOUNTER_CODE !== 'GOATCOUNTER_' + 'CODE') {
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = `https://${GOATCOUNTER_CODE}.goatcounter.com/count`;
  document.head.appendChild(s);
}
