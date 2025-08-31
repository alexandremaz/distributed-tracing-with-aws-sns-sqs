#!/usr/bin/env python3

import os
import sys
import json
from urllib.request import urlopen, Request

HEALTH_URL = "http://localhost:4566/_localstack/health"

services_env = os.getenv("SERVICES", "")
SERVICES = [service.strip() for service in services_env.split(",") if service.strip()]

def fetch_health(url):
    req = Request(url)
    with urlopen(req) as resp:
        return json.load(resp).get("services", {})

def main():
    try:
        statuses = fetch_health(HEALTH_URL)
    except Exception as e:
        print(f"Healthcheck failed: unable to reach {HEALTH_URL} — {e}")
        sys.exit(1)

    report = []
    all_ok = True

    for service in SERVICES:
        status = statuses.get(service)
        ok = status in ("available", "running")
        marker = "✅" if ok else "❌"
        report.append(f"{marker} {service}={status!r}")
        if not ok:
            all_ok = False

    summary = "; ".join(report)
    if all_ok:
        print(f"Healthcheck succeeded: {summary}")
        sys.exit(0)
    else:
        print(f"Healthcheck failed: {summary}")
        sys.exit(1)

if __name__ == "__main__":
    main()