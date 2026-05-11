import json
import requests
from prompts import PLAN_SORT_PROMPT, PLAN_SINGLE_EVAL_PROMPT, WISH_EVAL_PROMPT

PLAN_TYPE_CN = {
    'today': '今日',
    'weekly': '周',
    'monthly': '月',
    'yearly': '年',
}


def _call_llm(base_url, api_key, model, messages, extra_headers=None):
    """Call OpenAI-compatible API."""
    url = base_url.rstrip('/') + '/chat/completions'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}',
    }
    if extra_headers:
        headers.update(extra_headers)

    payload = {
        'model': model,
        'messages': messages,
        'temperature': 0.3,
        'response_format': {'type': 'json_object'},
    }

    resp = requests.post(url, json=payload, headers=headers, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    content = data['choices'][0]['message']['content']
    return json.loads(content)


def fetch_models(base_url, api_key, extra_headers=None):
    """Fetch available models from OpenAI-compatible API."""
    url = base_url.rstrip('/') + '/models'
    headers = {
        'Authorization': f'Bearer {api_key}',
    }
    if extra_headers:
        headers.update(extra_headers)

    resp = requests.get(url, headers=headers, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    models = [m['id'] for m in data.get('data', [])]
    models.sort()
    return models


def test_connection(base_url, api_key, model, extra_headers=None):
    """Test if the AI API is reachable and responding."""
    try:
        result = _call_llm(
            base_url, api_key, model,
            [{'role': 'user', 'content': '请回复JSON格式: {"status": "ok"}'}],
            extra_headers
        )
        return True, "连接成功"
    except requests.exceptions.ConnectionError:
        return False, "无法连接到API服务器，请检查Base URL"
    except requests.exceptions.Timeout:
        return False, "连接超时"
    except requests.exceptions.HTTPError as e:
        return False, f"HTTP错误: {e.response.status_code} - {e.response.text[:200]}"
    except Exception as e:
        return False, f"错误: {str(e)}"


def evaluate_single_plan(base_url, api_key, model, plan_type, title, description, min_value, max_value, extra_headers=None):
    """Evaluate a single plan's priority and virtual value."""
    plan_type_cn = PLAN_TYPE_CN.get(plan_type, plan_type)
    prompt = PLAN_SINGLE_EVAL_PROMPT.format(
        plan_type_cn=plan_type_cn,
        min_value=min_value,
        max_value=max_value,
        title=title,
        description=description or '无',
    )
    result = _call_llm(
        base_url, api_key, model,
        [{'role': 'system', 'content': prompt}],
        extra_headers
    )
    priority = min(100, max(1, int(result.get('priority', 50))))
    virtual_value = round(float(result.get('virtual_value', min_value)), 1)
    return priority, virtual_value, result.get('reason', '')


def sort_plans(base_url, api_key, model, plans, plan_type, min_value, max_value, extra_headers=None):
    """Use AI to sort plans by priority and assign virtual values."""
    plan_type_cn = PLAN_TYPE_CN.get(plan_type, plan_type)
    plans_json = json.dumps(
        [{'id': p['id'], 'title': p['title'], 'description': p['description']} for p in plans],
        ensure_ascii=False, indent=2
    )

    prompt = PLAN_SORT_PROMPT.format(
        plan_type_cn=plan_type_cn,
        min_value=min_value,
        max_value=max_value,
        plans_json=plans_json,
    )

    result = _call_llm(
        base_url, api_key, model,
        [{'role': 'system', 'content': prompt}],
        extra_headers
    )

    sorted_plans = result.get('sorted_plans', [])
    # Validate and clamp values
    for item in sorted_plans:
        item['priority'] = min(100, max(1, int(item.get('priority', 50))))
        item['virtual_value'] = round(float(item.get('virtual_value', min_value)), 1)
    return sorted_plans


def evaluate_wish(base_url, api_key, model, name, price, extra_headers=None):
    """Use AI to evaluate the virtual cost of a wish item."""
    prompt = WISH_EVAL_PROMPT.format(name=name, price=price)
    result = _call_llm(
        base_url, api_key, model,
        [{'role': 'system', 'content': prompt}],
        extra_headers
    )
    return round(float(result.get('virtual_cost', 0)), 1), result.get('reason', '')
