# PlanMaster v1.6.1 - 计划管理与心愿兑换系统

## 项目概述

PlanMaster 是一个基于 Flask + SQLite 的本地桌面应用（支持 macOS 和 Windows），用于管理日/周/月/年计划，通过接入 OpenAI 兼容 API 的大模型自动对计划进行优先级排序和虚拟价值评估。用户完成计划可获得虚拟价值，虚拟价值可用于兑换心愿物品。已完成计划进入回收站，可恢复或永久删除。打包后通过 pywebview 提供原生窗口，支持应用内一键检查更新、专注模式、打卡、统计数据等功能。

## 技术栈

- **后端**: Python 3.13 + Flask 3.x
- **数据库**: SQLite3 (WAL 模式)
- **前端**: 原生 HTML + CSS + JavaScript (单页应用，无框架依赖)
- **AI**: 通过 OpenAI 兼容 `/v1/chat/completions` 和 `/v1/models` 接口调用任意 LLM
- **打包**: PyInstaller + hdiutil (macOS DMG) / Inno Setup (Windows EXE)
- **CI/CD**: GitHub Actions 自动构建双平台安装包并发布 Release
- **设计风格**: Glassmorphism (毛玻璃)，紫蓝色调渐变背景浮动光球，支持深色主题自适应

## 项目结构

```
PlanMaster/
├── app.py              # Flask 主入口，所有 API 路由定义
├── database.py         # SQLite 数据库操作层 (CRUD + 迁移)
├── ai_service.py       # LLM API 调用封装 (排序/评估/模型列表/测试)
├── prompts.py          # Prompt 模板 (计划排序/单条评估/心愿评估)
├── updater.py          # macOS 在线更新模块 (DMG 热替换)
├── requirements.txt    # Python 依赖: flask, requests, pywebview
├── start.sh            # 启动脚本 (激活 venv + 运行 app.py)
├── build.sh            # DMG 打包脚本 (PyInstaller + hdiutil)
├── build_setup.iss     # Windows Inno Setup 安装包配置
├── PlanMaster.spec     # PyInstaller 打包配置
├── icon.icns           # macOS 应用图标
├── icon.ico            # Windows 应用图标
├── icon.jpg            # 应用图标 (JPEG)
├── todo.db             # SQLite 数据库文件 (运行时自动创建)
├── venv/               # Python 虚拟环境
├── .github/workflows/
│   └── build.yml       # CI 自动构建 (Windows + macOS + Release)
├── templates/
│   └── index.html      # 单页应用 HTML (所有页面/弹窗/结构)
└── static/
    ├── style.css       # 全部 CSS 样式 (毛玻璃/动画/明暗主题)
    ├── app.js          # 前端 JavaScript 逻辑 (导航/API调用/渲染)
    └── icon.jpg        # 浏览器 favicon
```

## 启动方式

```bash
cd PlanMaster
./start.sh
# 或手动:
source venv/bin/activate
python app.py
```

服务启动在 `http://localhost:8080`，浏览器自动打开。

## 数据库设计

### plans 表 - 计划

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| plan_type | TEXT | 计划类型: `today` / `weekly` / `monthly` / `yearly` |
| title | TEXT | 计划标题 |
| description | TEXT | 计划描述 |
| priority | INTEGER | 综合优先级评分 1-100 (越高越优先，0=未评估) |
| virtual_value | REAL | 虚拟价值 (小数点后1位) |
| progress | INTEGER | 完成进度 0-100 |
| suggested_time | TEXT | AI 建议完成时间 (如 "14:00", "周三", "15日前", "6月前") |
| completed | INTEGER | 是否完成 0/1 |
| created_at | TIMESTAMP | 创建时间 |
| completed_at | TIMESTAMP | 完成时间 |

### ai_settings 表 - AI 配置

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 固定为 1 (单行配置) |
| base_url | TEXT | API 基础地址，如 `https://api.openai.com/v1` |
| api_key | TEXT | API 密钥 |
| model_name | TEXT | 模型名称，如 `gpt-4` |
| extra_headers | TEXT | JSON 格式的额外 HTTP 请求头 |

