import json
import sys
import os
import time
import platform
import tempfile
import subprocess
import webbrowser
import threading
from datetime import datetime, date
import requests
from flask import Flask, render_template, request, jsonify, send_from_directory
import database as db
import ai_service
import updater

CURRENT_VERSION = '1.4.8'

def _parse_version(v):
    """解析版本号为元组用于语义比较"""
    try:
        return tuple(int(x) for x in v.split('.'))
    except (ValueError, AttributeError):
        return (0, 0, 0)

def _read_version_from_file(path):
    try:
        with open(path) as f:
            for line in f:
                if line.startswith('CURRENT_VERSION'):
                    q = "'" if "'" in line else '"'
                    return line.split(q)[1]
    except Exception:
        pass
    return '0.0.0'

if getattr(sys, 'frozen', False):
    base_dir = sys._MEIPASS
    _user_dir = os.path.join(os.path.expanduser('~'), 'Library', 'Application Support', 'PlanMaster')
    os.makedirs(_user_dir, exist_ok=True)
else:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    _user_dir = base_dir

_use_user_dir = False
if os.path.isdir(os.path.join(_user_dir, 'templates')) and os.path.isdir(os.path.join(_user_dir, 'static')):
    user_ver = _read_version_from_file(os.path.join(_user_dir, 'app.py'))
    if _parse_version(user_ver) >= _parse_version(CURRENT_VERSION):
        _use_user_dir = True

_tpl_dir = os.path.join(_user_dir, 'templates') if _use_user_dir else os.path.join(base_dir, 'templates')
_sta_dir = os.path.join(_user_dir, 'static') if _use_user_dir else os.path.join(base_dir, 'static')
app = Flask(__name__, template_folder=_tpl_dir, static_folder=_sta_dir)


@app.route('/')
def index():
    return render_template('index.html')


# ---- Plans API ----

@app.route('/api/plans', methods=['GET'])
def api_get_plans():
    plan_type = request.args.get('type')
    return jsonify(db.get_plans(plan_type, include_completed=False))


@app.route('/api/plans/all', methods=['GET'])
def api_get_all_plans():
    plan_type = request.args.get('type')
    return jsonify(db.get_plans(plan_type, include_completed=True))


@app.route('/api/plans/completed', methods=['GET'])
def api_get_completed_plans():
    return jsonify(db.get_completed_plans())


@app.route('/api/plans', methods=['POST'])
def api_create_plan():
    data = request.json
    plan_type = data['plan_type']
    title = data['title']
    description = data.get('description', '')

    priority = data.get('priority', 0) or 0
    virtual_value = data.get('virtual_value', 0) or 0
    progress = data.get('progress', 0) or 0

    plan = db.create_plan(plan_type, title, description, priority, virtual_value, progress)

    # AI evaluation in background if no user-provided values
    if not priority and not virtual_value:
        ai_cfg = db.get_ai_settings()
        if ai_cfg.get('base_url') and ai_cfg.get('api_key'):
            def _bg_eval():
                try:
                    extra_headers = json.loads(ai_cfg.get('extra_headers', '{}'))
                except json.JSONDecodeError:
                    extra_headers = {}
                s = db.get_settings()
                min_val = float(s.get(f'{plan_type}_min', 1))
                max_val = float(s.get(f'{plan_type}_max', 10))
                try:
                    pri, val, stime, _ = ai_service.evaluate_single_plan(
                        ai_cfg['base_url'], ai_cfg['api_key'], ai_cfg['model_name'],
                        plan_type, title, description, min_val, max_val, extra_headers
                    )
                    db.update_plan(plan['id'], priority=pri, virtual_value=val, suggested_time=stime)
                except Exception:
                    pass
            threading.Thread(target=_bg_eval, daemon=True).start()

    return jsonify(plan), 201


@app.route('/api/plans/<int:plan_id>', methods=['PUT'])
def api_update_plan(plan_id):
    data = request.json
    plan = db.update_plan(
        plan_id,
        title=data.get('title'),
        description=data.get('description'),
        priority=data.get('priority'),
        virtual_value=data.get('virtual_value'),
        progress=data.get('progress'),
    )
    return jsonify(plan)


@app.route('/api/plans/<int:plan_id>', methods=['DELETE'])
def api_delete_plan(plan_id):
    db.delete_plan(plan_id)
    return jsonify({'ok': True})


