'use strict';

const F = 'fill="#000"';
const S = 'stroke="#000" stroke-linecap="round" stroke-linejoin="round"';
const flame = (t = 0) => `<path ${F} transform="translate(0 ${t})" d="M50 20C58 34 70 42 66 58C64 68 57 74 50 74C42 74 35 68 34 59C33 50 40 46 43 38C46 44 48 46 52 46C54 38 50 30 50 20Z"/>`;

const ICONS = {
  GHS01: `<circle cx="45" cy="60" r="15" ${F}/><path d="M52 47L60 36" ${S} stroke-width="4" fill="none"/><path d="M60 36L66 26M60 36L72 34M60 36L68 42M60 36L58 24" ${S} stroke-width="3" fill="none"/>`,
  GHS02: flame(),
  GHS03: `<circle cx="50" cy="66" r="14" fill="none" ${S} stroke-width="5"/><path ${F} transform="translate(0 -14) scale(1 .75) translate(0 10)" d="M50 20C58 34 70 42 66 58C64 68 57 74 50 74C42 74 35 68 34 59C33 50 40 46 43 38C46 44 48 46 52 46C54 38 50 30 50 20Z"/>`,
  GHS04: `<rect x="38" y="36" width="24" height="42" rx="10" ${F}/><rect x="45" y="26" width="10" height="14" ${F}/><rect x="40" y="22" width="20" height="6" rx="2" ${F}/>`,
  GHS05: `<rect x="22" y="64" width="34" height="8" ${F}/><path d="M26 28l8 14M44 28l-8 14" ${S} stroke-width="6" fill="none"/><circle cx="30" cy="50" r="3" ${F}/><circle cx="40" cy="52" r="3" ${F}/><circle cx="31" cy="58" r="2.5" ${F}/><path ${F} d="M62 70L62 52L66 46L68 52L70 44L74 46L74 52L78 50L78 62L72 72Z"/>`,
  GHS06: `<circle cx="50" cy="40" r="17" ${F}/><rect x="42" y="50" width="16" height="14" rx="2" ${F}/><circle cx="43" cy="40" r="4.5" fill="#fff"/><circle cx="57" cy="40" r="4.5" fill="#fff"/><path d="M48 49l2-4 2 4z" fill="#fff"/><path d="M26 58L74 78M74 58L26 78" ${S} stroke-width="6" fill="none"/>`,
  GHS07: `<rect x="45" y="22" width="10" height="34" rx="4" ${F}/><circle cx="50" cy="70" r="6" ${F}/>`,
  GHS08: `<circle cx="42" cy="26" r="8" ${F}/><path ${F} d="M24 76V56C24 44 32 38 42 38C52 38 60 44 60 56V76Z"/><polygon fill="#fff" points="42,46 44.5,52 51,52 46,56 48,62 42,58 36,62 38,56 33,52 39.5,52"/><path d="M58 30h18M58 40h14" ${S} stroke-width="0"/>`,
  GHS09: `<path d="M30 76V50M30 56L20 48M30 52L40 44M30 62L22 58M30 46L28 36" ${S} stroke-width="4" fill="none"/><ellipse cx="62" cy="62" rx="14" ry="8" ${F}/><polygon points="74,62 84,54 84,70" ${F}/><circle cx="55" cy="60" r="2" fill="#fff"/><path d="M46 78c6-4 16-4 22 0" ${S} stroke-width="2" fill="none"/>`
};

function svg(code) {
  return `<svg viewBox="0 0 100 100" role="img" aria-label="Piktogramm ${code}"><polygon points="50,4 96,50 50,96 4,50" fill="#fff" stroke="#d0021b" stroke-width="9" stroke-linejoin="miter"/>${ICONS[code]}</svg>`;
}

