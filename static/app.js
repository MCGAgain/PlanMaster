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
        else if (page === 'apibalance') { document.getElementById('page-apibalance').classList.add('active'); loadApiBalance(); }
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
            btn.textContent = focusElapsed >= 3600 ? fmtHMS(focusElapsed) : fmtHMS(focusElapsed).substring(3);
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

async function restoreFocusSession() {
    try {
        const sessions = await api('/api/sessions');
        const unfinished = sessions.find(s => !s.end_time);
        if (!unfinished) return;

        const elapsed = (Date.now() - new Date(unfinished.start_time).getTime()) / 1000;
        if (elapsed > 14400) {
            await api('/api/sessions/' + unfinished.id, {
                method: 'PUT',
                body: JSON.stringify({ end_time: new Date().toISOString() })
            });
            return;
        }

        const now = new Date();
        await api('/api/sessions/' + unfinished.id, {
            method: 'PATCH',
            body: JSON.stringify({ start_time: now.toISOString() })
        });

        if (unfinished.plan_id) {
            activeFocusSession = { id: unfinished.id, plan_id: unfinished.plan_id, start_time: now, interval: null };
            activeFocusSession.interval = setInterval(() => updateFocusCardDisplay(), 1000);
        } else {
            focusCurrentSessionId = unfinished.id;
            focusCurrentTask = unfinished.category || '';
            focusStartTime = now;
            focusElapsed = 0;
            focusState = 'running';
            document.getElementById('focusTaskLabel').textContent = focusCurrentTask;
            document.getElementById('focusModeLabel').textContent = '不限时专注中';
            renderFocusPage();
            startFocusTimerTick();
        }
    } catch (e) {}
}

async function toggleFocus(planId) {
    if (activeFocusSession && activeFocusSession.plan_id === planId) {
        await stopFocus();
    } else {
        if (activeFocusSession) await stopFocus();
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
            btn.innerHTML = '&#9632; ' + fmtHMS(elapsed).substring(3);
            btn.classList.add('focusing');
        }
    }
}

