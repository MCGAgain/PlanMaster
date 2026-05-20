"""Standalone macOS online update module for PlanMaster.

Handles version detection, asset download from GitHub Releases,
and suicide-hot-replacement via a detached shell script.
"""

import os
import sys
import sqlite3
import subprocess
import platform
import requests
from datetime import datetime

GITHUB_REPO = 'MCGAgain/PlanMaster'
APP_NAME = 'PlanMaster'


def _gh_headers():
    """返回带认证的 GitHub API 请求头（如有 token）"""
    token = os.environ.get('GITHUB_TOKEN') or os.environ.get('GH_TOKEN')
    headers = {'Accept': 'application/vnd.github.v3+json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    return headers
_last_resolve_error = None
UPDATE_DIR = os.path.join(os.path.expanduser('~'), 'Library', 'Application Support', 'PlanMaster', 'update')
PROGRESS_FILE = os.path.join(UPDATE_DIR, 'planmaster_update_progress.txt')
ERR_LOG = os.path.join(UPDATE_DIR, 'planmaster_update.log')

os.makedirs(UPDATE_DIR, exist_ok=True)


def _close_open_sessions():
    """Close all unfinished focus sessions before process exit.

    Uses raw sqlite3 to avoid importing database.py (which may have
    different import requirements). Closes every session with end_time IS NULL,
    calculating duration from start_time to now.
    """
    try:
        if getattr(sys, 'frozen', False):
            if platform.system() == 'Windows':
                data_dir = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'PlanMaster')
            else:
                data_dir = os.path.join(os.path.expanduser('~'), 'Library', 'Application Support', 'PlanMaster')
        else:
            data_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(data_dir, 'todo.db')
        if not os.path.isfile(db_path):
            return
        conn = sqlite3.connect(db_path, timeout=5)
        now = datetime.now()
        rows = conn.execute(
            "SELECT id, start_time FROM focus_sessions WHERE end_time IS NULL"
        ).fetchall()
        for row in rows:
            start = datetime.fromisoformat(row[1].replace('Z', ''))
            end_time = now.isoformat()
            duration = int((now - start).total_seconds())
            conn.execute(
                "UPDATE focus_sessions SET end_time=?, duration=? WHERE id=?",
                (end_time, duration, row[0])
            )
        conn.commit()
        conn.close()
    except Exception:
        pass


# ── Public API ────────────────────────────────────────────────────────────────

def get_remote_version():
    """Fetch the latest release tag from GitHub Releases API.

    Returns the version string (without 'v' prefix) or None on failure.
    """
    try:
        api_url = f'https://api.github.com/repos/{GITHUB_REPO}/releases/latest'
        resp = requests.get(api_url, timeout=10, headers=_gh_headers())
        if resp.status_code == 200:
            tag = resp.json().get('tag_name', '')
            return tag.lstrip('v') if tag else None
    except Exception:
        pass
    return None


def start_update(current_version, ghproxy=None, on_progress=None):
    """Main entry point: resolve asset, download, spawn install script, exit.

    On success this function never returns (calls os._exit(0)).
    Returns an error dict if something fails before the spawn.
    on_progress(percent: int, message: str) is called during download.
    """
    if not getattr(sys, 'frozen', False):
        return {'error': True, 'message': 'macOS 更新仅支持打包版本'}

    app_path = _detect_app_path()
    if not app_path:
        return {'error': True, 'message': '无法定位应用路径'}

    if not ghproxy:
        ghproxy = os.environ.get('GHPROXY')

    if on_progress:
        on_progress(-1, '正在获取更新信息...')

    url, remote_ver = _resolve_asset_url(ghproxy)
    if not url:
        return {'error': True, 'message': '未找到安装包，请前往 GitHub 手动下载'}

    ext = '.dmg' if url.endswith('.dmg') else '.tar.gz'
    dest = os.path.join('/tmp', f'{APP_NAME}-macOS{ext}')

    if on_progress:
        on_progress(0, f'准备下载 v{remote_ver}...')

    if not _download_file(url, dest, on_progress=on_progress):
        return {'error': True, 'message': '下载失败'}

    script_content = _generate_install_script(app_path, dest, 'dmg' if ext == '.dmg' else 'tar.gz')
    _spawn_and_exit(script_content)


def get_progress():
    """Read the current update progress from disk.

    Returns a dict with 'status', 'percent', 'message'.
    """
    msg = ''
    try:
        with open(PROGRESS_FILE, 'r') as f:
            msg = f.read().strip()
    except Exception:
        pass
    return {'status': 'unknown', 'percent': 0, 'message': msg}


# ── Internal functions ────────────────────────────────────────────────────────