const DATA = [
  { code: 'GHS01', name: 'Explosiv', meaning: 'Explosive Stoffe, Gemische und Gegenstände. Können durch Schlag, Reibung, Wärme oder Funken explodieren.', examples: ['Feuerwerkskörper', 'Nitroglycerin', 'Pikrinsäure (trocken)'], tips: ['Nicht stoßen, nicht reiben, nicht erhitzen', 'Von Zündquellen fernhalten'], tags: ['explosiv', 'explosion'] },
  { code: 'GHS02', name: 'Entzündbar', meaning: 'Entzündbare Gase, Aerosole, Flüssigkeiten und Feststoffe sowie selbsterhitzende und selbstentzündliche Stoffe.', examples: ['Ethanol', 'Aceton', 'Benzin', 'Feuerzeuggas'], tips: ['Fern von Hitze, Funken, offener Flamme', 'Nicht rauchen', 'Gut lüften'], tags: ['entzündbar', 'entzündlich', 'flamme', 'brennbar'] },
  { code: 'GHS03', name: 'Brandfördernd (oxidierend)', meaning: 'Stoffe, die andere Stoffe entzünden oder Brände verstärken, meist durch Abgabe von Sauerstoff.', examples: ['Wasserstoffperoxid (konz.)', 'Kaliumpermanganat', 'Sauerstoff'], tips: ['Von brennbaren Stoffen getrennt lagern', 'Kein Kontakt mit Öl oder Fett'], tags: ['brandfördernd', 'oxidierend', 'entzündend', 'oxidationsmittel'] },
  { code: 'GHS04', name: 'Gas unter Druck', meaning: 'Komprimierte, verflüssigte oder gelöste Gase in Behältern. Bei Erwärmung Berstgefahr; tiefkalte Gase können Kälteverbrennungen verursachen.', examples: ['Gasflaschen (Argon, CO₂)', 'Flüssigstickstoff'], tips: ['Flaschen gegen Umfallen sichern', 'Vor Sonne und Hitze schützen'], tags: ['druck', 'gas', 'gasflasche', 'unter druck stehende gase'] },
  { code: 'GHS05', name: 'Ätzend', meaning: 'Wirkt hautätzend, verursacht schwere Augenschäden und kann Metalle angreifen (korrosiv).', examples: ['Salzsäure', 'Natronlauge', 'Rohrreiniger'], tips: ['Schutzbrille und Handschuhe tragen', 'Bei Augenkontakt sofort mehrere Minuten spülen und Arzt aufsuchen'], tags: ['ätzend', 'hautätzend', 'augenschädigung', 'schwere augenschädigung', 'korrosiv'] },
  { code: 'GHS06', name: 'Giftig (akut toxisch)', meaning: 'Schon kleine Mengen können beim Verschlucken, Einatmen oder bei Hautkontakt lebensgefährlich sein (Kategorien 1–3).', examples: ['Methanol', 'Kaliumcyanid', 'Quecksilberverbindungen'], tips: ['Kontakt unbedingt vermeiden', 'Nur mit passender Schutzausrüstung und Abzug arbeiten'], tags: ['giftig', 'toxisch', 'akut toxisch', 'tödlich'] },
  { code: 'GHS07', name: 'Reizend / gesundheitsschädlich', meaning: 'Reizt Haut, Augen oder Atemwege, kann Allergien der Haut auslösen oder ist akut schädlich (Kategorie 4). Früher „mindergiftig“.', examples: ['Isopropanol', 'Waschmittel', 'Ethylacetat'], tips: ['Dämpfe nicht einatmen', 'Handschuhe und Brille tragen'], tags: ['reizung', 'reizend', 'mindergiftig', 'gesundheitsschädlich', 'ausrufezeichen'] },
  { code: 'GHS08', name: 'Gesundheitsgefahr (KMR u. a.)', meaning: 'Schwere, oft langfristige Gesundheitsschäden: krebserzeugend, keimzellmutagen, reproduktionstoxisch (KMR), Organschäden, Atemwegssensibilisierung, Aspirationsgefahr.', examples: ['Benzol', 'Formaldehyd', 'Asbest', 'Blei'], tips: ['Exposition so weit wie möglich vermeiden', 'Besonders Schwangere und Jugendliche beachten (Beschäftigungsverbote)'], tags: ['kmr', 'krebserzeugend', 'mutagen', 'reproduktionstoxisch', 'gesundheitsgefahr'] },
  { code: 'GHS09', name: 'Umweltgefährlich (gewässergefährdend)', meaning: 'Schädlich für Wasserorganismen, oft mit langfristiger Wirkung.', examples: ['Pestizide', 'Kupfersalze', 'Schwermetallverbindungen'], tips: ['Nie in den Abfluss gießen', 'Als Sondermüll entsorgen'], tags: ['umwelt', 'gewässergefährdend', 'gewassergefahrdend', 'gewässer', 'fisch'] }
];