### wishes 表 - 心愿清单

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| name | TEXT | 心愿名称 |
| real_price | REAL | 真实价格 (元) |
| virtual_cost | REAL | 兑换所需虚拟价值 (小数点后1位) |
| quantity | INTEGER | 兑换数量 (NULL=无限，正整数=有限次数) |
| redeemed | INTEGER | 是否已兑换 0/1 (旧数据兼容，新版不再使用) |
| created_at | TIMESTAMP | 创建时间 |
| redeemed_at | TIMESTAMP | 兑换时间 (旧数据兼容，新版不再使用) |

### transactions 表 - 虚拟价值流水

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| amount | REAL | 金额 (正=收入，负=支出) |
| source | TEXT | 来源: `plan_complete` / `wish_redeem` / `balance_reset` |
| reference_id | INTEGER | 关联的计划或心愿 ID |
| note | TEXT | 流水说明 |
| created_at | TIMESTAMP | 创建时间 |

### settings 表 - 系统设置

| key | 默认值 | 说明 |
|-----|--------|------|
| today_min / today_max | 1 / 10 | 今日待办虚拟价值范围 |
| weekly_min / weekly_max | 1 / 10 | 周计划虚拟价值范围 |
| monthly_min / monthly_max | 10 / 20 | 月计划虚拟价值范围 |
| yearly_min / yearly_max | 20 / 100 | 年计划虚拟价值范围 |

### signatures 表 - 个性签名

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| content | TEXT | 签名内容 |
| created_at | TIMESTAMP | 创建时间 |

### focus_sessions 表 - 专注会话

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| plan_id | INTEGER | 关联计划ID (可为空) |
| category | TEXT | 分类 (从标题前缀自动提取) |
| start_time | TIMESTAMP | 开始时间 |
| end_time | TIMESTAMP | 结束时间 |
| duration | INTEGER | 专注时长 (秒) |
| created_at | TIMESTAMP | 创建时间 |

**数据库迁移**: `init_db()` 使用 `ALTER TABLE` 检测并添加缺失列 (如 `progress`)，兼容旧数据库。

## API 设计

### 计划 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/plans?type={type}` | 获取未完成计划列表 (可选 type 过滤) |
| GET | `/api/plans/all?type={type}` | 获取所有计划列表 (含已完成，用于进度计算) |
| POST | `/api/plans` | 创建计划 (自动 AI 评估) |
| PUT | `/api/plans/{id}` | 更新计划 (标题/描述/优先级/价值/进度) |
| DELETE | `/api/plans/{id}` | 删除计划 |
| POST | `/api/plans/{id}/complete` | 标记完成 (进度设为100，累加虚拟价值) |
| POST | `/api/plans/{id}/restore` | 恢复已完成计划 (撤销完成，删除对应流水) |
| GET | `/api/plans/completed` | 获取所有已完成计划 (回收站) |
| POST | `/api/plans/batch-delete` | 批量删除计划 (body: `{"ids": [1,2,3]}`) |
| POST | `/api/plans/sort` | AI 批量排序 (当前分类下所有未完成计划) |

**创建计划逻辑 (POST /api/plans)**:
1. 立即创建计划并返回 (不阻塞用户操作)
2. 如果用户未提供 `priority` 和 `virtual_value` 且 AI 已配置 → 在后台线程中调用 `ai_service.evaluate_single_plan()` 自动评估
3. 后台评估完成后自动更新数据库，前端延迟 3 秒刷新列表以获取 AI 评估结果
4. 如果未配置 AI 或评估失败 → 保持默认值 0

**批量排序逻辑 (POST /api/plans/sort)**:
1. 获取当前分类下所有未完成计划
2. 发送给 LLM 进行一次性评估
3. LLM 返回每条计划的 priority (1-100) 和 virtual_value
4. 逐条更新数据库

