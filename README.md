# 新闻资讯网站

基于 GitHub Pages + GitHub API 的新闻管理系统，前端展示新闻，后台可直接增删改新闻，所有数据存储在 GitHub 仓库中。

## 功能

- 📰 **新闻首页**：分类筛选、关键词搜索、新闻详情弹窗
- 🔧 **后台管理**：可视化管理面板，支持增删改新闻
- 📌 **置顶功能**：重要新闻可设为置顶
- 🔗 **GitHub API**：数据直接存储在仓库 news.json 中，操作即时生效
- 📱 **响应式设计**：适配手机、平板、桌面

## 部署步骤

### 1. 创建 GitHub 仓库

在 GitHub 上创建一个新仓库（例如 `news-site`），仓库设为 **Public**。

### 2. 上传文件

将本目录下的所有文件上传到仓库：

```
news-site/
├── index.html
├── admin.html
├── css/
│   ├── style.css
│   └── admin.css
├── js/
│   ├── main.js
│   └── admin.js
├── data/
│   └── news.json
└── README.md
```

### 3. 启用 GitHub Pages

1. 进入仓库 → Settings → Pages
2. Source 选择 `Deploy from a branch`
3. Branch 选择 `main`，文件夹选择 `/ (root)`
4. 点击 Save

等待几分钟，你的网站就可以通过 `https://你的用户名.github.io/news-site/` 访问了！

### 4. 生成 Personal Access Token

后台管理需要 GitHub Token 来更新数据：

1. 打开 https://github.com/settings/tokens
2. 点击 **Generate new token (classic)**
3. 填写 Note（例如 `news-site-admin`）
4. 勾选 **repo** 权限（完整的 repo 权限）
5. 点击 **Generate token**
6. **复制保存 Token**（只显示一次！）

### 5. 使用后台管理

1. 访问 `https://你的用户名.github.io/news-site/admin.html`
2. 填写配置信息：
   - **GitHub 用户名**：你的 GitHub 用户名
   - **仓库名**：`news-site`
   - **Personal Access Token**：上面生成的 Token
3. 点击 **保存配置**
4. 点击 **测试连接** 确认配置正确
5. 开始添加和管理新闻！

## 技术栈

- 纯前端：HTML + CSS + JavaScript
- 托管：GitHub Pages（免费）
- 数据存储：GitHub 仓库中 news.json
- API 调用：GitHub Contents API

## 注意事项

- Token 保存在浏览器 localStorage 中，不会上传到 GitHub
- 仓库需要设为 Public 才能使用 GitHub Pages（Private 需要 GitHub Pro）
- 每次保存会生成一个 commit，请勿在后台频繁操作
