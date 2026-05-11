let currentPage = 'today';
let editingPlanId = null;
let planSaving = false;

function switchPage(page) {
    currentPage = page;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const a = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (a) a.classList.add('active');
    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    const planPages = ['today', 'weekly', 'monthly', 'yearly'];
    if (planPages.includes(page)) {
        document.getElementById('page-plans').classList.add('active');
        const t = { today:'今日待办', weekly:'周计划', monthly:'月计划', yearly:'年计划' };
        document.getElementById('planTitle').textContent = t[page];
        loadPlans();
    } else if (page === 'wishes') { document.getElementById('page-wishes').classList.add('active'); loadWishes(); }
    else if (page === 'transactions') { document.getElementById('page-transactions').classList.add('active'); loadTransactions(); }
    else if (page === 'recycle') { document.getElementById('page-recycle').classList.add('active'); loadRecycleBin(); }
    else if (page === 'settings') { document.getElementById('page-settings').classList.add('active'); loadSettings(); }
}

function toggleGroup(h) { h.classList.toggle('collapsed'); h.nextElementSibling.classList.toggle('open'); }

async function api(url, opts = {}) {
    const r = await fetch(url, { headers: {'Content-Type':'application/json'}, ...opts });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || '请求失败');
    return d;
}

function toast(msg, err = false) {
    const el = document.getElementById('toast');
    el.textContent = msg; el.className = 'toast show' + (err ? ' error' : '');
    clearTimeout(el._t); el._t = setTimeout(() => el.className = 'toast', 3000);
}

