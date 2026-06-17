// ── Particles ──
(function () {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function rand(a, b) { return Math.random() * (b - a) + a; }

  for (let i = 0; i < 70; i++) {
    particles.push({
      x: rand(0, W), y: rand(0, H),
      r: rand(0.5, 1.8),
      dx: rand(-0.15, 0.15),
      dy: rand(-0.3, -0.05),
      opacity: rand(0.1, 0.5)
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 180,255, ${p.opacity})`;
      ctx.fill();
      p.x += p.dx; p.y += p.dy;
      if (p.y < -5) { p.y = H + 5; p.x = rand(0, W); }
      if (p.x < -5) p.x = W + 5;
      if (p.x > W + 5) p.x = -5;
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ── State ──
const STORAGE_KEY = 'linkboard_v2';
let links = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
let activeCategory = 'all';
let searchQuery = '';
let editingId = null;
let selectedColor = '#6366f1';

// Default links
const DEFAULT_LINKS = [
  {
    id: 'gh-new', url: 'https://github.com/new',
    title: 'Новый репозиторий', desc: 'Создать новый репозиторий на GitHub',
    cat: 'Разработка', color: '#24292e', createdAt: 1
  },
  {
    id: 'fanpay', url: 'https://funpay.com/',
    title: 'FunPay', desc: 'Маркетплейс игровых товаров и услуг',
    cat: 'Финансы', color: '#ec4899', createdAt: 2
  },
  {
    id: 'my-site', url: 'https://realfactchecknews-eng.github.io/my-projects/index.html',
    title: 'Мой сайт', desc: 'Мои проекты на GitHub Pages',
    cat: 'Мои', color: '#10b981', createdAt: 3
  },
  {
    id: 'openrouter', url: 'https://openrouter.ai',
    title: 'OpenRouter', desc: 'Единый API для всех AI-моделей',
    cat: 'AI', color: '#f97316', createdAt: 4
  },
  {
    id: 'cloudflare', url: 'https://cloudflare.com',
    title: 'Cloudflare', desc: 'CDN, безопасность и DNS для сайтов',
    cat: 'Инфраструктура', color: '#f59e0b', createdAt: 5
  },
  {
    id: 'gumloop', url: 'https://gumloop.com',
    title: 'Gumloop', desc: 'Твой AI-ассистент с доступом к интеграциям',
    cat: 'AI', color: '#8b5cf6', createdAt: 6
  },
];

if (!links) { links = DEFAULT_LINKS; save(); }

// ── Helpers ──
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(links)); }
function uid()  { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function showToast(msg) {
  clearTimeout(window._toastTimer);
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  window._toastTimer = setTimeout(() => t.classList.add('hidden'), 2400);
}

function getHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function getFavicon(url) {
  try { return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(new URL(url).origin)}`; }
  catch { return ''; }
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

function getCategories() {
  return [...new Set(links.map(l => l.cat).filter(Boolean))].sort();
}

// ── Render ──
function renderCats() {
  const cats = getCategories();
  const catsEl = document.getElementById('categories');
  const datalist = document.getElementById('catList');
  datalist.innerHTML = cats.map(c => `<option value="${c}">`).join('');
  catsEl.querySelectorAll('[data-cat]:not([data-cat="all"])').forEach(el => el.remove());
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'chip'; btn.dataset.cat = cat; btn.textContent = cat;
    catsEl.appendChild(btn);
  });
  catsEl.querySelectorAll('[data-cat]').forEach(b =>
    b.classList.toggle('active', b.dataset.cat === activeCategory));
}

function renderGrid() {
  const q = searchQuery.toLowerCase();
  const filtered = links.filter(l => {
    const catOk = activeCategory === 'all' || l.cat === activeCategory;
    const searchOk = !q || l.title.toLowerCase().includes(q)
      || (l.desc||'').toLowerCase().includes(q)
      || getHost(l.url).includes(q);
    return catOk && searchOk;
  });

  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  grid.innerHTML = '';

  if (!filtered.length) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  filtered.forEach((link, i) => {
    const color = link.color || '#6366f1';
    const favicon = getFavicon(link.url);
    const initial = (link.title||'?')[0].toUpperCase();

    const a = document.createElement('a');
    a.className = 'card';
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.dataset.id = link.id;
    a.style.setProperty('--card-color', color);
    a.style.setProperty('--card-color-rgb', hexToRgb(color));
    a.style.animationDelay = `${i * 0.06}s`;

    a.innerHTML = `
      <div class="shimmer"></div>
      <div class="card-actions">
        <button class="act-btn" title="Редактировать" data-action="edit" data-id="${link.id}" onclick="event.preventDefault()">✏️</button>
        <button class="act-btn del" title="Удалить" data-action="delete" data-id="${link.id}" onclick="event.preventDefault()">🗑️</button>
      </div>
      <div class="card-top">
        <div class="card-icon" style="background: ${color}18; border-color: ${color}30;">
          <img src="${favicon}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
          <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-weight:700;color:${color};">${initial}</span>
        </div>
        <div class="card-info">
          <div class="card-title">${link.title}</div>
          <div class="card-host">${getHost(link.url)}</div>
        </div>
      </div>
      ${link.desc ? `<div class="card-desc">${link.desc}</div>` : ''}
      <div class="card-footer">
        ${link.cat ? `<span class="card-cat">${link.cat}</span>` : '<span></span>'}
        <span class="card-arrow">↗</span>
      </div>`;
    grid.appendChild(a);
  });
}

function render() { renderCats(); renderGrid(); }

// ── Event delegation for card buttons ──
document.getElementById('grid').addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  e.preventDefault(); e.stopPropagation();
  const id = btn.dataset.id;
  if (btn.dataset.action === 'delete') {
    if (confirm('Удалить эту ссылку?')) {
      links = links.filter(l => l.id !== id);
      save(); showToast('🗑️  Ссылка удалена'); render();
    }
  }
  if (btn.dataset.action === 'edit') {
    const link = links.find(l => l.id === id);
    if (link) openModal(link);
  }
});

