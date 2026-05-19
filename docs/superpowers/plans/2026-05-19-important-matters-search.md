# 重要事项 + 搜索框 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Important Matters" page with due-date-based tasks and search boxes to 5 plan pages.

**Architecture:** Reuse the existing `plans` table with a new `plan_type='important'` and a `due_date` column. Search boxes follow the recycle bin pattern (client-side filtering with pinyin support). Auto-delete expired items on page load.

**Tech Stack:** Python Flask, SQLite, vanilla JS, HTML/CSS

---

### Task 1: Database — Add `due_date` column and important items functions

**Files:**
- Modify: `/Users/Zhuanz/PlanMaster/database.py`

- [ ] **Step 1: Add `due_date` column migration**

In `database.py`, after the `suggested_time` migration block (line 202), add:

```python
        # Migration: add due_date column if missing
        try:
            conn.execute("SELECT due_date FROM plans LIMIT 1")
        except sqlite3.OperationalError:
            conn.execute("ALTER TABLE plans ADD COLUMN due_date TEXT")
```

- [ ] **Step 2: Add `create_plan` due_date support**

Modify `create_plan` function (line 303) to accept `due_date`:

```python
def create_plan(plan_type, title, description='', priority=0, virtual_value=0, progress=0, suggested_time='', due_date=None):
    with _conn() as conn:
        cur = conn.execute(
            "INSERT INTO plans (plan_type, title, description, priority, virtual_value, progress, suggested_time, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (plan_type, title, description, priority, virtual_value, progress, suggested_time, due_date)
        )
        plan_id = cur.lastrowid
        conn.commit()
    return get_plan(plan_id)
```

- [ ] **Step 3: Add `update_plan` due_date support**

Modify `update_plan` function (line 314) to accept `due_date`:

```python
def update_plan(plan_id, title=None, description=None, priority=None, virtual_value=None, progress=None, suggested_time=None, due_date=_SENTINEL):
```

Add inside the function body, before `conn.commit()`:

```python
        if due_date is not _SENTINEL:
            conn.execute("UPDATE plans SET due_date=? WHERE id=?", (due_date, plan_id))
```

Note: Need to move `_SENTINEL` definition (currently at line 412) above `update_plan`, or define a separate sentinel for this function. Simplest: use a module-level `_UNSET = object()` sentinel defined near the top of the file.

- [ ] **Step 4: Add `get_important_items` function**

Add after `get_completed_plans` (line 280):

```python
def get_important_items():
    with _conn() as conn:
        rows = conn.execute(
            "SELECT * FROM plans WHERE plan_type='important' AND completed=0 ORDER BY due_date ASC, created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]
```

- [ ] **Step 5: Add `cleanup_important` function**

Add after `get_important_items`:

```python
def cleanup_important():
    """Delete expired important items (due_date < today)."""
    with _conn() as conn:
        today = date.today().isoformat()
        cur = conn.execute(
            "DELETE FROM plans WHERE plan_type='important' AND due_date IS NOT NULL AND due_date < ?",
            (today,)
        )
        deleted = cur.rowcount
        conn.commit()
        return deleted
```

- [ ] **Step 6: Commit**

```bash
git add database.py
git commit -m "feat: add due_date column and important items DB functions"
```

---

### Task 2: Backend API — Add important items endpoints

**Files:**
- Modify: `/Users/Zhuanz/PlanMaster/app.py`

- [ ] **Step 1: Add GET /api/important endpoint**

Add after the `/api/plans/completed` endpoint (line 115):

```python
@app.route('/api/important', methods=['GET'])
def api_get_important():
    db.cleanup_important()
    return jsonify(db.get_important_items())
```

- [ ] **Step 2: Modify POST /api/plans to accept due_date**

In `api_create_plan` (line 118), after `progress = data.get('progress', 0) or 0` (line 127), add:

```python
    due_date = data.get('due_date') or None
```

Change the `db.create_plan` call (line 129) to:

```python
    plan = db.create_plan(plan_type, title, description, priority, virtual_value, progress, due_date=due_date)
```

- [ ] **Step 3: Modify PUT /api/plans/<id> to accept due_date**

In `api_update_plan` (line 156), add `due_date` to the `db.update_plan` call:

```python
@app.route('/api/plans/<int:plan_id>', methods=['PUT'])
def api_update_plan(plan_id):
    data = request.json
    due_date = data.get('due_date', db._UNSET) if 'due_date' in data else db._UNSET
    plan = db.update_plan(
        plan_id,
        title=data.get('title'),
        description=data.get('description'),
        priority=data.get('priority'),
        virtual_value=data.get('virtual_value'),
        progress=data.get('progress'),
        due_date=due_date,
    )
    return jsonify(plan)
```