### AI 设置 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/ai-settings` | 获取设置 (API Key 脱敏) |
| PUT | `/api/ai-settings` | 保存设置 |
| POST | `/api/ai-settings/test` | 测试 API 连接 |
| POST | `/api/ai-settings/models` | 获取可用模型列表 |

**获取模型列表**: 调用 `{base_url}/models` (OpenAI 兼容)，返回排序后的模型 ID 列表。

### 心愿 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/wishes` | 获取心愿列表 |
| POST | `/api/wishes` | 创建心愿 (支持 quantity 参数，null=无限，正整数=有限次数) |
| PUT | `/api/wishes/{id}` | 编辑心愿 (名称/价格/虚拟价值/数量) |
| POST | `/api/wishes/{id}/redeem` | 兑换心愿 (校验余额，有限数量自动递减/删除) |
| DELETE | `/api/wishes/{id}` | 删除心愿 |

**兑换逻辑**:
- 无限心愿 (`quantity=null`): 可反复兑换，不删除
- 有限心愿 (`quantity=N`): 每次兑换后数量减 1，减到 0 自动删除
- 余额 ≥ 虚拟价值时允许兑换，生成负数流水

### 余额与流水 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/balance` | 获取当前余额 (SUM of transactions) |
| POST | `/api/balance/reset` | 清零余额 (生成等额负数流水) |
| GET | `/api/transactions` | 获取流水记录 (按时间倒序) |

### 设置 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/settings` | 获取所有设置 |
| PUT | `/api/settings` | 批量更新设置 |

### 签名 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/signatures` | 获取所有签名 |
| PUT | `/api/signatures` | 保存签名 (body: `{"contents": ["签名1", "签名2"]}`) |

### 专注会话 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/sessions` | 创建专注会话 (body: `{"plan_id": int, "start_time": ISO}`) |
| PUT | `/api/sessions/{id}` | 结束专注会话 (body: `{"end_time": ISO}`) |
| GET | `/api/sessions` | 获取会话列表 (可选参数: plan_id, date, category) |
| DELETE | `/api/sessions/{id}` | 删除会话 |

### 统计 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats/cumulative` | 获取累计统计 (次数/总时长/日均时长) |
| GET | `/api/stats/daily?date=YYYY-MM-DD` | 获取某日统计 |
| GET | `/api/stats/distribution?period=day\|week\|month&date=YYYY-MM-DD` | 获取分类时长分布 |
| GET | `/api/stats/monthly?month=YYYY-MM` | 获取月度每日统计 |
| DELETE | `/api/stats/clear` | 清除所有专注记录 |

### API 余量 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/deepseek/balance` | 获取 DeepSeek 账户余额 (需配置 API Key) |

### 更新 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/update` | 检查并从 GitHub 下载更新 |

## AI 服务 (`ai_service.py`)

### 函数列表

| 函数 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `_call_llm(base_url, api_key, model, messages, extra_headers)` | API 配置 + 消息列表 | dict (JSON 解析后的响应) | 调用 OpenAI 兼容 chat completions API，强制 `json_object` 响应格式 |
| `fetch_models(base_url, api_key, extra_headers)` | API 配置 | list[str] (模型 ID 列表) | 调用 `/v1/models` 获取可用模型 |
| `test_connection(base_url, api_key, model, extra_headers)` | API 配置 | (bool, str) (成功/失败, 消息) | 发送简单请求测试连通性 |
| `evaluate_single_plan(base_url, api_key, model, plan_type, title, description, min_value, max_value, extra_headers)` | API 配置 + 计划信息 + 价值范围 | (int, float, str, str) (priority, virtual_value, suggested_time, reason) | 评估单条计划的优先级、价值和建议时间 |
| `sort_plans(base_url, api_key, model, plans, plan_type, min_value, max_value, extra_headers)` | API 配置 + 计划列表 + 价值范围 | list[dict] (id, priority, virtual_value, suggested_time, reason) | 批量排序和评估多条计划 |
| `evaluate_wish(base_url, api_key, model, name, price, extra_headers)` | API 配置 + 心愿信息 | (float, str) (virtual_cost, reason) | 评估心愿的虚拟兑换价值 |

