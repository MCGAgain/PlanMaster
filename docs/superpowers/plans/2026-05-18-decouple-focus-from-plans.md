# 解耦专注记录与任务管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 解耦专注记录与任务管理，删除任务时保留专注记录，进度条按时间周期重置。

**Architecture:** 修改 focus_sessions 外键约束为 ON DELETE SET NULL，新增时间周期进度 API，前端调用新接口更新进度条。

**Tech Stack:** Python/Flask, SQLite, JavaScript

---

## File Structure

- `database.py` — 外键约束、迁移逻辑、删除函数、新增进度查询函数
- `app.py` — 新增 `/api/plans/progress` 接口
- `static/app.js` — 前端进度计算改为调用新接口
- `build.sh` — 版本号更新

---

### Task 1: 修改数据库外键约束与迁移

**Files:**
- Modify: `database.py:178-189` (focus_sessions 表定义)
- Modify: `database.py:190-229` (init_db 迁移区域)

- [ ] **Step 1: 修改 focus_sessions 表定义**

在 `database.py` 第186行，将 `ON DELETE CASCADE` 改为 `ON DELETE SET NULL`：

```python
# database.py 第178-189行
            CREATE TABLE IF NOT EXISTS focus_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                plan_id INTEGER,
                category TEXT NOT NULL DEFAULT '',
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP,
                duration INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_focus_sessions_start ON focus_sessions(start_time);
            CREATE INDEX IF NOT EXISTS idx_focus_sessions_category ON focus_sessions(category);
```

- [ ] **Step 2: 添加数据库迁移逻辑**

在 `database.py` 的 `init_db()` 函数中，在现有迁移代码之后（约第208行之后），添加 focus_sessions 表迁移：

```python
        # Migration: recreate focus_sessions table with ON DELETE SET NULL
        cursor = conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='focus_sessions'")
        row = cursor.fetchone()
        if row and 'ON DELETE CASCADE' in (row['sql'] or ''):
            conn.execute("""
                CREATE TABLE IF NOT EXISTS focus_sessions_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    plan_id INTEGER,
                    category TEXT NOT NULL DEFAULT '',
                    start_time TIMESTAMP NOT NULL,
                    end_time TIMESTAMP,
                    duration INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL
                )
            """)
            conn.execute("INSERT INTO focus_sessions_new SELECT * FROM focus_sessions")
            conn.execute("DROP TABLE focus_sessions")
            conn.execute("ALTER TABLE focus_sessions_new RENAME TO focus_sessions")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_focus_sessions_start ON focus_sessions(start_time)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_focus_sessions_category ON focus_sessions(category)")
```

- [ ] **Step 3: 添加 plans 表索引**

在迁移代码之后，添加 plans 表的索引：

```python
        # Migration: add indexes for time-period queries
        conn.execute("CREATE INDEX IF NOT EXISTS idx_plans_created_at ON plans(created_at)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_plans_type_created ON plans(plan_type, created_at)")
```

- [ ] **Step 4: 修改 delete_plan() 函数**

修改 `database.py` 第307-311行，移除显式的专注记录删除：

```python
def delete_plan(plan_id):
    with _conn() as conn:
        conn.execute("DELETE FROM plans WHERE id=?", (plan_id,))
        conn.commit()
```

- [ ] **Step 5: 修改 batch_delete_plans() 函数**

修改 `database.py` 第314-321行，移除显式的专注记录删除：

```python
def batch_delete_plans(plan_ids):
    with _conn() as conn:
        placeholders = ','.join('?' * len(plan_ids))
        cur = conn.execute(f"DELETE FROM plans WHERE id IN ({placeholders})", plan_ids)
        deleted = cur.rowcount
        conn.commit()
        return deleted
```

- [ ] **Step 6: 添加进度查询函数**

在 `database.py` 的 `# ---- Focus Sessions ----` 部分之前，添加新函数：

```python
def get_plan_progress(plan_type):
    """获取当前时间周期内的计划完成进度"""
    now = datetime.now()
    if plan_type == 'today':
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif plan_type == 'weekly':
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    elif plan_type == 'monthly':
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif plan_type == 'yearly':
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        return {'completed': 0, 'total': 0, 'percentage': 0}

    with _conn() as conn:
        row = conn.execute(
            "SELECT COUNT(*) as total, SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed "
            "FROM plans WHERE plan_type = ? AND created_at >= ?",
            (plan_type, start.isoformat())
        ).fetchone()
        total = row['total'] or 0
        completed = row['completed'] or 0
        percentage = round(completed / total * 100) if total > 0 else 0
        return {'completed': completed, 'total': total, 'percentage': percentage}
```