@app.route('/api/plans/<int:plan_id>/complete', methods=['POST'])
def api_complete_plan(plan_id):
    plan = db.complete_plan(plan_id)
    if not plan:
        return jsonify({'error': '计划不存在或已完成'}), 400
    return jsonify(plan)


@app.route('/api/plans/<int:plan_id>/restore', methods=['POST'])
def api_restore_plan(plan_id):
    plan = db.restore_plan(plan_id)
    if not plan:
        return jsonify({'error': '计划不存在或未完成'}), 400
    return jsonify(plan)


@app.route('/api/plans/batch-delete', methods=['POST'])
def api_batch_delete_plans():
    data = request.json
    ids = data.get('ids', [])
    if not ids:
        return jsonify({'error': '未选择计划'}), 400
    deleted = db.batch_delete_plans(ids)
    return jsonify({'ok': True, 'deleted': deleted})


@app.route('/api/plans/sort', methods=['POST'])
def api_sort_plans():
    data = request.json
    plan_type = data['plan_type']
    plans = db.get_plans(plan_type)
    uncompleted = [p for p in plans if not p['completed']]
    if not uncompleted:
        return jsonify({'error': '没有未完成的计划'}), 400

    ai_cfg = db.get_ai_settings()
    if not ai_cfg.get('base_url') or not ai_cfg.get('api_key'):
        return jsonify({'error': '请先配置AI设置'}), 400

    s = db.get_settings()
    min_val = float(s.get(f'{plan_type}_min', 1))
    max_val = float(s.get(f'{plan_type}_max', 10))

    try:
        extra_headers = json.loads(ai_cfg.get('extra_headers', '{}'))
    except json.JSONDecodeError:
        extra_headers = {}

    try:
        sorted_plans = ai_service.sort_plans(
            ai_cfg['base_url'], ai_cfg['api_key'], ai_cfg['model_name'],
            uncompleted, plan_type, min_val, max_val, extra_headers
        )
    except Exception as e:
        return jsonify({'error': f'AI调用失败: {str(e)}'}), 500

    results = []
    for item in sorted_plans:
        pid = item.get('id')
        priority = item.get('priority', 50)
        virtual_value = item.get('virtual_value', 0)
        suggested_time = item.get('suggested_time', '')
        db.update_plan_ai(pid, priority, virtual_value, suggested_time)
        plan = db.get_plan(pid)
        if plan:
            plan['ai_reason'] = item.get('reason', '')
            results.append(plan)

    return jsonify(results)


# ---- AI Settings API ----

@app.route('/api/ai-settings', methods=['GET'])
def api_get_ai_settings():
    settings = db.get_ai_settings()
    if settings.get('api_key'):
        key = settings['api_key']
        settings['api_key_masked'] = key[:8] + '***' + key[-4:] if len(key) > 12 else '***'
    else:
        settings['api_key_masked'] = ''
    return jsonify(settings)


@app.route('/api/ai-settings', methods=['PUT'])
def api_update_ai_settings():
    data = request.json
    db.update_ai_settings(
        data.get('base_url', ''),
        data.get('api_key', ''),
        data.get('model_name', 'gpt-4'),
        data.get('extra_headers', '{}')
    )
    return jsonify({'ok': True})


@app.route('/api/ai-settings/test', methods=['POST'])
def api_test_ai():
    settings = db.get_ai_settings()
    if not settings.get('base_url') or not settings.get('api_key'):
        return jsonify({'ok': False, 'message': '请填写Base URL和API Key'})
    try:
        extra_headers = json.loads(settings.get('extra_headers', '{}'))
    except json.JSONDecodeError:
        extra_headers = {}
    ok, msg = ai_service.test_connection(
        settings['base_url'], settings['api_key'], settings['model_name'], extra_headers
    )
    return jsonify({'ok': ok, 'message': msg})