### Prompt 设计

**计划排序 Prompt (`PLAN_SORT_PROMPT`)**:
- 输入: 计划类型名称 + 计划列表 JSON + 价值范围
- **两个独立维度**: 优先级 (决定执行顺序) 和虚拟价值 (完成奖励)，二者不挂钩
- 优先级评分依据: 紧急程度(40%) + 重要程度(30%) + 执行难度(20%) + 依赖关系(10%)
- 虚拟价值评估依据: 执行难度、时间精力投入、个人成长收益 (与优先级无关)
- 建议完成时间: 根据计划类型返回 (今日:HH:MM, 周:周X, 月:X日前, 年:X月前)
- 输出格式: `{"sorted_plans": [{"id": int, "priority": 1-100, "virtual_value": float, "suggested_time": str, "reason": str}]}`

**单条计划评估 Prompt (`PLAN_SINGLE_EVAL_PROMPT`)**:
- 与批量排序相同的评分标准，但只评估一条计划
- 输出格式: `{"priority": 1-100, "virtual_value": float, "suggested_time": str, "reason": str}`

**心愿评估 Prompt (`WISH_EVAL_PROMPT`)**:
- 基础兑换率: 1元 ≈ 1虚拟价值
- 奢侈品(>500元): 上浮 1.2-1.5 倍
- 必需品: 下调 0.8-1.0 倍
- 输出格式: `{"virtual_cost": float, "reason": str}`

所有 Prompt 均要求 LLM **严格且只返回 JSON**，使用 `response_format: {type: json_object}` 强制 JSON 输出。

## 数据库操作 (`database.py`)

### 函数列表

| 函数 | 说明 |
|------|------|
| `get_db()` | 获取 SQLite 连接 (Row 工厂 + WAL 模式) |
| `init_db()` | 建表 + 默认设置 + 列迁移 |
| `get_plans(plan_type, include_completed)` | 获取计划列表 (默认排除已完成，按 priority DESC 排序) |
| `get_completed_plans()` | 获取所有已完成计划 (回收站，按完成时间倒序) |
| `get_plan(plan_id)` | 获取单条计划 |
| `create_plan(plan_type, title, description, priority, virtual_value, progress, suggested_time)` | 创建计划 |
| `update_plan(plan_id, title, description, priority, virtual_value, progress, suggested_time)` | 更新计划 (仅更新非 None 字段) |
| `delete_plan(plan_id)` | 删除单条计划 |
| `batch_delete_plans(plan_ids)` | 批量删除计划 (返回删除数量) |
| `complete_plan(plan_id)` | 标记完成 + 生成收入流水 |
| `restore_plan(plan_id)` | 恢复已完成计划 (completed=0，删除对应收入流水) |
| `update_plan_ai(plan_id, priority, virtual_value)` | AI 排序后批量更新 |
| `get_ai_settings()` / `update_ai_settings()` | AI 配置读写 |
| `get_wishes(include_redeemed)` | 获取心愿列表 |
| `create_wish(name, real_price, virtual_cost, quantity)` | 创建心愿 (quantity: None=无限, 正整数=有限) |
| `update_wish(wish_id, name, real_price, virtual_cost, quantity)` | 编辑心愿 (仅更新非 None 字段) |
| `delete_wish(wish_id)` | 删除心愿 |
| `redeem_wish(wish_id)` | 兑换心愿 (事务: 校验余额 + 生成流水 + 递减数量/自动删除) |
| `get_balance_val(conn)` | 计算余额 (SUM transactions) |
| `get_balance()` | 获取余额 |
| `reset_balance()` | 清零余额 (生成负数流水) |
| `get_transactions()` | 获取流水记录 |
| `get_settings()` / `update_settings()` | 系统设置读写 |
| `get_signatures()` | 获取所有签名 |
| `save_signatures(contents)` | 清空并重新保存签名列表 |
| `delete_all_focus_sessions()` | 清除所有专注记录 |