async function api(url, opts = {}) {
    const headers = {};
    if (opts.body) headers['Content-Type'] = 'application/json';
    const r = await fetch(url, { headers, ...opts });
    let d;
    try { d = await r.json(); } catch (_) { d = {}; }
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

// ---- Pinyin Mapping ----
const PINYIN_MAP = {
    '啊':'a','阿':'a','哎':'ai','哀':'ai','唉':'ai','爱':'ai','安':'an','按':'an','暗':'an','案':'an',
    '昂':'ang','奥':'ao','八':'ba','把':'ba','爸':'ba','吧':'ba','白':'bai','百':'bai','摆':'bai','败':'bai',
    '班':'ban','搬':'ban','半':'ban','办':'ban','伴':'ban','帮':'bang','棒':'bang','包':'bao','宝':'bao','报':'bao',
    '抱':'bao','暴':'bao','爆':'bao','杯':'bei','北':'bei','被':'bei','背':'bei','备':'bei','奔':'ben','本':'ben',
    '比':'bi','笔':'bi','必':'bi','币':'bi','避':'bi','边':'bian','变':'bian','便':'bian','遍':'bian','标':'biao',
    '表':'biao','别':'bie','宾':'bin','冰':'bing','并':'bing','病':'bing','波':'bo','博':'bo','补':'bu','不':'bu',
    '步':'bu','部':'bu','擦':'ca','猜':'cai','才':'cai','财':'cai','菜':'cai','参':'can','餐':'can','残':'can',
    '草':'cao','策':'ce','层':'ceng','曾':'ceng','差':'cha','查':'cha','茶':'cha','拆':'chai','产':'chan','长':'chang',
    '常':'chang','场':'chang','唱':'chang','超':'chao','朝':'chao','潮':'chao','车':'che','陈':'chen','称':'cheng','成':'cheng',
    '城':'cheng','程':'cheng','吃':'chi','持':'chi','尺':'chi','冲':'chong','虫':'chong','抽':'chou','出':'chu','初':'chu',
    '除':'chu','楚':'chu','处':'chu','穿':'chuan','传':'chuan','窗':'chuang','创':'chuang','吹':'chui','春':'chun','词':'ci',
    '此':'ci','次':'ci','从':'cong','粗':'cu','催':'cui','存':'cun','错':'cuo','达':'da','打':'da','大':'da',
    '呆':'dai','带':'dai','代':'dai','单':'dan','但':'dan','淡':'dan','蛋':'dan','当':'dang','刀':'dao','到':'dao',
    '道':'dao','得':'de','的':'de','灯':'deng','等':'deng','低':'di','地':'di','弟':'di','第':'di','点':'dian',
    '电':'dian','店':'dian','调':'diao','顶':'ding','定':'ding','东':'dong','冬':'dong','懂':'dong','动':'dong','都':'dou',
    '读':'du','度':'du','短':'duan','段':'duan','对':'dui','多':'duo','朵':'duo','额':'e','恶':'e','儿':'er',
    '耳':'er','二':'er','发':'fa','法':'fa','烦':'fan','反':'fan','饭':'fan','方':'fang','房':'fang','放':'fang',
    '飞':'fei','非':'fei','费':'fei','分':'fen','风':'feng','封':'feng','夫':'fu','服':'fu','福':'fu','父':'fu',
    '复':'fu','付':'fu','负':'fu','富':'fu','该':'gai','改':'gai','干':'gan','感':'gan','刚':'gang','高':'gao',
    '搞':'gao','告':'gao','哥':'ge','歌':'ge','个':'ge','各':'ge','给':'gei','根':'gen','跟':'gen','更':'geng',
    '工':'gong','公':'gong','功':'gong','共':'gong','够':'gou','购':'gou','古':'gu','股':'gu','故':'gu','顾':'gu',
    '瓜':'gua','挂':'gua','关':'guan','观':'guan','管':'guan','光':'guang','广':'guang','贵':'gui','国':'guo','果':'guo',
    '过':'guo','哈':'ha','还':'hai','孩':'hai','海':'hai','害':'hai','含':'han','喊':'han','汉':'han','好':'hao',
    '号':'hao','喝':'he','和':'he','合':'he','何':'he','河':'he','很':'hen','红':'hong','后':'hou','候':'hou',
    '厚':'hou','呼':'hu','湖':'hu','虎':'hu','互':'hu','花':'hua','华':'hua','化':'hua','话':'hua','画':'hua',
    '怀':'huai','坏':'huai','欢':'huan','还':'huan','环':'huan','换':'huan','黄':'huang','回':'hui','会':'hui','婚':'hun',
    '活':'huo','火':'huo','或':'huo','机':'ji','鸡':'ji','基':'ji','极':'ji','集':'ji','及':'ji','急':'ji',
    '即':'ji','计':'ji','记':'ji','技':'ji','际':'ji','继':'ji','加':'jia','家':'jia','假':'jia','价':'jia',
    '驾':'jia','架':'jia','间':'jian','件':'jian','见':'jian','建':'jian','健':'jian','将':'jiang','江':'jiang','讲':'jiang',
    '奖':'jiang','交':'jiao','教':'jiao','叫':'jiao','接':'jie','街':'jie','节':'jie','结':'jie','姐':'jie','解':'jie',
    '介':'jie','今':'jin','金':'jin','仅':'jin','进':'jin','近':'jin','京':'jing','经':'jing','精':'jing','景':'jing',
    '静':'jing','境':'jing','究':'jiu','九':'jiu','久':'jiu','就':'jiu','举':'ju','句':'ju','具':'ju','据':'ju',
    '决':'jue','觉':'jue','军':'jun','开':'kan','看':'kan','康':'kang','考':'kao','可':'ke','克':'ke','刻':'ke',
    '客':'ke','课':'ke','空':'kong','孔':'kong','口':'kou','快':'kuai','况':'kuang','困':'kun','拉':'la','啦':'la',
    '来':'lai','蓝':'lan','篮':'lan','老':'lao','了':'le','乐':'le','雷':'lei','累':'lei','冷':'leng','离':'li',
    '李':'li','里':'li','理':'li','力':'li','历':'li','利':'li','立':'li','连':'lian','联':'lian','脸':'lian',
    '练':'lian','亮':'liang','两':'liang','辆':'liang','量':'liang','了':'liao','林':'lin','灵':'ling','领':'ling','另':'ling',
    '六':'liu','龙':'long','楼':'lou','路':'lu','录':'lu','旅':'lv','绿':'lv','乱':'luan','论':'lun','落':'luo',
    '妈':'ma','马':'ma','吗':'ma','买':'mai','卖':'mai','满':'man','慢':'man','忙':'mang','毛':'mao','么':'me',
    '没':'mei','每':'mei','美':'mei','门':'men','们':'men','米':'mi','面':'mian','民':'min','名':'ming','明':'ming',
    '命':'ming','末':'mo','莫':'mo','母':'mu','木':'mu','目':'mu','拿':'na','那':'na','哪':'na','奶':'nai',
    '南':'nan','难':'nan','脑':'nao','呢':'ne','内':'nei','能':'neng','你':'ni','年':'nian','念':'nian','娘':'niang',
    '鸟':'niao','您':'nin','牛':'niu','农':'nong','女':'nv','暖':'nuan','哦':'o','欧':'ou','怕':'pa','排':'pai',
    '派':'pai','盘':'pan','判':'pan','跑':'pao','配':'pei','朋':'peng','批':'pi','片':'pian','漂':'piao','票':'piao',
    '品':'pin','平':'ping','评':'ping','瓶':'ping','破':'po','七':'qi','期':'qi','其':'qi','奇':'qi','起':'qi',
    '企':'qi','气':'qi','汽':'qi','千':'qian','前':'qian','钱':'qian','强':'qiang','桥':'qiao','切':'qie','亲':'qin',
    '青':'qing','清':'qing','情':'qing','请':'qing','秋':'qiu','球':'qiu','区':'qu','去':'qu','全':'quan','权':'quan',
    '然':'ran','让':'rang','热':'re','人':'ren','认':'ren','任':'ren','日':'ri','容':'rong','肉':'rou','如':'ru',
    '入':'ru','三':'san','色':'se','山':'shan','善':'shan','上':'shang','少':'shao','绍':'shao','社':'she','设':'she',
    '身':'shen','深':'shen','什':'shen','生':'sheng','声':'sheng','省':'sheng','师':'shi','十':'shi','石':'shi','时':'shi',
    '实':'shi','食':'shi','史':'shi','始':'shi','使':'shi','是':'shi','市':'shi','事':'shi','势':'shi','试':'shi',
    '视':'shi','收':'shou','手':'shou','首':'shou','受':'shou','书':'shu','输':'shu','术':'shu','树':'shu','数':'shu',
    '双':'shuang','谁':'shui','水':'shui','睡':'shui','顺':'shun','说':'shuo','思':'si','死':'si','四':'si','送':'song',
    '速':'su','算':'suan','虽':'sui','随':'sui','岁':'sui','所':'suo','他':'ta','她':'ta','它':'ta','台':'tai',
    '太':'tai','谈':'tan','汤':'tang','特':'te','疼':'teng','提':'ti','题':'ti','体':'ti','天':'tian','田':'tian',
    '条':'tiao','铁':'tie','听':'ting','停':'ting','通':'tong','同':'tong','统':'tong','头':'tou','图':'tu','土':'tu',
    '团':'tuan','推':'tui','退':'tui','外':'wai','完':'wan','玩':'wan','万':'wan','网':'wang','往':'wang','忘':'wang',
    '望':'wang','为':'wei','位':'wei','味':'wei','文':'wen','问':'wen','我':'wo','无':'wu','五':'wu','武':'wu',
    '午':'wu','物':'wu','务':'wu','西':'xi','希':'xi','息':'xi','习':'xi','系':'xi','细':'xi','下':'xia',
    '夏':'xia','先':'xian','现':'xian','线':'xian','相':'xiang','想':'xiang','向':'xiang','象':'xiang','小':'xiao','校':'xiao',
    '笑':'xiao','些':'xie','写':'xie','谢':'xie','心':'xin','新':'xin','信':'xin','星':'xing','行':'xing','醒':'xing',
    '兴':'xing','幸':'xing','性':'xing','姓':'xing','修':'xiu','需':'xu','许':'xu','续':'xu','选':'xuan','学':'xue',
    '雪':'xue','血':'xue','寻':'xun','呀':'ya','牙':'ya','亚':'ya','言':'yan','研':'yan','眼':'yan','演':'yan',
    '验':'yan','阳':'yang','养':'yang','样':'yang','要':'yao','药':'yao','也':'ye','业':'ye','叶':'ye','一':'yi',
    '衣':'yi','医':'yi','已':'yi','以':'yi','亿':'yi','意':'yi','义':'yi','艺':'yi','因':'yin','音':'yin',
    '银':'yin','应':'ying','英':'ying','影':'ying','营':'ying','永':'yong','用':'yong','优':'you','由':'you','游':'you',
    '有':'you','友':'you','又':'you','右':'you','鱼':'yu','雨':'yu','语':'yu','元':'yuan','原':'yuan','员':'yuan',
    '园':'yuan','远':'yuan','院':'yuan','月':'yue','越':'yue','云':'yun','运':'yun','杂':'za','在':'zai','再':'zai',
    '咱':'zan','早':'zao','造':'zao','则':'ze','怎':'zen','曾':'zeng','展':'zhan','占':'zhan','站':'zhan','长':'zhang',
    '张':'zhang','章':'zhang','找':'zhao','照':'zhao','者':'zhe','这':'zhe','真':'zhen','正':'zheng','整':'zheng','之':'zhi',
    '知':'zhi','直':'zhi','只':'zhi','指':'zhi','至':'zhi','制':'zhi','治':'zhi','中':'zhong','钟':'zhong','种':'zhong',
    '重':'zhong','众':'zhong','周':'zhou','主':'zhu','住':'zhu','注':'zhu','助':'zhu','专':'zhuan','转':'zhuan','装':'zhuang',
    '状':'zhuang','准':'zhun','桌':'zhuo','子':'zi','自':'zi','字':'zi','总':'zong','走':'zou','足':'zu','组':'zu',
    '祖':'zu','最':'zui','昨':'zuo','左':'zuo','做':'zuo','作':'zuo','座':'zuo'
};

function toPinyin(str) {
    let result = '';
    for (const ch of str) {
        result += PINYIN_MAP[ch] || ch.toLowerCase();
    }
    return result;
}

function toPinyinInitials(str) {
    let result = '';
    for (const ch of str) {
        const py = PINYIN_MAP[ch];
        if (py) result += py[0];
        else if (/[a-z0-9]/i.test(ch)) result += ch.toLowerCase();
    }
    return result;
}

function matchPinyin(title, keyword) {
    if (!keyword) return true;
    const kw = keyword.toLowerCase();
    const titleLower = title.toLowerCase();
    if (titleLower.includes(kw)) return true;
    if (toPinyin(title).includes(kw)) return true;
    if (toPinyinInitials(title).includes(kw)) return true;
    return false;
}

// ---- Recycle Bin Filter ----
let recycleFilterType = 'all';
let recycleSearchKeyword = '';

function setRecycleFilter(type) {
    recycleFilterType = type;
    document.querySelectorAll('.recycle-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.type === type));
    filterAndRenderRecycle();
}

function onRecycleSearch(e) {
    recycleSearchKeyword = e.target.value.trim();
    const clearBtn = document.getElementById('recycleSearchClear');
    if (clearBtn) clearBtn.style.display = recycleSearchKeyword ? 'flex' : 'none';
    filterAndRenderRecycle();
}

function clearRecycleSearch() {
    recycleSearchKeyword = '';
    const input = document.getElementById('recycleSearchInput');
    if (input) input.value = '';
    const clearBtn = document.getElementById('recycleSearchClear');
    if (clearBtn) clearBtn.style.display = 'none';
    filterAndRenderRecycle();
}

let allRecyclePlans = [];

function filterAndRenderRecycle() {
    let filtered = allRecyclePlans;
    if (recycleFilterType !== 'all') {
        filtered = filtered.filter(p => p.plan_type === recycleFilterType);
    }
    if (recycleSearchKeyword) {
        filtered = filtered.filter(p => matchPinyin(p.title, recycleSearchKeyword));
    }
    renderRecycleBin(filtered, allRecyclePlans);
}

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
    timers[id] = { remaining: totalSec, total: totalSec, startAt: Date.now() };
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

function stopTimer(id) {
    if (!timers[id]) return;
    clearInterval(timers[id].interval);
    delete timers[id];
    const card = document.querySelector(`.plan-card[data-id="${id}"]`);
    if (card) {
        const btn = card.querySelector('.timer-btn');
        if (btn) { btn.textContent = '开始'; btn.classList.remove('counting'); }
    }
}

function toggleTimer(id, timeStr) {
    id = parseInt(id);
    if (timers[id]) { stopTimer(id); return; }
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
                <div class="plan-card-title">${esc(p.title)}${planDateLabel(p.plan_type) ? `<span class="plan-date-label">${planDateLabel(p.plan_type)}</span>` : ''}</div>
                <div class="plan-card-meta">
                    <span class="plan-type-tag" style="background:${PLAN_TYPE_COLORS[p.plan_type] || '#7c6ef0'}">${PLAN_TYPE_LABELS[p.plan_type] || p.plan_type}</span>
                    ${p.suggested_time ? `<span class="plan-badge badge-time">&#128336; ${esc(p.suggested_time)}</span>
                    <button class="btn timer-btn${timers[p.id] ? ' counting' : ''}" data-id="${p.id}" data-time="${esc(p.suggested_time)}" onclick="toggleTimer(this.dataset.id,this.dataset.time)">${timers[p.id] ? fmtCountdown(timers[p.id].remaining) : '开始'}</button>` : ''}
                    <button class="btn focus-btn btn-sm${activeFocusSession && activeFocusSession.plan_id === p.id ? ' focusing' : ''}" onclick="toggleFocus(${p.id})">${activeFocusSession && activeFocusSession.plan_id === p.id ? '&#9632; 停止' : '&#9654; 专注'}</button>
                    ${p.virtual_value > 0 ? `<span class="plan-badge badge-value">${p.virtual_value} 价值</span>` : ''}
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
    if (activeFocusSession && activeFocusSession.plan_id === id) await stopFocus();
    try { await api('/api/plans/' + id, { method: 'DELETE' }); toast('计划已删除'); loadPlans(); }
    catch (e) { toast('删除失败: ' + e.message, true); }
}

async function completePlan(id) {
    stopTimer(id);
    if (activeFocusSession && activeFocusSession.plan_id === id) await stopFocus();
    try {
        await api('/api/plans/' + id + '/complete', { method: 'POST' });
        toast('计划已完成，虚拟价值已入账！'); loadPlans(); loadBalance();
    } catch (e) { toast('操作失败: ' + e.message, true); }
}

// ---- Recycle Bin ----

async function loadRecycleBin() {
    try {
        const plans = await api('/api/plans/completed');
        allRecyclePlans = plans;
        updateRecycleFilterCounts(plans);
        filterAndRenderRecycle();
    } catch (e) { toast('加载失败: ' + e.message, true); }
}

function updateRecycleFilterCounts(plans) {
    const counts = { all: plans.length, today: 0, weekly: 0, monthly: 0, yearly: 0 };
    plans.forEach(p => { if (counts[p.plan_type] !== undefined) counts[p.plan_type]++; });
    document.querySelectorAll('.recycle-filter-btn').forEach(b => {
        const type = b.dataset.type;
        const countEl = b.querySelector('.filter-count');
        if (countEl) countEl.textContent = counts[type] || 0;
    });
}

function renderRecycleBin(plans, allPlans) {
    const c = document.getElementById('recycleList');
    if (!plans.length) {
        const msg = allPlans && allPlans.length ? '没有匹配的计划' : '回收站为空';
        c.innerHTML = `<div class="empty-state">${msg}</div>`;
        return;
    }
    c.innerHTML = plans.map(p => {
        const color = PLAN_TYPE_COLORS[p.plan_type] || '#7c6ef0';
        return `
        <div class="plan-card completed recycle-card" data-id="${p.id}">
            <label class="recycle-check">
                <input type="checkbox" class="recycle-checkbox" value="${p.id}">
            </label>
            <div class="plan-card-body">
                <div class="plan-card-title">${esc(p.title)}</div>
                <div class="plan-card-meta">
                    <span class="plan-type-tag" style="background:${color}">${PLAN_TYPE_LABELS[p.plan_type] || p.plan_type}</span>
                    ${p.virtual_value > 0 ? `<span class="plan-badge badge-value">${p.virtual_value} 价值</span>` : ''}
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
    if (!id && id !== 0) { toast('无效的计划ID', true); return; }
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
    c.innerHTML = wishes.map(w => {
        const qtyText = w.quantity === null ? '无限' : `剩余 ${w.quantity}`;
        const canRedeem = w.quantity === null || w.quantity > 0;
        return `
        <div class="wish-card ${w.redeemed ? 'redeemed' : ''}">
            <div class="wish-info"><h4>${esc(w.name)}</h4>
                <div class="wish-meta">${w.real_price > 0 ? '¥' + w.real_price : ''}${w.redeemed ? ' · 已兑换' : ''} · ${qtyText}</div></div>
            <div class="wish-actions"><span class="wish-cost">${w.virtual_cost}</span>
                ${!w.redeemed ? `<button class="btn btn-success btn-sm" onclick="redeemWish(${w.id})" ${!canRedeem || bal < w.virtual_cost ? 'disabled' : ''}>兑换</button>
                <button class="btn btn-glass btn-sm" data-wish='${encodeURIComponent(JSON.stringify(w))}' onclick="editWishFromBtn(this)">编辑</button>` : ''}
                <button class="btn btn-danger btn-sm" onclick="deleteWish(${w.id})">删除</button></div>
        </div>`;
    }).join('');
}

function editWishFromBtn(btn) {
    const w = JSON.parse(decodeURIComponent(btn.dataset.wish));
    showEditWishModal(w.id, w.name, w.real_price, w.virtual_cost, w.quantity);
}

let wishSaving = false;
let editingWishId = null;

function showAddWishModal() {
    editingWishId = null;
    document.getElementById('wishModalTitle').textContent = '新增心愿';
    document.getElementById('wishNameInput').value = '';
    document.getElementById('wishPriceInput').value = '';
    document.getElementById('wishCostInput').value = '';
    document.getElementById('wishQtyInput').value = '';
    document.getElementById('wishInfiniteCheck').checked = true;
    toggleQtyInput();
    document.getElementById('wishModal').classList.add('show');
    setTimeout(() => document.getElementById('wishNameInput').focus(), 100);
}

function showEditWishModal(id, name, price, cost, qty) {
    editingWishId = id;
    document.getElementById('wishModalTitle').textContent = '编辑心愿';
    document.getElementById('wishNameInput').value = name;
    document.getElementById('wishPriceInput').value = price || '';
    document.getElementById('wishCostInput').value = cost || '';
    if (qty === null) {
        document.getElementById('wishInfiniteCheck').checked = true;
        document.getElementById('wishQtyInput').value = '';
    } else {
        document.getElementById('wishInfiniteCheck').checked = false;
        document.getElementById('wishQtyInput').value = qty;
    }
    toggleQtyInput();
    document.getElementById('wishModal').classList.add('show');
    setTimeout(() => document.getElementById('wishNameInput').focus(), 100);
}

function toggleQtyInput() {
    const infinite = document.getElementById('wishInfiniteCheck').checked;
    document.getElementById('wishQtyInput').disabled = infinite;
    if (infinite) document.getElementById('wishQtyInput').value = '';
}

async function saveWish() {
    if (wishSaving) return;
    const n = document.getElementById('wishNameInput').value.trim();
    const p = parseFloat(document.getElementById('wishPriceInput').value) || 0;
    const c = parseFloat(document.getElementById('wishCostInput').value) || null;
    const infinite = document.getElementById('wishInfiniteCheck').checked;
    const qty = infinite ? null : (parseInt(document.getElementById('wishQtyInput').value) || null);
    if (!n) { toast('请输入心愿名称', true); return; }
    if (!infinite && (!qty || qty <= 0)) { toast('请输入有效数量或勾选无限', true); return; }
    wishSaving = true;
    try {
        if (editingWishId) {
            await api('/api/wishes/' + editingWishId, { method: 'PUT', body: JSON.stringify({ name: n, real_price: p, virtual_cost: c, quantity: qty }) });
            toast('心愿已更新');
        } else {
            await api('/api/wishes', { method: 'POST', body: JSON.stringify({ name: n, real_price: p, virtual_cost: c, quantity: qty }) });
            toast('心愿已添加');
        }
        closeModal('wishModal'); loadWishes();
    } catch (e) { toast('保存失败: ' + e.message, true); }
    finally { wishSaving = false; editingWishId = null; }
}

async function redeemWish(id) {
    if (!confirm('确定兑换？')) return;
    try {
        const r = await api('/api/wishes/' + id + '/redeem', { method: 'POST' });
        const qtyInfo = r.quantity === null ? '（无限）' : (r.quantity <= 1 ? '（已用完，自动删除）' : `（剩余 ${r.quantity - 1}）`);
        toast('兑换成功！' + qtyInfo);
        loadWishes(); loadBalance();
    } catch (e) { toast('兑换失败: ' + e.message, true); }
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

// ---- API Balance ----

async function loadApiBalance() {
    const container = document.getElementById('apibalanceContent');
    container.innerHTML = '<div class="empty-state">加载中...</div>';
    try {
        const data = await api('/api/deepseek/balance');
        if (data.supported === false) {
            container.innerHTML = `
                <div class="glass-card apibalance-unsupported">
                    <div class="apibalance-unsupported-icon">&#9888;</div>
                    <div class="apibalance-unsupported-title">功能不支持</div>
                    <div class="apibalance-unsupported-desc">${esc(data.message)}</div>
                    <div class="apibalance-unsupported-hint">请在 <strong>AI设置</strong> 中将 Base URL 切换为 DeepSeek 的 API 地址，例如：</div>
                    <div class="apibalance-url-example">https://api.deepseek.com/v1</div>
                </div>`;
            return;
        }
        if (data.error) {
            container.innerHTML = `
                <div class="glass-card">
                    <div class="apibalance-section-title">DeepSeek 账户</div>
                    <div class="apibalance-status apibalance-status-error">
                        <span class="apibalance-status-icon">&#10060;</span>
                        <span>获取失败：${esc(data.error)}</span>
                    </div>
                </div>`;
            return;
        }
        const bv = parseFloat(data.balance);
        const isAvail = data.is_available && bv > 0;
        const statusText = !data.is_available ? '已用尽' : bv <= 0 ? '余额为零' : '正常';
        const statusType = isAvail ? 'ok' : 'warn';
        const pct = Math.min(100, Math.round(bv));
        const barColor = bv > 10 ? 'var(--success)' : bv > 1 ? 'var(--warning)' : 'var(--danger)';
        container.innerHTML = `
            <div class="glass-card apibalance-hero" onclick="loadApiBalance()">
                <div class="apibalance-section-title">DeepSeek 账户</div>
                <div class="apibalance-hero-amount">
                    <span class="apibalance-hero-sign">&#165;</span>
                    <span class="apibalance-hero-val ${isAvail ? '' : 'apibalance-zero'}">${bv.toFixed(4)}</span>
                    <span class="apibalance-hero-unit">${esc(data.currency)}</span>
                </div>
                <div class="apibalance-bar-track">
                    <div class="apibalance-bar-fill" style="width:${pct}%;background:${barColor}"></div>
                </div>
                <div class="apibalance-hero-footer">
                    <span class="apibalance-status apibalance-status-${statusType}">${statusText}</span>
                    <span class="apibalance-refresh-hint">&#128260; 点击刷新</span>
                </div>
            </div>
            <div class="apibalance-info-grid">
                <div class="glass-card apibalance-info-card">
                    <div class="apibalance-info-icon">&#128176;</div>
                    <div class="apibalance-info-label">充值余额</div>
                    <div class="apibalance-info-val">${bv.toFixed(2)}</div>
                </div>
                <div class="glass-card apibalance-info-card">
                    <div class="apibalance-info-icon">&#128200;</div>
                    <div class="apibalance-info-label">账户状态</div>
                    <div class="apibalance-info-val apibalance-info-status-${statusType}">${statusText}</div>
                </div>
                <div class="glass-card apibalance-info-card">
                    <div class="apibalance-info-icon">&#127760;</div>
                    <div class="apibalance-info-label">币种</div>
                    <div class="apibalance-info-val">${esc(data.currency)}</div>
                </div>
            </div>`;
    } catch (e) {
        container.innerHTML = `
            <div class="glass-card">
                <div class="apibalance-status apibalance-status-error">
                    <span class="apibalance-status-icon">&#10060;</span>
                    <span>请求失败：${esc(e.message)}</span>
                </div>
            </div>`;
    }
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

        // Background settings
        const bgMode = s.bg_mode || 'orb';
        const bgColor = s.bg_solid_color || '#f0eef8';
        const bgImage = s.bg_image || '';
        document.querySelectorAll('.bg-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === bgMode));
        document.getElementById('bgSolidPanel').style.display = bgMode === 'solid' ? 'block' : 'none';
        document.getElementById('bgImagePanel').style.display = bgMode === 'image' ? 'block' : 'none';
        document.querySelectorAll('.bg-color-swatch').forEach(sw => sw.classList.toggle('active', sw.dataset.color === bgColor));
        if (bgImage) {
            document.getElementById('bgPreviewImg').src = bgImageUrl(bgImage);
            document.getElementById('bgImagePreview').style.display = 'block';
        }
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
        document.getElementById('appVersion').textContent = d.version || '';
    } catch (e) {}
}

// ---- Background ----

function bgImageUrl(path) {
    if (!path) return '';
    return path.replace('/static/bg_custom/', '/api/background/custom/');
}

async function loadBackground() {
    try {
        const s = await api('/api/settings');
        const mode = s.bg_mode || 'orb';
        applyBgMode(mode, s.bg_solid_color || '#f0eef8', bgImageUrl(s.bg_image));
    } catch (e) {}
}

function isColorDark(hex) {
    if (!hex || !hex.startsWith('#')) return false;
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    // relative luminance
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum < 0.5;
}

function applyBgMode(mode, color, image) {
    document.body.classList.remove('bg-solid', 'bg-image', 'theme-dark');
    if (mode === 'solid') {
        document.body.classList.add('bg-solid');
        document.body.style.backgroundColor = color;
        document.body.style.backgroundImage = '';
        if (isColorDark(color)) {
            document.body.classList.add('theme-dark');
        }
    } else if (mode === 'image') {
        document.body.classList.add('bg-image', 'theme-dark');
        document.body.style.backgroundColor = '';
        if (image) {
            document.body.style.backgroundImage = `url(${image})`;
        }
    } else {
        document.body.style.backgroundColor = '';
        document.body.style.backgroundImage = '';
    }
}

function switchBgMode(mode) {
    document.querySelectorAll('.bg-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    document.getElementById('bgSolidPanel').style.display = mode === 'solid' ? 'block' : 'none';
    document.getElementById('bgImagePanel').style.display = mode === 'image' ? 'block' : 'none';
    const color = document.querySelector('.bg-color-swatch.active')?.dataset.color || '#f0eef8';
    const image = document.getElementById('bgPreviewImg').src || '';
    applyBgMode(mode, color, image);
}

function pickBgColor(color) {
    document.querySelectorAll('.bg-color-swatch').forEach(sw => sw.classList.toggle('active', sw.dataset.color === color));
    applyBgMode('solid', color, '');
}

function previewBgImage(input) {
    if (!input.files || !input.files[0]) return;
    document.getElementById('bgFileName').textContent = input.files[0].name;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('bgPreviewImg').src = e.target.result;
        document.getElementById('bgImagePreview').style.display = 'block';
        applyBgMode('image', '', e.target.result);
    };
    reader.readAsDataURL(input.files[0]);
}

function resetBgImage() {
    document.getElementById('bgFileInput').value = '';
    document.getElementById('bgFileName').textContent = '';
    document.getElementById('bgPreviewImg').src = '';
    document.getElementById('bgImagePreview').style.display = 'none';
    applyBgMode('orb', '', '');
}

async function saveBgSettings() {
    const mode = document.querySelector('.bg-mode-btn.active')?.dataset.mode || 'orb';
    const payload = { bg_mode: mode };

    if (mode === 'solid') {
        payload.bg_solid_color = document.querySelector('.bg-color-swatch.active')?.dataset.color || '#f0eef8';
    } else if (mode === 'image') {
        const fileInput = document.getElementById('bgFileInput');
        if (fileInput.files && fileInput.files[0]) {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            try {
                const d = await fetch('/api/background/upload', { method: 'POST', body: formData }).then(r => r.json());
                if (d.error) { toast('上传失败: ' + d.error, true); return; }
                payload.bg_image = d.path;
            } catch (e) { toast('上传失败: ' + e.message, true); return; }
        } else {
            let existing = document.getElementById('bgPreviewImg').src || '';
            if (existing.startsWith('data:')) existing = '';
            if (existing) {
                const idx = existing.indexOf('/api/background/custom/');
                if (idx !== -1) payload.bg_image = '/static/bg_custom/' + existing.substring(idx + '/api/background/custom/'.length);
                else payload.bg_image = existing;
            }
        }
    }

    try {
        await api('/api/settings', { method: 'PUT', body: JSON.stringify(payload) });
        toast('背景设置已保存');
    } catch (e) { toast('保存失败: ' + e.message, true); }
}

function window_updateDownloadProgress(pct) {
    const wrap = document.getElementById('updateProgress');
    const bar = document.getElementById('updateProgressBar');
    const pLabel = document.getElementById('updateProgressLabel');
    const pPct = document.getElementById('updateProgressPct');
    if (!wrap) return;
    wrap.style.display = 'block';
    if (pct < 0) {
        pLabel.textContent = '准备更新...';
        pPct.textContent = '';
        bar.style.width = '0%';
        return;
    }
    bar.style.width = pct + '%';
    pPct.textContent = pct + '%';
    if (pct >= 100) {
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
            if (prog) prog.style.display = 'block';
            btn.disabled = true; btn.textContent = '更新中...';
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
    const pLabel = document.getElementById('updateProgressLabel');
    const pPct = document.getElementById('updateProgressPct');
    const bar = document.getElementById('updateProgressBar');
    const prog = document.getElementById('updateProgress');
    let failCount = 0;
    const poll = setInterval(async () => {
        try {
            const d = await api('/api/update/status');
            failCount = 0;
            if (pLabel && d.message) pLabel.textContent = d.message;
            if (d.percent >= 0) {
                if (bar) bar.style.width = d.percent + '%';
                if (pPct) pPct.textContent = d.percent + '%';
            }
            if (d.status === 'restarting') {
                pLabel.textContent = d.message || '正在重启安装...';
                return;
            }
            if (d.status === 'idle') {
                clearInterval(poll);
                btn.disabled = false; btn.textContent = '检查更新';
                if (prog) prog.style.display = 'none';
                return;
            }
            if (d.status === 'error') {
                clearInterval(poll);
                el.textContent = d.message || '更新失败';
                el.className = 'test-result error'; el.style.display = 'block';
                btn.disabled = false; btn.textContent = '检查更新';
                if (prog) prog.style.display = 'none';
            }
        } catch {
            failCount++;
            if (failCount > 5) {
                clearInterval(poll);
                if (pLabel) pLabel.textContent = '应用即将重启...';
            }
        }
    }, 1000);
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
                <div class="plan-card-title">${esc(item.name)}</div>
                <div class="plan-card-meta">
                    <span class="plan-badge badge-checkin-streak">连续 ${item.streak} 天</span>
                    ${item.current_value > 0 ? `<span class="plan-badge badge-checkin-value">${item.current_value} 价值</span>` : ''}
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
    if (!seconds || seconds <= 0) return '0分钟';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return d + '天' + h + '小时' + m + '分钟';
    if (h > 0) return h + '小时' + m + '分钟';
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

async function clearFocusSessions() {
    if (!confirm('确定要清除所有专注记录吗？此操作不可撤销。')) return;
    try {
        await api('/api/stats/clear', {method: 'DELETE'});
        toast('专注记录已清除');
        loadStatsPage();
    } catch (e) { toast('清除失败: ' + e.message, true); }
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

document.addEventListener('DOMContentLoaded', async () => { await restoreFocusSession(); loadBalance(); loadPlans(); loadSignatures(); loadBackground(); });