const $ = id => document.getElementById(id);
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function renderGrid(filter = '') {
  const q = filter.trim().toLowerCase();
  const list = DATA.filter(d => !q || [d.code, d.name, d.meaning, ...d.examples, ...d.tags].join(' ').toLowerCase().includes(q));
  $('grid').innerHTML = list.length ? list.map(d => `
    <article class="card">
      <div class="head">${svg(d.code)}<div><h3>${esc(d.name)}</h3><div class="code">${d.code}</div></div></div>
      <p>${esc(d.meaning)}</p>
      <ul>
        <li><strong>Beispiele:</strong> ${d.examples.map(esc).join(', ')}</li>
        ${d.tips.map(t => `<li>${esc(t)}</li>`).join('')}
      </ul>
    </article>`).join('') : '<p>Nichts gefunden.</p>';
}
$('search').addEventListener('input', e => renderGrid(e.target.value));
renderGrid();

// Lernkarten
let order = DATA.map((_, i) => i), pos = 0, flipped = false;
function renderFlash() {
  const d = DATA[order[pos]];
  $('flash').innerHTML = flipped
    ? `<h3>${esc(d.name)}</h3><div class="code">${d.code}</div><p>${esc(d.meaning)}</p>`
    : `${svg(d.code)}<p class="code">Karte ${pos + 1} / ${DATA.length} – Klick zum Umdrehen</p>`;
}
function flip() { flipped = !flipped; renderFlash(); }
function go(n) { pos = (pos + n + DATA.length) % DATA.length; flipped = false; renderFlash(); }
$('flash').addEventListener('click', flip);
$('flash').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
$('prev').onclick = () => go(-1);
$('next').onclick = () => go(1);
$('shuffle').onclick = () => { order.sort(() => Math.random() - .5); pos = 0; flipped = false; renderFlash(); };
renderFlash();

// Quiz
let score = 0, asked = 0;
function nextQuestion() {
  const correct = DATA[Math.floor(Math.random() * DATA.length)];
  const opts = [correct, ...DATA.filter(d => d !== correct).sort(() => Math.random() - .5).slice(0, 3)].sort(() => Math.random() - .5);
  $('quizbox').innerHTML = `
    <div class="score">Richtig: ${score} / ${asked}</div>
    ${svg(correct.code)}
    <div class="opts">${opts.map(o => `<button data-c="${o.code}">${esc(o.name)}</button>`).join('')}</div>
    <div class="row"><button id="qnext" disabled>Nächste Frage</button></div>`;
  $('quizbox').querySelectorAll('.opts button').forEach(b => b.onclick = () => {
    asked++;
    const ok = b.dataset.c === correct.code;
    if (ok) score++;
    $('quizbox').querySelectorAll('.opts button').forEach(x => {
      x.disabled = true;
      if (x.dataset.c === correct.code) x.classList.add('right');
    });
    if (!ok) b.classList.add('wrong');
    $('quizbox').querySelector('.score').textContent = `Richtig: ${score} / ${asked}`;
    $('qnext').disabled = false;
    $('qnext').onclick = nextQuestion;
  });
}
nextQuestion();
