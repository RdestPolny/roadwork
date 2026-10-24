/** @typedef {{title:string,hp:number,hpMax:number,sta:number,staCap:number}} HudFighter */

let hud;
let vitals;
let costLabels;
let notice;
let counterNotice;
let clock;

/** Create a text-only HUD element. */
function element(tag, className, text = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

/** Create a labelled meter and its cached fill/value nodes. */
function gauge(parent, label, kind) {
  const row = element('div', 'rt-gauge-row');
  const caption = element('span', 'rt-gauge-label', label);
  const meter = element('span', 'rt-gauge rt-' + kind);
  meter.setAttribute('role', 'meter');
  meter.setAttribute('aria-valuemin', '0');
  const fill = element('i', 'rt-fill');
  const value = element('span', 'rt-gauge-value');
  meter.append(fill);
  row.append(caption, meter, value);
  parent.append(row);
  return { meter, fill, value, label };
}

/** Build the fixed-frame overlay once, alongside the existing fight HUD. */
function createHud() {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./realtime-hud.css', import.meta.url).href;
  document.head.append(stylesheet);
  hud = element('section', 'rt-hud');
  hud.id = 'realtimeHud';
  hud.setAttribute('aria-label', 'Walka w czasie rzeczywistym');
  vitals = [0, 1].map(side => {
    const box = element('div', 'rt-vitals rt-side-' + side);
    const title = element('b', 'rt-title');
    box.append(title);
    const hp = gauge(box, 'Zdrowie', 'hp');
    const sta = gauge(box, 'Kondycja', 'sta');
    hud.append(box);
    return { title, hp, sta };
  });
  clock = element('span', 'rt-clock');
  clock.setAttribute('aria-label', 'Czas walki');
  const feedback = element('div', 'rt-feedback');
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  notice = element('p', 'rt-notice');
  counterNotice = element('b', 'rt-counter', 'Kontra +50% · 1 s');
  counterNotice.hidden = true;
  feedback.append(notice, counterNotice);
  const controls = element('footer', 'rt-controls');
  const punches = element('div', 'rt-punches');
  costLabels = ['Jab', 'Cross', 'Hook', 'Uppercut'].map((name, index) => {
    const punch = element('span', 'rt-punch');
    const key = element('kbd', '', String(index + 1));
    const title = element('b', '', name);
    const cost = element('small', 'rt-cost');
    punch.append(key, title, cost);
    punches.append(punch);
    return { punch, cost };
  });
  const hints = element('p', 'rt-hints', '↓ korpus · Spacja blok · Q slip · ←→ dystans · F10 pauza');
  controls.append(punches, hints);
  hud.append(clock, feedback, controls);
  document.getElementById('cardHud').parentElement.append(hud);
}

/** Update a meter without replacing its DOM nodes. */
function updateGauge(gauge, current, maximum, title) {
  const max = Math.max(1, maximum);
  const value = Math.max(0, Math.min(max, current));
  gauge.fill.style.width = (value / max * 100) + '%';
  gauge.value.textContent = Math.ceil(value) + ' / ' + Math.ceil(maximum);
  gauge.meter.setAttribute('aria-label', title + ': ' + gauge.label);
  gauge.meter.setAttribute('aria-valuemax', String(max));
  gauge.meter.setAttribute('aria-valuenow', String(value));
  gauge.meter.setAttribute('aria-valuetext', gauge.value.textContent);
  gauge.meter.classList.toggle('low', value / max < .25);
}

/**
 * Update the live fight overlay; elapsed time is in seconds.
 * @param {{fighters:HudFighter[],costs:number[],message:string,counter:boolean,phase:string,elapsed:number}} state
 */
export function realtimeHud(state) {
  if (state.phase !== 'intro' && state.phase !== 'fight') {
    hideRealtimeHud();
    return;
  }
  if (!hud) createHud();
  hud.hidden = false;
  hud.classList.toggle('rt-intro', state.phase === 'intro');
  state.fighters.slice(0, 2).forEach((fighter, index) => {
    const nodes = vitals[index];
    nodes.title.textContent = fighter.title;
    updateGauge(nodes.hp, fighter.hp, fighter.hpMax, fighter.title);
    updateGauge(nodes.sta, fighter.sta, fighter.staCap, fighter.title);
  });
  costLabels.forEach(({punch, cost}, index) => {
    const amount = state.costs[index];
    cost.textContent = amount + ' kond.';
    punch.classList.toggle('rt-unavailable', amount > state.fighters[0].sta);
  });
  notice.textContent = state.message;
  counterNotice.hidden = !state.counter;
  const seconds = Math.max(0, Math.floor(state.elapsed));
  clock.textContent = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}

/** Hide the overlay when leaving a live fight. */
export function hideRealtimeHud() {
  if (hud) hud.hidden = true;
}