## 前端设计

### 页面结构

前端是单页应用 (SPA)，所有页面在 `index.html` 中预定义，通过 CSS `display` 切换可见性。

**页面列表**:
1. **今日待办** (`today`) - 计划页面，plan_type=today
2. **打卡** (`checkin`) - 打卡管理
3. **周计划** (`weekly`) - 计划页面，plan_type=weekly
4. **月计划** (`monthly`) - 计划页面，plan_type=monthly
5. **年计划** (`yearly`) - 计划页面，plan_type=yearly
6. **锁机模式** (`focus`) - 专注锁定 (占位)
7. **统计数据** (`stats`) - 专注统计 (累计/每日/饼图/柱状图)
8. **API 余量** (`apibalance`) - DeepSeek 账户余额查看
9. **心愿兑换单** (`wishes`) - 心愿管理
10. **价值流水** (`transactions`) - 流水记录
11. **回收站** (`recycle`) - 已完成计划 (可恢复/永久删除)
12. **AI设置** (`settings`) - AI 配置 + 价值范围 + 数据管理

**计划页面共享同一个 DOM 容器** (`#page-plans`)，通过 `currentPage` 状态变量区分。

### CSS 设计系统

**Glassmorphism (毛玻璃) 设计语言**:
- 所有卡片使用 `background: rgba(255,255,255,0.45)` + `backdrop-filter: blur(20px)`
- 边框使用半透明白色 `border: 1px solid rgba(255,255,255,0.55)`
- 背景使用三个浮动光球 (`.orb`)，通过 CSS `filter: blur(80px)` + `@keyframes float` 实现动态模糊背景
- 主色调: 紫色系 (`#7c6ef0` → `#a78bfa` → `#c4b5fd`)
- 背景色: `#f0eef8` (浅紫灰)

**CSS 变量** (定义在 `:root`):
- `--primary`, `--primary-light`, `--primary-glow`: 主色及其变体
- `--glass-bg`, `--glass-border`, `--glass-shadow`, `--glass-blur`: 毛玻璃参数
- `--sidebar-glass`, `--sidebar-border`: 侧边栏毛玻璃
- `--bg`, `--text`, `--text-soft`, `--text-muted`: 文字和背景色
- `--radius`, `--radius-sm`, `--radius-lg`: 圆角半径
- `--transition`: 统一过渡动画

**深色主题**: `body.theme-dark` 覆盖上述变量为暗色值，JS 通过 `isColorDark(hex)` 计算背景亮度自动切换。自定义图片背景默认使用深色主题 + 文字阴影。

**动画**:
- `float`: 背景光球浮动 (20s 循环)
- `slideInLeft`: 侧边栏入场
- `fadeIn` / `pageIn`: 内容区入场
- `cardIn`: 卡片列表交错入场 (nth-child delay)
- `modalIn`: 弹窗弹入 (带 spring 缓动)
- `overlayIn`: 遮罩淡入
- `spin`: 加载动画旋转

### 优先级圆形设计

每条计划左侧显示优先级圆形徽章，由三层组成:

1. **SVG 进度环** (`.priority-ring svg`): 显示计划完成进度
   - `.ring-bg`: 灰色背景圆环
   - `.ring-fill`: 彩色进度圆环，`stroke-dasharray` / `stroke-dashoffset` 控制进度
   - SVG 旋转 -90deg 使起点在顶部

2. **优先级圆形** (`.priority-circle`): 显示优先级分数
   - **渐变设计**: 使用 `radial-gradient(circle, 浅色 0%, 深色 100%)` 实现从边缘到中心的颜色渐变
   - 边缘为高饱和度优先级颜色，中心过渡为浅色
   - 毛玻璃效果: `backdrop-filter: blur(8px)` + 半透明白色边框
   - 内阴影: `box-shadow: inset 0 2px 8px rgba(255,255,255,0.3)` 增强玻璃质感
   - 未设置优先级时: 灰色半透明背景，显示 "-"

