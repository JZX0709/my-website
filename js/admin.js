// ========== 后台管理逻辑 ==========

let allNews = [];
let currentEditId = null;
let currentFileSha = null;

// ========== 工具函数 ==========

// UTF-8 安全 Base64 编码（支持中文等 Unicode 字符）
function utf8ToBase64(str) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Base64 解码为 UTF-8 字符串
function base64ToUtf8(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// ========== 配置管理 ==========

function getConfig() {
  return {
    user: localStorage.getItem('gh_user') || '',
    repo: localStorage.getItem('gh_repo') || '',
    branch: localStorage.getItem('gh_branch') || 'main',
    token: localStorage.getItem('gh_token') || ''
  };
}

function saveConfig() {
  const user = document.getElementById('githubUser').value.trim();
  const repo = document.getElementById('githubRepo').value.trim();
  const branch = document.getElementById('githubBranch').value.trim() || 'main';
  const token = document.getElementById('githubToken').value.trim();

  if (!user || !repo || !token) {
    showToast('请填写完整的配置信息', 'error');
    return;
  }

  localStorage.setItem('gh_user', user);
  localStorage.setItem('gh_repo', repo);
  localStorage.setItem('gh_branch', branch);
  localStorage.setItem('gh_token', token);
  showToast('配置已保存', 'success');
}

function loadConfig() {
  const cfg = getConfig();
  document.getElementById('githubUser').value = cfg.user;
  document.getElementById('githubRepo').value = cfg.repo;
  document.getElementById('githubBranch').value = cfg.branch;
  document.getElementById('githubToken').value = cfg.token;
}

// ========== GitHub API ==========

async function githubAPI(path, options = {}) {
  const cfg = getConfig();
  if (!cfg.user || !cfg.repo || !cfg.token) {
    showToast('请先配置 GitHub 仓库信息', 'error');
    throw new Error('未配置');
  }

  const baseURL = `https://api.github.com/repos/${cfg.user}/${cfg.repo}/contents/${path}`;
  const url = options.ref ? `${baseURL}?ref=${options.ref}` : baseURL;

  const headers = {
    'Authorization': `token ${cfg.token}`,
    'Accept': 'application/vnd.github.v3+json'
  };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return res.json();
}

async function testConnection() {
  const cfg = getConfig();
  if (!cfg.user || !cfg.repo || !cfg.token) {
    showToast('请先填写并保存配置', 'error');
    return;
  }

  const statusEl = document.getElementById('configStatus');
  statusEl.textContent = '⏳ 正在测试连接...';
  statusEl.style.color = 'var(--text-secondary)';

  try {
    const data = await githubAPI('data/news.json', { ref: cfg.branch });
    currentFileSha = data.sha;
    statusEl.textContent = '✅ 连接成功！已找到 news.json 文件';
    statusEl.style.color = 'var(--success)';
    showToast('连接成功', 'success');
  } catch (err) {
    statusEl.textContent = '❌ 连接失败: ' + err.message;
    statusEl.style.color = 'var(--danger)';
    showToast('连接失败: ' + err.message, 'error');
  }
}

// ========== 数据加载/保存 ==========

async function loadNewsFromGitHub() {
  try {
    const data = await githubAPI('data/news.json', { ref: getConfig().branch });
    currentFileSha = data.sha;
    const content = JSON.parse(base64ToUtf8(data.content));
    allNews = content.news || [];
    renderNewsList();
    return true;
  } catch (err) {
    console.error('加载失败:', err);
    showToast('加载新闻失败: ' + err.message, 'error');
    return false;
  }
}

function loadNewsFromLocal() {
  // 离线模式：从本地 news.json 加载
  fetch('data/news.json')
    .then(res => res.json())
    .then(data => {
      allNews = data.news || [];
      renderNewsList();
    });
}

async function saveToGitHub() {
  const cfg = getConfig();

  // 重新获取最新 SHA（防止冲突）
  let sha = currentFileSha;
  try {
    const latest = await githubAPI('data/news.json', { ref: cfg.branch });
    sha = latest.sha;
  } catch (e) {
    // 如果文件不存在，sha 为 null
  }

  const content = JSON.stringify({ news: allNews }, null, 2);
  const body = {
    message: `更新新闻: ${new Date().toLocaleString('zh-CN')}`,
    content: utf8ToBase64(content),
    branch: cfg.branch
  };
  if (sha) body.sha = sha;

  const result = await githubAPI('data/news.json', {
    method: 'PUT',
    body,
    ref: cfg.branch
  });

  currentFileSha = result.content.sha;
  return result;
}

// ========== 新闻列表渲染 ==========

function renderNewsList() {
  const listEl = document.getElementById('newsList');
  const countEl = document.getElementById('listCount');
  countEl.textContent = `(${allNews.length} 条)`;

  if (allNews.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="icon">📭</div>
        <h3>暂无新闻</h3>
        <p>使用左侧表单添加第一条新闻</p>
      </div>`;
    return;
  }

  // 按置顶 + 日期排序
  const sorted = [...allNews].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.date) - new Date(a.date);
  });

  const catMap = { tech: '科技', sports: '体育', entertainment: '娱乐', business: '财经', world: '国际', science: '科学' };

  listEl.innerHTML = sorted.map(n => `
    <div class="news-list-item">
      <div class="item-header">
        <div class="item-title">
          ${n.pinned ? '<span class="pin-mark">📌</span>' : ''}${escapeHtml(n.title)}
        </div>
        <div class="item-actions">
          <button class="btn btn-outline btn-sm" onclick="editNews(${n.id})" title="编辑">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteNews(${n.id})" title="删除">🗑️</button>
        </div>
      </div>
      <div class="item-meta">
        <span>📂 ${catMap[n.category] || n.category}</span>
        <span>✍️ ${n.author}</span>
        <span>📅 ${n.date}</span>
        <span>🆔 #${n.id}</span>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ========== 增删改操作 ==========

function generateId() {
  return allNews.length > 0 ? Math.max(...allNews.map(n => n.id)) + 1 : 1;
}

async function saveNews(e) {
  e.preventDefault();

  const cfg = getConfig();
  if (!cfg.user || !cfg.repo || !cfg.token) {
    showToast('请先配置并保存 GitHub 仓库信息', 'error');
    return;
  }

  const newsData = {
    id: currentEditId || generateId(),
    title: document.getElementById('newsTitle').value.trim(),
    summary: document.getElementById('newsSummary').value.trim(),
    content: document.getElementById('newsContent').value.trim(),
    category: document.getElementById('newsCategory').value,
    author: document.getElementById('newsAuthor').value.trim() || '编辑部',
    date: document.getElementById('newsDate').value || new Date().toISOString().split('T')[0],
    image: document.getElementById('newsImage').value.trim(),
    pinned: document.getElementById('newsPinned').checked
  };

  if (!newsData.title) {
    showToast('请输入新闻标题', 'error');
    return;
  }

  // 显示保存状态
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="loading-spinner"></span> 保存中...';

  try {
    if (currentEditId) {
      // 编辑模式：替换旧新闻
      const idx = allNews.findIndex(n => n.id === currentEditId);
      if (idx !== -1) allNews[idx] = newsData;
    } else {
      // 新增模式
      allNews.push(newsData);
    }

    await saveToGitHub();
    showToast(currentEditId ? '新闻已更新' : '新闻已添加', 'success');
    resetForm();
    renderNewsList();
  } catch (err) {
    showToast('保存失败: ' + err.message, 'error');
    // 恢复数据（重新加载）
    await loadNewsFromGitHub();
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = currentEditId ? '💾 更新新闻' : '✅ 添加新闻';
  }
}

function editNews(id) {
  const news = allNews.find(n => n.id === id);
  if (!news) return;

  currentEditId = id;
  document.getElementById('editId').value = id;
  document.getElementById('newsTitle').value = news.title;
  document.getElementById('newsSummary').value = news.summary || '';
  document.getElementById('newsContent').value = news.content || '';
  document.getElementById('newsCategory').value = news.category;
  document.getElementById('newsAuthor').value = news.author || '';
  document.getElementById('newsDate').value = news.date || '';
  document.getElementById('newsImage').value = news.image || '';
  document.getElementById('newsPinned').checked = news.pinned || false;

  document.getElementById('formTitle').textContent = '✏️ 编辑新闻';
  document.getElementById('submitBtn').textContent = '💾 更新新闻';
  document.getElementById('cancelBtn').style.display = '';

  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
  resetForm();
}

function resetForm() {
  currentEditId = null;
  document.getElementById('editId').value = '';
  document.getElementById('newsForm').reset();
  document.getElementById('newsDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('newsPinned').checked = false;
  document.getElementById('formTitle').textContent = '✏️ 添加新闻';
  document.getElementById('submitBtn').textContent = '✅ 添加新闻';
  document.getElementById('cancelBtn').style.display = 'none';
}

async function deleteNews(id) {
  if (!confirm('确定要删除这条新闻吗？此操作不可撤销。')) return;

  const cfg = getConfig();
  if (!cfg.user || !cfg.repo || !cfg.token) {
    showToast('请先配置 GitHub 仓库信息', 'error');
    return;
  }

  try {
    allNews = allNews.filter(n => n.id !== id);
    await saveToGitHub();
    if (currentEditId === id) resetForm();
    showToast('新闻已删除', 'success');
    renderNewsList();
  } catch (err) {
    showToast('删除失败: ' + err.message, 'error');
    await loadNewsFromGitHub();
  }
}

// ========== Toast 提示 ==========

function showToast(msg, type) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ========== 初始化 ==========

document.addEventListener('DOMContentLoaded', () => {
  loadConfig();

  // 设置默认日期为今天
  document.getElementById('newsDate').value = new Date().toISOString().split('T')[0];

  // 尝试从 GitHub 加载，失败则加载本地文件
  const cfg = getConfig();
  if (cfg.user && cfg.repo && cfg.token) {
    loadNewsFromGitHub().then(success => {
      if (!success) loadNewsFromLocal();
    });
  } else {
    loadNewsFromLocal();
    showToast('请配置 GitHub 仓库信息以启用在线上传功能', 'info');
  }
});
