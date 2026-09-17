#!/usr/bin/env python3
"""Собрать config.json sing-box из vless:// ссылки (stdlib)."""
from __future__ import annotations

import json
import sys
from urllib.parse import parse_qs, unquote, urlparse

LISTEN_HOST = "127.0.0.1"
HTTP_PORT = 7890
SOCKS_PORT = 7891


def die(msg: str) -> None:
    print(f"ОШИБКА: {msg}", file=sys.stderr)
    sys.exit(1)


def parse_vless(uri: str) -> dict:
    uri = uri.strip()
    if not uri.startswith("vless://"):
        die("ожидается vless://…")

    parsed = urlparse(uri)
    uuid = unquote(parsed.username or "")
    if not uuid:
        die("в ссылке нет UUID")

    host = parsed.hostname
    if not host:
        die("в ссылке нет хоста")

    port = parsed.port or 443
    q = {k: unquote(v[0]) for k, v in parse_qs(parsed.query, keep_blank_values=True).items()}

    transport_type = (q.get("type") or "tcp").lower()
    security = (q.get("security") or "tls").lower()
    sni = q.get("sni") or q.get("host") or host
    fp = q.get("fp") or "chrome"

    outbound: dict = {
        "type": "vless",
        "tag": "proxy",
        "server": host,
        "server_port": port,
        "uuid": uuid,
    }

    flow = q.get("flow")
    if flow:
        outbound["flow"] = flow

    if transport_type == "ws":
        path = q.get("path") or "/"
        ws_host = q.get("host") or sni
        outbound["transport"] = {
            "type": "ws",
            "path": path,
            "headers": {"Host": ws_host},
        }
    elif transport_type == "grpc":
        outbound["transport"] = {
            "type": "grpc",
            "service_name": q.get("serviceName") or q.get("service_name") or "",
        }
    elif transport_type not in ("tcp", "none", ""):
        die(f"неподдерживаемый transport type={transport_type}")

    if security == "reality":
        pbk = q.get("pbk") or q.get("publicKey") or q.get("public_key")
        sid = q.get("sid") or q.get("short_id") or q.get("shortId") or ""
        if not pbk:
            die("для reality нужен pbk (public_key) в ссылке")
        outbound["tls"] = {
            "enabled": True,
            "server_name": sni,
            "utls": {"enabled": True, "fingerprint": fp},
            "reality": {
                "enabled": True,
                "public_key": pbk,
                "short_id": sid,
            },
        }
    elif security in ("tls", "xtls"):
        outbound["tls"] = {
            "enabled": True,
            "server_name": sni,
            "utls": {"enabled": True, "fingerprint": fp},
        }
        alpn = q.get("alpn")
        if alpn:
            outbound["tls"]["alpn"] = [p.strip() for p in alpn.split(",") if p.strip()]
    elif security == "none":
        if transport_type != "ws":
            die("security=none поддерживается только с type=ws")
    else:
        die(f"неподдерживаемый security={security}")

    return outbound


def build_config(vless_uri: str) -> dict:
    proxy = parse_vless(vless_uri)
    return {
        "log": {"level": "warn", "timestamp": True},
        "dns": {
            "servers": [
                {"tag": "local", "address": "local", "detour": "direct"},
                {"tag": "remote", "address": "1.1.1.1", "address_resolver": "local"},
            ],
            "rules": [{"outbound": "any", "server": "local"}],
            "final": "remote",
            "strategy": "prefer_ipv4",
        },
        "inbounds": [
            {
                "type": "mixed",
                "tag": "mixed-in",
                "listen": LISTEN_HOST,
                "listen_port": HTTP_PORT,
            },
            {
                "type": "socks",
                "tag": "socks-in",
                "listen": LISTEN_HOST,
                "listen_port": SOCKS_PORT,
            },
        ],
        "outbounds": [
            proxy,
            {"type": "direct", "tag": "direct"},
            {"type": "block", "tag": "block"},
        ],
        "route": {
            "auto_detect_interface": True,
            "rules": [
                {"ip_is_private": True, "outbound": "direct"},
                {"domain_suffix": [".local"], "outbound": "direct"},
            ],
            "final": "proxy",
        },
    }


def main() -> None:
    if len(sys.argv) != 3:
        die("использование: gen_config.py <vless-uri> <output.json>")

    uri = sys.argv[1]
    out = sys.argv[2]
    cfg = build_config(uri)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"записан {out} (HTTP {LISTEN_HOST}:{HTTP_PORT}, SOCKS {LISTEN_HOST}:{SOCKS_PORT})")


if __name__ == "__main__":
    main()
