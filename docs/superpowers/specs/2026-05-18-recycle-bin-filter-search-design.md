# Recycle Bin Filter & Search - Design Spec

## Overview

Enhance the recycle bin page with tag-based filtering and keyword search with pinyin support.

## Scope

- Tag filter buttons: 全部, 今日待办, 周计划, 月计划, 年计划
- Real-time search input with Chinese and pinyin matching
- Client-side filtering (all completed plans loaded once)
- Version bump to 1.7.0

## UI Changes

### Recycle Bin Page Header

Add below the existing batch action buttons:

1. **Tag filter row**: Horizontal button group showing plan type counts
   - `全部 (N)` | `今日待办 (N)` | `周计划 (N)` | `月计划 (N)` | `年计划 (N)`
   - Active button highlighted with primary color
   - Clicking a tag filters the list to show only that type

2. **Search bar**: Full-width input below the tag filters
   - Placeholder: "搜索计划标题... (支持拼音)"
   - Real-time filtering as user types
   - Clear button (x) when input has content
   - Matches against: original title text AND pinyin representation

### Filter Logic

- Filters are additive: tag filter AND search filter both apply
- Tag filter defaults to "全部"
- Search is case-insensitive
- Pinyin matching: match full pinyin (e.g., "gouwu" matches "购物") and first-letter pinyin (e.g., "gw" matches "购物")

## Pinyin Implementation

Embedded pinyin mapping table covering ~500 common Chinese characters. Each entry maps a character to its pinyin (with tone stripped). For search:

1. Convert search term to lowercase
2. For each completed plan title:
   - Check if search term is substring of title (Chinese match)
   - Convert title to pinyin string, check if search term is substring (full pinyin match)
   - Convert title to pinyin initials string, check if search term is substring (initials match)

## Files Modified

- `static/app.js`: Add filter/search logic, pinyin mapping, UI rendering
- `templates/index.html`: Add filter/search UI elements to recycle bin page
- `static/style.css`: Add styles for filter buttons and search input
- `app.py`: Bump CURRENT_VERSION to 1.7.0