@app.route('/api/ai-settings/models', methods=['POST'])
def api_fetch_models():
    data = request.json or {}
    base_url = data.get('base_url', '').strip()
    api_key = data.get('api_key', '').strip()
    if not base_url or not api_key:
        return jsonify({'error': '请填写Base URL和API Key'}), 400
    try:
        extra_headers = json.loads(data.get('extra_headers', '{}'))
    except json.JSONDecodeError:
        extra_headers = {}
    try:
        models = ai_service.fetch_models(base_url, api_key, extra_headers)
        return jsonify({'models': models})
    except requests.exceptions.ConnectionError:
        return jsonify({'error': '无法连接到API服务器'}), 400
    except requests.exceptions.HTTPError as e:
        return jsonify({'error': f'HTTP {e.response.status_code}: {e.response.text[:200]}'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 400


# ---- Wishes API ----

@app.route('/api/wishes', methods=['GET'])
def api_get_wishes():
    return jsonify(db.get_wishes(include_redeemed=True))


@app.route('/api/wishes', methods=['POST'])
def api_create_wish():
    data = request.json
    virtual_cost = data.get('virtual_cost')

    if virtual_cost is None or virtual_cost <= 0:
        ai_cfg = db.get_ai_settings()
        if ai_cfg.get('base_url') and ai_cfg.get('api_key'):
            try:
                extra_headers = json.loads(ai_cfg.get('extra_headers', '{}'))
            except json.JSONDecodeError:
                extra_headers = {}
            try:
                virtual_cost, reason = ai_service.evaluate_wish(
                    ai_cfg['base_url'], ai_cfg['api_key'], ai_cfg['model_name'],
                    data['name'], data.get('real_price', 0), extra_headers
                )
            except Exception:
                virtual_cost = data.get('real_price', 10)
        else:
            virtual_cost = data.get('real_price', 10)

    wish = db.create_wish(data['name'], data.get('real_price', 0), virtual_cost)
    return jsonify(wish), 201


@app.route('/api/wishes/<int:wish_id>/redeem', methods=['POST'])
def api_redeem_wish(wish_id):
    wish, error = db.redeem_wish(wish_id)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(wish)


@app.route('/api/wishes/<int:wish_id>', methods=['DELETE'])
def api_delete_wish(wish_id):
    db.delete_wish(wish_id)
    return jsonify({'ok': True})


# ---- Balance & Transactions ----

@app.route('/api/balance', methods=['GET'])
def api_get_balance():
    return jsonify({'balance': db.get_balance()})


@app.route('/api/balance/reset', methods=['POST'])
def api_reset_balance():
    old = db.reset_balance()
    return jsonify({'ok': True, 'cleared': old})


@app.route('/api/transactions', methods=['GET'])
def api_get_transactions():
    return jsonify(db.get_transactions())


# ---- Settings ----

@app.route('/api/settings', methods=['GET'])
def api_get_settings():
    return jsonify(db.get_settings())


@app.route('/api/settings', methods=['PUT'])
def api_update_settings():
    data = request.json
    db.update_settings(data)
    return jsonify({'ok': True})


# ---- Check-in ----

@app.route('/api/checkin-items', methods=['GET'])
def api_get_checkin_items():
    return jsonify(db.get_checkin_items())


@app.route('/api/checkin-items', methods=['POST'])
def api_create_checkin_item():
    data = request.json
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': '请输入名称'}), 400
    item = db.create_checkin_item(name)
    return jsonify(item), 201


@app.route('/api/checkin-items/<int:item_id>', methods=['DELETE'])
def api_delete_checkin_item(item_id):
    db.delete_checkin_item(item_id)
    return jsonify({'ok': True})


@app.route('/api/checkin/<int:item_id>', methods=['POST'])
def api_checkin(item_id):
    result, error = db.checkin_today(item_id)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(result)


# ---- Focus Sessions ----

@app.route('/api/sessions', methods=['POST'])
def api_create_session():
    data = request.json
    plan_id = data.get('plan_id')
    start_time = data.get('start_time', datetime.now().isoformat())
    category = data.get('category') or '未分类'
    if plan_id and not data.get('category'):
        plan = db.get_plan(plan_id)
        if plan:
            category = db.extract_category(plan['title'], plan.get('plan_type', ''))
    session = db.create_focus_session(plan_id, category, start_time)
    return jsonify(session), 201


@app.route('/api/sessions/<int:session_id>', methods=['PUT'])
def api_end_session(session_id):
    data = request.json
    end_time = data.get('end_time', datetime.now().isoformat())
    sessions = db.get_focus_sessions()
    session = None
    for s in sessions:
        if s['id'] == session_id:
            session = s
            break
    if not session:
        return jsonify({'error': '会话不存在'}), 404
    start = datetime.fromisoformat(session['start_time'])
    end = datetime.fromisoformat(end_time)
    duration = (end - start).total_seconds()
    result = db.end_focus_session(session_id, end_time, duration)
    return jsonify(result)


@app.route('/api/sessions', methods=['GET'])
def api_get_sessions():
    plan_id = request.args.get('plan_id', type=int)
    date_str = request.args.get('date')
    category = request.args.get('category')
    return jsonify(db.get_focus_sessions(plan_id, date_str, category))


@app.route('/api/sessions/<int:session_id>', methods=['DELETE'])
def api_delete_session(session_id):
    db.delete_focus_session(session_id)
    return jsonify({'ok': True})


# ---- Statistics ----

@app.route('/api/stats/cumulative', methods=['GET'])
def api_stats_cumulative():
    return jsonify(db.get_cumulative_stats())


@app.route('/api/stats/daily', methods=['GET'])
def api_stats_daily():
    date_str = request.args.get('date', date.today().isoformat())
    return jsonify(db.get_daily_stats(date_str))


@app.route('/api/stats/distribution', methods=['GET'])
def api_stats_distribution():
    period = request.args.get('period', 'day')
    date_str = request.args.get('date', date.today().isoformat())
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    return jsonify(db.get_distribution_stats(period, date_str, start_date, end_date))


@app.route('/api/stats/monthly', methods=['GET'])
def api_stats_monthly():
    month = request.args.get('month')
    if not month:
        today = date.today()
        month = f"{today.year}-{today.month:02d}"
    return jsonify(db.get_monthly_daily_stats(month))


# ---- Signatures ----

@app.route('/api/signatures', methods=['GET'])
def api_get_signatures():
    return jsonify(db.get_signatures())


@app.route('/api/signatures', methods=['PUT'])
def api_save_signatures():
    data = request.json
    db.save_signatures(data.get('contents', []))
    return jsonify({'ok': True})


# ---- Background ----

@app.route('/api/background/upload', methods=['POST'])
def api_upload_background():
    if 'file' not in request.files:
        return jsonify({'error': '未选择文件'}), 400
    file = request.files['file']
    if not file.filename:
        return jsonify({'error': '未选择文件'}), 400
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in ('jpg', 'jpeg', 'png', 'gif', 'webp'):
        return jsonify({'error': '不支持的格式，请上传 JPG/PNG/GIF/WebP'}), 400

    bg_dir = os.path.join(_user_dir, 'static', 'bg_custom')
    os.makedirs(bg_dir, exist_ok=True)
    filename = f'custom_bg.{ext}'
    filepath = os.path.join(bg_dir, filename)
    file.save(filepath)
    return jsonify({'path': f'/static/bg_custom/{filename}'})


@app.route('/api/background/custom/<filename>')
def api_get_custom_bg(filename):
    bg_dir = os.path.join(_user_dir, 'static', 'bg_custom')
    return send_from_directory(bg_dir, filename)


def start_flask(port):
    db.init_db()
    db.checkin_missed_penalty()
    app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)


def _wait_for_port(port, timeout=30):
    """Poll local port until it accepts connections."""
    import socket
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=0.1):
                return True
        except OSError:
            time.sleep(0.1)
    return False