3. **颜色计算**: `priColor(p)` 函数，priority 1-100 映射到 HSL 色相 120(绿) → 0(红)

### 计划类型标签

每条计划卡片右上角显示类型标签 (`.plan-type-tag`)，颜色编码:
- **今日待办** (`today`): 紫色 `#7c6ef0`
- **周计划** (`weekly`): 蓝色 `#3b82f6`
- **月计划** (`monthly`): 绿色 `#10b981`
- **年计划** (`yearly`): 橙色 `#f59e0b`

标签使用白色文字 + 对应颜色背景，圆角药丸形状。

### 回收站

已完成的计划从主列表移入回收站页面，回收站显示所有 `completed=1` 的计划 (跨所有类型)。
- **单条恢复**: 调用 `POST /api/plans/{id}/restore`，将 `completed` 设为 0 并删除对应收入流水
- **单条永久删除**: 调用 `DELETE /api/plans/{id}`，直接删除记录
- **批量操作**: 每条计划左侧有复选框，支持全选、批量恢复、批量删除
- **批量删除**: 调用 `POST /api/plans/batch-delete`，body 包含 `{"ids": [1,2,3]}`
- 回收站中的计划显示完成时间、类型标签，无进度条和完成按钮
- 加载遮罩可点击空白处关闭，避免用户操作被阻塞

### 任务进度条

每条计划下方有可拖动的进度条:
- 外层 `.plan-progress-track`: 半透明背景轨道，hover 时显示拖动手柄
- 内层 `.plan-progress-bar`: 渐变填充条，宽度由 progress 值决定
- 拖动手柄: 毛玻璃效果 (`rgba(255,255,255,.6)` + `backdrop-filter: blur(12px)`)，紫色半透明边框，内阴影增强玻璃质感
- `<input type="range">`: 透明覆盖在轨道上，用户可拖动
- 右侧显示百分比文本
- 拖动时实时预览 (oninput)，松手后保存 (onchange)
- 弹窗中的进度条滑块同样使用毛玻璃手柄设计

### 分类总进度条

每个计划分类页面顶部显示该分类的整体完成进度:
- 计算公式: 已完成计划数 / 总计划数 × 100%
- 使用与单条进度条一致的视觉风格
- 渐变填充 + 数字百分比显示

### JavaScript 函数依赖

```
switchTab(tab) → renderSubNav() + switchPage()
switchPage(page)
  ├── loadPlans()        → api GET /api/plans → renderPlans() + updateCategoryProgress() + showNextSignature()
  ├── loadWishes()       → api GET /api/wishes + /api/balance → renderWishes()
  ├── loadTransactions() → api GET /api/transactions → renderTransactions()
  ├── loadRecycleBin()   → api GET /api/plans/completed → renderRecycleBin()
  ├── loadSettings()     → api GET /api/ai-settings + /api/settings + /api/signatures
  └── loadStatsPage()    → loadCumulativeStats() + loadDailyStats() + loadDistributionStats() + loadMonthlyStats()

startFocus(planId) → api POST /api/sessions → updateFocusDisplay()
stopFocus()        → api PUT /api/sessions/{id} → loadPlans()

savePlan()
  ├── (新建) api POST /api/plans → loadPlans() + setTimeout(loadPlans, 3000) (静默AI评估后刷新)
  └── (编辑) api PUT /api/plans/{id} → loadPlans()

completePlan(id) → api POST /api/plans/{id}/complete → loadPlans() + loadBalance()
restorePlan(id)  → api POST /api/plans/{id}/restore → loadRecycleBin() + loadBalance()
permanentDelete(id) → api DELETE /api/plans/{id} → loadRecycleBin()
toggleSelectAll() → 切换回收站全选状态
batchDeleteRecycle() → api POST /api/plans/batch-delete → loadRecycleBin()
batchRestoreRecycle() → 逐条 api POST /api/plans/{id}/restore → loadRecycleBin() + loadBalance()

aiSortPlans() → api POST /api/plans/sort → loadPlans()

updateProgress(id, val) → api PUT /api/plans/{id} (progress field)

saveWish()      → api POST /api/wishes (新建) 或 PUT /api/wishes/{id} (编辑)
editWishFromBtn(btn) → showEditWishModal()
redeemWish(id)  → api POST /api/wishes/{id}/redeem → loadWishes() + loadBalance()
resetBalance()  → api POST /api/balance/reset → loadBalance()

fetchModels()       → api POST /api/ai-settings/models
saveAiSettings()    → api PUT /api/ai-settings
testAiConnection()  → saveAiSettings() → api POST /api/ai-settings/test
saveValueRanges()   → api PUT /api/settings
checkUpdate()       → api POST /api/update → location.reload()
loadSignatures()    → api GET /api/signatures → showNextSignature()
saveSignatures()    → api PUT /api/signatures
showNextSignature() → 轮换显示下一条签名
```

