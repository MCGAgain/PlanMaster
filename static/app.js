let currentPage = 'today';
let editingPlanId = null;
let planSaving = false;
let signatures = [];
let sigIndex = 0;

function switchPage(page) {
    currentPage = page;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const a = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (a) a.classList.add('active');
    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    if (page === 'checkin') {
        document.getElementById('page-checkin').classList.add('active');
        loadCheckins();
        showNextSignature();
    } else if (page === 'stats') {
        document.getElementById('page-stats').classList.add('active');
        loadStatsPage();
    } else if (page === 'focus') {
        document.getElementById('page-focus').classList.add('active');
        renderFocusPage();
        if (focusState === 'running') {
            focusElapsed = Math.floor((Date.now() - focusStartTime.getTime()) / 1000);
            const display = document.getElementById('focusTimerDisplay');
            if (display) {
                if (focusMode === 'countdown') {
                    display.textContent = fmtHMS(Math.max(0, focusTotalSec - focusElapsed));
                } else {
                    display.textContent = fmtHMS(focusElapsed);
                }
            }
            updateFocusTimerRing();
        }
    } else {
        const planPages = ['today', 'weekly', 'monthly', 'yearly'];
        if (planPages.includes(page)) {
            document.getElementById('page-plans').classList.add('active');
            const t = { today:'今日待办', weekly:'周计划', monthly:'月计划', yearly:'年计划' };
            document.getElementById('planTitle').textContent = t[page];
            loadPlans();
            showNextSignature();
        } else if (page === 'wishes') { document.getElementById('page-wishes').classList.add('active'); loadWishes(); }
        else if (page === 'transactions') { document.getElementById('page-transactions').classList.add('active'); loadTransactions(); }
        else if (page === 'recycle') { document.getElementById('page-recycle').classList.add('active'); loadRecycleBin(); }
        else if (page === 'settings') { document.getElementById('page-settings').classList.add('active'); loadSettings(); }
    }
}

function toggleGroup(h) { h.classList.toggle('collapsed'); h.nextElementSibling.classList.toggle('open'); }

// ---- Focus Sessions ----
let activeFocusSession = null;
let focusMode = 'unlimited';
let focusTotalSec = 0;
let focusState = 'setup'; // setup | running | complete
let focusStartTime = null;
let focusElapsed = 0;
let focusTimerInterval = null;
let focusCurrentSessionId = null;
let focusCurrentTask = '';
const FOCUS_RING_CIRCUMFERENCE = 2 * Math.PI * 120;

