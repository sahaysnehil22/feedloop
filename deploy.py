#!/usr/bin/env python3
"""Deploy the Firebase-wired FeedLoop (Next.js) to Vercel.

Project: feedloop (prj_Z8lIenWyPNAtshYL9GT2ZO3DJojr)
Team:    team_nlqFD2dq4q704gftJuIbzq6g
Target:  production

Vercel is NOT Git-connected for this project (link: None), so this script
deploys the local source tree via the Vercel API (create_deployment).
Files > 10 KB are uploaded first via upload_file (base64) and referenced
by SHA1 so the deploy call stays under the argv cap; smaller files are
inlined as UTF-8.

Excludes: node_modules, .next, .git, .env.local, .env.example, seed scripts,
.demo-password.txt, supabase/ (dead code — project is Firebase now).
Env vars come from the Vercel project settings (already set: Firebase web
config + FIREBASE_SERVICE_ACCOUNT_KEY + NEXT_PUBLIC_DEMO_KEY + NEXT_PUBLIC_APP_URL).

Run: python3 deploy.py
"""
import base64
import hashlib
import json
import os
import subprocess
import sys

VERCEL = "/opt/hatch/bin/vercel"
TEAM = "team_nlqFD2dq4q704gftJuIbzq6g"
PROJECT_ID = "prj_Z8lIenWyPNAtshYL9GT2ZO3DJojr"
PROJECT_NAME = "feedloop"
ROOT = "/home/hatch/workspace/feedloop"

# Source files to deploy (relative to ROOT).
FILES = [
    "package.json",
    "next.config.mjs",
    "tsconfig.json",
    "next-env.d.ts",
    "public/loader.js",
    "src/app/page.tsx",
    "src/app/layout.tsx",
    "src/app/globals.css",
    "src/app/[lang]/page.tsx",
    "src/app/w/page.tsx",
    "src/app/w/widget.tsx",
    "src/app/dashboard/login/page.tsx",
    "src/app/dashboard/page.tsx",
    "src/app/dashboard/[id]/page.tsx",
    "src/app/api/public/config/route.ts",
    "src/app/api/public/suggestions/route.ts",
    "src/app/api/public/vote/route.ts",
    "src/app/api/public/changelog/route.ts",
    "src/app/api/public/similar/route.ts",
    "src/lib/types.ts",
    "src/lib/i18n.ts",
    "src/lib/firebase.ts",
    "src/lib/firebase-admin.ts",
    "src/lib/public-api.ts",
]

UPLOAD_THRESHOLD = 10 * 1024  # files larger than this go via upload_file


def call_tool(name, args):
    """Call a Vercel MCP tool; return the parsed inner result dict."""
    proc = subprocess.run(
        [VERCEL, "call-tool", "--name", name, "--arguments-json", json.dumps(args)],
        capture_output=True, text=True, timeout=300,
    )
    if proc.returncode != 0:
        print(f"!! {name} failed (exit {proc.returncode}): {proc.stdout} {proc.stderr}", file=sys.stderr)
        sys.exit(1)
    outer = json.loads(proc.stdout)
    if not outer.get("ok"):
        print(f"!! {name} returned not-ok: {proc.stdout[:2000]}", file=sys.stderr)
        sys.exit(1)
    text = outer["result"]["content"][0]["text"]
    return json.loads(text)


def upload_file(rel):
    data = open(os.path.join(ROOT, rel), "rb").read()
    sha1 = hashlib.sha1(data).hexdigest()
    print(f"uploading {rel} ({len(data)} bytes, sha1 {sha1}) ...", flush=True)
    res = call_tool("upload_file", {
        "requestBody": base64.b64encode(data).decode(),
        "contentLength": len(data),
        "xVercelDigest": sha1,
        "teamId": TEAM,
    })
    print(f"  -> {json.dumps(res)[:200]}", flush=True)
    return {"file": rel, "sha": sha1, "size": len(data)}


def main():
    files = []
    for rel in FILES:
        path = os.path.join(ROOT, rel)
        size = os.path.getsize(path)
        if size > UPLOAD_THRESHOLD:
            files.append(upload_file(rel))
        else:
            text = open(path, encoding="utf-8").read()
            files.append({"file": rel, "data": text, "encoding": "utf-8"})
    print(f"deploying {PROJECT_NAME} ({len(files)} files) ...", flush=True)
    res = call_tool("create_deployment", {
        "requestBody": {
            "name": PROJECT_NAME,
            "project": PROJECT_ID,
            "target": "production",
            "files": files,
        },
        "teamId": TEAM,
        "forceNew": "1",
        "skipAutoDetectionConfirmation": "1",
    })
    result = res.get("result", res)
    print(f"  deployment id: {result.get('id')}")
    print(f"  url: {result.get('url')}")
    print(f"  state: {result.get('readyState')}")
    print("\nDONE — poll the deployment until READY, then verify the live site.")


if __name__ == "__main__":
    main()