function showLoading(t = '处理中...') {
    hideLoading();
    const o = document.createElement('div'); o.className = 'loading-overlay'; o.id = 'loadingOverlay';
    o.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><div>${t}</div></div>`;
    o.addEventListener('click', e => { if (e.target === o) hideLoading(); });
    document.body.appendChild(o);
}
function hideLoading() { const e = document.getElementById('loadingOverlay'); if (e) e.remove(); }

const PLAN_TYPE_LABELS = { today:'今日待办', weekly:'周计划', monthly:'月计划', yearly:'年计划' };
const PLAN_TYPE_COLORS = { today:'#7c6ef0', weekly:'#3b82f6', monthly:'#10b981', yearly:'#f59e0b' };

// Priority color: green(1) -> yellow(50) -> red(100)
function priColor(p) {
    if (!p || p <= 0) return null;
    p = Math.min(100, Math.max(1, p));
    const h = 120 - (p / 100) * 120;
    return `hsl(${h}, 72%, 52%)`;
}

function priColorLight(p) {
    if (!p || p <= 0) return null;
    p = Math.min(100, Math.max(1, p));
    const h = 120 - (p / 100) * 120;
    return `hsl(${h}, 72%, 92%)`;
}

async function loadBalance() {
    try {
        const d = await api('/api/balance');
        const v = d.balance.toFixed(1);
        document.getElementById('balanceValue').textContent = v;
        document.getElementById('wishBalance').textContent = v;
        document.getElementById('txBalance').textContent = v;
    } catch (e) {}
}

// ---- Plans ----

async function loadPlans() {
    try {
        const plans = await api('/api/plans?type=' + currentPage);
        renderPlans(plans);
        updateCategoryProgress(plans);
    } catch (e) { toast('加载失败: ' + e.message, true); }
}

function updateCategoryProgress(plans) {
    const bar = document.getElementById('categoryProgressBar');
    const txt = document.getElementById('categoryProgressText');
    if (!plans.length) { bar.style.width = '0%'; txt.textContent = '0%'; return; }
    const completed = plans.filter(p => p.completed).length;
    const pct = Math.round((completed / plans.length) * 100);
    bar.style.width = pct + '%';
    txt.textContent = pct + '%';
}

function renderPlans(plans) {
    const c = document.getElementById('planList');
    if (!plans.length) { c.innerHTML = '<div class="empty-state">暂无计划，点击右上角添加</div>'; return; }

    c.innerHTML = plans.map(p => {
        const hasP = p.priority > 0;
        const color = priColor(p.priority);
        const colorLight = priColorLight(p.priority);
        // SVG progress ring
        const r = 24; const circ = 2 * Math.PI * r;
        const prog = Math.min(100, Math.max(0, p.progress || 0));
        const offset = circ - (prog / 100) * circ;
        const ringColor = color || 'rgba(168,163,191,0.4)';

        // Priority circle background: radial gradient from edge color to white center
        const circleBg = hasP
            ? `background: radial-gradient(circle, ${colorLight} 0%, ${color} 100%);`
            : '';

        return `
        <div class="plan-card ${p.completed ? 'completed' : ''}" data-id="${p.id}">
            <div class="priority-ring">
                <svg width="54" height="54" viewBox="0 0 54 54">
                    <circle class="ring-bg" cx="27" cy="27" r="${r}"/>
                    <circle class="ring-fill" cx="27" cy="27" r="${r}"
                        stroke="${ringColor}"
                        stroke-dasharray="${circ}"
                        stroke-dashoffset="${offset}"/>
                </svg>
                <div class="priority-circle${hasP ? '' : ' priority-none'}" style="${circleBg}">
                    ${hasP ? p.priority : '-'}
                </div>
            </div>
            <div class="plan-card-body">
                <div class="plan-card-header">
                    <div class="plan-card-title">${esc(p.title)}</div>
                    <div class="plan-card-meta">
                        <span class="plan-type-tag" style="background:${PLAN_TYPE_COLORS[p.plan_type] || '#7c6ef0'}">${PLAN_TYPE_LABELS[p.plan_type] || p.plan_type}</span>
                        ${p.virtual_value > 0 ? `<span class="plan-badge badge-value">${p.virtual_value} 价值</span>` : ''}
                    </div>
                </div>
                ${p.description ? `<div class="plan-card-desc">${esc(p.description)}</div>` : ''}
                ${p.ai_reason ? `<div class="plan-card-reason">AI: ${esc(p.ai_reason)}</div>` : ''}
                <div class="plan-progress">
                    <div class="plan-progress-track">
                        <div class="plan-progress-bar" style="width:${prog}%"></div>
                        <input type="range" class="plan-progress-input" min="0" max="100" step="5" value="${prog}"
                            onchange="updateProgress(${p.id}, this.value)" oninput="previewProgress(this)">
                    </div>
                    <span class="plan-progress-text">${prog}%</span>
                </div>
                <div class="plan-card-actions">
                    ${!p.completed ? `<button class="btn btn-success btn-sm" onclick="completePlan(${p.id})">&#10003; 完成</button>` : ''}
                    <button class="btn btn-glass btn-sm" onclick="editPlan(${p.id})">编辑</button>
                    <button class="btn btn-danger btn-sm" onclick="deletePlan(${p.id})">删除</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function previewProgress(input) {
    const track = input.closest('.plan-progress-track');
    const bar = track.querySelector('.plan-progress-bar');
    const text = input.closest('.plan-progress').querySelector('.plan-progress-text');
    bar.style.width = input.value + '%';
    text.textContent = input.value + '%';
}

async function updateProgress(id, val) {
    const v = parseInt(val);
    try {
        await api('/api/plans/' + id, { method: 'PUT', body: JSON.stringify({ progress: v }) });
        // Update SVG ring on this card only
        const card = document.querySelector(`.plan-card[data-id="${id}"]`);
        if (card) {
            const r = 24, circ = 2 * Math.PI * r;
            const ringFill = card.querySelector('.ring-fill');
            if (ringFill) ringFill.style.strokeDashoffset = circ - (v / 100) * circ;
            // Update category progress
            refreshCategoryProgress();
        }
    } catch (e) { toast('更新失败: ' + e.message, true); }
}

async function refreshCategoryProgress() {
    try {
        const plans = await api('/api/plans?type=' + currentPage);
        updateCategoryProgress(plans);
    } catch (e) {}
}

function showAddPlanModal() {
    editingPlanId = null;
    document.getElementById('planModalTitle').textContent = '新增计划';
    document.getElementById('planTitleInput').value = '';
    document.getElementById('planDescInput').value = '';
    document.getElementById('planPriorityInput').value = '';
    document.getElementById('planValueInput').value = '';
    document.getElementById('planProgressInput').value = 0;
    document.getElementById('planProgressLabel').textContent = '0';
    document.getElementById('planModal').classList.add('show');
    setTimeout(() => document.getElementById('planTitleInput').focus(), 100);
}

async function editPlan(id) {
    try {
        const plans = await api('/api/plans');
        const p = plans.find(x => x.id === id);
        if (!p) { toast('计划不存在', true); return; }
        editingPlanId = id;
        document.getElementById('planModalTitle').textContent = '编辑计划';
        document.getElementById('planTitleInput').value = p.title;
        document.getElementById('planDescInput').value = p.description || '';
        document.getElementById('planPriorityInput').value = p.priority || '';
        document.getElementById('planValueInput').value = p.virtual_value || '';
        document.getElementById('planProgressInput').value = p.progress || 0;
        document.getElementById('planProgressLabel').textContent = p.progress || 0;
        document.getElementById('planModal').classList.add('show');
    } catch (e) { toast('加载失败: ' + e.message, true); }
}

async function savePlan() {
    if (planSaving) return;
    const title = document.getElementById('planTitleInput').value.trim();
    const desc = document.getElementById('planDescInput').value.trim();
    const pri = document.getElementById('planPriorityInput').value;
    const val = document.getElementById('planValueInput').value;
    const prog = document.getElementById('planProgressInput').value;
    if (!title) { toast('请输入计划标题', true); return; }
    planSaving = true;
    try {
        if (editingPlanId) {
            const body = { title, description: desc, progress: parseInt(prog) };
            if (pri !== '') body.priority = parseInt(pri);
            if (val !== '') body.virtual_value = parseFloat(val);
            await api('/api/plans/' + editingPlanId, { method: 'PUT', body: JSON.stringify(body) });
            toast('计划已更新');
            closeModal('planModal'); loadPlans();
        } else {
            const body = { plan_type: currentPage, title, description: desc, progress: parseInt(prog) };
            if (pri !== '') body.priority = parseInt(pri);
            if (val !== '') body.virtual_value = parseFloat(val);
            await api('/api/plans', { method: 'POST', body: JSON.stringify(body) });
            toast('计划已创建');
            closeModal('planModal'); loadPlans();
            if (pri === '' && val === '') {
                setTimeout(() => loadPlans(), 3000);
            }
        }
    } catch (e) { toast('保存失败: ' + e.message, true); }
    finally { planSaving = false; }
}

async function deletePlan(id) {
    if (!confirm('确定删除此计划？')) return;
    try { await api('/api/plans/' + id, { method: 'DELETE' }); toast('计划已删除'); loadPlans(); }
    catch (e) { toast('删除失败: ' + e.message, true); }
}

async function completePlan(id) {
    try {
        await api('/api/plans/' + id + '/complete', { method: 'POST' });
        toast('计划已完成，虚拟价值已入账！'); loadPlans(); loadBalance();
    } catch (e) { toast('操作失败: ' + e.message, true); }
}

// ---- Recycle Bin ----

async function loadRecycleBin() {
    try {
        const plans = await api('/api/plans/completed');
        renderRecycleBin(plans);
    } catch (e) { toast('加载失败: ' + e.message, true); }
}

function renderRecycleBin(plans) {
    const c = document.getElementById('recycleList');
    if (!plans.length) { c.innerHTML = '<div class="empty-state">回收站为空</div>'; return; }
    c.innerHTML = plans.map(p => {
        const color = PLAN_TYPE_COLORS[p.plan_type] || '#7c6ef0';
        return `
        <div class="plan-card completed recycle-card" data-id="${p.id}">
            <label class="recycle-check">
                <input type="checkbox" class="recycle-checkbox" value="${p.id}">
            </label>
            <div class="plan-card-body">
                <div class="plan-card-header">
                    <div class="plan-card-title">${esc(p.title)}</div>
                    <div class="plan-card-meta">
                        <span class="plan-type-tag" style="background:${color}">${PLAN_TYPE_LABELS[p.plan_type] || p.plan_type}</span>
                        ${p.virtual_value > 0 ? `<span class="plan-badge badge-value">${p.virtual_value} 价值</span>` : ''}
                    </div>
                </div>
                ${p.description ? `<div class="plan-card-desc">${esc(p.description)}</div>` : ''}
                <div class="recycle-info">完成于 ${fmtTime(p.completed_at)}</div>
                <div class="plan-card-actions">
                    <button class="btn btn-glass btn-sm" onclick="restorePlan(${p.id})">恢复</button>
                    <button class="btn btn-danger btn-sm" onclick="permanentDelete(${p.id})">永久删除</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function getSelectedRecycleIds() {
    return Array.from(document.querySelectorAll('.recycle-checkbox:checked')).map(cb => parseInt(cb.value));
}

function toggleSelectAll() {
    const boxes = document.querySelectorAll('.recycle-checkbox');
    const allChecked = Array.from(boxes).every(cb => cb.checked);
    boxes.forEach(cb => cb.checked = !allChecked);
}

async function batchDeleteRecycle() {
    const ids = getSelectedRecycleIds();
    if (!ids.length) { toast('请先选择要删除的计划', true); return; }
    if (!confirm(`确定永久删除 ${ids.length} 条计划？此操作不可撤销。`)) return;
    try {
        await api('/api/plans/batch-delete', { method: 'POST', body: JSON.stringify({ ids }) });
        toast(`已删除 ${ids.length} 条计划`); loadRecycleBin();
    } catch (e) { toast('删除失败: ' + e.message, true); }
}

async function batchRestoreRecycle() {
    const ids = getSelectedRecycleIds();
    if (!ids.length) { toast('请先选择要恢复的计划', true); return; }
    try {
        for (const id of ids) {
            await api('/api/plans/' + id + '/restore', { method: 'POST' });
        }
        toast(`已恢复 ${ids.length} 条计划`); loadRecycleBin(); loadBalance();
    } catch (e) { toast('恢复失败: ' + e.message, true); }
}

async function restorePlan(id) {
    try {
        await api('/api/plans/' + id + '/restore', { method: 'POST' });
        toast('计划已恢复'); loadRecycleBin(); loadBalance();
    } catch (e) { toast('恢复失败: ' + e.message, true); }
}

async function permanentDelete(id) {
    if (!confirm('确定永久删除？此操作不可撤销。')) return;
    try { await api('/api/plans/' + id, { method: 'DELETE' }); toast('已永久删除'); loadRecycleBin(); }
    catch (e) { toast('删除失败: ' + e.message, true); }
}

async function aiSortPlans() {
    showLoading('AI 正在分析和排序...');
    try {
        const r = await api('/api/plans/sort', { method: 'POST', body: JSON.stringify({ plan_type: currentPage }) });
        hideLoading(); toast('AI排序完成，已更新 ' + r.length + ' 条计划'); loadPlans();
    } catch (e) { hideLoading(); toast('AI排序失败: ' + e.message, true); }
}

// ---- Wishes ----

async function loadWishes() {
    try {
        const [w, b] = await Promise.all([api('/api/wishes'), api('/api/balance')]);
        renderWishes(w, b.balance);
    } catch (e) { toast('加载失败: ' + e.message, true); }
}

function renderWishes(wishes, bal) {
    const c = document.getElementById('wishList');
    if (!wishes.length) { c.innerHTML = '<div class="empty-state">暂无心愿</div>'; return; }
    c.innerHTML = wishes.map(w => `
        <div class="wish-card ${w.redeemed ? 'redeemed' : ''}">
            <div class="wish-info"><h4>${esc(w.name)}</h4>
                <div class="wish-meta">${w.real_price > 0 ? '¥' + w.real_price : ''}${w.redeemed ? ' · 已兑换' : ''}</div></div>
            <div class="wish-actions"><span class="wish-cost">${w.virtual_cost}</span>
                ${!w.redeemed ? `<button class="btn btn-success btn-sm" onclick="redeemWish(${w.id})" ${bal < w.virtual_cost ? 'disabled' : ''}>兑换</button>
                <button class="btn btn-danger btn-sm" onclick="deleteWish(${w.id})">删除</button>` : ''}</div>
        </div>`).join('');
}

let wishSaving = false;

function showAddWishModal() {
    document.getElementById('wishNameInput').value = '';
    document.getElementById('wishPriceInput').value = '';
    document.getElementById('wishCostInput').value = '';
    document.getElementById('wishModal').classList.add('show');
    setTimeout(() => document.getElementById('wishNameInput').focus(), 100);
}

async function saveWish() {
    if (wishSaving) return;
    const n = document.getElementById('wishNameInput').value.trim();
    const p = parseFloat(document.getElementById('wishPriceInput').value) || 0;
    const c = parseFloat(document.getElementById('wishCostInput').value) || null;
    if (!n) { toast('请输入心愿名称', true); return; }
    wishSaving = true;
    try {
        await api('/api/wishes', { method: 'POST', body: JSON.stringify({ name: n, real_price: p, virtual_cost: c }) });
        toast('心愿已添加'); closeModal('wishModal'); loadWishes();
    } catch (e) { toast('添加失败: ' + e.message, true); }
    finally { wishSaving = false; }
}

async function redeemWish(id) {
    if (!confirm('确定兑换？')) return;
    try { await api('/api/wishes/' + id + '/redeem', { method: 'POST' }); toast('兑换成功！'); loadWishes(); loadBalance(); }
    catch (e) { toast('兑换失败: ' + e.message, true); }
}

async function deleteWish(id) {
    if (!confirm('确定删除？')) return;
    try { await api('/api/wishes/' + id, { method: 'DELETE' }); toast('已删除'); loadWishes(); }
    catch (e) { toast('删除失败: ' + e.message, true); }
}

// ---- Transactions ----

async function loadTransactions() {
    try { renderTransactions(await api('/api/transactions')); }
    catch (e) { toast('加载失败: ' + e.message, true); }
}

function renderTransactions(txs) {
    const c = document.getElementById('txList');
    if (!txs.length) { c.innerHTML = '<div class="empty-state">暂无流水</div>'; return; }
    c.innerHTML = txs.map(tx => `
        <div class="tx-card"><div class="tx-info"><span class="tx-note">${esc(tx.note || tx.source)}</span><span class="tx-time">${fmtTime(tx.created_at)}</span></div>
        <span class="tx-amount ${tx.amount >= 0 ? 'positive' : 'negative'}">${tx.amount >= 0 ? '+' : ''}${tx.amount.toFixed(1)}</span></div>`).join('');
}

// ---- Settings ----

async function loadSettings() {
    try {
        const [a, s] = await Promise.all([api('/api/ai-settings'), api('/api/settings')]);
        document.getElementById('setBaseUrl').value = a.base_url || '';
        document.getElementById('setApiKey').value = a.api_key || '';
        document.getElementById('setModelNameManual').value = a.model_name || '';
        document.getElementById('setExtraHeaders').value = a.extra_headers || '{}';
        document.getElementById('setTodayMin').value = s.today_min || 1;
        document.getElementById('setTodayMax').value = s.today_max || 10;
        document.getElementById('setWeeklyMin').value = s.weekly_min || 1;
        document.getElementById('setWeeklyMax').value = s.weekly_max || 10;
        document.getElementById('setMonthlyMin').value = s.monthly_min || 10;
        document.getElementById('setMonthlyMax').value = s.monthly_max || 20;
        document.getElementById('setYearlyMin').value = s.yearly_min || 20;
        document.getElementById('setYearlyMax').value = s.yearly_max || 100;
    } catch (e) { toast('加载失败: ' + e.message, true); }
}

async function fetchModels() {
    const bu = document.getElementById('setBaseUrl').value.trim();
    const ak = document.getElementById('setApiKey').value.trim();
    if (!bu || !ak) { toast('请先填写 Base URL 和 API Key', true); return; }
    const btn = document.getElementById('fetchModelsBtn'); btn.disabled = true; btn.textContent = '获取中...';
    try {
        const d = await api('/api/ai-settings/models', { method: 'POST', body: JSON.stringify({ base_url: bu, api_key: ak, extra_headers: document.getElementById('setExtraHeaders').value.trim() }) });
        const sel = document.getElementById('setModelName');
        const man = document.getElementById('setModelNameManual');
        sel.innerHTML = '<option value="">-- 选择模型 --</option>';
        d.models.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; if (m === man.value) o.selected = true; sel.appendChild(o); });
        sel.onchange = () => { if (sel.value) man.value = sel.value; };
        toast('已获取 ' + d.models.length + ' 个模型');
    } catch (e) { toast('获取失败: ' + e.message, true); }
    finally { btn.disabled = false; btn.textContent = '获取模型'; }
}

async function saveAiSettings() {
    try {
        await api('/api/ai-settings', { method: 'PUT', body: JSON.stringify({
            base_url: document.getElementById('setBaseUrl').value.trim(),
            api_key: document.getElementById('setApiKey').value.trim(),
            model_name: document.getElementById('setModelNameManual').value.trim() || document.getElementById('setModelName').value || 'gpt-4',
            extra_headers: document.getElementById('setExtraHeaders').value.trim()
        })}); toast('AI设置已保存');
    } catch (e) { toast('保存失败: ' + e.message, true); }
}

async function testAiConnection() {
    const el = document.getElementById('testResult'); el.className = 'test-result'; el.style.display = 'none';
    showLoading('测试连接中...');
    try { await saveAiSettings(); const d = await api('/api/ai-settings/test', { method: 'POST' }); hideLoading(); el.textContent = d.message; el.className = 'test-result ' + (d.ok ? 'success' : 'error'); el.style.display = 'block'; }
    catch (e) { hideLoading(); el.textContent = '失败: ' + e.message; el.className = 'test-result error'; el.style.display = 'block'; }
}

async function checkUpdate() {
    const el = document.getElementById('updateResult');
    const btn = document.getElementById('updateBtn');
    el.className = 'test-result'; el.style.display = 'none';
    btn.disabled = true; btn.textContent = '检查中...';
    try {
        const d = await api('/api/update', { method: 'POST' });
        if (d.updated) {
            el.textContent = '发现新版本，正在更新...';
            el.className = 'test-result success'; el.style.display = 'block';
            setTimeout(() => location.reload(), 3000);
        } else {
            el.textContent = d.message || '已是最新版本';
            el.className = 'test-result success'; el.style.display = 'block';
        }
    } catch (e) {
        el.textContent = '检查失败: ' + e.message;
        el.className = 'test-result error'; el.style.display = 'block';
    } finally { btn.disabled = false; btn.textContent = '检查更新'; }
}

async function saveValueRanges() {
    try {
        await api('/api/settings', { method: 'PUT', body: JSON.stringify({
            today_min: document.getElementById('setTodayMin').value, today_max: document.getElementById('setTodayMax').value,
            weekly_min: document.getElementById('setWeeklyMin').value, weekly_max: document.getElementById('setWeeklyMax').value,
            monthly_min: document.getElementById('setMonthlyMin').value, monthly_max: document.getElementById('setMonthlyMax').value,
            yearly_min: document.getElementById('setYearlyMin').value, yearly_max: document.getElementById('setYearlyMax').value
        })}); toast('价值范围已保存');
    } catch (e) { toast('保存失败: ' + e.message, true); }
}

async function resetBalance() {
    if (!confirm('确定清零所有虚拟价值？此操作不可撤销。')) return;
    try {
        const d = await api('/api/balance/reset', { method: 'POST' });
        toast('已清零 ' + d.cleared.toFixed(1) + ' 虚拟价值');
        loadBalance();
    } catch (e) { toast('操作失败: ' + e.message, true); }
}

// ---- Modal ----

function closeModal(id) { document.getElementById(id).classList.remove('show'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')); });

// Progress slider label sync in modal
document.addEventListener('DOMContentLoaded', () => {
    const pi = document.getElementById('planProgressInput');
    const pl = document.getElementById('planProgressLabel');
    if (pi && pl) { pi.addEventListener('input', () => { pl.textContent = pi.value; }); }
});

function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function fmtTime(ts) { return ts ? new Date(ts).toLocaleString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : ''; }

document.addEventListener('DOMContentLoaded', () => { loadBalance(); loadPlans(); });
