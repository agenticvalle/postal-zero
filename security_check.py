#!/usr/bin/env python3
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

BLOCKED_FILE = re.compile(
    r'(^|/)(\.env$|\.env\..+|.*\.pem$|.*\.p12$|.*\.key$|.*\.sqlite$|.*\.db$|.*\.log$|.*\.bak$|.*\.zip$|.*\.tar$|.*\.gz$)'
)

ALLOW_FILE_NAMES = {
    ".env.example",
}

TEXT_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".json", ".prisma", ".md",
    ".toml", ".yml", ".yaml", ".sh", ".py", ".txt"
}

SECRET_PATTERNS = [
    ("JWT token", re.compile(r'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}')),
    ("Private key", re.compile(r'-----BEGIN [A-Z ]*PRIVATE KEY-----')),
    ("GitHub token", re.compile(r'gh[pousr]_[A-Za-z0-9_]{30,}')),
    ("Stripe secret", re.compile(r'sk_(live|test)_[A-Za-z0-9]{20,}')),
    ("OpenAI key", re.compile(r'sk-[A-Za-z0-9]{20,}')),
    ("Bearer token", re.compile(r'Bearer\s+eyJ[A-Za-z0-9_-]{20,}')),
    ("Database URL", re.compile(r'postgres(?:ql)?://[^\\s"\']+')),
    ("Secret assignment", re.compile(r'(JWT_SECRET|DATABASE_URL|RESEND_API_KEY|STRIPE_SECRET_KEY|POSTAL_AGENT_KEY|COINBASE_[A-Z0-9_]*|ANTHROPIC_API_KEY|OPENAI_API_KEY)\s*=\s*["\']?[^"\'\s]{12,}', re.I)),
]

def git_lines(args):
    try:
        out = subprocess.check_output(["git"] + args, cwd=ROOT, text=True, stderr=subprocess.DEVNULL)
        return [line.strip() for line in out.splitlines() if line.strip()]
    except subprocess.CalledProcessError:
        return []

def fail(msg):
    print(f"FAIL: {msg}")
    return 1

def is_blocked_file(path):
    name = Path(path).name
    if name in ALLOW_FILE_NAMES:
        return False
    return bool(BLOCKED_FILE.search(path))

def should_scan(path):
    p = Path(path)
    if p.name in ALLOW_FILE_NAMES:
        return True
    if p.suffix not in TEXT_EXTENSIONS:
        return False
    if any(part in {"node_modules", ".next", "dist", "build"} for part in p.parts):
        return False
    return True

def scan_content(files):
    problems = []
    for rel in files:
        if not should_scan(rel):
            continue
        path = ROOT / rel
        if not path.exists() or not path.is_file():
            continue
        try:
            text = path.read_text(errors="ignore")
        except Exception:
            continue
        for i, line in enumerate(text.splitlines(), 1):
            for label, pat in SECRET_PATTERNS:
                if pat.search(line):
                    problems.append(f"{rel}:{i}: possible {label}")
    return problems

def main():
    errors = []

    tracked = git_lines(["ls-files"])
    bad_tracked = [p for p in tracked if is_blocked_file(p)]
    if bad_tracked:
        errors.append("Dangerous tracked files:\n  " + "\n  ".join(bad_tracked))

    staged = git_lines(["diff", "--cached", "--name-only", "--diff-filter=ACMR"])
    bad_staged = [p for p in staged if is_blocked_file(p)]
    if bad_staged:
        errors.append("Dangerous staged files:\n  " + "\n  ".join(bad_staged))

    history = git_lines(["log", "--all", "--name-only", "--pretty=format:"])
    bad_history = sorted(set(p for p in history if is_blocked_file(p)))
    if bad_history:
        errors.append("Dangerous files found in git history:\n  " + "\n  ".join(bad_history))

    files_to_scan = staged if staged else tracked
    content_hits = scan_content(files_to_scan)
    if content_hits:
        errors.append("Possible secrets found. Review locally; do not paste values:\n  " + "\n  ".join(content_hits[:50]))

    if errors:
        print("\n\n".join(errors))
        sys.exit(1)

    print("OK: Postal Zero security check passed")

if __name__ == "__main__":
    main()