function selectFocusMode(mode) {
    focusMode = mode;
    document.querySelectorAll('.focus-mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.focus-mode-btn[data-mode="${mode}"]`).classList.add('active');
    document.getElementById('focusDurationGroup').style.display = mode === 'countdown' ? '' : 'none';
}

function renderFocusPage() {
    const setup = document.getElementById('focusSetup');
    const timer = document.getElementById('focusTimerArea');
    const complete = document.getElementById('focusComplete');
    setup.style.display = focusState === 'setup' ? '' : 'none';
    timer.style.display = focusState === 'running' ? '' : 'none';
    complete.style.display = focusState === 'complete' ? '' : 'none';
}

function fmtHMS(totalSec) {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function updateFocusTimerRing() {
    const ring = document.getElementById('focusRingFill');
    if (!ring) return;
    if (focusMode === 'unlimited') {
        const segments = Math.floor(focusElapsed / 3600);
        const segProgress = (focusElapsed % 3600) / 3600;
        const offset = FOCUS_RING_CIRCUMFERENCE * (1 - segProgress);
        ring.style.strokeDashoffset = offset;
    } else {
        const remaining = Math.max(0, focusTotalSec - focusElapsed);
        const progress = focusElapsed / focusTotalSec;
        const offset = FOCUS_RING_CIRCUMFERENCE * (1 - progress);
        ring.style.strokeDashoffset = offset;
    }
}

function startFocusTimerTick() {
    if (focusTimerInterval) return;
    focusTimerInterval = setInterval(() => {
        focusElapsed = Math.floor((Date.now() - focusStartTime.getTime()) / 1000);
        if (focusMode === 'countdown' && focusElapsed >= focusTotalSec) {
            focusElapsed = focusTotalSec;
            clearInterval(focusTimerInterval);
            focusTimerInterval = null;
            finishFocusTimer();
            return;
        }
        if (currentPage === 'focus') {
            const display = document.getElementById('focusTimerDisplay');
            if (display) {
                if (focusMode === 'countdown') {
                    display.textContent = fmtHMS(Math.max(0, focusTotalSec - focusElapsed));
                } else {
                    display.textContent = fmtHMS(focusElapsed);
                }
            }
            updateFocusTimerRing();
        }
        updatePlanCardFocusBtn();
    }, 1000);
}

function updatePlanCardFocusBtn() {
    if (!activeFocusSession) return;
    const card = document.querySelector(`.plan-card[data-id="${activeFocusSession.plan_id}"]`);
    if (card) {
        const btn = card.querySelector('.focus-btn');
        if (btn) {
            btn.textContent = fmtHMS(focusElapsed).substring(3);
            btn.classList.add('focusing');
        }
    }
}

async function startFocusTimer() {
    const task = document.getElementById('focusTaskInput').value.trim();
    if (!task) { toast('请输入任务名称', true); return; }

    if (focusMode === 'countdown') {
        const h = parseInt(document.getElementById('focusHours').value) || 0;
        const m = parseInt(document.getElementById('focusMinutes').value) || 0;
        focusTotalSec = h * 3600 + m * 60;
        if (focusTotalSec <= 0) { toast('请设置倒计时时长', true); return; }
    }

    try {
        const session = await api('/api/sessions', {
            method: 'POST',
            body: JSON.stringify({ plan_id: null, start_time: new Date().toISOString(), category: task })
        });
        focusCurrentSessionId = session.id;
        focusCurrentTask = task;
        focusStartTime = new Date(session.start_time);
        focusElapsed = 0;
        focusState = 'running';

        document.getElementById('focusTaskLabel').textContent = task;
        const infoEl = document.getElementById('focusModeLabel');
        if (focusMode === 'countdown') {
            infoEl.textContent = '倒计时 ' + fmtHMS(focusTotalSec);
        } else {
            infoEl.textContent = '不限时专注中';
        }

        renderFocusPage();
        startFocusTimerTick();

        if (focusMode === 'countdown') {
            const display = document.getElementById('focusTimerDisplay');
            if (display) display.textContent = fmtHMS(focusTotalSec);
        }
        updateFocusTimerRing();
    } catch (e) { toast('启动失败: ' + e.message, true); }
}

function finishFocusTimer() { stopFocusTimer(); }

async function stopFocusTimer() {
    if (!focusCurrentSessionId) return;
    if (focusTimerInterval) { clearInterval(focusTimerInterval); focusTimerInterval = null; }

    const endTime = new Date().toISOString();
    try {
        await api('/api/sessions/' + focusCurrentSessionId, {
            method: 'PUT',
            body: JSON.stringify({ end_time: endTime })
        });
        toast('专注已结束');
    } catch (e) { toast('结束失败: ' + e.message, true); }

    focusState = 'complete';
    document.getElementById('focusCompleteTitle').textContent =
        focusMode === 'countdown' && focusElapsed >= focusTotalSec ? '倒计时结束' : '专注完成';
    document.getElementById('focusCompleteDuration').textContent = fmtHMS(focusElapsed);
    document.getElementById('focusCompleteCategory').textContent = '任务: ' + focusCurrentTask;
    renderFocusPage();

    focusCurrentSessionId = null;
    activeFocusSession = null;
}

function cancelFocusTimer() {
    if (focusCurrentSessionId) {
        if (focusTimerInterval) { clearInterval(focusTimerInterval); focusTimerInterval = null; }
        api('/api/sessions/' + focusCurrentSessionId, { method: 'DELETE' }).catch(() => {});
        focusCurrentSessionId = null;
    }
    activeFocusSession = null;
    resetFocusPage();
}

function resetFocusPage() {
    focusState = 'setup';
    focusElapsed = 0;
    focusStartTime = null;
    focusCurrentTask = '';
    if (focusTimerInterval) { clearInterval(focusTimerInterval); focusTimerInterval = null; }
    const ring = document.getElementById('focusRingFill');
    if (ring) ring.style.strokeDashoffset = FOCUS_RING_CIRCUMFERENCE;
    renderFocusPage();
}

async function startFocus(planId) {
    try {
        const session = await api('/api/sessions', {
            method: 'POST',
            body: JSON.stringify({ plan_id: planId, start_time: new Date().toISOString() })
        });
        activeFocusSession = { id: session.id, plan_id: planId, start_time: new Date(session.start_time), interval: null };
        activeFocusSession.interval = setInterval(() => updateFocusCardDisplay(), 1000);
        updateFocusCardDisplay();
        toast('专注已开始');
    } catch (e) { toast('启动失败: ' + e.message, true); }
}

async function stopFocus() {
    if (!activeFocusSession) return;
    clearInterval(activeFocusSession.interval);
    try {
        await api('/api/sessions/' + activeFocusSession.id, {
            method: 'PUT',
            body: JSON.stringify({ end_time: new Date().toISOString() })
        });
        toast('专注已结束');
    } catch (e) { toast('结束失败: ' + e.message, true); }
    activeFocusSession = null;
    loadPlans();
}

function updateFocusCardDisplay() {
    if (!activeFocusSession) return;
    const elapsed = Math.floor((Date.now() - activeFocusSession.start_time.getTime()) / 1000);
    const card = document.querySelector(`.plan-card[data-id="${activeFocusSession.plan_id}"]`);
    if (card) {
        const btn = card.querySelector('.focus-btn');
        if (btn) {
            btn.textContent = fmtHMS(elapsed).substring(3);
            btn.classList.add('focusing');
        }
    }
}

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

// ---- Countdown Timer ----
const timers = {};

function parseSuggestedTime(str) {
    if (!str) return 0;
    const m = str.match(/([\d.]+)\s*(秒|分钟|小时)/);
    if (!m) return 0;
    const v = parseFloat(m[1]);
    return m[2] === '秒' ? v : m[2] === '分钟' ? v * 60 : v * 3600;
}

function fmtCountdown(s) {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
}

function startTimer(id, totalSec) {
    if (timers[id] && timers[id].interval) return;
    if (timers[id]) {
        // Resume from paused state: adjust startAt so elapsed = total - remaining
        timers[id].startAt = Date.now() - (timers[id].total - timers[id].remaining) * 1000;
    } else {
        timers[id] = { remaining: totalSec, total: totalSec, startAt: Date.now() };
    }
    const t = timers[id];
    t.interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - t.startAt) / 1000);
        t.remaining = Math.max(0, t.total - elapsed);
        const prog = Math.min(99, Math.round((1 - t.remaining / t.total) * 100));
        const card = document.querySelector(`.plan-card[data-id="${id}"]`);
        if (card) {
            const bar = card.querySelector('.plan-progress-bar');
            const txt = card.querySelector('.plan-progress-text');
            const input = card.querySelector('.plan-progress-input');
            const btn = card.querySelector('.timer-btn');
            if (bar) bar.style.width = prog + '%';
            if (txt) txt.textContent = prog + '%';
            if (input) input.value = prog;
            if (btn) btn.textContent = fmtCountdown(t.remaining);
        }
        if (t.remaining <= 0) {
            clearInterval(t.interval);
            delete timers[id];
            if (card) {
                const btn = card.querySelector('.timer-btn');
                if (btn) { btn.textContent = '开始'; btn.classList.remove('counting'); }
            }
        }
    }, 1000);
}

