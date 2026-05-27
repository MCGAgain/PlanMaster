"""
Agent Tool Registry - Backend tools that the AI can call.
Each tool is a function the AI can invoke during a conversation.
"""

import database as db

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": "创建一个新任务/计划。可以指定类型（今日/周/月/年）和截止日期。",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "任务标题"},
                    "plan_type": {"type": "string", "enum": ["today", "weekly", "monthly", "yearly"], "description": "任务类型"},
                    "description": {"type": "string", "description": "任务描述"},
                    "priority": {"type": "integer", "description": "优先级 1-100"},
                    "due_date": {"type": "string", "description": "截止日期 YYYY-MM-DD"}
                },
                "required": ["title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "query_tasks",
            "description": "查询任务列表。可以按类型和关键词筛选。返回任务列表包含 id、标题、优先级、进度等。",
            "parameters": {
                "type": "object",
                "properties": {
                    "plan_type": {"type": "string", "enum": ["today", "weekly", "monthly", "yearly", "important"], "description": "任务类型"},
                    "keyword": {"type": "string", "description": "搜索关键词"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_task",
            "description": "更新任务信息，如修改标题、优先级、进度、截止日期等。",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "integer", "description": "任务ID"},
                    "title": {"type": "string"},
                    "priority": {"type": "integer"},
                    "progress": {"type": "integer"},
                    "due_date": {"type": "string"},
                    "description": {"type": "string"}
                },
                "required": ["task_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "complete_task",
            "description": "标记任务为已完成，会获得虚拟价值奖励。",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "integer", "description": "任务ID"}
                },
                "required": ["task_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_task_log",
            "description": "给任务添加一条进度日志，记录当前进展、学到的内容、下一步计划。",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "integer", "description": "任务ID"},
                    "content": {"type": "string", "description": "日志内容"},
                    "next_step": {"type": "string", "description": "下一步计划"}
                },
                "required": ["task_id", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "query_task_logs",
            "description": "查询某个任务的进度日志历史。",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "integer", "description": "任务ID"}
                },
                "required": ["task_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_focus_stats",
            "description": "查询专注统计数据。可以查指定日期或累计。返回今日/本周/本月专注时长和获得的虚拟价值。",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {"type": "string", "description": "查询日期 YYYY-MM-DD，默认今天"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_balance",
            "description": "查询当前虚拟价值余额和近期流水。",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_daily_plan",
            "description": "在今日规划中添加一条规划项，可以关联已有任务。",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "规划标题"},
                    "note": {"type": "string", "description": "思路/备注"},
                    "date": {"type": "string", "description": "日期 YYYY-MM-DD，默认今天"},
                    "linked_plan_id": {"type": "integer", "description": "关联的任务ID"}
                },
                "required": ["title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "query_daily_plans",
            "description": "查询某天的规划列表。",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {"type": "string", "description": "日期 YYYY-MM-DD，默认今天"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_checkin_stats",
            "description": "查询打卡习惯和连续打卡情况。",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "query_wishes",
            "description": "查询心愿兑换单列表，包括虚拟价值和兑换状态。",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_wish",
            "description": "创建一个新的心愿。",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "心愿名称"},
                    "virtual_cost": {"type": "number", "description": "虚拟价值成本，留空由AI评估"},
                    "real_price": {"type": "number", "description": "真实价格（可选）"}
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "redeem_wish",
            "description": "兑换一个心愿，会扣除对应的虚拟价值余额。",
            "parameters": {
                "type": "object",
                "properties": {
                    "wish_id": {"type": "integer", "description": "心愿ID"}
                },
                "required": ["wish_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "query_important_items",
            "description": "查询重要事项列表。",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_important_item",
            "description": "创建一个重要事项，需要设置截止日期。",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "事项标题"},
                    "description": {"type": "string", "description": "事项描述"},
                    "due_date": {"type": "string", "description": "截止日期 YYYY-MM-DD"}
                },
                "required": ["title", "due_date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_transactions",
            "description": "查询虚拟价值流水记录，包括收支明细。",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "sort_tasks_ai",
            "description": "用AI对某个类型的任务进行智能排序，按优先级和价值重新排列。",
            "parameters": {
                "type": "object",
                "properties": {
                    "plan_type": {"type": "string", "enum": ["today", "weekly", "monthly", "yearly"], "description": "任务类型"}
                },
                "required": ["plan_type"]
            }
        }
    }
]


def _today_str():
    from datetime import date
    return date.today().isoformat()