_LOADING_HTML = '''<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{margin:0;background:#222;color:#eee;font-family:-apple-system,BlinkMacSystemFont,sans-serif;
display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;gap:16px}
.spinner{width:40px;height:40px;border:4px solid rgba(255,255,255,.2);border-top-color:#a78bfa;
border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
h1{font-size:20px;font-weight:600;opacity:.9}
p{font-size:13px;opacity:.5}
</style></head><body><div class="spinner"></div><h1>服务初始化中...</h1><p>正在启动 PlanMaster</p></body></html>'''


# ---- Update ----

GITHUB_REPO = 'MCGAgain/PlanMaster'
GITHUB_BRANCH = 'main'
_update_state = {'status': 'idle', 'percent': 0, 'message': ''}
_update_dir = os.path.join(os.path.expanduser('~'), 'Library', 'Application Support', 'PlanMaster', 'update')
os.makedirs(_update_dir, exist_ok=True)
PROGRESS_FILE = os.path.join(_update_dir, 'planmaster_update_progress.txt')

@app.route('/api/version', methods=['GET'])
def api_version():
    return jsonify({'version': CURRENT_VERSION})

def _get_remote_version():
    """获取远程版本号，优先从 raw 文件读取，失败则从 GitHub API 获取"""
    # 方法1: 从 raw 文件读取 CURRENT_VERSION
    raw_url = f'https://raw.githubusercontent.com/{GITHUB_REPO}/{GITHUB_BRANCH}/app.py'
    try:
        resp = requests.get(raw_url, timeout=10)
        if resp.status_code == 200:
            for line in resp.text.splitlines():
                if line.startswith('CURRENT_VERSION'):
                    return line.split("'")[1] if "'" in line else line.split('"')[1]
    except Exception:
        pass

    # 方法2: 从 GitHub API 获取最新 release tag
    try:
        api_url = f'https://api.github.com/repos/{GITHUB_REPO}/releases/latest'
        resp = requests.get(api_url, timeout=10, headers={'Accept': 'application/vnd.github.v3+json'})
        if resp.status_code == 200:
            tag = resp.json().get('tag_name', '')
            return tag.lstrip('v') if tag else None
    except Exception:
        pass

    return None