function stopTimer(id, preserve) {
    if (!timers[id]) return;
    clearInterval(timers[id].interval);
    timers[id].interval = null;
    if (!preserve) delete timers[id];
}

function toggleTimer(id, timeStr) {
    id = parseInt(id);
    if (timers[id] && timers[id].interval) { stopTimer(id, true); return; }
    if (timers[id]) { startTimer(id); return; }
    const sec = parseSuggestedTime(timeStr);
    if (sec > 0) startTimer(id, sec);
}

function planDateLabel(type) {
    const d = new Date();
    const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
    if (type === 'today') return (d.getMonth()+1) + '月' + d.getDate() + '日';
    if (type === 'weekly') return weekdays[d.getDay()];
    if (type === 'monthly') return (d.getMonth()+1) + '月';
    if (type === 'yearly') return d.getFullYear() + '年';
    return '';
}

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

function showNextSignature() {
    const bar = document.getElementById('signatureBar');
    if (!bar) return;
    if (!signatures.length) { bar.classList.remove('show'); bar.textContent = ''; return; }
    bar.textContent = signatures[sigIndex % signatures.length];
    bar.classList.add('show');
    sigIndex++;
}

async function loadSignatures() {
    try {
        const rows = await api('/api/signatures');
        signatures = rows.map(r => r.content);
        showNextSignature();
    } catch (e) {}
}