def execute_tool(name, arguments):
    """Execute a tool by name with given arguments. Returns a JSON-serializable result."""
    try:
        if name == "create_task":
            return db.create_plan(
                plan_type=arguments.get("plan_type", "today"),
                title=arguments["title"],
                description=arguments.get("description", ""),
                priority=arguments.get("priority", 0) or 0,
                due_date=arguments.get("due_date")
            )

        elif name == "query_tasks":
            pt = arguments.get("plan_type")
            kw = arguments.get("keyword", "")
            if pt == "important":
                items = db.get_important_items()
            else:
                items = db.get_plans(pt)
            if kw:
                items = [i for i in items if kw.lower() in i.get("title", "").lower() or kw.lower() in i.get("description", "").lower()]
            return items

        elif name == "update_task":
            tid = arguments.pop("task_id")
            return db.update_plan(tid, **{k: v for k, v in arguments.items() if v is not None})

        elif name == "complete_task":
            return db.complete_plan(arguments["task_id"])

        elif name == "add_task_log":
            return db.create_task_log(
                plan_id=arguments["task_id"],
                content=arguments["content"],
                next_step=arguments.get("next_step", "")
            )

        elif name == "query_task_logs":
            return db.get_task_logs(arguments["task_id"])

        elif name == "get_focus_stats":
            date_str = arguments.get("date", _today_str())
            daily = db.get_daily_stats(date_str)
            cumulative = db.get_cumulative_stats()
            with db._conn() as conn:
                row = conn.execute(
                    "SELECT COALESCE(SUM(amount), 0) as v FROM transactions WHERE source='focus_session' AND substr(created_at,1,10)=?",
                    (date_str,)
                ).fetchone()
                today_value = round(row['v'] or 0, 1)
                row2 = conn.execute(
                    "SELECT COALESCE(SUM(amount), 0) as v FROM transactions WHERE source='focus_session'"
                ).fetchone()
                total_value = round(row2['v'] or 0, 1)
            return {
                "date": date_str,
                "today_duration_minutes": round((daily.get("total_duration", 0) or 0) / 60),
                "today_sessions": daily.get("count", 0) or 0,
                "today_value": today_value,
                "total_duration_hours": round((cumulative.get("total_duration", 0) or 0) / 3600, 1),
                "total_sessions": cumulative.get("count", 0) or 0,
                "total_value": total_value
            }

        elif name == "get_balance":
            balance = db.get_balance()
            return {"balance": round(balance, 1)}

        elif name == "create_daily_plan":
            return db.create_daily_plan(
                plan_date=arguments.get("date", _today_str()),
                title=arguments["title"],
                note=arguments.get("note", ""),
                linked_plan_id=arguments.get("linked_plan_id")
            )

        elif name == "query_daily_plans":
            return db.get_daily_plans(arguments.get("date", _today_str()))

        elif name == "get_checkin_stats":
            items = db.get_checkin_items()
            return items

        elif name == "query_wishes":
            return db.get_wishes(include_redeemed=True)

        elif name == "create_wish":
            virtual_cost = arguments.get("virtual_cost")
            real_price = arguments.get("real_price", 0) or 0
            if not virtual_cost or virtual_cost <= 0:
                ai_cfg = db.get_ai_settings()
                if ai_cfg.get("base_url") and ai_cfg.get("api_key"):
                    try:
                        extra = json.loads(ai_cfg.get("extra_headers", "{}"))
                        virtual_cost, _ = ai_service.evaluate_wish(
                            ai_cfg["base_url"], ai_cfg["api_key"], ai_cfg["model_name"],
                            arguments["name"], real_price, extra
                        )
                    except Exception:
                        virtual_cost = real_price or 10
                else:
                    virtual_cost = real_price or 10
            return db.create_wish(
                name=arguments["name"],
                real_price=real_price,
                virtual_cost=virtual_cost
            )

        elif name == "redeem_wish":
            return db.redeem_wish(arguments["wish_id"])

        elif name == "query_important_items":
            return db.get_important_items()

        elif name == "create_important_item":
            return db.create_plan(
                plan_type="important",
                title=arguments["title"],
                description=arguments.get("description", ""),
                due_date=arguments.get("due_date")
            )

        elif name == "get_transactions":
            return db.get_transactions()

        elif name == "sort_tasks_ai":
            # This needs to call the AI sort service
            import ai_service
            plan_type = arguments["plan_type"]
            plans = db.get_plans(plan_type)
            if not plans:
                return {"message": "没有可排序的任务"}
            ai_cfg = db.get_ai_settings()
            if not ai_cfg.get("base_url") or not ai_cfg.get("api_key"):
                return {"error": "请先配置AI设置"}
            settings = db.get_settings()
            min_val = float(settings.get(f"{plan_type}_min", 1))
            max_val = float(settings.get(f"{plan_type}_max", 10))
            extra_headers = {}
            try:
                extra_headers = json.loads(ai_cfg.get("extra_headers", "{}"))
            except json.JSONDecodeError:
                pass
            result = ai_service.sort_plans(
                ai_cfg["base_url"], ai_cfg["api_key"], ai_cfg["model_name"],
                plan_type, plans, min_val, max_val, extra_headers
            )
            for item in result.get("sorted", []):
                pid = item.get("id")
                if pid:
                    db.update_plan_ai(pid, item.get("priority", 0), item.get("virtual_value", 0), item.get("suggested_time", ""))
            return result

        else:
            return {"error": f"Unknown tool: {name}"}

    except Exception as e:
        return {"error": str(e)}