Note: This requires `_UNSET` to be exported from database.py. Define `_UNSET = object()` at module level in database.py.

- [ ] **Step 4: Commit**

```bash
git add app.py database.py
git commit -m "feat: add /api/important endpoint and due_date support in plan CRUD"
```

---

### Task 3: Frontend HTML — Add important page, sidebar item, and search boxes

**Files:**
- Modify: `/Users/Zhuanz/PlanMaster/templates/index.html`

- [ ] **Step 1: Add important menu item in sidebar**

In `index.html`, after the 打卡 `</li>` (line 30) and before the 今日待办 `<li>` (line 31), insert:

```html
                <li class="nav-item" data-page="important" onclick="switchPage('important')">
                    <span class="nav-icon">&#9888;</span>
                    <span>重要事项</span>
                </li>
```

- [ ] **Step 2: Add important page div**

Before the Plan Pages section (line 93), add:

```html
            <!-- Important Matters Page -->
            <div class="page" id="page-important">
                <div class="page-header">
                    <h2>重要事项</h2>
                    <div class="page-actions">
                        <button class="btn btn-glass" onclick="showAddImportantModal()">+ 新增事项</button>
                    </div>
                </div>
                <div class="search-wrap">
                    <input type="text" id="importantSearchInput" class="search-input" placeholder="搜索重要事项... (支持拼音)" oninput="onImportantSearch(event)">
                    <span class="search-clear" id="importantSearchClear" onclick="clearImportantSearch()" style="display:none">&times;</span>
                </div>
                <div class="plan-list" id="importantList">
                    <div class="empty-state">暂无重要事项，点击右上角添加</div>
                </div>
            </div>
```

- [ ] **Step 3: Add search box to plans page**

In the Plan Pages section, after the `<div class="page-header">` closing tag (after line 100) and before `<div class="category-progress"` (line 101), insert:

```html
                <div class="search-wrap">
                    <input type="text" id="planSearchInput" class="search-input" placeholder="搜索计划... (支持拼音)" oninput="onPlanSearch(event)">
                    <span class="search-clear" id="planSearchClear" onclick="clearPlanSearch()" style="display:none">&times;</span>
                </div>
```

- [ ] **Step 4: Add due_date field to plan modal**

In the plan modal (line 494-532), after the plan description form-group (line 509) and before the priority/value form-row (line 511), add:

```html
                <div class="form-group" id="dueDateGroup" style="display:none">
                    <label>截止日期</label>
                    <input type="date" id="planDueDateInput">
                </div>
```

- [ ] **Step 5: Commit**

```bash
git add templates/index.html
git commit -m "feat: add important page HTML, sidebar item, and search boxes"
```

---

### Task 4: Frontend CSS — Search styles and important item styles

**Files:**
- Modify: `/Users/Zhuanz/PlanMaster/static/style.css`

- [ ] **Step 1: Add generic search styles**

After the recycle search styles (line 342), add:

```css
/* Generic search styles */
.search-wrap { position: relative; margin-bottom: 20px; }
.search-input { width: 100%; padding: 10px 36px 10px 16px; border: 1px solid rgba(255,255,255,.4); border-radius: var(--radius-sm); font-size: 14px; font-family: inherit; background: rgba(255,255,255,.35); backdrop-filter: blur(8px); color: var(--text); transition: var(--transition); }
.search-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-glow); background: rgba(255,255,255,.5); }
.search-input::placeholder { color: var(--text-muted); }
.search-clear { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(124,110,240,.15); color: var(--primary); font-size: 14px; cursor: pointer; transition: var(--transition); }
.search-clear:hover { background: rgba(124,110,240,.3); }
```

- [ ] **Step 2: Add dark theme overrides for generic search**

After the dark theme recycle search overrides (line 347), add:

```css
body.theme-dark .search-input { background: rgba(0,0,0,.3); border-color: rgba(255,255,255,.15); color: var(--text); }
body.theme-dark .search-input:focus { background: rgba(0,0,0,.4); }
```

- [ ] **Step 3: Add due-date badge styles**

After the search styles, add:

```css
/* Due date badges */
.badge-due { padding: 3px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; backdrop-filter: blur(8px); }
.badge-due-normal { background: rgba(59,130,246,.1); color: #3b82f6; border: 1px solid rgba(59,130,246,.2); }
.badge-due-soon { background: rgba(251,191,36,.15); color: #d97706; border: 1px solid rgba(251,191,36,.3); }
.badge-due-today { background: rgba(239,68,68,.1); color: #ef4444; border: 1px solid rgba(239,68,68,.3); }
```