// ── Category filter ──
document.getElementById('categories').addEventListener('click', e => {
  const chip = e.target.closest('[data-cat]');
  if (!chip) return;
  activeCategory = chip.dataset.cat;
  renderCats(); renderGrid();
});

// ── Search ──
document.getElementById('search').addEventListener('input', e => {
  searchQuery = e.target.value; renderGrid();
});

// ── Color picker ──
document.getElementById('colorPicker').addEventListener('click', e => {
  const dot = e.target.closest('.color-dot');
  if (!dot) return;
  document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
  dot.classList.add('active');
  selectedColor = dot.dataset.color;
  document.getElementById('color').value = selectedColor;
});

// ── Modal ──
function openModal(link = null) {
  editingId = link?.id || null;
  document.getElementById('modalTitle').textContent = link ? 'Редактировать' : 'Новая ссылка';
  document.getElementById('url').value   = link?.url   || '';
  document.getElementById('title').value = link?.title || '';
  document.getElementById('desc').value  = link?.desc  || '';
  document.getElementById('cat').value   = link?.cat   || '';
  selectedColor = link?.color || '#6366f1';
  document.getElementById('color').value = selectedColor;
  document.querySelectorAll('.color-dot').forEach(d => {
    d.classList.toggle('active', d.dataset.color === selectedColor);
  });
  document.getElementById('modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('url').focus(), 60);
}
function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('linkForm').reset();
  editingId = null; selectedColor = '#6366f1';
}

document.getElementById('openModal').addEventListener('click', () => openModal());
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Auto-fill title ──
document.getElementById('url').addEventListener('blur', function () {
  const t = document.getElementById('title');
  if (!this.value || t.value) return;
  try {
    const h = new URL(this.value).hostname.replace(/^www\./, '');
    t.value = h.charAt(0).toUpperCase() + h.slice(1);
  } catch {}
});

// ── Form submit ──
document.getElementById('linkForm').addEventListener('submit', e => {
  e.preventDefault();
  const data = {
    url:   document.getElementById('url').value.trim(),
    title: document.getElementById('title').value.trim(),
    desc:  document.getElementById('desc').value.trim(),
    cat:   document.getElementById('cat').value.trim(),
    color: document.getElementById('color').value,
  };
  if (editingId) {
    const idx = links.findIndex(l => l.id === editingId);
    if (idx !== -1) links[idx] = { ...links[idx], ...data };
    showToast('✅  Ссылка обновлена');
  } else {
    links.unshift({ id: uid(), ...data, createdAt: Date.now() });
    showToast('✅  Ссылка добавлена');
  }
  save(); closeModal(); render();
});

// ── Init ──
render();
