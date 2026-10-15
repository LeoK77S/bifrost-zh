#!/usr/bin/env python3
"""构建 Bifrost 汉化油猴脚本。

把 src/ 下的词典、模式与引擎模板合并，生成自包含的 bifrost-zh.user.js。
零外部依赖，仅用标准库。

用法：
    python build.py            # 生成 bifrost-zh.user.js
    python build.py --check    # 只校验源文件，不写产物
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "src"
DICT_FILE = SRC / "dict.json"
PATTERNS_FILE = SRC / "patterns.js"
ENGINE_FILE = SRC / "engine.js"
OUT_FILE = HERE / "bifrost-zh.user.js"

DICT_MARK = "/*__DICT__*/ {}"
PATTERNS_MARK = "/*__PATTERNS__*/ []"


def load_dict() -> dict:
    data = json.loads(DICT_FILE.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or not data:
        raise SystemExit("dict.json 必须是非空对象")
    # 键与值都必须是非空字符串
    for k, v in data.items():
        if not isinstance(k, str) or not isinstance(v, str):
            raise SystemExit(f"dict.json 存在非字符串条目: {k!r}")
    return data


def render_dict(data: dict) -> str:
    """紧凑 JSON（一行一条），便于 diff 与人工查看。"""
    items = ",\n\t".join(
        json.dumps(k, ensure_ascii=False) + ": " + json.dumps(v, ensure_ascii=False)
        for k, v in data.items()
    )
    return "{\n\t" + items + "\n}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="只校验，不写产物")
    args = ap.parse_args()

    for f in (DICT_FILE, PATTERNS_FILE, ENGINE_FILE):
        if not f.exists():
            raise SystemExit(f"缺少源文件: {f}")

    data = load_dict()
    patterns = PATTERNS_FILE.read_text(encoding="utf-8").strip()
    engine = ENGINE_FILE.read_text(encoding="utf-8")

    if DICT_MARK not in engine:
        raise SystemExit("engine.js 缺少词典占位符")
    if PATTERNS_MARK not in engine:
        raise SystemExit("engine.js 缺少模式占位符")

    out = engine.replace(DICT_MARK, "/*__DICT__*/ " + render_dict(data))
    out = out.replace(PATTERNS_MARK, "/*__PATTERNS__*/ " + patterns)

    print(f"词典条目: {len(data)}")
    print(f"模式数量: {patterns.count('[/^')}")
    print(f"产物大小: {len(out.encode('utf-8')) / 1024:.1f} KiB")

    if args.check:
        print("（--check：未写产物）")
        return 0

    OUT_FILE.write_text(out, encoding="utf-8")
    print(f"已生成: {OUT_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