async function saveSignatures() {
    const raw = document.getElementById('signaturesInput').value;
    const contents = raw.split('\n');
    try {
        await api('/api/signatures', { method: 'PUT', body: JSON.stringify({ contents }) });
        signatures = contents.filter(c => c.trim());
        toast('签名已保存');
    } catch (e) { toast('保存失败: ' + e.message, true); }
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
        const active = await api('/api/plans?type=' + currentPage);
        renderPlans(active);
        try {
            const all = await api('/api/plans/all?type=' + currentPage);
            updateCategoryProgress(all);
        } catch (_) {
            updateCategoryProgress(active);
        }
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
        const timerProg = timers[p.id] ? Math.min(99, Math.round((1 - timers[p.id].remaining / timers[p.id].total) * 100)) : null;
        const prog = timerProg !== null ? timerProg : Math.min(100, Math.max(0, p.progress || 0));
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
                    <div class="plan-card-title">${esc(p.title)}${planDateLabel(p.plan_type) ? `<span class="plan-date-label">${planDateLabel(p.plan_type)}</span>` : ''}</div>
                    <div class="plan-card-meta">
                        <span class="plan-type-tag" style="background:${PLAN_TYPE_COLORS[p.plan_type] || '#7c6ef0'}">${PLAN_TYPE_LABELS[p.plan_type] || p.plan_type}</span>
                        ${p.suggested_time ? `<span class="plan-badge badge-time">&#128336; ${esc(p.suggested_time)}</span>
                        <button class="btn timer-btn${timers[p.id] ? ' counting' : ''}" data-id="${p.id}" data-time="${esc(p.suggested_time)}" onclick="toggleTimer(this.dataset.id,this.dataset.time)">${timers[p.id] ? fmtCountdown(timers[p.id].remaining) : '开始'}</button>` : ''}
                        <button class="btn focus-btn btn-sm${activeFocusSession && activeFocusSession.plan_id === p.id ? ' focusing' : ''}" onclick="${activeFocusSession && activeFocusSession.plan_id === p.id ? 'stopFocus()' : 'startFocus(' + p.id + ')'}">${activeFocusSession && activeFocusSession.plan_id === p.id ? '...' : '&#9654; 专注'}</button>
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
    if (v >= 100) stopTimer(id);
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
        const plans = await api('/api/plans/all?type=' + currentPage);
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
            const newPlan = await api('/api/plans', { method: 'POST', body: JSON.stringify(body) });
            toast('计划已创建');
            closeModal('planModal'); loadPlans();
            if (pri === '' && val === '' && newPlan && newPlan.id) {
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

async function deletePlan(id) {
    if (!confirm('确定删除此计划？')) return;
    stopTimer(id);
    try { await api('/api/plans/' + id, { method: 'DELETE' }); toast('计划已删除'); loadPlans(); }
    catch (e) { toast('删除失败: ' + e.message, true); }
}

async function completePlan(id) {
    stopTimer(id);
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
        const [a, s, sigs] = await Promise.all([api('/api/ai-settings'), api('/api/settings'), api('/api/signatures')]);
        loadVersion();
        document.getElementById('signaturesInput').value = sigs.map(r => r.content).join('\n');
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
        document.getElementById('setCheckinDailyInc').value = s.checkin_daily_increment || 1;
        document.getElementById('setCheckinMaxVal').value = s.checkin_max_value || 30;
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

async function loadVersion() {
    try {
        const d = await api('/api/version');
        document.getElementById('appVersion').textContent = d.version || '1.3.8';
    } catch (e) {}
}

function window_updateDownloadProgress(pct) {
    const wrap = document.getElementById('updateProgress');
    const bar = document.getElementById('updateProgressBar');
    const pLabel = document.getElementById('updateProgressLabel');
    const pPct = document.getElementById('updateProgressPct');
    if (!wrap) return;
    if (pct < 0) {
        wrap.style.display = 'block';
        pLabel.textContent = '准备更新...';
        pPct.textContent = '';
        bar.style.width = '0%';
        return;
    }
    wrap.style.display = 'block';
    bar.style.width = pct + '%';
    pPct.textContent = pct + '%';
    if (pct >= 100) {
        pLabel.textContent = '正在重启安装...';
        pPct.textContent = '100%';
    }
}
window.updateDownloadProgress = window_updateDownloadProgress;

async function checkUpdate() {
    const el = document.getElementById('updateResult');
    const btn = document.getElementById('updateBtn');
    const prog = document.getElementById('updateProgress');
    el.className = 'test-result'; el.style.display = 'none';
    if (prog) prog.style.display = 'none';
    btn.disabled = true; btn.textContent = '检查中...';
    try {
        const d = await api('/api/update', { method: 'POST' });
        if (d.downloading) {
            el.textContent = d.message;
            el.className = 'test-result success'; el.style.display = 'block';
            pollUpdateStatus();
            return;
        }
        el.textContent = d.message || '已是最新版本';
        el.className = 'test-result success'; el.style.display = 'block';
    } catch (e) {
        el.textContent = '检查失败: ' + e.message;
        el.className = 'test-result error'; el.style.display = 'block';
    } finally { btn.disabled = false; btn.textContent = '检查更新'; }
}

async function pollUpdateStatus() {
    const el = document.getElementById('updateResult');
    const btn = document.getElementById('updateBtn');
    const poll = setInterval(async () => {
        try {
            const d = await api('/api/update/status');
            if (d.status === 'idle') { clearInterval(poll); btn.disabled = false; btn.textContent = '检查更新'; return; }
            if (d.status === 'error') {
                clearInterval(poll);
                el.textContent = d.message || '更新失败';
                el.className = 'test-result error'; el.style.display = 'block';
                btn.disabled = false; btn.textContent = '检查更新';
                document.getElementById('updateProgress').style.display = 'none';
            }
        } catch { clearInterval(poll); btn.disabled = false; btn.textContent = '检查更新'; }
    }, 2000);
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

// ---- Check-in ----

async function loadCheckins() {
    try {
        const items = await api('/api/checkin-items');
        renderCheckins(items);
    } catch (e) { toast('加载失败: ' + e.message, true); }
}

function renderCheckins(items) {
    const c = document.getElementById('checkinList');
    if (!items.length) { c.innerHTML = '<div class="empty-state">暂无打卡项目，点击右上角添加</div>'; return; }
    c.innerHTML = items.map(item => {
        const pct = Math.min(100, Math.round((item.current_value / 30) * 100));
        return `
        <div class="plan-card" data-id="${item.id}">
            <div class="checkin-icon">${item.checked_today ? '&#9989;' : '&#9744;'}</div>
            <div class="plan-card-body">
                <div class="plan-card-header">
                    <div class="plan-card-title">${esc(item.name)}
                        <span class="plan-badge badge-checkin-streak">连续 ${item.streak} 天</span>
                        ${item.current_value > 0 ? `<span class="plan-badge badge-checkin-value">${item.current_value} 价值</span>` : ''}
                    </div>
                </div>
                <div class="plan-progress">
                    <div class="plan-progress-track">
                        <div class="plan-progress-bar checkin-bar" style="width:${pct}%"></div>
                    </div>
                    <span class="plan-progress-text">${item.current_value}</span>
                </div>
                <div class="plan-card-actions">
                    ${!item.checked_today ? `<button class="btn btn-success btn-sm" onclick="doCheckin(${item.id})">&#9989; 打卡</button>` : '<span class="checkin-done">今日已打卡</span>'}
                    <button class="btn btn-danger btn-sm" onclick="deleteCheckinItem(${item.id})">删除</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function showAddCheckinModal() {
    document.getElementById('checkinNameInput').value = '';
    document.getElementById('checkinModal').classList.add('show');
}

let checkinSaving = false;
async function saveCheckin() {
    const name = document.getElementById('checkinNameInput').value.trim();
    if (!name) { toast('请输入打卡名称', true); return; }
    if (checkinSaving) return;
    checkinSaving = true;
    try {
        await api('/api/checkin-items', { method: 'POST', body: JSON.stringify({ name }) });
        toast('打卡项目已创建');
        closeModal('checkinModal');
        loadCheckins();
    } catch (e) { toast('创建失败: ' + e.message, true); }
    finally { checkinSaving = false; }
}

async function doCheckin(id) {
    try {
        await api('/api/checkin/' + id, { method: 'POST' });
        toast('打卡成功！');
        loadCheckins();
        loadBalance();
    } catch (e) { toast(e.message, true); }
}

async function deleteCheckinItem(id) {
    if (!confirm('确定删除此打卡项目？所有记录将被清除。')) return;
    try {
        await api('/api/checkin-items/' + id, { method: 'DELETE' });
        toast('已删除');
        loadCheckins();
    } catch (e) { toast('删除失败: ' + e.message, true); }
}

async function saveCheckinSettings() {
    try {
        await api('/api/settings', { method: 'PUT', body: JSON.stringify({
            checkin_daily_increment: document.getElementById('setCheckinDailyInc').value,
            checkin_max_value: document.getElementById('setCheckinMaxVal').value,
        })});
        toast('打卡设置已保存');
    } catch (e) { toast('保存失败: ' + e.message, true); }
}

// ---- Statistics Page ----
let statsDate = new Date();
let statsMonth = new Date();
let statsPeriod = 'day';
let donutChart = null;
let barChart = null;

const CHART_COLORS = [
    '#7c6ef0', '#a78bfa', '#c4b5fd', '#3b82f6', '#60a5fa',
    '#10b981', '#34d399', '#f59e0b', '#fbbf24', '#f87171',
    '#ec4899', '#8b5cf6'
];

function fmtDuration(seconds) {
    if (!seconds || seconds <= 0) return '0小时0分钟';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0 && m > 0) return h + '小时' + m + '分钟';
    if (h > 0) return h + '小时';
    return m + '分钟';
}

function fmtDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function fmtMonth(d) {
    return d.getFullYear() + '年' + String(d.getMonth() + 1).padStart(2, '0') + '月';
}

function fmtMonthParam(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

async function loadStatsPage() {
    statsDate = new Date();
    statsMonth = new Date();
    document.getElementById('statsDateLabel').textContent = fmtDate(statsDate);
    document.getElementById('statsDistDate').textContent = fmtDate(statsDate);
    document.getElementById('statsMonthLabel').textContent = fmtMonth(statsMonth);
    await Promise.all([
        loadCumulativeStats(),
        loadDailyStats(),
        loadDistributionStats(),
        loadMonthlyStats()
    ]);
}

async function loadCumulativeStats() {
    try {
        const d = await api('/api/stats/cumulative');
        document.getElementById('statTotalCount').textContent = d.count;
        document.getElementById('statTotalDuration').textContent = fmtDuration(d.total_duration);
        document.getElementById('statDailyAvg').textContent = fmtDuration(d.daily_avg);
        const sinceEl = document.getElementById('statsSinceDate');
        if (d.first_date) sinceEl.textContent = '自 ' + d.first_date + ' 起';
        else sinceEl.textContent = '';
    } catch (e) {}
}

async function loadDailyStats() {
    try {
        const d = await api('/api/stats/daily?date=' + fmtDate(statsDate));
        document.getElementById('statDailyCount').textContent = d.count;
        document.getElementById('statDailyDuration').textContent = fmtDuration(d.duration);
    } catch (e) {}
}

function statsDatePrev() {
    statsDate.setDate(statsDate.getDate() - 1);
    document.getElementById('statsDateLabel').textContent = fmtDate(statsDate);
    loadDailyStats();
}

function statsDateNext() {
    statsDate.setDate(statsDate.getDate() + 1);
    document.getElementById('statsDateLabel').textContent = fmtDate(statsDate);
    loadDailyStats();
}

function switchStatsPeriod(period) {
    statsPeriod = period;
    document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.period-tab[data-period="${period}"]`).classList.add('active');
    loadDistributionStats();
}

async function loadDistributionStats() {
    try {
        const d = await api('/api/stats/distribution?period=' + statsPeriod + '&date=' + fmtDate(statsDate));
        renderDonutChart(d.items, d.total_duration);
    } catch (e) {}
}

function renderDonutChart(items, totalDuration) {
    const ctx = document.getElementById('donutChart').getContext('2d');
    if (donutChart) { donutChart.destroy(); donutChart = null; }
    const legend = document.getElementById('donutLegend');
    if (!items || !items.length) {
        legend.innerHTML = '<div class="empty-state" style="padding:20px">暂无数据</div>';
        return;
    }
    donutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: items.map(i => i.category),
            datasets: [{
                data: items.map(i => i.total_duration),
                backgroundColor: items.map((_, idx) => CHART_COLORS[idx % CHART_COLORS.length]),
                borderColor: 'rgba(255,255,255,.6)',
                borderWidth: 2,
                hoverBorderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: false,
            cutout: '60%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(255,255,255,.9)',
                    titleColor: '#2d2655',
                    bodyColor: '#2d2655',
                    borderColor: 'rgba(124,110,240,.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: { label: function(ctx) { return ctx.label + ': ' + fmtDuration(ctx.raw); } }
                }
            }
        }
    });
    legend.innerHTML = items.map((item, idx) => {
        const color = CHART_COLORS[idx % CHART_COLORS.length];
        return `<div class="legend-item" data-idx="${idx}" onclick="toggleDonutSector(${idx})">
            <div class="legend-left"><span class="legend-color" style="background:${color}"></span><span class="legend-name">${esc(item.category)}</span></div>
            <div class="legend-right"><span class="legend-duration">${fmtDuration(item.total_duration)}</span><span class="legend-pct">${item.percentage}%</span></div>
        </div>`;
    }).join('');
}

function toggleDonutSector(idx) {
    if (!donutChart) return;
    const meta = donutChart.getDatasetMeta(0);
    meta.data[idx].hidden = !meta.data[idx].hidden;
    donutChart.update();
    const legendItem = document.querySelector(`.legend-item[data-idx="${idx}"]`);
    if (legendItem) legendItem.classList.toggle('disabled');
}

async function loadMonthlyStats() {
    try {
        const d = await api('/api/stats/monthly?month=' + fmtMonthParam(statsMonth));
        renderBarChart(d);
    } catch (e) {}
}

function statsMonthPrev() {
    statsMonth.setMonth(statsMonth.getMonth() - 1);
    document.getElementById('statsMonthLabel').textContent = fmtMonth(statsMonth);
    loadMonthlyStats();
}

function statsMonthNext() {
    statsMonth.setMonth(statsMonth.getMonth() + 1);
    document.getElementById('statsMonthLabel').textContent = fmtMonth(statsMonth);
    loadMonthlyStats();
}

function renderBarChart(data) {
    const canvas = document.getElementById('barChart');
    const ctx = canvas.getContext('2d');
    if (barChart) { barChart.destroy(); barChart = null; }
    const labels = data.map(d => d.day);
    const values = data.map(d => Math.round(d.duration / 60));
    const chartWidth = Math.max(600, data.length * 24);
    canvas.style.width = chartWidth + 'px';
    canvas.width = chartWidth;
    barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: 'rgba(124,110,240,.6)',
                borderColor: 'rgba(124,110,240,.8)',
                borderWidth: 1,
                borderRadius: 4,
                hoverBackgroundColor: 'rgba(124,110,240,.85)'
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(255,255,255,.9)',
                    titleColor: '#2d2655',
                    bodyColor: '#2d2655',
                    borderColor: 'rgba(124,110,240,.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: { label: function(ctx) { return ctx.raw + ' 分钟'; } }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#7a7494', font: { size: 11 } } },
                y: { grid: { color: 'rgba(124,110,240,.08)', drawBorder: false }, ticks: { color: '#7a7494', font: { size: 11 }, callback: function(val) { return val + ' min'; } }, beginAtZero: true }
            }
        }
    });
}

// Progress slider label sync in modal
document.addEventListener('DOMContentLoaded', () => {
    const pi = document.getElementById('planProgressInput');
    const pl = document.getElementById('planProgressLabel');
    if (pi && pl) { pi.addEventListener('input', () => { pl.textContent = pi.value; }); }
});

function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function fmtTime(ts) { return ts ? new Date(ts).toLocaleString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : ''; }

document.addEventListener('DOMContentLoaded', () => { loadBalance(); loadPlans(); loadSignatures(); });
