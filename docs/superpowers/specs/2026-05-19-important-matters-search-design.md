# 重要事项 + 搜索框功能设计文档

**日期:** 2026-05-19
**版本目标:** 1.9.0

## 概述

两个功能：
1. **重要事项** — 左侧菜单新增"重要事项"页面，记录有截止日期的重要任务，按日期排序，过期自动删除
2. **搜索框** — 为重要事项、今日待办、周计划、月计划、年计划页面添加搜索框（支持拼音）

---

## 功能 1: 重要事项

### 数据模型

复用现有 `plans` 表，新增：
- `plan_type` 新值: `'important'`
- 新列 `due_date` (TEXT, nullable): 截止日期，格式 `YYYY-MM-DD`，其他 type 为 NULL

迁移代码在 `database.py` 的 `init_db()` 中，使用 `PRAGMA table_info` 检查列是否存在后执行 ALTER。

### 后端 API

| 方法 | 路由 | 用途 |
|------|------|------|
| GET | `/api/important` | 获取重要事项（未完成，按 due_date ASC） |
| POST | `/api/important/cleanup` | 清理过期事项（due_date < today） |
| POST | `/api/plans` | 创建（复用，plan_type='important'，含 due_date） |
| PUT | `/api/plans/<id>` | 编辑（复用） |
| POST | `/api/plans/<id>` | 删除（复用） |

`database.py` 新增函数：
- `get_important_items()`: `SELECT * FROM plans WHERE plan_type='important' AND completed=0 ORDER BY due_date ASC`
- `cleanup_important()`: `DELETE FROM plans WHERE plan_type='important' AND due_date < date('now')`

### 前端

**侧边栏** (`index.html`): 在打卡和今日待办之间插入：
```html
<li class="nav-item" data-page="important" onclick="switchPage('important')">
    <span class="nav-icon">&#9888;</span>
    <span>重要事项</span>
</li>
```

**页面** (`index.html`): 新增 `<div id="page-important" class="page">`
- 搜索框（复用通用搜索样式）
- 添加按钮
- 事项卡片列表

**switchPage** (`app.js`): 添加 `important` case，调用 `loadImportantItems()`

**添加/编辑弹窗**: 为 `important` 类型显示 `<input type="date">` 日期选择器

**卡片显示**: 标题、描述、截止日期、剩余天数标签（"还有3天" / "今日到期" / 已过期红色标签）

**自动删除**: 每次加载页面时，后端先 cleanup 再返回数据

### 排序

按 `due_date ASC`（日期越近越靠前），NULL 排最后。

---

## 功能 2: 搜索框

### 搜索范围

同时匹配标题和描述：`matchPinyin(title, kw) || matchPinyin(description, kw)`

### 涉及页面

| 页面 | 搜索状态变量 | 数据缓存变量 |
|------|-------------|-------------|
| 重要事项 | `importantSearchKeyword` | `allImportantItems` |
| 今日待办 | `todaySearchKeyword` | `allPlans`（复用） |
| 周计划 | `weeklySearchKeyword` | `allPlans`（复用） |
| 月计划 | `monthlySearchKeyword` | `allPlans`（复用） |
| 年计划 | `yearlySearchKeyword` | `allPlans`（复用） |

### 实现模式

复用回收站的搜索模式：
1. `loadPlans()` / `loadImportantItems()` 返回数据后缓存
2. `onXxxSearch(e)` 监听 input 事件，更新 keyword，调用 filterAndRender
3. `filterAndRenderXxx()` 用 `matchPinyin` 过滤后渲染
4. `clearXxxSearch()` 清空搜索框和 keyword

### CSS

将回收站搜索样式提取为通用类：
- `.search-wrap` (原 `.recycle-search-wrap`)
- `.search-input` (原 `.recycle-search-input`)
- `.search-clear` (原 `.recycle-search-clear`)

回收站和新页面共用这些类。保留 `.recycle-search-*` 作为别名以兼容。

### HTML 结构

每个页面顶部添加：
```html
<div class="search-wrap">
    <input type="text" class="search-input" placeholder="搜索... (支持拼音)" oninput="onXxxSearch(event)">
    <span class="search-clear" onclick="clearXxxSearch()" style="display:none">&times;</span>
</div>
```

---

## 文件变更清单

| 文件 | 变更 |
|------|------|
| `database.py` | 添加 due_date 列迁移、get_important_items()、cleanup_important() |
| `app.py` | 添加 /api/important、/api/important/cleanup 端点；修改 POST /api/plans 支持 due_date |
| `templates/index.html` | 添加重要事项菜单项、页面 div、各页面搜索框 |
| `static/app.js` | 添加 important 页面逻辑、搜索功能、switchPage case |
| `static/style.css` | 提取通用搜索样式、重要事项卡片样式、剩余天数标签样式 |
| `version.py` 或版本号位置 | 更新为 1.9.0 |

---

## 不做的事情

- 不添加定时器/后台任务清理过期事项（页面加载时清理即可）
- 不为重要事项添加 AI 评估、虚拟价值、进度条功能
- 不修改回收站的搜索实现（保持原样，新页面使用通用样式类）
- 不添加重要事项的批量操作（保持简单）
