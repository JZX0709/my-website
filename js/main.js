// ========== 新闻首页逻辑 ==========

const NEWS_DATA_URL = 'data/news.json';

let allNews = [];
let currentCategory = 'all';
let searchQuery = '';

// 分类中文映射
const categoryLabels = {
  all: '全部',
  tech: '科技',
  sports: '体育',
  entertainment: '娱乐',
  business: '财经',
  world: '国际',
  science: '科学'
};

const categoryIcons = {
  tech: '💻',
  sports: '⚽',
  entertainment: '🎬',
  business: '💼',
  world: '🌍',
  science: '🔬'
};

// 加载新闻数据
async function loadNews() {
  try {
    const res = await fetch(NEWS_DATA_URL);
    if (!res.ok) throw new Error('加载失败');
    const data = await res.json();
    allNews = data.news || [];
    renderNews();
  } catch (err) {
    console.error('加载新闻失败:', err);
    document.getElementById('newsGrid').innerHTML = `
      <div class="empty-state">
        <div class="icon">⚠️</div>
        <h3>加载失败</h3>
        <p>请检查 news.json 文件是否存在</p>
      </div>`;
  }
}

// 渲染新闻列表
function renderNews() {
  const grid = document.getElementById('newsGrid');
  let filtered = [...allNews];

  // 分类筛选
  if (currentCategory !== 'all') {
    filtered = filtered.filter(n => n.category === currentCategory);
  }

  // 搜索筛选
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    filtered = filtered.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.summary.toLowerCase().includes(q)
    );
  }

  // 置顶排序
  filtered.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.date) - new Date(a.date);
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="icon">📭</div>
        <h3>没有找到相关新闻</h3>
        <p>试试换个关键词或分类</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(news => {
    const catClass = `cat-${news.category}`;
    const catLabel = categoryLabels[news.category] || news.category;
    const icon = categoryIcons[news.category] || '📄';

    const imgHTML = news.image
      ? `<img src="${news.image}" alt="${news.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='block';">`
      : '';
    const placeholderHTML = (!news.image || news.imageFailed) ? `<span class="placeholder-icon">${icon}</span>` : '';

    const featuredClass = news.pinned ? ' featured' : '';

    return `
      <div class="news-card${featuredClass}" onclick="openDetail(${news.id})">
        <div class="card-img">
          ${imgHTML}
          ${placeholderHTML}
        </div>
        <div class="card-body">
          <span class="category ${catClass}">${catLabel}</span>
          <h3 class="card-title">${news.title}</h3>
          <p class="card-summary">${news.summary}</p>
          <div class="card-meta">
            <span>${news.author} · ${news.date}</span>
            ${news.pinned ? '<span class="pin-badge">📌 置顶</span>' : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

// 打开新闻详情
function openDetail(id) {
  const news = allNews.find(n => n.id === id);
  if (!news) return;

  const overlay = document.getElementById('modalOverlay');
  const modal = document.getElementById('modal');

  const catLabel = categoryLabels[news.category] || news.category;
  const imgHTML = news.image
    ? `<img class="modal-img" src="${news.image}" alt="${news.title}" onerror="this.style.display='none';">`
    : '';

  modal.innerHTML = `
    <div class="modal-header">
      <h2>${news.title}</h2>
      <button class="modal-close" onclick="closeDetail()">✕</button>
    </div>
    <div class="modal-meta">
      <span>📂 ${catLabel}</span>
      <span>✍️ ${news.author}</span>
      <span>📅 ${news.date}</span>
      ${news.pinned ? '<span>📌 置顶</span>' : ''}
    </div>
    ${imgHTML}
    <div class="modal-content">${news.content}</div>
  `;

  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

// 关闭详情
function closeDetail() {
  document.getElementById('modalOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

// 事件绑定
document.getElementById('modalOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeDetail();
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeDetail();
});

// 分页标签点击
document.getElementById('filterTabs').addEventListener('click', function(e) {
  if (e.target.classList.contains('filter-tab')) {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    currentCategory = e.target.dataset.category;
    renderNews();
  }
});

// 搜索（防抖）
let searchTimer;
document.getElementById('searchInput').addEventListener('input', function() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = this.value;
    renderNews();
  }, 300);
});

// 启动
loadNews();
