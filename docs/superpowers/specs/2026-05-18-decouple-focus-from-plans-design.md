# 设计规格：解耦专注记录与任务管理 (v1.8.0)

## 概述

本设计将专注记录（focus_sessions）与任务管理（plans）解耦，实现：
1. 删除任务时保留专注记录
2. 进度条按时间周期重置，而非依据回收站操作
3. 历史专注时长永久保留

## 一、数据库层改动

### 1.1 修改 focus_sessions 表外键约束

**当前定义**（`database.py` 第187行）：
```sql
FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
```

**改为**：
```sql
FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL
```

**效果**：删除计划时，关联的专注记录保留，`plan_id` 自动设为 NULL。

### 1.2 迁移现有数据库

**问题**：SQLite 无法直接修改外键约束。

**解决方案**：重建 focus_sessions 表。

**迁移步骤**：
1. 检测表结构是否需要迁移（检查是否有 `ON DELETE CASCADE`）
2. 创建 `focus_sessions_new` 表（使用新的外键约束）
3. 复制所有数据到新表
4. 删除旧表
5. 重命名新表为 `focus_sessions`
6. 重建索引

**数据安全保障**：
- 整个迁移在事务中执行，失败则回滚
- 先创建新表、复制数据，再删除旧表
- 幂等性：重复执行不会出错
- 用户数据完全安全，迁移过程对用户透明

### 1.3 修改 delete_plan() 函数

**当前**（`database.py` 第307-311行）：
```python
def delete_plan(plan_id):
    conn.execute("DELETE FROM focus_sessions WHERE plan_id=?", (plan_id,))
    conn.execute("DELETE FROM plans WHERE id=?", (plan_id,))
```

**改为**：
```python
def delete_plan(plan_id):
    # 不再需要显式删除专注记录，外键的 ON DELETE SET NULL 自动处理
    conn.execute("DELETE FROM plans WHERE id=?", (plan_id,))
```

### 1.4 修改 batch_delete_plans() 函数

**当前**（`database.py` 第314-321行）：
```python
def batch_delete_plans(plan_ids):
    placeholders = ','.join(['?'] * len(plan_ids))
    conn.execute(f"DELETE FROM focus_sessions WHERE plan_id IN ({placeholders})", plan_ids)
    cur = conn.execute(f"DELETE FROM plans WHERE id IN ({placeholders})", plan_ids)
```

**改为**：
```python
def batch_delete_plans(plan_ids):
    placeholders = ','.join(['?'] * len(plan_ids))
    # 不再需要显式删除专注记录
    cur = conn.execute(f"DELETE FROM plans WHERE id IN ({placeholders})", plan_ids)
```

### 1.5 添加索引

在 `init_db()` 中添加索引，优化时间周期查询：
```sql
CREATE INDEX IF NOT EXISTS idx_plans_created_at ON plans(created_at);
CREATE INDEX IF NOT EXISTS idx_plans_type_created ON plans(plan_type, created_at);
```

## 二、后端 API 改动

### 2.1 新增接口：获取计划进度

**路径**：`GET /api/plans/progress`

**参数**：
- `type`：计划类型，可选值：`today`、`weekly`、`monthly`、`yearly`

**返回**：
```json
{
    "completed": 2,
    "total": 5,
    "percentage": 40
}
```

**时间周期边界计算**：
- 今日：当天 00:00:00 至今
- 本周：本周一 00:00:00 至今
- 本月：本月1日 00:00:00 至今
- 本年：1月1日 00:00:00 至今

**SQL 查询**：
```sql
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed
FROM plans 
WHERE plan_type = ? 
AND created_at >= ?
```

### 2.2 修改删除接口

无需修改路由层，只需修改数据库函数（见1.3和1.4）。

## 三、前端改动

### 3.1 修改 loadPlans() 函数

**当前**（`app.js` 第634行附近）：
```javascript
async function loadPlans(type) {
    const plans = await api(`/api/plans/all?type=${type}`);
    // ... 渲染计划列表
    updateCategoryProgress(plans);  // 在前端计算进度
}
```

**改为**：
```javascript
async function loadPlans(type) {
    const plans = await api(`/api/plans/all?type=${type}`);
    // ... 渲染计划列表
    
    // 调用新接口获取进度
    const progress = await api(`/api/plans/progress?type=${type}`);
    updateCategoryProgress(progress);
}
```

### 3.2 修改 updateCategoryProgress() 函数

**当前**（`app.js` 第642-650行）：
```javascript
function updateCategoryProgress(plans) {
    const completed = plans.filter(p => p.completed).length;
    const pct = Math.round((completed / plans.length) * 100);
    // ... 更新进度条
}
```

**改为**：
```javascript
function updateCategoryProgress(progress) {
    const { completed, total, percentage } = progress;
    // ... 使用 percentage 更新进度条
}
```

### 3.3 保留计划卡片上的专注按钮

`toggleFocus()` 功能不变，用户仍可从计划卡片快速开始专注。

## 四、统计系统

**无需改动**。

统计接口直接查询 `focus_sessions` 表，`plan_id` 设为 NULL 后，专注记录仍然保留：
- 累计统计：总次数、总时长、日均时长
- 每日统计：指定日期的次数和时长
- 分布统计：按分类的时长分布
- 月度统计：每日专注分钟数柱状图

所有历史数据完整保留。

## 五、版本更新

- 更新 `build.sh` 中的版本号为 `1.8.0`
- 提交 git，版本标签 `v1.8.0`

## 六、影响范围

### 需要修改的文件
1. `database.py` - 外键约束、迁移、删除函数
2. `app.py` - 新增进度接口
3. `static/app.js` - 前端进度计算
4. `build.sh` - 版本号

### 不需要修改的文件
- `index.html` - 无需改动
- 统计相关代码 - 无需改动

### 测试要点
1. 创建计划 → 专注 → 删除计划 → 验证专注记录保留
2. 创建今日计划 → 完成部分 → 验证进度条正确
3. 跨天/跨周/跨月 → 验证进度条重置
4. 批量删除 → 验证专注记录保留
5. 统计页面 → 验证历史数据完整