## 美学设计要点

1. **毛玻璃一致性**: 所有卡片、侧边栏、弹窗、Toast、进度条均使用 `backdrop-filter: blur()` + 半透明背景
2. **渐变色系**: 主按钮使用 `linear-gradient(135deg, #7c6ef0, #a78bfa)`，成功按钮使用绿色渐变，危险按钮使用红色渐变
3. **浮动背景**: 三个不同颜色的大光球 (紫/蓝/绿) 在背景缓慢浮动，通过 `filter: blur(80px)` 柔化
4. **入场动画**: 所有元素有从下方滑入 + 淡入的入场动画，卡片列表使用交错延迟
5. **交互反馈**: hover 时卡片上浮 + 阴影增强，按钮有渐变叠加层
6. **优先级圆形**: 从边缘到中心的径向渐变 (颜色→浅色)，配合毛玻璃边框和内阴影
7. **进度环**: SVG 圆环叠加在优先级圆形外圈，颜色与优先级一致
8. **进度条拖动手柄**: 毛玻璃效果 (`rgba(255,255,255,.6)` + `backdrop-filter: blur(12px)`)，半透明紫色边框，内阴影增强玻璃质感，hover 时放大
9. **加载遮罩**: 可点击空白处关闭，遮罩使用毛玻璃背景 (`backdrop-filter: blur(8px)`)

## 构建打包

**macOS DMG**:
```bash
./build.sh
```
需要 `brew install create-dmg` (可选，否则使用 `hdiutil`)。

**Windows EXE + 安装包**:
GitHub Actions 自动构建。本地构建:
```bash
pip install pyinstaller flask requests pywebview
pyinstaller --name PlanMaster --onedir --windowed --icon icon.ico --add-data "templates;templates" --add-data "static;static" --hidden-import flask --hidden-import sqlite3 --hidden-import webview --hidden-import webview.platforms --hidden-import webview.platforms.winforms --exclude-module simplejson --noconfirm --clean app.py
# 然后用 Inno Setup 编译 build_setup.iss
```

运行模式区别:
- **开发模式** (`python app.py`): 自动打开浏览器
- **打包版**: pywebview 原生窗口 (macOS: `.app`, Windows: `.exe`)

## 应用内更新

设置页面底部显示当前版本号和"检查更新"按钮。版本号通过 `/api/version` 接口动态获取，前端不硬编码。

**更新流程**:
1. 开发者修改代码后推送到 GitHub，CI 自动构建并发布 Release
2. 用户在应用设置页点击"检查更新"
3. 前端调用 `POST /api/update`，后端从 GitHub Releases 获取最新版本号对比
4. 版本不同 → 下载对应平台安装包 (macOS: `.dmg`, Windows: `.exe`)
5. **macOS**: 下载 DMG 后启动 Shell 脚本执行热替换 (挂载 DMG → 复制 app → 移除隔离属性 → 重启)
6. **Windows**: 下载 Inno Setup 安装包 → checkpoint WAL 保护数据库 → 静默安装 → 自动重启

