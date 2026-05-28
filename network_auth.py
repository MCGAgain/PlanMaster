"""
Campus Network Auto-Login Module.

Handles captive portal detection and automatic authentication
for campus network portals (eportal-style).
"""

import requests
import logging
import threading
import time
from urllib.parse import urlencode, parse_qs, urlparse

logger = logging.getLogger(__name__)

# Default portal config (can be overridden by user settings)
PORTAL_IP = '10.60.208.4'
CHECK_URL = 'http://connect.rom.miui.com/generate_204'  # Xiaomi connectivity check
LOGIN_INTERVAL = 300  # Check every 5 minutes

_stop_event = threading.Event()
_monitor_thread = None


def _get_portal_url():
    return f'http://{PORTAL_IP}'


def check_network_status():
    """Check if network needs authentication.
    Returns: (status: str, portal_url: str)
    status: 'connected', 'portal', or 'error'
    portal_url: the redirect URL with query params (only for 'portal')
    """
    try:
        resp = requests.get(CHECK_URL, timeout=5, allow_redirects=False)
        if resp.status_code == 204:
            return 'connected', ''
        if resp.status_code in (301, 302):
            location = resp.headers.get('Location', '')
            if PORTAL_IP in location or 'eportal' in location:
                return 'portal', location
        # Try direct portal check
        resp2 = requests.get(f'http://{PORTAL_IP}/eportal/index.jsp', timeout=5, allow_redirects=False)
        if resp2.status_code in (301, 302):
            return 'portal', resp2.headers.get('Location', '')
        if resp2.status_code == 200:
            return 'portal', resp2.url
        return 'error', ''
    except requests.exceptions.RequestException:
        try:
            resp = requests.get(f'http://{PORTAL_IP}/eportal/index.jsp', timeout=5, allow_redirects=False)
            if resp.status_code in (301, 302):
                return 'portal', resp.headers.get('Location', '')
            if resp.status_code == 200:
                return 'portal', resp.url
        except Exception:
            pass
        return 'error', ''


def get_query_string(portal_url):
    """Extract queryString from portal redirect URL for login POST."""
    parsed = urlparse(portal_url)
    # The queryString is the entire query string from the URL
    return parsed.query if parsed.query else ''


def login(userId, password, queryString=''):
    """Login to campus network portal.
    Returns: (success: bool, message: str)
    """
    url = f'http://{PORTAL_IP}/eportal/InterFace.do?method=login'

    data = {
        'userId': userId,
        'password': password,
        'service': '',
        'queryString': queryString,
        'operatorPwd': '',
        'operatorUserId': '',
        'validcode': '',
    }

    try:
        resp = requests.post(url, data=data, timeout=10)
        result = resp.json()
        if result.get('result') == 'success':
            return True, '登录成功'
        msg = result.get('message', result.get('result', '未知错误'))
        return False, f'登录失败: {msg}'
    except requests.exceptions.RequestException as e:
        return False, f'网络错误: {str(e)}'
    except Exception as e:
        return False, f'错误: {str(e)}'


def logout():
    """Logout from campus network."""
    url = f'http://{PORTAL_IP}/eportal/InterFace.do?method=logout'
    try:
        resp = requests.post(url, timeout=10)
        result = resp.json()
        return result.get('result') == 'success', result.get('message', '')
    except Exception as e:
        return False, str(e)


def auto_login_if_needed(userId, password):
    """Check network status and auto-login if portal detected.
    Returns: (action: str, message: str)
    action: 'connected', 'login_success', 'login_failed', 'error'
    """
    status, portal_url = check_network_status()
    if status == 'connected':
        return 'connected', '网络已连接'
    if status == 'error':
        return 'error', '无法检测网络状态'

    # Portal detected, extract queryString from redirect URL
    qs = get_query_string(portal_url)
    success, msg = login(userId, password, queryString=qs)
    if success:
        return 'login_success', '自动登录成功'
    return 'login_failed', msg


def start_monitor(get_credentials_fn, on_status_fn=None):
    """Start background network monitor thread.
    get_credentials_fn: () -> (userId, password) or None
    on_status_fn: (action, message) callback
    """
    global _monitor_thread
    _stop_event.clear()

    def _loop():
        while not _stop_event.is_set():
            try:
                creds = get_credentials_fn()
                if creds and creds[0] and creds[1]:
                    action, msg = auto_login_if_needed(creds[0], creds[1])
                    if on_status_fn:
                        on_status_fn(action, msg)
            except Exception as e:
                logger.error(f'Network monitor error: {e}')
            _stop_event.wait(LOGIN_INTERVAL)

    _monitor_thread = threading.Thread(target=_loop, daemon=True)
    _monitor_thread.start()


def stop_monitor():
    """Stop the background monitor."""
    _stop_event.set()