- [ ] **Step 4: Commit**

```bash
git add static/style.css
git commit -m "feat: add generic search styles and due-date badge CSS"
```

---

### Task 5: Frontend JS — Important items functionality

**Files:**
- Modify: `/Users/Zhuanz/PlanMaster/static/app.js`

- [ ] **Step 1: Add PLAN_TYPE_LABELS and COLORS for 'important'**

At line 361-362, update:

```javascript
const PLAN_TYPE_LABELS = { important:'重要事项', today:'今日待办', weekly:'周计划', monthly:'月计划', yearly:'年计划' };
const PLAN_TYPE_COLORS = { important:'#ef4444', today:'#7c6ef0', weekly:'#3b82f6', monthly:'#10b981', yearly:'#f59e0b' };
```

- [ ] **Step 2: Add switchPage case for 'important'**

In `switchPage` function (line 7), add a new case. After line 15 (`showNextSignature();`) and before `} else if (page === 'stats')`, add:

```javascript
    } else if (page === 'important') {
        document.getElementById('page-important').classList.add('active');
        loadImportantItems();
        showNextSignature();
```

- [ ] **Step 3: Add important items state variables and functions**

After the recycle bin filter section (around line 507), add:

```javascript
// ---- Important Items ----
let allImportantItems = [];
let importantSearchKeyword = '';

async function loadImportantItems() {
    try {
        const items = await api('/api/important');
        allImportantItems = items;
        filterAndRenderImportant();
    } catch (e) { toast('加载失败: ' + e.message, true); }
}

function onImportantSearch(e) {
    importantSearchKeyword = e.target.value.trim();
    const clearBtn = document.getElementById('importantSearchClear');
    if (clearBtn) clearBtn.style.display = importantSearchKeyword ? 'flex' : 'none';
    filterAndRenderImportant();
}

function clearImportantSearch() {
    importantSearchKeyword = '';
    const input = document.getElementById('importantSearchInput');
    if (input) input.value = '';
    const clearBtn = document.getElementById('importantSearchClear');
    if (clearBtn) clearBtn.style.display = 'none';
    filterAndRenderImportant();
}

function filterAndRenderImportant() {
    let filtered = allImportantItems;
    if (importantSearchKeyword) {
        filtered = filtered.filter(p => matchPinyin(p.title, importantSearchKeyword) || matchPinyin(p.description || '', importantSearchKeyword));
    }
    renderImportantItems(filtered, allImportantItems);
}

function daysUntilDue(dueDate) {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate + 'T00:00:00');
    const diff = Math.ceil((due - today) / 86400000);
    return diff;
}

function dueBadge(dueDate) {
    const days = daysUntilDue(dueDate);
    if (days === null) return '';
    if (days < 0) return '<span class="plan-badge badge-due badge-due-today">已过期</span>';
    if (days === 0) return '<span class="plan-badge badge-due badge-due-today">今日到期</span>';
    if (days <= 3) return `<span class="plan-badge badge-due badge-due-soon">还有${days}天</span>`;
    return `<span class="plan-badge badge-due badge-due-normal">还有${days}天</span>`;
}

function renderImportantItems(items, allItems) {
    const c = document.getElementById('importantList');
    if (!items.length) {
        const msg = allItems && allItems.length ? '没有匹配的事项' : '暂无重要事项，点击右上角添加';
        c.innerHTML = `<div class="empty-state">${msg}</div>`;
        return;
    }
    c.innerHTML = items.map(p => {
        return `
        <div class="plan-card" data-id="${p.id}">
            <div class="plan-card-body">
                <div class="plan-card-title">${esc(p.title)}</div>
                <div class="plan-card-meta">
                    ${p.due_date ? `<span class="plan-badge badge-due badge-due-normal">${p.due_date}</span>` : ''}
                    ${dueBadge(p.due_date)}
                </div>
                ${p.description ? `<div class="plan-card-desc">${esc(p.description)}</div>` : ''}
                <div class="plan-card-actions">
                    <button class="btn btn-glass btn-sm" onclick="editImportant(${p.id})">编辑</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteImportant(${p.id})">删除</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function showAddImportantModal() {
    editingPlanId = null;
    document.getElementById('planModalTitle').textContent = '新增重要事项';
    document.getElementById('planTitleInput').value = '';
    document.getElementById('planDescInput').value = '';
    document.getElementById('planPriorityInput').value = '';
    document.getElementById('planValueInput').value = '';
    document.getElementById('planProgressInput').value = 0;
    document.getElementById('planProgressLabel').textContent = '0';
    document.getElementById('dueDateGroup').style.display = '';
    document.getElementById('planDueDateInput').value = '';
    // Hide priority/value/progress for important items
    document.getElementById('planPriorityInput').closest('.form-row').style.display = 'none';
    document.getElementById('planProgressInput').closest('.form-group').style.display = 'none';
    document.getElementById('planModal').classList.add('show');
    setTimeout(() => document.getElementById('planTitleInput').focus(), 100);
}