def _resolve_asset_url(ghproxy=None):
    """Find the macOS download URL from the latest GitHub release.

    Prefers .dmg, falls back to .tar.gz.
    Returns (download_url, remote_version) or (None, None).
    On error, sets _last_resolve_error with details.
    """
    global _last_resolve_error
    _last_resolve_error = None
    try:
        api_url = f'https://api.github.com/repos/{GITHUB_REPO}/releases/latest'
        resp = requests.get(api_url, timeout=15, headers=_gh_headers())
        if resp.status_code != 200:
            _last_resolve_error = f'GitHub API 返回 HTTP {resp.status_code}'
            print(f'[updater] GitHub API 返回 {resp.status_code}: {resp.text[:200]}')
            return None, None
        data = resp.json()
        remote_ver = data.get('tag_name', '').lstrip('v')

        dmg_url = None
        tar_url = None
        for asset in data.get('assets', []):
            name = asset.get('name', '').lower()
            if not (name.endswith('.dmg') or name.endswith('.tar.gz')):
                continue
            if name.endswith('.dmg'):
                dmg_url = asset['browser_download_url']
            elif name.endswith('.tar.gz'):
                tar_url = asset['browser_download_url']

        url = dmg_url or tar_url
        if not url:
            _last_resolve_error = f'Release v{remote_ver} 中未找到 .dmg 或 .tar.gz 安装包'
            return None, remote_ver

        if ghproxy:
            url = ghproxy.rstrip('/') + '/' + url

        return url, remote_ver
    except requests.exceptions.ConnectionError as e:
        _last_resolve_error = f'网络连接失败: {e}'
        print(f'[updater] 网络连接失败: {e}')
        return None, None
    except requests.exceptions.Timeout:
        _last_resolve_error = 'GitHub API 请求超时'
        print('[updater] GitHub API 请求超时')
        return None, None
    except Exception as e:
        _last_resolve_error = f'获取更新信息失败: {e}'
        print(f'[updater] _resolve_asset_url 异常: {e}')
        return None, None


def _download_file(url, dest_path, on_progress=None):
    """Download a file with streaming progress.

    Returns True on success, False on failure.
    """
    try:
        resp = requests.get(url, stream=True, timeout=30, allow_redirects=True)
        if resp.status_code != 200:
            print(f'[updater] 下载失败: HTTP {resp.status_code}')
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
                    msg = f'下载中 {mb_done:.1f}/{mb_total:.1f} MB ({pct}%)'
                    print(f'[updater] {msg}')
                    if on_progress:
                        on_progress(pct, msg)

        print('[updater] 下载完成')
        if on_progress:
            on_progress(100, '下载完成')
        return True
    except Exception as e:
        print(f'[updater] 下载异常: {e}')
        return False


def _detect_app_path():
    """Walk up from sys.executable to find the enclosing .app bundle.

    Returns the absolute path to the .app directory, or None if not found.
    """
    exe = sys.executable
    for _ in range(5):
        candidate = os.path.dirname(exe)
        if candidate.endswith('.app'):
            return candidate
        exe = candidate
    return None


