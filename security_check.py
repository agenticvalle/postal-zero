#!/usr/bin/env python3
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

BLOCKED_FILE = re.compile(
    r'(^|/)(\.env$|\.env\..+|.*\.pem$|.*\.p12$|.*\.key$|.*\.sqlite$|.*\.db$|.*\.log$|.*\.bak$|.*\.zip$|.*\.tar$|.*\.gz$|.*\.7z$|.*\.rar$)'
)

ALLOW_FILE_NAMES = {
    ".env.example",
}

TEXT_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".json", ".prisma", ".md",
    ".toml", ".yml", ".yaml", ".sh", ".py", ".txt", ".dockerignore"
}

SECRET_PATTERNS = [
    ("JWT token", re.compile(r'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}')),
    ("Private key", re.compile(r'-----BEGIN [A-Z ]*PRIVATE KEY-----')),
    ("GitHub token", re.compile(r'gh[pousr]_[A-Za-z0-9_]{30,}')),
    ("Stripe secret", re.compile(r'sk_(live|test)_[A-Za-z0-9]{20,}')),
    ("OpenAI key", re.compile(r'sk-[A-Za-z0-9]{20,}')),
    ("Bearer JWT", re.compile(r'Bearer\s+eyJ[A-Za-z0-9_-]{20,}')),
    ("Database URL", re.compile(r'postgres(?:ql)?://[^\s"\']+')),
    ("Resend key", re.compile(r're_[A-Za-z0-9_]{20,}')),
    ("Secret assignment", re.compile(r'(JWT_SECRET|DATABASE_URL|RESEND_API_KEY|STRIPE_SECRET_KEY|POSTAL_AGENT_KEY|COINBASE_[A-Z0-9_]*|ANTHROPIC_API_KEY|OPENAI_API_KEY|ACCESS_TOKEN|REFRESH_TOKEN)\s*=\s*["\']?[^"\'\s]{12,}', re.I)),
]

SAFE_EXAMPLE_FILES = {
    ".env.example",
    "README.md",
    "DEPLOY.md",
    "docker-compose.yml",
}

def git(args):
    return subprocess.check_output(["git"] + args, cwd=ROOT, text=True, stderr=subprocess.DEVNULL)

def git_lines(args):
    try:
        return [line.strip() for line in git(args).splitlines() if line.strip()]
    except subprocess.CalledProcessError:
        return []

def is_blocked_file(path):
    name = Path(path).name
    if name in ALLOW_FILE_NAMES:
        return False
    return bool(BLOCKED_FILE.search(path))

def should_scan(path):
    p = Path(path)
    if p.name in SAFE_EXAMPLE_FILES:
        return False
    if p.suffix not in TEXT_EXTENSIONS:
        return False
    if any(part in {"node_modules", ".next", "dist", "build"} for part in p.parts):
        return False
    return True

def staged_files():
    return git_lines(["diff", "--cached", "--name-only", "--diff-filter=ACMR"])

def changed_files():
    return git_lines(["diff", "--name-only", "--diff-filter=ACMR"])

def upstream_files():
    try:
        upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]).strip()
        return git_lines(["diff", "--name-only", "--diff-filter=ACMR", f"{upstream}..HEAD"])
    except Exception:
        return []

def scan_files(files):
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

def scan_diff(args, label):
    problems = []
    try:
        diff = git(args)
    except Exception:
        return problems

    for pat_label, pat in SECRET_PATTERNS:
        if pat.search(diff):
            problems.append(f"possible {pat_label} in {label}")
    return problems

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "check"
    errors = []

    tracked = git_lines(["ls-files"])
    bad_tracked = [p for p in tracked if is_blocked_file(p)]
    if bad_tracked:
        errors.append("Dangerous tracked files:\n  " + "\n  ".join(bad_tracked))

    staged = staged_files()
    bad_staged = [p for p in staged if is_blocked_file(p)]
    if bad_staged:
        errors.append("Dangerous staged files:\n  " + "\n  ".join(bad_staged))

    history = git_lines(["log", "--all", "--name-only", "--pretty=format:"])
    bad_history = sorted(set(p for p in history if is_blocked_file(p)))
    if bad_history:
        errors.append("Dangerous file names found in git history:\n  " + "\n  ".join(bad_history))

    if mode == "--push":
        files_to_scan = sorted(set(upstream_files() + changed_files() + staged))
        diff_hits = scan_diff(["diff", "@{u}..HEAD"], "unpushed commits") if upstream_files() else []
        diff_hits += scan_diff(["diff", "--cached"], "staged diff")
    else:
        files_to_scan = sorted(set(staged if staged else changed_files()))
        diff_hits = scan_diff(["diff", "--cached"], "staged diff")

    content_hits = scan_files(files_to_scan)

    if content_hits:
        errors.append("Possible secrets found. Review locally; do not paste values:\n  " + "\n  ".join(content_hits[:80]))

    if diff_hits:
        errors.append("Possible secrets found in git diff. Review locally; do not paste values:\n  " + "\n  ".join(diff_hits[:20]))

    if errors:
        print("\n\n".join(errors))
        sys.exit(1)

    print("OK: Postal Zero security check passed")

if __name__ == "__main__":
    main()