- [ ] **Step 7: 提交数据库改动**

```bash
git add database.py
git commit -m "feat: 解耦专注记录与任务管理 - 数据库层 (v1.8.0)

- 外键约束从 ON DELETE CASCADE 改为 ON DELETE SET NULL
- 添加迁移逻辑，安全重建 focus_sessions 表
- 删除计划时不再删除专注记录
- 添加时间周期进度查询函数
- 添加 plans 表索引优化查询"
```

---

### Task 2: 新增后端进度 API

**Files:**
- Modify: `app.py` (在 plans API 部分添加新路由)

- [ ] **Step 1: 添加进度查询接口**

在 `app.py` 的 `api_get_all_plans` 函数之后（约第102行），添加新路由：

```python
@app.route('/api/plans/progress', methods=['GET'])
def api_plan_progress():
    plan_type = request.args.get('type', 'today')
    if plan_type not in ('today', 'weekly', 'monthly', 'yearly'):
        return jsonify({'error': '无效的计划类型'}), 400
    progress = db.get_plan_progress(plan_type)
    return jsonify(progress)
```

- [ ] **Step 2: 更新版本号**

修改 `app.py` 第22行：

```python
CURRENT_VERSION = '1.8.0'
```

- [ ] **Step 3: 提交后端改动**

```bash
git add app.py
git commit -m "feat: 新增计划进度 API，更新版本号为 1.8.0"
```

---

### Task 3: 修改前端进度计算

**Files:**
- Modify: `static/app.js:629-650` (loadPlans 和 updateCategoryProgress 函数)

- [ ] **Step 1: 修改 loadPlans() 函数**

修改 `static/app.js` 第629-640行：

```javascript
async function loadPlans() {
    try {
        const active = await api('/api/plans?type=' + currentPage);
        renderPlans(active);
        try {
            const progress = await api('/api/plans/progress?type=' + currentPage);
            updateCategoryProgress(progress);
        } catch (_) {
            updateCategoryProgress({ completed: 0, total: 0, percentage: 0 });
        }
    } catch (e) { toast('加载失败: ' + e.message, true); }
}
```

- [ ] **Step 2: 修改 updateCategoryProgress() 函数**

修改 `static/app.js` 第642-650行：

```javascript
function updateCategoryProgress(progress) {
    const bar = document.getElementById('categoryProgressBar');
    const txt = document.getElementById('categoryProgressText');
    const { completed, total, percentage } = progress;
    bar.style.width = percentage + '%';
    txt.textContent = percentage + '%';
}
```

- [ ] **Step 3: 提交前端改动**

```bash
git add static/app.js
git commit -m "feat: 前端进度条改用时间周期 API"
```

---

### Task 4: 更新构建脚本版本号

**Files:**
- Modify: `build.sh:8` (VERSION 变量)

- [ ] **Step 1: 更新 build.sh 版本号**

修改 `build.sh` 第8行：

```bash
VERSION="1.8.0"
```

- [ ] **Step 2: 提交版本更新**

```bash
git add build.sh
git commit -m "chore: 更新构建脚本版本号为 1.8.0"
```

---

### Task 5: 代码审查与最终提交

- [ ] **Step 1: 检查所有改动**

```bash
git diff HEAD~4..HEAD --stat
```

- [ ] **Step 2: 验证数据库迁移安全性**

确认迁移代码满足：
- 事务保护（失败则回滚）
- 幂等性（重复执行不出错）
- 数据完整性（所有数据保留）

- [ ] **Step 3: 验证 API 正确性**

确认 `/api/plans/progress` 接口：
- 参数验证完整
- 返回格式正确
- 时间周期边界计算准确

- [ ] **Step 4: 创建版本标签**

```bash
git tag -a v1.8.0 -m "v1.8.0: 解耦专注记录与任务管理"
```

- [ ] **Step 5: 推送到远程**

```bash
git push origin main --tags
```