def _generate_install_script(app_path, archive_path, archive_format):
    """Generate the bash install script content.

    archive_format: 'dmg' or 'tar.gz'
    """
    parent_pid = os.getpid()
    update_dir = UPDATE_DIR
    err_log = ERR_LOG
    progress_file = PROGRESS_FILE
    extract_dir = os.path.join(update_dir, 'pm_update_extract')

    # Common preamble: wait for parent to exit
    preamble = (
        '#!/bin/bash\n'
        'set -e\n'
        f'PROGRESS="{progress_file}"\n'
        f'ERR_LOG="{err_log}"\n'
        f'APP="{app_path}"\n'
        f'ARCHIVE="{archive_path}"\n'
        f'PARENT_PID={parent_pid}\n'
        f'EXTRACT_DIR="{extract_dir}"\n'
        'log() { echo "$(date "+%H:%M:%S") $1" >> "$ERR_LOG"; echo "$1" > "$PROGRESS"; }\n'
        'log "=== 更新脚本启动 ==="\n'
        'log "APP=$APP"\n'
        'log "ARCHIVE=$ARCHIVE"\n'
        'log "PARENT_PID=$PARENT_PID"\n'
        '\n'
        '# 等待主进程退出\n'
        'log "等待主程序退出..."\n'
        'WAIT=0\n'
        'while kill -0 "$PARENT_PID" 2>/dev/null && [ "$WAIT" -lt 15 ]; do\n'
        '  sleep 0.5\n'
        '  WAIT=$((WAIT + 1))\n'
        'done\n'
        'sleep 1\n'
    )

    if archive_format == 'dmg':
        install_body = (
            '# 清理旧的挂载点\n'
            'OLD_MOUNT=$(hdiutil info | grep -A1 "PlanMaster" | grep "/Volumes/" | awk \'{{print $NF}}\' | head -1)\n'
            'if [ -n "$OLD_MOUNT" ]; then\n'
            '  hdiutil detach "$OLD_MOUNT" -quiet 2>/dev/null || true\n'
            'fi\n'
            '\n'
            '# 移除 DMG 隔离属性\n'
            'log "移除 DMG 隔离属性..."\n'
            'xattr -d com.apple.quarantine "$ARCHIVE" 2>/dev/null || true\n'
            '\n'
            '# 挂载 DMG\n'
            'log "挂载 DMG..."\n'
            'MOUNT_POINT=$(hdiutil attach "$ARCHIVE" -nobrowse -readonly | grep "/Volumes/" | sed \'s/.*\\/Volumes/\\/Volumes/\' | head -1)\n'
            'if [ -z "$MOUNT_POINT" ]; then\n'
            '  log "错误: DMG 挂载失败"\n'
            '  exit 1\n'
            'fi\n'
            'log "挂载点: $MOUNT_POINT"\n'
            '\n'
            '# 查找 PlanMaster.app\n'
            'NEW_APP=$(find "$MOUNT_POINT" -maxdepth 2 -name "{app_name}.app" -type d | head -1)\n'
            'if [ -z "$NEW_APP" ]; then\n'
            '  log "错误: DMG 中未找到 {app_name}.app"\n'
            '  hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true\n'
            '  exit 1\n'
            'fi\n'
            'log "新应用: $NEW_APP"\n'
            '\n'
            '# 移除应用隔离属性\n'
            'xattr -r -d com.apple.quarantine "$NEW_APP" 2>/dev/null || true\n'
            '\n'
            '# 替换应用\n'
            'log "正在替换应用..."\n'
            'rm -rf "$APP"\n'
            'ditto "$NEW_APP" "$APP"\n'
            '\n'
            '# 卸载 DMG\n'
            'hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true\n'
        ).format(app_name=APP_NAME)
    else:
        # tar.gz fallback
        install_body = (
            '# 解压 tar.gz\n'
            'log "正在解压..."\n'
            'rm -rf "$EXTRACT_DIR"\n'
            'mkdir -p "$EXTRACT_DIR"\n'
            'tar xzf "$ARCHIVE" -C "$EXTRACT_DIR"\n'
            '\n'
            '# 查找 PlanMaster.app\n'
            'NEW_APP=$(find "$EXTRACT_DIR" -maxdepth 2 -name "{app_name}.app" -type d | head -1)\n'
            'if [ -z "$NEW_APP" ]; then\n'
            '  log "错误: 解压后未找到 {app_name}.app"\n'
            '  exit 1\n'
            'fi\n'
            'log "新应用: $NEW_APP"\n'
            '\n'
            '# 移除应用隔离属性\n'
            'xattr -r -d com.apple.quarantine "$NEW_APP" 2>/dev/null || true\n'
            '\n'
            '# 替换应用\n'
            'log "正在替换应用..."\n'
            'rm -rf "$APP"\n'
            'ditto "$NEW_APP" "$APP"\n'
            '\n'
            '# 清理解压目录\n'
            'rm -rf "$EXTRACT_DIR"\n'
        ).format(app_name=APP_NAME)

    epilogue = (
        '\n'
        '# 验证替换结果\n'
        'if [ ! -d "$APP/Contents/MacOS" ]; then\n'
        '  log "错误: 替换后应用结构异常"\n'
        '  exit 1\n'
        'fi\n'
        '\n'
        '# 清理下载文件\n'
        'log "清理临时文件..."\n'
        'rm -f "$ARCHIVE"\n'
        '\n'
        '# 启动新版本\n'
        'log "正在启动新版本..."\n'
        'open "$APP"\n'
        'sleep 2\n'
        'log "=== 更新完成 ==="\n'
    )

    return preamble + install_body + epilogue


def _spawn_and_exit(script_content):
    """Write the install script to disk, spawn it detached, and exit."""
    script_path = os.path.join(UPDATE_DIR, 'update_planmaster.sh')

    with open(script_path, 'w') as f:
        f.write(script_content)
    os.chmod(script_path, 0o755)

    print(f'[updater] 启动更新脚本: {script_path}')
    subprocess.Popen(
        ['/bin/bash', script_path],
        start_new_session=True,
        stdin=subprocess.DEVNULL,
    )
    _close_open_sessions()
    os._exit(0)
