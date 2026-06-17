// ── State ──
const STORAGE_KEY = 'linkboard_links';
let links = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let activeCategory = 'all';
let searchQuery = '';
let editingId = null;

// ── DOM ──
const grid       = document.getElementById('grid');
const emptyState = document.getElementById('empty');
const modal      = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const linkForm   = document.getElementById('linkForm');
const searchInput = document.getElementById('search');
const catsEl     = document.getElementById('categories');
const catInput   = document.getElementById('cat');
const catDatalist= document.getElementById('catSuggestions');
const toast      = document.getElementById('toast');
let toastTimer;

// ── Helpers ──
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function showToast(msg, emoji = '✅') {
  clearTimeout(toastTimer);
  toast.textContent = emoji + '  ' + msg;
  toast.classList.remove('hidden');
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2500);
}

function getHostname(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

function getFaviconUrl(url) {
  try {
    const h = new URL(url).origin;
    return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(h)}`;
  } catch { return ''; }
}

function getCategories() {
  return [...new Set(links.map(l => l.cat).filter(Boolean))].sort();
}

// ── Render ──
function renderCategories() {
  const cats = getCategories();
  // Update datalist suggestions
  catDatalist.innerHTML = cats.map(c => `<option value="${c}">`).join('');

  // Keep "All" chip, rebuild rest
  const existing = [...catsEl.querySelectorAll('[data-cat]')].map(el => el.dataset.cat);
  // Remove outdated
  catsEl.querySelectorAll('[data-cat]').forEach(el => {
    if (el.dataset.cat !== 'all' && !cats.includes(el.dataset.cat)) el.remove();
  });
  // Add new
  cats.forEach(cat => {
    if (!existing.includes(cat)) {
      const btn = document.createElement('button');
      btn.className = 'cat-chip';
      btn.dataset.cat = cat;
      btn.textContent = cat;
      catsEl.appendChild(btn);
    }
  });
  // Set active
  catsEl.querySelectorAll('[data-cat]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === activeCategory);
  });
}

function renderGrid() {
  const query = searchQuery.toLowerCase();
  const filtered = links.filter(l => {
    const matchCat = activeCategory === 'all' || l.cat === activeCategory;
    const matchSearch = !query ||
      l.title.toLowerCase().includes(query) ||
      (l.desc || '').toLowerCase().includes(query) ||
      getHostname(l.url).toLowerCase().includes(query);
    return matchCat && matchSearch;
  });

  grid.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  filtered.forEach((link, i) => {
    const card = document.createElement('div');
    card.className = 'link-card';
    card.style.animationDelay = `${i * 0.05}s`;
    card.dataset.id = link.id;

    const favicon = getFaviconUrl(link.url);
    const initial = (link.title || '?')[0].toUpperCase();

    card.innerHTML = `
      <div class="card-actions">
        <button class="action-btn edit" title="Редактировать" data-id="${link.id}">✏️</button>
        <button class="action-btn delete" title="Удалить" data-id="${link.id}">🗑️</button>
      </div>
      <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="block no-underline" onclick="event.stopPropagation()">
        <div class="flex items-start gap-3">
          <div class="favicon-wrap shrink-0 mt-0.5">
            <img src="${favicon}" alt="" class="card-favicon" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
            <div class="card-favicon-fallback" style="display:none">${initial}</div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="card-title">${link.title}</div>
            ${link.desc ? `<div class="card-desc">${link.desc}</div>` : ''}
            <div class="card-url">${getHostname(link.url)}</div>
            ${link.cat ? `<span class="card-cat">${link.cat}</span>` : ''}
          </div>
        </div>
      </a>`;
    grid.appendChild(card);
  });
}

function render() {
  renderCategories();
  renderGrid();
}

// ── Modal ──
function openModal(link = null) {
  editingId = link ? link.id : null;
  modalTitle.textContent = link ? 'Редактировать' : 'Новая ссылка';
  document.getElementById('url').value   = link?.url   || '';
  document.getElementById('title').value = link?.title || '';
  document.getElementById('desc').value  = link?.desc  || '';
  catInput.value                          = link?.cat   || '';
  modal.classList.remove('hidden');
  setTimeout(() => document.getElementById('url').focus(), 50);
}

function closeModal() {
  modal.classList.add('hidden');
  linkForm.reset();
  editingId = null;
}

document.getElementById('openModal').addEventListener('click', () => openModal());
document.getElementById('closeModal').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Form submit ──
linkForm.addEventListener('submit', e => {
  e.preventDefault();
  const data = {
    url:   document.getElementById('url').value.trim(),
    title: document.getElementById('title').value.trim(),
    desc:  document.getElementById('desc').value.trim(),
    cat:   catInput.value.trim(),
  };
  if (editingId) {
    const idx = links.findIndex(l => l.id === editingId);
    if (idx !== -1) links[idx] = { ...links[idx], ...data };
    showToast('Ссылка обновлена');
  } else {
    links.unshift({ id: uid(), ...data, createdAt: Date.now() });
    showToast('Ссылка добавлена');
  }
  save();
  closeModal();
  render();
});

// ── Auto-fill title from URL ──
document.getElementById('url').addEventListener('blur', async function () {
  const titleInput = document.getElementById('title');
  if (!this.value || titleInput.value) return;
  try {
    const host = new URL(this.value).hostname.replace(/^www\./, '');
    titleInput.value = host.charAt(0).toUpperCase() + host.slice(1);
  } catch {}
});

// ── Card actions (delete / edit) ──
grid.addEventListener('click', e => {
  const editBtn  = e.target.closest('.action-btn.edit');
  const deleteBtn = e.target.closest('.action-btn.delete');
  if (editBtn) {
    e.preventDefault();
    const link = links.find(l => l.id === editBtn.dataset.id);
    if (link) openModal(link);
  }
  if (deleteBtn) {
    e.preventDefault();
    if (confirm('Удалить эту ссылку?')) {
      links = links.filter(l => l.id !== deleteBtn.dataset.id);
      save();
      showToast('Ссылка удалена', '🗑️');
      render();
    }
  }
});

// ── Category filter ──
catsEl.addEventListener('click', e => {
  const chip = e.target.closest('.cat-chip');
  if (!chip) return;
  activeCategory = chip.dataset.cat;
  renderCategories();
  renderGrid();
});

// ── Search ──
searchInput.addEventListener('input', e => {
  searchQuery = e.target.value;
  renderGrid();
});

// ── Init with sample links if empty ──
if (links.length === 0) {
  links = [
    { id: uid(), url: 'https://github.com', title: 'GitHub', desc: 'Хостинг кода и проектов', cat: 'Разработка', createdAt: Date.now() },
    { id: uid(), url: 'https://figma.com', title: 'Figma', desc: 'Дизайн интерфейсов', cat: 'Дизайн', createdAt: Date.now() },
    { id: uid(), url: 'https://developer.mozilla.org', title: 'MDN Web Docs', desc: 'Документация по веб-технологиям', cat: 'Разработка', createdAt: Date.now() },
  ];
  save();
}

render();