async function editImportant(id) {
    try {
        const item = allImportantItems.find(x => x.id === id);
        if (!item) { toast('事项不存在', true); return; }
        editingPlanId = id;
        document.getElementById('planModalTitle').textContent = '编辑重要事项';
        document.getElementById('planTitleInput').value = item.title;
        document.getElementById('planDescInput').value = item.description || '';
        document.getElementById('planPriorityInput').value = '';
        document.getElementById('planValueInput').value = '';
        document.getElementById('planProgressInput').value = 0;
        document.getElementById('planProgressLabel').textContent = '0';
        document.getElementById('dueDateGroup').style.display = '';
        document.getElementById('planDueDateInput').value = item.due_date || '';
        document.getElementById('planPriorityInput').closest('.form-row').style.display = 'none';
        document.getElementById('planProgressInput').closest('.form-group').style.display = 'none';
        document.getElementById('planModal').classList.add('show');
    } catch (e) { toast('加载失败: ' + e.message, true); }
}

async function deleteImportant(id) {
    if (!confirm('确定删除此重要事项？')) return;
    try { await api('/api/plans/' + id, { method: 'POST' }); toast('已删除'); loadImportantItems(); }
    catch (e) { toast('删除失败: ' + e.message, true); }
}
```

- [ ] **Step 4: Modify `savePlan` to handle important items**

In `savePlan` function (line 797), modify the logic to detect if we're saving an important item. Replace the function body to handle the `due_date` field and the important type.

The key changes:
1. When `currentPage === 'important'` or the modal title contains '重要事项', set `plan_type: 'important'`
2. Include `due_date` from the date input
3. After save, reload important items instead of plans

Replace the `savePlan` function (lines 797-835) with:

```javascript
async function savePlan() {
    if (planSaving) return;
    const title = document.getElementById('planTitleInput').value.trim();
    const desc = document.getElementById('planDescInput').value.trim();
    const pri = document.getElementById('planPriorityInput').value;
    const val = document.getElementById('planValueInput').value;
    const prog = document.getElementById('planProgressInput').value;
    const dueDateInput = document.getElementById('planDueDateInput');
    const isImportant = document.getElementById('dueDateGroup').style.display !== 'none';
    if (!title) { toast('请输入标题', true); return; }
    if (isImportant && !dueDateInput.value) { toast('请选择截止日期', true); return; }
    planSaving = true;
    try {
        if (editingPlanId) {
            const body = { title, description: desc };
            if (!isImportant) {
                body.progress = parseInt(prog);
                if (pri !== '') body.priority = parseInt(pri);
                if (val !== '') body.virtual_value = parseFloat(val);
            }
            if (isImportant) body.due_date = dueDateInput.value;
            await api('/api/plans/' + editingPlanId, { method: 'PUT', body: JSON.stringify(body) });
            toast('已更新');
            closeModal('planModal');
            if (isImportant) loadImportantItems(); else loadPlans();
        } else {
            const planType = isImportant ? 'important' : currentPage;
            const body = { plan_type: planType, title, description: desc };
            if (!isImportant) {
                body.progress = parseInt(prog);
                if (pri !== '') body.priority = parseInt(pri);
                if (val !== '') body.virtual_value = parseFloat(val);
            }
            if (isImportant) body.due_date = dueDateInput.value;
            const newPlan = await api('/api/plans', { method: 'POST', body: JSON.stringify(body) });
            toast('已创建');
            closeModal('planModal');
            if (isImportant) loadImportantItems(); else loadPlans();
            if (!isImportant && pri === '' && val === '' && newPlan && newPlan.id) {
                let polls = 0;
                const poll = setInterval(async () => {
                    try {
                        const plans = await api('/api/plans?type=' + currentPage);
                        const found = plans.find(p => p.id === newPlan.id);
                        if (found && found.priority > 0) { clearInterval(poll); loadPlans(); }
                    } catch (_) {}
                    if (++polls >= 15) clearInterval(poll);
                }, 1000);
            }
        }
    } catch (e) { toast('保存失败: ' + e.message, true); }
    finally { planSaving = false; }
}
```

- [ ] **Step 5: Modify `showAddPlanModal` to reset modal state**

In `showAddPlanModal` (line 767), add reset for the due date group and priority/value visibility:

After `document.getElementById('planProgressLabel').textContent = '0';` (line 775), add:

```javascript
    document.getElementById('dueDateGroup').style.display = 'none';
    document.getElementById('planPriorityInput').closest('.form-row').style.display = '';
    document.getElementById('planProgressInput').closest('.form-group').style.display = '';
