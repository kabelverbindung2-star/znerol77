'use strict';

const F = 'fill="#000"';
const S = 'stroke="#000" stroke-linecap="round" stroke-linejoin="round"';
const FLAME = 'M50 20C58 34 70 42 66 58C64 68 57 74 50 74C42 74 35 68 34 59C33 50 40 46 43 38C46 44 48 46 52 46C54 38 50 30 50 20Z';
const flame = (tf, inner = true) => `<g transform="${tf}"><path ${F} d="${FLAME}"/>${inner ? '<path fill="#fff" d="M50 50C55 56 58 60 56 66C55 70 52 72 50 72C47 72 44 70 44 66C44 60 47 58 50 50Z"/>' : ''}</g>`;
const burst = (cx, cy, ro, ri, n) => {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro, a = Math.PI * i / n - Math.PI / 2;
    pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
  }
  return `<polygon ${F} points="${pts.join(' ')}"/>`;
};

const ICONS = {
  GHS01: burst(56, 38, 20, 8, 8) + `<circle cx="40" cy="64" r="14" ${F}/><path d="M48 55L52 48" ${S} stroke-width="4" fill="none"/>`,
  GHS02: flame('translate(0 2)') + `<rect x="30" y="78" width="40" height="4" ${F}/>`,
  GHS03: flame('translate(50 18) scale(.62) translate(-50 -20)') + `<circle cx="50" cy="68" r="11" fill="none" ${S} stroke-width="6"/><rect x="34" y="80" width="32" height="4" ${F}/>`,
  GHS04: `<g transform="rotate(45 50 50)"><rect x="36" y="38" width="28" height="44" rx="12" ${F}/><rect x="45" y="24" width="10" height="18" ${F}/><rect x="40" y="20" width="20" height="6" rx="2" ${F}/></g>`,
  GHS05: `<path d="M24 24L40 34L36 42L20 32Z" ${F}/><path d="M50 22L64 32L58 40L46 30Z" ${F}/><circle cx="31" cy="49" r="3" ${F}/><circle cx="38" cy="56" r="2.5" ${F}/><circle cx="55" cy="47" r="3" ${F}/><circle cx="60" cy="55" r="2.5" ${F}/><path d="M16 66H46V74H16Z" ${F}/><path d="M22 66l3-5 3 5M32 66l2-4 3 4" fill="#fff"/><path ${F} d="M58 74L58 60L62 52L65 58L66 49L70 50L70 58L74 55L78 58L76 70L68 78Z"/>`,
  GHS06: `<circle cx="50" cy="38" r="17" ${F}/><rect x="42" y="48" width="16" height="14" rx="2" ${F}/><circle cx="43" cy="38" r="4.5" fill="#fff"/><circle cx="57" cy="38" r="4.5" fill="#fff"/><path d="M48 47l2-4 2 4z" fill="#fff"/><path d="M26 56L74 80M74 56L26 80" ${S} stroke-width="6" fill="none"/><circle cx="25" cy="55" r="4" ${F}/><circle cx="75" cy="55" r="4" ${F}/><circle cx="25" cy="81" r="4" ${F}/><circle cx="75" cy="81" r="4" ${F}/>`,
  GHS07: `<path ${F} d="M44 22H56L54 58H46Z"/><circle cx="50" cy="71" r="6.5" ${F}/>`,
  GHS08: `<circle cx="50" cy="28" r="9" ${F}/><path ${F} d="M24 78V60C24 46 34 40 50 40C66 40 76 46 76 60V78Z"/><polygon fill="#fff" points="50,48 53,56 62,56 55,61 58,69 50,64 42,69 45,61 38,56 47,56"/>`,
  GHS09: `<path d="M22 78H78" ${S} stroke-width="3" fill="none"/><path d="M33 78V48M33 62L24 52M33 56L42 46M33 50L30 40M33 68L40 60" ${S} stroke-width="4" fill="none"/><ellipse cx="62" cy="66" rx="13" ry="7" ${F}/><polygon points="74,66 83,58 83,74" ${F}/><circle cx="55" cy="64" r="2" fill="#fff"/><path d="M52 52c4-3 10-3 14 0" ${S} stroke-width="2" fill="none"/>`
};

function svg(code) {
  return `<svg viewBox="0 0 100 100" role="img" aria-label="Piktogramm ${code}"><polygon points="50,3 97,50 50,97 3,50" fill="#fff" stroke="#d0021b" stroke-width="5" stroke-linejoin="miter"/>${ICONS[code]}</svg>`;
}