def _write_progress(msg):
    try:
        with open(PROGRESS_FILE, 'w') as f:
            f.write(msg)
    except Exception:
        pass

def _read_progress():
    try:
        with open(PROGRESS_FILE, 'r') as f:
            return f.read().strip()
    except Exception:
        return ''

def _push_progress(pct, msg=None):
    _update_state['percent'] = pct
    if msg:
        _update_state['message'] = msg
        _write_progress(msg)

def _get_asset_download_url():
    api_url = f'https://api.github.com/repos/{GITHUB_REPO}/releases/latest'
    resp = requests.get(api_url, timeout=15, headers={'Accept': 'application/vnd.github.v3+json'})
    if resp.status_code != 200:
        return None, None
    data = resp.json()
    remote_ver = data.get('tag_name', '').lstrip('v')
    is_windows = platform.system() == 'Windows'
    for asset in data.get('assets', []):
        name = asset.get('name', '')
        if is_windows and name.endswith('.exe'):
            return asset['browser_download_url'], remote_ver
        if not is_windows and (name.endswith('.dmg') or name.endswith('.tar.gz')) and 'macOS' in name:
            return asset['browser_download_url'], remote_ver
    return None, remote_ver

def _stream_download(url, dest_path):
    resp = requests.get(url, stream=True, timeout=30, allow_redirects=True)
    if resp.status_code != 200:
        _push_progress(0, f'下载失败 (HTTP {resp.status_code})')
        return False
    total = int(resp.headers.get('content-length', 0))
    downloaded = 0
    with open(dest_path, 'wb') as f:
        for chunk in resp.iter_content(chunk_size=65536):
            if not chunk:
                continue
            f.write(chunk)
            downloaded += len(chunk)
            if total > 0:
                pct = min(99, int(downloaded * 100 / total))
                mb_done = downloaded / 1048576
                mb_total = total / 1048576
                _push_progress(pct, f'下载中 {mb_done:.1f}/{mb_total:.1f} MB ({pct}%)')
    _push_progress(100, '下载完成')
    return True

def _install_and_restart():
    tmpdir = tempfile.gettempdir()
    is_windows = platform.system() == 'Windows'

    _update_state['status'] = 'restarting'

    if is_windows:
        setup_path = os.path.join(tmpdir, 'PlanMaster-Setup.exe')
        if not os.path.isfile(setup_path):
            _push_progress(0, '安装包不存在')
            _update_state['status'] = 'error'
            return
        _write_progress('正在启动安装程序...')
        subprocess.Popen(
            [setup_path, '/VERYSILENT', '/SUPPRESSMSGBOXES', '/FORCECLOSEAPPLICATIONS', '/RESTARTAPPLICATIONS'],
            cwd=tmpdir, close_fds=True
        )
        os._exit(0)
    else:
        if not getattr(sys, 'frozen', False):
            _push_progress(0, 'macOS 更新仅支持打包版本')
            _update_state['status'] = 'error'
            return

        # 查找已下载的更新包 (.dmg 或 .tar.gz)
        archive_path = None
        archive_format = None
        for fmt, ext in [('dmg', '.dmg'), ('tar.gz', '.tar.gz')]:
            candidate = os.path.join(tmpdir, f'PlanMaster-macOS{ext}')
            if os.path.isfile(candidate):
                archive_path = candidate
                archive_format = fmt
                break
        if not archive_path:
            _push_progress(0, '安装包不存在')
            _update_state['status'] = 'error'
            return

        app_path = updater._detect_app_path()
        if not app_path:
            _push_progress(0, '无法定位应用路径')
            _update_state['status'] = 'error'
            return

        _write_progress('正在启动安装程序...')
        updater._spawn_and_exit(
            updater._generate_install_script(app_path, archive_path, archive_format)
        )