**数据安全**:
- **macOS**: 数据库位于 `~/Library/Application Support/PlanMaster/`，与应用 bundle 分离
- **Windows**: 数据库位于 `%APPDATA%\PlanMaster\`，与 Program Files 安装目录分离
- 更新前自动执行 SQLite WAL checkpoint，防止数据损坏

**远程仓库**: https://github.com/MCGAgain/PlanMaster (分支: main)

## 版本历史

- v1.6.1: 修复旧版已兑换心愿无法删除的问题，数据库迁移时自动清理旧 redeemed 心愿，已兑换心愿也显示删除按钮
- v1.6.0: 心愿兑换支持数量管理 (有限/无限) 和编辑功能；有限数量心愿兑换后自动递减，用完自动删除；新增 PUT 编辑心愿 API
- v1.5.4: 改善更新检查错误提示，区分网络超时/连接失败/API错误并显示具体原因
- v1.5.3: 修复 API 余额显示为 0 的问题 (DeepSeek balance_infos 结构解析)
- v1.5.2: 统计页面添加清除专注时长按钮；优化时长显示，超过24小时显示为"X天Y小时Z分钟"
- v1.5.1: 新增 API 余量页面，支持查看 DeepSeek 账户余额，含进度条和信息卡片
- v1.4.17: 修复更新后专注时长异常增加（第二轮修复）
- v1.4.16: 修复更新版本后专注时长异常增加的 bug
- v1.4.15: 修复更新版本后专注时长异常增加的 bug
- v1.4.14: 修复专注按钮计时超过1小时后显示重置的bug
- v1.4.13: 修复 Windows 更新前数据库 WAL 未 checkpoint 导致数据丢失风险
- v1.4.12: 计划卡片标签独立成行，避免竖屏下标题被挤压
- v1.4.11: 专注按钮改为 toggle 逻辑 (点击开始/再点停止并记录)
- v1.4.10: 排除 simplejson 解决 Windows 打包 ImportError；深色背景自适应文字颜色 (theme-dark)
- v1.4.9: Windows 平台路径兼容 (%APPDATA%)；修复专注按钮重启后恢复状态
- v1.4.8: 修复背景设置重启后丢失
- v1.4.7: 修复断签重复扣除和背景设置丢失
- v1.4.6: macOS 热替换脚本 awk 转义修复
- v1.4.5: asset 匹配去掉 'macos' 文件名要求
- v1.4.4: 更新测试版本
- v1.4.3: 独立 macOS 在线更新模块 (updater.py)、DMG 格式更新包、ghproxy 代理加速
- v1.4.0: 新增背景切换功能 (动态渐变/纯色/自定义图片)
- v1.3.10: 修复更新功能 (ditto解压、kill -0等待、重定向fd)
- v1.3.9: 重构计时器交互 (开始→清零→重新开始)
- v1.3.8: 修复统计数据页面间距
- v1.3.7: 重构自动更新 (流式下载+进度条+静默安装)、CI 自动发布 Release
- v1.3.6: 重构启动逻辑 (轮询握手)、Windows Inno Setup 安装包
- v1.3.5: 修复计时器跨页面、专注倒计时崩溃
- v1.3.4: 修复检查更新白屏、统计数据任务名称
- v1.3.3: 新增专注模式页面 (圆形计时器+不限时/倒计时)
- v1.3.2: 新增统计数据页面 (饼图/柱状图)、专注会话记录
- v1.2.2: 新增打卡功能 (独立价值体系)
- v1.2.1: 新增任务倒计时功能
- v1.2.0: 修复进度条交互、日期标签、更新重启
- v1.1.3: AI 优先级与虚拟价值解耦、个性签名
- v1.1.0: 应用内更新、原生窗口、秒启动
- v1.0.1: 回收站批量操作、计划类型标签
- v1.0.0: 初始版本 — 计划管理、AI 排序、心愿兑换

## 环境要求

- Python 3.10+
- macOS / Windows
- 网络连接 (AI 功能需要)