const DATA = [
  { code: 'GHS01', name: 'Explosiv', meaning: 'Explosive Stoffe, Gemische und Gegenstände. Können durch Schlag, Reibung, Wärme oder Funken explodieren.', examples: ['Feuerwerkskörper', 'Nitroglycerin', 'Pikrinsäure (trocken)'], tips: ['Nicht stoßen, nicht reiben, nicht erhitzen', 'Von Zündquellen fernhalten'], tags: ['explosiv', 'explosion'] },
  { code: 'GHS02', name: 'Entzündbar', meaning: 'Entzündbare Gase, Aerosole, Flüssigkeiten und Feststoffe sowie selbsterhitzende und selbstentzündliche Stoffe.', examples: ['Ethanol', 'Aceton', 'Benzin', 'Feuerzeuggas'], tips: ['Fern von Hitze, Funken, offener Flamme', 'Nicht rauchen', 'Gut lüften'], tags: ['entzündbar', 'entzündlich', 'flamme', 'brennbar'] },
  { code: 'GHS03', name: 'Entzündend (brandfördernd)', meaning: 'Stoffe, die andere Stoffe entzünden oder Brände verstärken, meist durch Abgabe von Sauerstoff.', examples: ['Wasserstoffperoxid (konz.)', 'Kaliumpermanganat', 'Sauerstoff'], tips: ['Von brennbaren Stoffen getrennt lagern', 'Kein Kontakt mit Öl oder Fett'], tags: ['brandfördernd', 'oxidierend', 'entzündend', 'oxidationsmittel'] },
  { code: 'GHS04', name: 'Unter Druck stehende Gase', meaning: 'Komprimierte, verflüssigte oder gelöste Gase in Behältern. Bei Erwärmung Berstgefahr; tiefkalte Gase können Kälteverbrennungen verursachen.', examples: ['Gasflaschen (Argon, CO₂)', 'Flüssigstickstoff'], tips: ['Flaschen gegen Umfallen sichern', 'Vor Sonne und Hitze schützen'], tags: ['druck', 'gas', 'gasflasche', 'unter druck stehende gase'] },
  { code: 'GHS05', merk: ['hautätzend', 'schwere Augenschädigung'], name: 'Hautätzend, schwere Augenschädigung', meaning: 'Wirkt hautätzend, verursacht schwere Augenschäden und kann Metalle angreifen (korrosiv).', examples: ['Salzsäure', 'Natronlauge', 'Rohrreiniger'], tips: ['Schutzbrille und Handschuhe tragen', 'Bei Augenkontakt sofort mehrere Minuten spülen und Arzt aufsuchen'], tags: ['ätzend', 'hautätzend', 'augenschädigung', 'schwere augenschädigung', 'korrosiv'] },
  { code: 'GHS06', name: 'Giftig', meaning: 'Schon kleine Mengen können beim Verschlucken, Einatmen oder bei Hautkontakt lebensgefährlich sein (Kategorien 1–3).', examples: ['Methanol', 'Kaliumcyanid', 'Quecksilberverbindungen'], tips: ['Kontakt unbedingt vermeiden', 'Nur mit passender Schutzausrüstung und Abzug arbeiten'], tags: ['giftig', 'toxisch', 'akut toxisch', 'tödlich'] },
  { code: 'GHS07', merk: ['Reizung (Augen, Haut)', 'evtl. mindergiftig'], name: 'Reizung (Augen, Haut), evtl. mindergiftig', meaning: 'Reizt Haut, Augen oder Atemwege, kann Allergien der Haut auslösen oder ist akut schädlich (Kategorie 4). Früher „mindergiftig“.', examples: ['Isopropanol', 'Waschmittel', 'Ethylacetat'], tips: ['Dämpfe nicht einatmen', 'Handschuhe und Brille tragen'], tags: ['reizung', 'reizend', 'mindergiftig', 'gesundheitsschädlich', 'ausrufezeichen'] },
  { code: 'GHS08', merk: ['K – karzinogen (krebserzeugend)', 'M – keimzellmutagen', 'R – reproduktionstoxisch'], name: 'K, M, R – sehr gefährliche Stoffe', meaning: 'Schwere, oft langfristige Gesundheitsschäden: krebserzeugend, keimzellmutagen, reproduktionstoxisch (KMR), Organschäden, Atemwegssensibilisierung, Aspirationsgefahr.', examples: ['Benzol', 'Formaldehyd', 'Asbest', 'Blei'], tips: ['Exposition so weit wie möglich vermeiden', 'Besonders Schwangere und Jugendliche beachten (Beschäftigungsverbote)'], tags: ['kmr', 'krebserzeugend', 'mutagen', 'reproduktionstoxisch', 'gesundheitsgefahr'] },
  { code: 'GHS09', name: 'Gewässergefährdend', meaning: 'Schädlich für Wasserorganismen, oft mit langfristiger Wirkung.', examples: ['Pestizide', 'Kupfersalze', 'Schwermetallverbindungen'], tips: ['Nie in den Abfluss gießen', 'Als Sondermüll entsorgen'], tags: ['umwelt', 'gewässergefährdend', 'gewassergefahrdend', 'gewässer', 'fisch'] }
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
      ${d.merk ? `<p>${d.merk.map(m => `<span class="tag">${esc(m)}</span>`).join('')}</p>` : ''}
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
    ? `<h3>${esc(d.name)}</h3><div class="code">${d.code}</div>${d.merk ? `<p>${d.merk.map(m => `<span class="tag">${esc(m)}</span>`).join('')}</p>` : ''}<p>${esc(d.meaning)}</p>`
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