```

Similarly, in `editPlan` (line 780), add the same resets to ensure the modal is in the correct state when editing regular plans:

After `document.getElementById('planProgressLabel').textContent = p.progress || 0;` (line 792), add:

```javascript
    document.getElementById('dueDateGroup').style.display = 'none';
    document.getElementById('planPriorityInput').closest('.form-row').style.display = '';
    document.getElementById('planProgressInput').closest('.form-group').style.display = '';
```

- [ ] **Step 6: Commit**

```bash
git add static/app.js
git commit -m "feat: add important items page functionality and due date support"
```

---

### Task 6: Frontend JS — Plan page search functionality

**Files:**
- Modify: `/Users/Zhuanz/PlanMaster/static/app.js`

- [ ] **Step 1: Add plan search state and functions**

After the important items section (added in Task 5), add:

```javascript
// ---- Plan Search ----
let allPlans = [];
let planSearchKeyword = '';

function onPlanSearch(e) {
    planSearchKeyword = e.target.value.trim();
    const clearBtn = document.getElementById('planSearchClear');
    if (clearBtn) clearBtn.style.display = planSearchKeyword ? 'flex' : 'none';
    filterAndRenderPlans();
}

function clearPlanSearch() {
    planSearchKeyword = '';
    const input = document.getElementById('planSearchInput');
    if (input) input.value = '';
    const clearBtn = document.getElementById('planSearchClear');
    if (clearBtn) clearBtn.style.display = 'none';
    filterAndRenderPlans();
}

function filterAndRenderPlans() {
    let filtered = allPlans;
    if (planSearchKeyword) {
        filtered = filtered.filter(p => matchPinyin(p.title, planSearchKeyword) || matchPinyin(p.description || '', planSearchKeyword));
    }
    renderPlans(filtered);
}
```

- [ ] **Step 2: Modify `loadPlans` to cache data and use search**

In `loadPlans` (line 639), after fetching plans, cache them. Replace the function:

```javascript
async function loadPlans() {
    if (_loadPlansAbort) { _loadPlansAbort.abort(); _loadPlansAbort = null; }
    const ac = new AbortController();
    _loadPlansAbort = ac;
    try {
        const [active, progress] = await Promise.all([
            api('/api/plans?type=' + currentPage, { signal: ac.signal }),
            api('/api/plans/progress?type=' + currentPage, { signal: ac.signal }).catch(() => ({ completed: 0, total: 0, percentage: 0 }))
        ]);
        allPlans = active;
        if (planSearchKeyword) {
            filterAndRenderPlans();
        } else {
            renderPlans(active);
        }
        updateCategoryProgress(progress);
    } catch (e) {
        if (e.name === 'AbortError') return;
        toast('加载失败: ' + e.message, true);
    }
}
```

- [ ] **Step 3: Clear plan search when switching plan types**

In `switchPage`, when entering a plan page, clear the search. In the planPages block (line 37-42), add after `showNextSignature();`:

```javascript
            clearPlanSearch();
```

- [ ] **Step 4: Commit**

```bash
git add static/app.js
git commit -m "feat: add search functionality to plan pages"
```

---

### Task 7: Version update

**Files:**
- Modify: `/Users/Zhuanz/PlanMaster/app.py`

- [ ] **Step 1: Update version**

In `app.py`, line 22, change:

```python
CURRENT_VERSION = '1.8.6'
```

to:

```python
CURRENT_VERSION = '1.9.0'
```

- [ ] **Step 2: Commit**

```bash
git add app.py
git commit -m "chore: update version to 1.9.0"
```

---

### Task 8: Final integration test and push

- [ ] **Step 1: Run the app and verify**

```bash
cd /Users/Zhuanz/PlanMaster && python app.py
```

Verify in browser:
1. "重要事项" appears in sidebar between 打卡 and 今日待办
2. Can add important items with due dates
3. Items sorted by due date (closest first)
4. Expired items are cleaned up on page load
5. Search box works on important items page (pinyin support)
6. Search box works on 今日待办 page
7. Search box works on 周计划/月计划/年计划 pages
8. Existing features (plans, recycle bin, etc.) still work

- [ ] **Step 2: Push to git**

```bash
git push origin main
```
