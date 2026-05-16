import sqlite3
import os
import sys
import math
import re
import platform
from datetime import datetime, date, timedelta

if getattr(sys, 'frozen', False):
    if platform.system() == 'Windows':
        _data_dir = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'PlanMaster')
    else:
        _data_dir = os.path.join(os.path.expanduser('~'), 'Library', 'Application Support', 'PlanMaster')
    os.makedirs(_data_dir, exist_ok=True)
    DB_PATH = os.path.join(_data_dir, 'todo.db')
else:
    DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'todo.db')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plan_type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            priority INTEGER DEFAULT 0,
            virtual_value REAL DEFAULT 0,
            progress INTEGER DEFAULT 0,
            completed INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS ai_settings (
            id INTEGER PRIMARY KEY,
            base_url TEXT DEFAULT '',
            api_key TEXT DEFAULT '',
            model_name TEXT DEFAULT 'gpt-4',
            extra_headers TEXT DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS wishes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            real_price REAL DEFAULT 0,
            virtual_cost REAL NOT NULL,
            redeemed INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            redeemed_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL NOT NULL,
            source TEXT NOT NULL,
            reference_id INTEGER,
            note TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS signatures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS checkin_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS checkin_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            check_date TEXT NOT NULL,
            streak INTEGER DEFAULT 1,
            value REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (item_id) REFERENCES checkin_items(id),
            UNIQUE(item_id, check_date)
        );

        CREATE TABLE IF NOT EXISTS focus_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plan_id INTEGER,
            category TEXT NOT NULL DEFAULT '',
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP,
            duration INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (plan_id) REFERENCES plans(id)
        );
        CREATE INDEX IF NOT EXISTS idx_focus_sessions_start ON focus_sessions(start_time);
        CREATE INDEX IF NOT EXISTS idx_focus_sessions_category ON focus_sessions(category);
    """)

    # Migration: add progress column if missing
    try:
        conn.execute("SELECT progress FROM plans LIMIT 1")
    except sqlite3.OperationalError:
        conn.execute("ALTER TABLE plans ADD COLUMN progress INTEGER DEFAULT 0")

    # Migration: add suggested_time column if missing
    try:
        conn.execute("SELECT suggested_time FROM plans LIMIT 1")
    except sqlite3.OperationalError:
        conn.execute("ALTER TABLE plans ADD COLUMN suggested_time TEXT DEFAULT ''")

    defaults = {
        'weekly_min': '1', 'weekly_max': '10',
        'monthly_min': '10', 'monthly_max': '20',
        'yearly_min': '20', 'yearly_max': '100',
        'today_min': '1', 'today_max': '10',
        'checkin_daily_increment': '1',
        'checkin_max_value': '30',
        'bg_mode': 'orb',
        'bg_solid_color': '#f0eef8',
        'bg_image': '',
    }
    for k, v in defaults.items():
        conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (k, v))

    conn.execute("INSERT OR IGNORE INTO ai_settings (id, base_url, api_key, model_name) VALUES (1, '', '', 'gpt-4')")

    conn.commit()
    conn.close()


# ---- Plans ----

def get_plans(plan_type=None, include_completed=False):
    conn = get_db()
    completed_filter = "" if include_completed else "AND completed=0"
    if plan_type:
        rows = conn.execute(
            f"SELECT * FROM plans WHERE plan_type=? {completed_filter} ORDER BY priority DESC, created_at DESC",
            (plan_type,)
        ).fetchall()
    else:
        rows = conn.execute(
            f"SELECT * FROM plans WHERE 1=1 {completed_filter} ORDER BY plan_type, priority DESC, created_at DESC"
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_completed_plans():
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM plans WHERE completed=1 ORDER BY completed_at DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def restore_plan(plan_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM plans WHERE id=? AND completed=1", (plan_id,)).fetchone()
    if not row:
        conn.close()
        return None
    conn.execute("UPDATE plans SET completed=0, completed_at=NULL WHERE id=?", (plan_id,))
    # Remove the income transaction for this plan
    conn.execute(
        "DELETE FROM transactions WHERE source='plan_complete' AND reference_id=?",
        (plan_id,)
    )
    conn.commit()
    conn.close()
    return get_plan(plan_id)


def get_plan(plan_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM plans WHERE id=?", (plan_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def create_plan(plan_type, title, description='', priority=0, virtual_value=0, progress=0, suggested_time=''):
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO plans (plan_type, title, description, priority, virtual_value, progress, suggested_time) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (plan_type, title, description, priority, virtual_value, progress, suggested_time)
    )
    plan_id = cur.lastrowid
    conn.commit()
    conn.close()
    return get_plan(plan_id)


def update_plan(plan_id, title=None, description=None, priority=None, virtual_value=None, progress=None, suggested_time=None):
    conn = get_db()
    if title is not None:
        conn.execute("UPDATE plans SET title=? WHERE id=?", (title, plan_id))
    if description is not None:
        conn.execute("UPDATE plans SET description=? WHERE id=?", (description, plan_id))
    if priority is not None:
        conn.execute("UPDATE plans SET priority=? WHERE id=?", (int(priority), plan_id))
    if virtual_value is not None:
        conn.execute("UPDATE plans SET virtual_value=? WHERE id=?", (round(float(virtual_value), 1), plan_id))
    if progress is not None:
        p = min(100, max(0, int(progress)))
        conn.execute("UPDATE plans SET progress=? WHERE id=?", (p, plan_id))
    if suggested_time is not None:
        conn.execute("UPDATE plans SET suggested_time=? WHERE id=?", (suggested_time, plan_id))
    conn.commit()
    conn.close()
    return get_plan(plan_id)


def delete_plan(plan_id):
    conn = get_db()
    conn.execute("DELETE FROM plans WHERE id=?", (plan_id,))
    conn.commit()
    conn.close()


def batch_delete_plans(plan_ids):
    conn = get_db()
    placeholders = ','.join('?' * len(plan_ids))
    cur = conn.execute(f"DELETE FROM plans WHERE id IN ({placeholders})", plan_ids)
    deleted = cur.rowcount
    conn.commit()
    conn.close()
    return deleted


def complete_plan(plan_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM plans WHERE id=?", (plan_id,)).fetchone()
    if not row or row['completed']:
        conn.close()
        return None
    now = datetime.now().isoformat()
    conn.execute("UPDATE plans SET completed=1, progress=100, completed_at=? WHERE id=?", (now, plan_id))
    conn.execute(
        "INSERT INTO transactions (amount, source, reference_id, note) VALUES (?, 'plan_complete', ?, ?)",
        (row['virtual_value'], plan_id, f"完成计划: {row['title']}")
    )
    conn.commit()
    conn.close()
    return get_plan(plan_id)


def update_plan_ai(plan_id, priority, virtual_value, suggested_time=''):
    conn = get_db()
    conn.execute(
        "UPDATE plans SET priority=?, virtual_value=?, suggested_time=? WHERE id=?",
        (int(priority), round(float(virtual_value), 1), suggested_time, plan_id)
    )
    conn.commit()
    conn.close()


# ---- AI Settings ----

def get_ai_settings():
    conn = get_db()
    row = conn.execute("SELECT * FROM ai_settings WHERE id=1").fetchone()
    conn.close()
    return dict(row) if row else {}


def update_ai_settings(base_url, api_key, model_name, extra_headers='{}'):
    conn = get_db()
    conn.execute(
        "UPDATE ai_settings SET base_url=?, api_key=?, model_name=?, extra_headers=? WHERE id=1",
        (base_url, api_key, model_name, extra_headers)
    )
    conn.commit()
    conn.close()


# ---- Wishes ----

def get_wishes(include_redeemed=False):
    conn = get_db()
    if include_redeemed:
        rows = conn.execute("SELECT * FROM wishes ORDER BY created_at DESC").fetchall()
    else:
        rows = conn.execute("SELECT * FROM wishes WHERE redeemed=0 ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def create_wish(name, real_price, virtual_cost):
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO wishes (name, real_price, virtual_cost) VALUES (?, ?, ?)",
        (name, real_price, round(float(virtual_cost), 1))
    )
    wish_id = cur.lastrowid
    conn.commit()
    conn.close()
    return _get_wish(wish_id)


def _get_wish(wish_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM wishes WHERE id=?", (wish_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def delete_wish(wish_id):
    conn = get_db()
    conn.execute("DELETE FROM wishes WHERE id=?", (wish_id,))
    conn.commit()
    conn.close()


def redeem_wish(wish_id):
    conn = get_db()
    wish = conn.execute("SELECT * FROM wishes WHERE id=?", (wish_id,)).fetchone()
    if not wish or wish['redeemed']:
        conn.close()
        return None, "心愿不存在或已兑换"

    balance = get_balance_val(conn)
    if balance < wish['virtual_cost']:
        conn.close()
        return None, f"虚拟价值不足，当前余额: {balance:.1f}，需要: {wish['virtual_cost']}"

    now = datetime.now().isoformat()
    conn.execute("UPDATE wishes SET redeemed=1, redeemed_at=? WHERE id=?", (now, wish_id))
    conn.execute(
        "INSERT INTO transactions (amount, source, reference_id, note) VALUES (?, 'wish_redeem', ?, ?)",
        (-wish['virtual_cost'], wish_id, f"兑换心愿: {wish['name']}")
    )
    conn.commit()
    conn.close()
    return _get_wish(wish_id), None


# ---- Balance & Transactions ----

def get_balance_val(conn=None):
    should_close = False
    if conn is None:
        conn = get_db()
        should_close = True
    row = conn.execute("SELECT COALESCE(SUM(amount), 0) as total FROM transactions").fetchone()
    if should_close:
        conn.close()
    return row['total']


def get_balance():
    return get_balance_val()


def reset_balance():
    """Insert a transaction that zeros out the balance."""
    balance = get_balance()
    if balance == 0:
        return 0
    conn = get_db()
    conn.execute(
        "INSERT INTO transactions (amount, source, reference_id, note) VALUES (?, 'balance_reset', NULL, ?)",
        (-balance, f"手动清零: 扣除 {balance:.1f}")
    )
    conn.commit()
    conn.close()
    return balance


def get_transactions():
    conn = get_db()
    rows = conn.execute("SELECT * FROM transactions ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ---- Signatures ----

def get_signatures():
    conn = get_db()
    rows = conn.execute("SELECT * FROM signatures ORDER BY id").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def save_signatures(contents):
    conn = get_db()
    conn.execute("DELETE FROM signatures")
    for c in contents:
        if c.strip():
            conn.execute("INSERT INTO signatures (content) VALUES (?)", (c.strip(),))
    conn.commit()
    conn.close()


# ---- Settings ----

def get_settings():
    conn = get_db()
    rows = conn.execute("SELECT * FROM settings").fetchall()
    conn.close()
    return {r['key']: r['value'] for r in rows}


def update_settings(settings_dict):
    conn = get_db()
    for k, v in settings_dict.items():
        conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, str(v)))
    conn.commit()
    conn.close()


# ---- Check-in ----

def _checkin_value(streak, daily_inc, max_val):
    """Value = sqrt(streak) * daily_inc, capped at max_val."""
    if streak <= 0:
        return 0
    return min(round(math.sqrt(streak) * daily_inc, 1), max_val)


def get_checkin_items():
    conn = get_db()
    s = get_settings()
    daily_inc = float(s.get('checkin_daily_increment', 1))
    max_val = float(s.get('checkin_max_value', 30))
    items = conn.execute("SELECT * FROM checkin_items ORDER BY created_at DESC").fetchall()
    today_str = date.today().isoformat()
    result = []
    for item in items:
        last = conn.execute(
            "SELECT check_date, streak FROM checkin_records WHERE item_id=? ORDER BY check_date DESC LIMIT 1",
            (item['id'],)
        ).fetchone()
        streak = 0
        checked_today = False
        if last:
            last_date = date.fromisoformat(last['check_date'])
            days_diff = (date.today() - last_date).days
            if days_diff == 0:
                streak = last['streak']
                checked_today = True
            elif days_diff == 1:
                streak = last['streak']
            else:
                streak = 0
        val = _checkin_value(streak, daily_inc, max_val) if streak > 0 else 0
        if streak > 0 and not checked_today:
            val = _checkin_value(streak, daily_inc, max_val)
        result.append({
            'id': item['id'],
            'name': item['name'],
            'created_at': item['created_at'],
            'streak': streak,
            'current_value': val,
            'checked_today': checked_today,
        })
    conn.close()
    return result


def create_checkin_item(name):
    conn = get_db()
    cur = conn.execute("INSERT INTO checkin_items (name) VALUES (?)", (name,))
    item_id = cur.lastrowid
    conn.commit()
    conn.close()
    return {'id': item_id, 'name': name}


def delete_checkin_item(item_id):
    conn = get_db()
    conn.execute("DELETE FROM checkin_records WHERE item_id=?", (item_id,))
    conn.execute("DELETE FROM checkin_items WHERE id=?", (item_id,))
    conn.commit()
    conn.close()


def checkin_today(item_id):
    """Record a check-in for today. Returns (item_dict, error_msg)."""
    conn = get_db()
    s = get_settings()
    daily_inc = float(s.get('checkin_daily_increment', 1))
    max_val = float(s.get('checkin_max_value', 30))

    item = conn.execute("SELECT * FROM checkin_items WHERE id=?", (item_id,)).fetchone()
    if not item:
        conn.close()
        return None, '打卡项目不存在'

    today_str = date.today().isoformat()
    existing = conn.execute(
        "SELECT * FROM checkin_records WHERE item_id=? AND check_date=?",
        (item_id, today_str)
    ).fetchone()
    if existing:
        conn.close()
        return None, '今天已打卡'

    last = conn.execute(
        "SELECT check_date, streak FROM checkin_records WHERE item_id=? ORDER BY check_date DESC LIMIT 1",
        (item_id,)
    ).fetchone()

    if last:
        last_date = date.fromisoformat(last['check_date'])
        days_diff = (date.today() - last_date).days
        if days_diff == 1:
            new_streak = last['streak'] + 1
        else:
            new_streak = 1
    else:
        new_streak = 1

    val = _checkin_value(new_streak, daily_inc, max_val)
    conn.execute(
        "INSERT INTO checkin_records (item_id, check_date, streak, value) VALUES (?, ?, ?, ?)",
        (item_id, today_str, new_streak, val)
    )
    if val > 0:
        conn.execute(
            "INSERT INTO transactions (amount, source, reference_id, note) VALUES (?, 'checkin', ?, ?)",
            (val, item_id, f"打卡: {item['name']} (连续{new_streak}天)")
        )
    conn.commit()
    conn.close()
    return {
        'id': item['id'],
        'name': item['name'],
        'streak': new_streak,
        'current_value': val,
        'checked_today': True,
    }, None


def checkin_missed_penalty():
    """Check for missed days and apply penalty. Called on app startup."""
    conn = get_db()
    s = get_settings()
    daily_inc = float(s.get('checkin_daily_increment', 1))
    max_val = float(s.get('checkin_max_value', 30))
    today_str = date.today().isoformat()

    items = conn.execute("SELECT * FROM checkin_items").fetchall()
    for item in items:
        last = conn.execute(
            "SELECT check_date, streak FROM checkin_records WHERE item_id=? ORDER BY check_date DESC LIMIT 1",
            (item['id'],)
        ).fetchone()
        if not last:
            continue
        last_date = date.fromisoformat(last['check_date'])
        days_diff = (date.today() - last_date).days
        if days_diff <= 1:
            continue
        # Missed: penalty = the value they had on their last check-in day
        old_val = _checkin_value(last['streak'], daily_inc, max_val)
        if old_val > 0:
            conn.execute(
                "INSERT INTO transactions (amount, source, reference_id, note) VALUES (?, 'checkin_penalty', ?, ?)",
                (-old_val, item['id'], f"断签扣除: {item['name']} (连续{last['streak']}天中断)")
            )
        # Insert marker record to prevent re-penalizing on next startup
        marker_date = (last_date + timedelta(days=1)).isoformat()
        conn.execute(
            "INSERT OR IGNORE INTO checkin_records (item_id, check_date, streak, value) VALUES (?, ?, 0, 0)",
            (item['id'], marker_date)
        )
    conn.commit()
    conn.close()


# ---- Category Extraction ----

def _plan_type_label(plan_type):
    labels = {
        'today': '今日待办', 'weekly': '周计划',
        'monthly': '月计划', 'yearly': '年计划'
    }
    return labels.get(plan_type, '未分类')


def extract_category(title, plan_type=''):
    """Extract category from plan title using prefix patterns."""
    if not title:
        return _plan_type_label(plan_type)

    # Pattern 1: 【xxx】rest
    m = re.match(r'^[【\[](.*?)[】\]]', title)
    if m:
        return m.group(1).strip()

    # Pattern 2: xxx: rest  or  xxx：rest (fullwidth colon)
    m = re.match(r'^([^:：]+)\s*[:：]', title)
    if m and len(m.group(1).strip()) <= 10:
        return m.group(1).strip()

    # Pattern 3: xxx-rest (dash separator, short prefix)
    m = re.match(r'^([^-]+)\s*-\s*', title)
    if m and len(m.group(1).strip()) <= 10:
        return m.group(1).strip()

    # Fallback: use title itself (truncated)
    return title[:20] + '...' if len(title) > 20 else title


# ---- Focus Sessions ----

def create_focus_session(plan_id, category, start_time):
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO focus_sessions (plan_id, category, start_time) VALUES (?, ?, ?)",
        (plan_id, category, start_time)
    )
    session_id = cur.lastrowid
    conn.commit()
    row = conn.execute("SELECT * FROM focus_sessions WHERE id=?", (session_id,)).fetchone()
    conn.close()
    return dict(row)


def end_focus_session(session_id, end_time, duration):
    conn = get_db()
    conn.execute(
        "UPDATE focus_sessions SET end_time=?, duration=? WHERE id=?",
        (end_time, int(duration), session_id)
    )
    conn.commit()
    row = conn.execute("SELECT * FROM focus_sessions WHERE id=?", (session_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_focus_sessions(plan_id=None, date_str=None, category=None):
    conn = get_db()
    query = "SELECT * FROM focus_sessions WHERE 1=1"
    params = []
    if plan_id is not None:
        query += " AND plan_id=?"
        params.append(plan_id)
    if date_str:
        query += " AND DATE(start_time)=?"
        params.append(date_str)
    if category:
        query += " AND category=?"
        params.append(category)
    query += " ORDER BY start_time DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_focus_session(session_id):
    conn = get_db()
    conn.execute("DELETE FROM focus_sessions WHERE id=?", (session_id,))
    conn.commit()
    conn.close()


def get_cumulative_stats():
    conn = get_db()
    row = conn.execute(
        "SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as total_duration, "
        "MIN(DATE(start_time)) as first_date FROM focus_sessions"
    ).fetchone()
    count = row['count']
    total_duration = row['total_duration']
    first_date = row['first_date']
    conn.close()

    daily_avg = 0
    if first_date and total_duration > 0:
        days = (date.today() - date.fromisoformat(first_date)).days + 1
        daily_avg = total_duration // max(1, days)

    return {
        'count': count,
        'total_duration': total_duration,
        'first_date': first_date or '',
        'daily_avg': daily_avg
    }


def get_daily_stats(date_str):
    conn = get_db()
    row = conn.execute(
        "SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as duration "
        "FROM focus_sessions WHERE DATE(start_time)=?",
        (date_str,)
    ).fetchone()
    conn.close()
    return {'count': row['count'], 'duration': row['duration']}


def get_distribution_stats(period, date_str, start_date=None, end_date=None):
    conn = get_db()
    query = "SELECT category, SUM(duration) as total_duration, COUNT(*) as count FROM focus_sessions WHERE "
    params = []

    if period == 'day':
        query += "DATE(start_time)=?"
        params.append(date_str)
    elif period == 'week':
        d = date.fromisoformat(date_str)
        sd = (d - timedelta(days=6)).isoformat()
        query += "DATE(start_time) BETWEEN ? AND ?"
        params.extend([sd, date_str])
    elif period == 'month':
        month_prefix = date_str[:7]
        query += "strftime('%Y-%m', start_time)=?"
        params.append(month_prefix)
    elif period == 'custom' and start_date and end_date:
        query += "DATE(start_time) BETWEEN ? AND ?"
        params.extend([start_date, end_date])
    else:
        query += "DATE(start_time)=?"
        params.append(date_str)

    query += " GROUP BY category ORDER BY total_duration DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()

    items = [dict(r) for r in rows]
    total = sum(i['total_duration'] for i in items)
    for i in items:
        i['percentage'] = round(i['total_duration'] / total * 100, 1) if total > 0 else 0

    return {'items': items, 'total_duration': total}


def get_monthly_daily_stats(year_month):
    conn = get_db()
    rows = conn.execute(
        "SELECT strftime('%d', start_time) as day, SUM(duration) as duration "
        "FROM focus_sessions WHERE strftime('%Y-%m', start_time)=? "
        "GROUP BY day ORDER BY day",
        (year_month,)
    ).fetchall()
    conn.close()

    result_map = {r['day']: r['duration'] for r in rows}
    y, m = int(year_month[:4]), int(year_month[5:7])
    import calendar
    days_in_month = calendar.monthrange(y, m)[1]
    result = []
    for d in range(1, days_in_month + 1):
        day_str = str(d).zfill(2)
        result.append({'day': day_str, 'duration': result_map.get(day_str, 0)})
    return result
