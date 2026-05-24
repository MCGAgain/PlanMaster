# PlanMaster v2.4.0 - 计划管理与心愿兑换系统

## 项目概述

PlanMaster 是一个基于 Flask + SQLite + Electron 的本地桌面应用（支持 macOS 和 Windows），用于管理日/周/月/年计划，通过接入 OpenAI 兼容 API 的大模型自动对计划进行优先级排序和虚拟价值评估。用户完成计划可获得虚拟价值，虚拟价值可用于兑换心愿物品。已完成计划进入回收站，可恢复或永久删除。支持应用内一键检查更新、专注模式、打卡、统计数据、自定义背景等功能。

## 技术栈

- **后端**: Python 3.13 + Flask 3.x
- **数据库**: SQLite3 (WAL 模式)
- **前端**: Vue 3 + Vite + Pinia + Vue Router (组件化单页应用)
- **桌面端**: Electron (原生窗口 + 自动更新)
- **AI**: 通过 OpenAI 兼容 `/v1/chat/completions` 和 `/v1/models` 接口调用任意 LLM
- **打包**: PyInstaller + Electron (macOS/Windows)
- **CI/CD**: GitHub Actions 自动构建双平台安装包并发布 Release
- **设计风格**: Liquid Glass (液态玻璃)，紫蓝色调渐变背景浮动光球，支持深色主题和自定义背景

## 项目结构

```
PlanMaster/
├── app.py              # Flask 主入口，所有 API 路由定义
├── database.py         # SQLite 数据库操作层 (CRUD + 迁移)
├── ai_service.py       # LLM API 调用封装 (排序/评估/模型列表/测试)
├── prompts.py          # Prompt 模板 (计划排序/单条评估/心愿评估)
├── updater.py          # 在线更新模块
├── requirements.txt    # Python 依赖: flask, requests
├── package.json        # Electron 主入口配置
├── electron/
│   └── main.js         # Electron 主进程
├── .github/workflows/
│   └── build.yml       # CI 自动构建 (Windows + macOS + Release)
├── frontend/           # Vue 3 前端项目
│   ├── src/
│   │   ├── components/ # Vue 组件 (layout/common/business)
│   │   ├── views/      # 页面视图 (13个)
│   │   ├── stores/     # Pinia 状态管理
│   │   ├── api/        # API 调用层
│   │   └── styles/     # CSS 样式 (全局/动画/液态玻璃)
│   ├── package.json
│   └── vite.config.js
└── static/
    └── dist/           # Vue 构建输出 (Electron 加载)
```

## 启动方式

**Electron 桌面模式** (生产):
```bash
cd PlanMaster
npm start
# 或:
npm run dev  # 开发模式 (开发工具 + 热更新)
```

**仅后端** (Flask API):
```bash
cd PlanMaster
source venv/bin/activate
python app.py
```

服务启动在 `http://localhost:8080`。

**前端开发模式** (热更新):
```bash
cd PlanMaster/frontend
npm install
npm run dev
```

开发服务器启动在 `http://localhost:5173`，API请求代理到 `http://localhost:8080`。

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

### 架构概览 (v2.4.0)

前端采用 Vue 3 组件化架构:

```
frontend/src/
├── components/
│   ├── layout/      # Header
│   ├── common/      # GlassCard, GlassButton, GlassModal, GlassInput
│   └── business/    # PlanCard, CheckinItem
├── views/           # 13个页面视图
├── stores/          # Pinia 状态管理
├── api/             # 统一 API 调用层
└── styles/          # CSS 变量、液态玻璃样式、动画
```

### 页面列表

1. **今日待办** (`/`) - 计划页面，plan_type=today
2. **打卡** (`/checkin`) - 打卡管理
3. **重要事项** (`/important`) - 重要事项管理
4. **周计划** (`/weekly`) - 计划页面，plan_type=weekly
5. **月计划** (`/monthly`) - 计划页面，plan_type=monthly
6. **年计划** (`/yearly`) - 计划页面，plan_type=yearly
7. **专注模式** (`/focus`) - 专注计时器 (正计时/倒计时)
8. **统计数据** (`/stats`) - 专注统计 (累计/每日/饼图/柱状图)
9. **心愿兑换单** (`/wishes`) - 心愿管理
10. **价值流水** (`/transactions`) - 流水记录
11. **回收站** (`/recycle`) - 已完成计划 (可恢复/永久删除)
12. **API 余量** (`/apibalance`) - DeepSeek 账户余额查看
13. **AI设置** (`/settings`) - AI 配置 + 价值范围 + 数据管理

### CSS 设计系统

**Liquid Glass (液态玻璃) 设计语言**:
- 所有卡片使用透明玻璃质感背景 + 精细边框
- 紫蓝色调渐变背景 + 浮动光球动画
- 支持深色主题自适应、自定义纯色背景、自定义图片背景
- 动画使用 GSAP 驱动，统一分层架构 (外层阴影 + 内层玻璃)

运行模式区别:
- **开发模式** (`python app.py`): 自动打开浏览器
- **Electron 模式** (`npm start`): 原生桌面窗口

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

- v2.4.0: **全面重构动画效果** - 统一升级全局动画缓动曲线与过渡效果；背景设置新增自定义颜色调色盘
- v2.3.7: 修复动画缓动曲线，移除 API 刷新提示
- v2.3.6: 修复重要事项清理、动画弹出效果、窗口拖拽
- v2.3.5: 代码审查修复，更新逻辑纠正
- v2.3.4: 重建前端 dist，修复 Electron 加载前端资源问题
- v2.3.1: macOS arm64 单架构构建
- v2.3.0: 改进卡片悬停动画
- v2.2.3: 修复计划管理页面计时器按钮、页面切换模糊闪烁
- v2.2.2: 更新 LiquidGlass 组件
- v2.2.1: 新增 LiquidGlass 组件 (CSS 驱动 backdrop-filter)
- v2.2.0: 新增 Liquid Glass 主题和设置选择器
- v2.1.3: 修复更新后自动重启和液态玻璃效果
- v2.1.2: 修复卡片模糊、刷新图标、小数位数、统计图表刷新
- v2.1.1: Electron 模式后端启动修复
- v2.1.0: **Electron 桌面化** - 从 pywebview 迁移到 Electron，支持原生窗口、自动更新
- v2.0.0: **前端重构** - 从原生 HTML/CSS/JS 迁移到 Vue 3 + Vite + Pinia + Vue Router；组件化架构提升可维护性；优化动画流畅度；统一API调用层；Pinia状态管理
- v1.6.2: 修复任务倒计时停止后按钮图标未立即刷新的问题；修复删除/完成任务时专注计时器未正确终止的问题
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

- Node.js 18+
- Python 3.10+
- macOS / Windows
- 网络连接 (AI 功能需要)