def _download_and_install():
    try:
        _push_progress(-1, '正在获取更新信息...')
        is_windows = platform.system() == 'Windows'

        if is_windows:
            url, remote_ver = _get_asset_download_url()
            if not url:
                _push_progress(0, '未找到安装包，请前往 GitHub 手动下载')
                _update_state['status'] = 'error'
                return
            dest = os.path.join(tempfile.gettempdir(), 'PlanMaster-Setup.exe')
            _push_progress(0, f'准备下载 v{remote_ver}...')
            if not _stream_download(url, dest):
                _update_state['status'] = 'error'
                return
        else:
            ghproxy = os.environ.get('GHPROXY')
            url, remote_ver = updater._resolve_asset_url(ghproxy)
            if not url:
                _push_progress(0, '未找到安装包，请前往 GitHub 手动下载')
                _update_state['status'] = 'error'
                return
            ext = '.dmg' if url.endswith('.dmg') else '.tar.gz'
            dest = os.path.join(tempfile.gettempdir(), f'PlanMaster-macOS{ext}')
            _push_progress(0, f'准备下载 v{remote_ver}...')
            if not updater._download_file(url, dest, on_progress=lambda pct, msg: _push_progress(pct, msg)):
                _update_state['status'] = 'error'
                return

        time.sleep(0.5)
        _install_and_restart()
    except requests.exceptions.ConnectionError:
        _push_progress(0, '网络连接失败')
        _update_state['status'] = 'error'
    except requests.exceptions.Timeout:
        _push_progress(0, '下载超时')
        _update_state['status'] = 'error'
    except Exception as e:
        _push_progress(0, f'更新失败: {str(e)}')
        _update_state['status'] = 'error'

@app.route('/api/update', methods=['POST'])
def api_update():
    if _update_state['status'] == 'downloading':
        return jsonify({'updated': False, 'downloading': True, 'message': '正在下载中...'})

    try:
        remote_ver = _get_remote_version()
    except Exception:
        remote_ver = None

    if not remote_ver:
        return jsonify({'updated': False, 'message': '无法获取远程版本信息，请检查网络'})
    if _parse_version(remote_ver) <= _parse_version(CURRENT_VERSION):
        return jsonify({'updated': False, 'message': f'已是最新版本 v{CURRENT_VERSION}'})

    if not getattr(sys, 'frozen', False):
        return jsonify({'updated': False, 'message': f'发现新版本 v{remote_ver}，开发模式下请手动更新'})

    _update_state['status'] = 'downloading'
    _update_state['percent'] = 0
    _update_state['message'] = f'准备下载 v{remote_ver}...'
    _write_progress(f'准备下载 v{remote_ver}...')
    threading.Thread(target=_download_and_install, daemon=True).start()
    return jsonify({'updated': False, 'downloading': True, 'message': f'发现新版本 v{remote_ver}，开始下载...'})

@app.route('/api/update/status', methods=['GET'])
def api_update_status():
    file_msg = _read_progress()
    return jsonify({
        'status': _update_state['status'],
        'percent': _update_state['percent'],
        'message': file_msg or _update_state['message'],
    })


if __name__ == '__main__':
    port = 8080

    if getattr(sys, 'frozen', False):
        import webview

        flask_thread = threading.Thread(target=start_flask, args=(port,), daemon=True)
        flask_thread.start()

        window = webview.create_window(
            'Todo - 计划管理',
            html=_LOADING_HTML,
            width=1200,
            height=800,
            min_size=(800, 600),
            text_select=True,
        )

        def _on_loaded():
            _wait_for_port(port)
            window.load_url(f'http://127.0.0.1:{port}')

        webview.start(_on_loaded)
    else:
        db.init_db()
        db.checkin_missed_penalty()
        threading.Timer(1.0, lambda: webbrowser.open(f'http://localhost:{port}')).start()
        print(f"Todo 启动中... 浏览器将自动打开 http://localhost:{port}")
        app.run(host='0.0.0.0', port=port, debug=False)
