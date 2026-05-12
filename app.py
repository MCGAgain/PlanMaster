import json
import sys
import os
import webbrowser
import threading
import requests
from flask import Flask, render_template, request, jsonify
import database as db
import ai_service

if getattr(sys, 'frozen', False):
    base_dir = sys._MEIPASS
    _user_dir = os.path.join(os.path.expanduser('~'), 'Library', 'Application Support', 'PlanMaster')
    os.makedirs(_user_dir, exist_ok=True)
else:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    _user_dir = base_dir

_tpl_dir = os.path.join(_user_dir, 'templates') if os.path.isdir(os.path.join(_user_dir, 'templates')) else os.path.join(base_dir, 'templates')
_sta_dir = os.path.join(_user_dir, 'static') if os.path.isdir(os.path.join(_user_dir, 'static')) else os.path.join(base_dir, 'static')
app = Flask(__name__, template_folder=_tpl_dir, static_folder=_sta_dir)


@app.route('/')
def index():
    return render_template('index.html')


# ---- Plans API ----

@app.route('/api/plans', methods=['GET'])
def api_get_plans():
    plan_type = request.args.get('type')
    return jsonify(db.get_plans(plan_type, include_completed=False))


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


# ---- Signatures ----

@app.route('/api/signatures', methods=['GET'])
def api_get_signatures():
    return jsonify(db.get_signatures())


@app.route('/api/signatures', methods=['PUT'])
def api_save_signatures():
    data = request.json
    db.save_signatures(data.get('contents', []))
    return jsonify({'ok': True})


def start_flask(port):
    db.init_db()
    app.run(host='127.0.0.1', port=port, debug=False, use_reloader=False)


# ---- Update ----

GITHUB_REPO = 'MCGAgain/PlanMaster'
CURRENT_VERSION = '1.1.3'

@app.route('/api/version', methods=['GET'])
def api_version():
    return jsonify({'version': CURRENT_VERSION})

def _get_remote_version():
    raw_url = f'https://raw.githubusercontent.com/{GITHUB_REPO}/master/app.py'
    resp = requests.get(raw_url, timeout=10)
    if resp.status_code != 200:
        return None
    for line in resp.text.splitlines():
        if line.startswith('CURRENT_VERSION'):
            return line.split("'")[1] if "'" in line else line.split('"')[1]
    return None

@app.route('/api/update', methods=['POST'])
def api_update():
    import io, zipfile
    try:
        remote_ver = _get_remote_version()
        if remote_ver and remote_ver == CURRENT_VERSION:
            return jsonify({'updated': False, 'message': f'已是最新版本 v{CURRENT_VERSION}'})
    except Exception:
        pass

    url = f'https://github.com/{GITHUB_REPO}/archive/refs/heads/master.zip'
    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code != 200:
            return jsonify({'updated': False, 'message': f'下载失败 (HTTP {resp.status_code})'})
        with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
            prefix = zf.namelist()[0]
            files_to_update = []
            for name in zf.namelist():
                if name.endswith('/'):
                    continue
                rel = name[len(prefix):]
                if rel.startswith(('app.py', 'database.py', 'ai_service.py', 'prompts.py',
                                   'templates/', 'static/', 'requirements.txt')):
                    files_to_update.append((name, rel))
            if not files_to_update:
                return jsonify({'updated': False, 'message': '未找到可更新的文件'})
            for arc_name, rel_path in files_to_update:
                dest = os.path.join(_user_dir, rel_path)
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                with zf.open(arc_name) as src, open(dest, 'wb') as dst:
                    dst.write(src.read())
        new_ver = _get_remote_version() or remote_ver or '?'
        return jsonify({'updated': True, 'message': f'已更新到 v{new_ver} ({len(files_to_update)} 个文件)，即将刷新'})
    except requests.exceptions.ConnectionError:
        return jsonify({'updated': False, 'message': '网络连接失败'})
    except requests.exceptions.Timeout:
        return jsonify({'updated': False, 'message': '下载超时'})
    except Exception as e:
        return jsonify({'updated': False, 'message': str(e)})


if __name__ == '__main__':
    port = 8080

    if getattr(sys, 'frozen', False):
        import webview
        flask_thread = threading.Thread(target=start_flask, args=(port,), daemon=True)
        flask_thread.start()
        window = webview.create_window(
            'Todo - 计划管理',
            f'http://127.0.0.1:{port}',
            width=1200,
            height=800,
            min_size=(800, 600),
            text_select=True,
        )
        webview.start()
    else:
        db.init_db()
        threading.Timer(1.0, lambda: webbrowser.open(f'http://localhost:{port}')).start()
        print(f"Todo 启动中... 浏览器将自动打开 http://localhost:{port}")
        app.run(host='127.0.0.1', port=port, debug=False)
