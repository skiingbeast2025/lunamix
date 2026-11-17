#!/usr/bin/env python3
"""
Async standard-library checker and atomic JSON updater for Lunamix WASM relays.

Probes every relay in ``wasm-relays.json`` (WISP, Eaglercraft, Bare, WebSocket,
or HTTP) using only Python standard library modules:
  - DNS resolution with sinkhole / NXDOMAIN detection
  - TCP + TLS handshake with certificate / MITM filter inspection
  - Real RFC-6455 HTTP WebSocket Upgrade (101 Switching Protocols) + HTTP fallback
  - Block-page detection (HTTP 30x, 403, 451, school/enterprise filter keywords)

Also supports manual tagging (`--mark-blocked`, `--unblock`), `--only-working`
output filtering, and atomic in-place updates of ``wasm-relays.json``.
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import fnmatch
import functools
import hashlib
import ipaddress
import json
import os
import re
import socket
import ssl
import subprocess
import sys
import tempfile
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

FILTER_KEYWORDS = (
    "goguardian",
    "securly",
    "lightspeed",
    "fortiguard",
    "fortinet",
    "cisco umbrella",
    "umbrella.cisco",
    "opendns",
    "iboss",
    "blocksi",
    "zscaler",
    "smoothwall",
    "linewize",
    "contentkeeper",
    "gaggle",
    "hapara",
    "dyknow",
    "netref",
    "lanschool",
    "imperosoftware",
    "barracuda",
    "sophos",
    "sonicwall",
    "untangle",
    "paloaltonetworks",
    "globalprotect",
    "web filter",
    "website blocked",
    "access blocked",
    "site blocked",
    "category blocked",
    "blocked by your",
    "filtered by",
)

# Known sinkhole / block-page IP addresses returned by common DNS filters.
KNOWN_FILTER_IPS = {
    "146.112.61.104",
    "146.112.61.105",
    "146.112.61.106",
    "146.112.61.107",
    "146.112.61.108",
    "146.112.61.109",
    "146.112.61.110",
}

MAX_HEADER_BYTES = 32 * 1024
MAX_BODY_BYTES = 16 * 1024


def utc_now_iso() -> str:
    """Return current UTC timestamp in ISO-8601 format with Z suffix."""
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def find_filter_keyword(text: str) -> str | None:
    """Return the first matching filter/block keyword in ``text``, if any."""
    if not text:
        return None
    lower = text.lower()
    for kw in FILTER_KEYWORDS:
        if kw in lower:
            return kw
    return None


def extract_peercert_text(peercert: dict[str, Any] | None, der_bytes: bytes | None = None) -> str:
    """Flatten parsed peercert issuer fields (or DER bytes when unverified) into text."""
    parts: list[str] = []
    if peercert:
        # Check issuer fields only so proxy hostnames in CN/SAN (e.g. *goguardian*) do not false-positive.
        for rdn in peercert.get("issuer", ()):
            for _, val in rdn:
                parts.append(str(val))
    elif der_bytes:
        # Latin-1 preserves raw byte values losslessly for unverified MITM cert inspection.
        parts.append(der_bytes.decode("latin-1", errors="ignore"))
    return " ".join(parts)


def is_ip_literal(host: str) -> bool:
    """Return True if ``host`` is already an IPv4/IPv6 literal."""
    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        return False


def check_sinkhole_ip(ip_str: str, host_was_literal: bool = False) -> str | None:
    """Return a sinkhole description if ``ip_str`` is a sinkhole/filter address."""
    if ip_str in KNOWN_FILTER_IPS:
        return f"Known DNS filter block IP ({ip_str})"
    try:
        ip_obj = ipaddress.ip_address(ip_str)
    except ValueError:
        return None
    if ip_obj.is_unspecified:
        return f"DNS sinkhole IP ({ip_str})"
    if ip_obj.is_loopback and not host_was_literal:
        return f"DNS sinkhole IP ({ip_str})"
    return None


def normalize_url(raw_url: str) -> tuple[str, str, int, str, str] | None:
    """
    Parse a relay URL into ``(scheme, host, port, path_and_query, host_header)``.
    Returns ``None`` if the URL has no valid hostname.
    """
    url = raw_url.strip()
    if not url:
        return None
    parsed = urlparse(url)
    scheme = parsed.scheme.lower()
    if scheme == "wisps":
        scheme = "wss"
    elif scheme == "wisp":
        scheme = "ws"

    if scheme not in ("wss", "ws", "https", "http"):
        return None
    host = parsed.hostname
    if not host:
        return None

    default_port = 443 if scheme in ("wss", "https") else 80
    try:
        port = parsed.port or default_port
    except ValueError:
        return None

    path = parsed.path or "/"
    if parsed.query:
        path = f"{path}?{parsed.query}"

    host_header = f"[{host}]" if ":" in host else host
    if port != default_port:
        host_header = f"{host_header}:{port}"

    return scheme, host, port, path, host_header


def parse_http_headers(raw_header_bytes: bytes) -> tuple[int | None, str, dict[str, str]]:
    """Parse HTTP status code, reason phrase, and lowercase header map."""
    text = raw_header_bytes.decode("iso-8859-1", errors="replace")
    lines = re.split(r"\r?\n", text)
    if not lines:
        return None, "", {}

    status_line = lines[0].strip()
    match = re.match(r"^HTTP/\d+(?:\.\d+)?\s+(\d{3})(?:\s+(.*))?$", status_line, re.IGNORECASE)
    if not match:
        return None, "", {}

    status_code = int(match.group(1))
    reason_phrase = (match.group(2) or "").strip()
    headers: dict[str, str] = {}
    for line in lines[1:]:
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        key = k.strip().lower()
        val = v.strip()
        if key in headers:
            headers[key] = f"{headers[key]}, {val}"
        else:
            headers[key] = val
    return status_code, reason_phrase, headers


async def read_http_response(
    reader: asyncio.StreamReader,
    timeout: float,
) -> tuple[int | None, str, dict[str, str], str]:
    """Read HTTP status line, headers, and a bounded body snippet."""
    buf = bytearray()
    header_end = -1
    sep_len = 0

    deadline = time.monotonic() + timeout
    while len(buf) < MAX_HEADER_BYTES:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise asyncio.TimeoutError()
        chunk = await asyncio.wait_for(reader.read(4096), timeout=remaining)
        if not chunk:
            break
        buf.extend(chunk)
        idx = buf.find(b"\r\n\r\n")
        if idx != -1:
            header_end = idx
            sep_len = 4
            break
        idx_lf = buf.find(b"\n\n")
        if idx_lf != -1:
            header_end = idx_lf
            sep_len = 2
            break

    if header_end == -1:
        status_code, reason_phrase, headers = parse_http_headers(bytes(buf))
        return status_code, reason_phrase, headers, buf.decode("utf-8", errors="ignore")

    header_bytes = bytes(buf[:header_end])
    body_buf = bytearray(buf[header_end + sep_len :])
    status_code, reason_phrase, headers = parse_http_headers(header_bytes)

    if status_code == 101:
        return status_code, reason_phrase, headers, ""

    content_length: int | None = None
    if "content-length" in headers:
        try:
            content_length = max(0, int(headers["content-length"].split(",")[0].strip()))
        except ValueError:
            content_length = None

    target_bytes = MAX_BODY_BYTES if content_length is None else min(content_length, MAX_BODY_BYTES)
    while len(body_buf) < target_bytes:
        remaining = min(1.0, deadline - time.monotonic())
        if remaining <= 0:
            break
        try:
            chunk = await asyncio.wait_for(
                reader.read(min(4096, target_bytes - len(body_buf))),
                timeout=remaining,
            )
        except asyncio.TimeoutError:
            break
        if not chunk:
            break
        body_buf.extend(chunk)

    body_text = body_buf.decode("utf-8", errors="ignore")
    return status_code, reason_phrase, headers, body_text


def build_ws_upgrade_request(path: str, host_header: str, scheme: str) -> tuple[bytes, str]:
    """Build an RFC-6455 WebSocket upgrade request and return ``(raw_bytes, expected_accept)``."""
    nonce = base64.b64encode(os.urandom(16)).decode("ascii")
    expected_accept = base64.b64encode(
        hashlib.sha1((nonce + WS_GUID).encode("ascii")).digest()
    ).decode("ascii")
    origin_scheme = "https" if scheme in ("wss", "https") else "http"
    req = (
        f"GET {path} HTTP/1.1\r\n"
        f"Host: {host_header}\r\n"
        f"Upgrade: websocket\r\n"
        f"Connection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {nonce}\r\n"
        f"Sec-WebSocket-Version: 13\r\n"
        f"Origin: {origin_scheme}://{host_header}\r\n"
        f"User-Agent: Mozilla/5.0 (compatible; LunamixRelayChecker/1.0)\r\n"
        f"\r\n"
    )
    return req.encode("ascii"), expected_accept


def build_http_get_request(path: str, host_header: str) -> bytes:
    """Build a plain HTTP/1.1 GET probe request."""
    req = (
        f"GET {path} HTTP/1.1\r\n"
        f"Host: {host_header}\r\n"
        f"Accept: */*\r\n"
        f"Connection: close\r\n"
        f"User-Agent: Mozilla/5.0 (compatible; LunamixRelayChecker/1.0)\r\n"
        f"\r\n"
    )
    return req.encode("ascii")


def classify_http_response(
    status_code: int | None,
    reason_phrase: str,
    headers: dict[str, str],
    body_text: str,
    expected_ws_accept: str | None,
    scheme: str,
) -> tuple[str, bool, str]:
    """
    Classify an HTTP / WebSocket handshake response into
    ``(status, blocked, reason)``.
    """
    if status_code is None:
        return "unreachable", False, "Malformed or empty HTTP response"

    headers_blob = " ".join(f"{k}: {v}" for k, v in headers.items())
    kw = find_filter_keyword(headers_blob) or find_filter_keyword(body_text)
    if kw:
        return "blocked", True, f"Blocked by filter keyword '{kw}' (HTTP {status_code})"

    if status_code == 101:
        upgrade_hdr = headers.get("upgrade", "").lower()
        accept_hdr = headers.get("sec-websocket-accept", "").strip()
        if "websocket" not in upgrade_hdr:
            return "unreachable", False, "HTTP 101 missing Upgrade: websocket header"
        if expected_ws_accept and accept_hdr and accept_hdr != expected_ws_accept:
            return "unreachable", False, "HTTP 101 invalid Sec-WebSocket-Accept"
        return "reachable", False, "WebSocket 101 Switching Protocols"

    if 300 <= status_code < 400:
        location = headers.get("location", "")
        detail = f" -> {location}" if location else ""
        return "blocked", True, f"HTTP {status_code} redirect{detail}"

    if status_code in (403, 451):
        label = "Unavailable For Legal Reasons" if status_code == 451 else "Forbidden"
        return "blocked", True, f"HTTP {status_code} {label}"

    if 500 <= status_code < 600:
        msg = f"HTTP {status_code} {reason_phrase}".strip()
        return "unreachable", False, msg

    if 200 <= status_code < 300:
        if scheme in ("http", "https"):
            return "reachable", False, f"Valid HTTP {status_code} response"
        # Some WISP/Bare servers serve info JSON or 200 OK on base path.
        content_type = headers.get("content-type", "").lower()
        body_lower = body_text.lower()
        if (
            "application/json" in content_type
            or "wisp" in body_lower
            or "bare" in body_lower
            or '"versions"' in body_lower
        ):
            return "reachable", False, f"Valid HTTP/WISP response (HTTP {status_code})"
        return "reachable", False, f"HTTP {status_code} {reason_phrase}".strip()

    msg = f"HTTP {status_code} {reason_phrase}".strip()
    return "unreachable", False, msg


async def resolve_addresses(
    host: str,
    port: int,
    timeout: float,
) -> tuple[list[tuple[int, str]], str | None, bool]:
    """
    Resolve ``host`` via system DNS.

    Returns ``(addresses, error_reason, is_blocked)`` where ``addresses`` is a list
    of ``(family, ip_str)`` sorted with IPv4 first for reliable connectivity.
    """
    loop = asyncio.get_running_loop()
    try:
        infos = await asyncio.wait_for(
            loop.getaddrinfo(host, port, family=socket.AF_UNSPEC, type=socket.SOCK_STREAM),
            timeout=timeout,
        )
    except asyncio.TimeoutError:
        return [], f"DNS resolution timeout after {timeout:.1f}s", False
    except socket.gaierror as exc:
        nxdomain_errnos = {socket.EAI_NONAME}
        if hasattr(socket, "EAI_NODATA"):
            nxdomain_errnos.add(socket.EAI_NODATA)
        if exc.errno in nxdomain_errnos:
            return [], f"DNS NXDOMAIN / sinkhole ({exc})", True
        return [], f"DNS resolution error ({exc})", False

    host_was_literal = is_ip_literal(host)
    seen: set[str] = set()
    addrs: list[tuple[int, str]] = []
    for family, _, _, _, sockaddr in infos:
        ip_str = sockaddr[0]
        sinkhole = check_sinkhole_ip(ip_str, host_was_literal=host_was_literal)
        if sinkhole:
            return [], sinkhole, True
        if ip_str not in seen:
            seen.add(ip_str)
            addrs.append((family, ip_str))

    if not addrs:
        return [], "DNS returned no addresses", True

    # Prefer IPv4 first when both A and AAAA are returned to avoid IPv6 blackholes.
    addrs.sort(key=lambda item: 0 if item[0] == socket.AF_INET else 1)
    return addrs, None, False


async def open_socket_with_fallback(
    addrs: list[tuple[int, str]],
    port: int,
    ssl_ctx: ssl.SSLContext | None,
    server_hostname: str,
    timeout: float,
) -> tuple[asyncio.StreamReader, asyncio.StreamWriter]:
    """Connect across resolved addresses until one succeeds or all fail."""
    last_exc: Exception | None = None
    per_addr_timeout = max(1.0, timeout / max(1, min(len(addrs), 2)))

    for idx, (_, ip_str) in enumerate(addrs):
        step_timeout = per_addr_timeout if idx < len(addrs) - 1 else timeout
        try:
            kwargs: dict[str, Any] = {}
            if ssl_ctx is not None:
                kwargs["ssl"] = ssl_ctx
                kwargs["server_hostname"] = server_hostname
            return await asyncio.wait_for(
                asyncio.open_connection(host=ip_str, port=port, **kwargs),
                timeout=step_timeout,
            )
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            # Don't mask TLS verification errors by retrying another IP unless needed.
            if isinstance(exc, ssl.SSLCertVerificationError):
                raise
    assert last_exc is not None
    raise last_exc


@functools.lru_cache(maxsize=1)
def get_verified_ssl_context() -> ssl.SSLContext:
    """
    Build a verified TLS context, falling back to system/macOS/certifi CA stores
    when python.org installers (notably on macOS) have no default CA bundle.
    """
    ctx = ssl.create_default_context()
    paths = ssl.get_default_verify_paths()
    has_default_store = bool(
        (paths.cafile and Path(paths.cafile).is_file())
        or (paths.capath and Path(paths.capath).is_dir() and any(Path(paths.capath).iterdir()))
    )
    if has_default_store or ctx.cert_store_stats().get("x509_ca", 0) > 0:
        return ctx

    # Try certifi if available in the environment.
    try:
        import certifi  # type: ignore[import-not-found]

        cafile = certifi.where()
        if cafile and Path(cafile).is_file():
            ctx.load_verify_locations(cafile=cafile)
            return ctx
    except Exception:  # noqa: BLE001
        pass

    # Try well-known OS CA bundle paths (including macOS LibreSSL /etc/ssl/cert.pem).
    for candidate in (
        "/etc/ssl/cert.pem",
        "/opt/homebrew/etc/ca-certificates/cert.pem",
        "/usr/local/etc/ca-certificates/cert.pem",
        "/etc/ssl/certs/ca-certificates.crt",
        "/etc/pki/tls/certs/ca-bundle.crt",
    ):
        if Path(candidate).is_file():
            try:
                ctx.load_verify_locations(cafile=candidate)
                if ctx.cert_store_stats().get("x509_ca", 0) > 0:
                    return ctx
            except Exception:  # noqa: BLE001
                pass

    # Last-resort macOS lookup: export Apple's SystemRootCertificates keychain.
    if sys.platform == "darwin":
        try:
            proc = subprocess.run(
                [
                    "security",
                    "find-certificate",
                    "-a",
                    "-p",
                    "/System/Library/Keychains/SystemRootCertificates.keychain",
                ],
                capture_output=True,
                text=True,
                timeout=5,
                check=False,
            )
            if proc.returncode == 0 and "BEGIN CERTIFICATE" in proc.stdout:
                ctx.load_verify_locations(cadata=proc.stdout)
                if ctx.cert_store_stats().get("x509_ca", 0) > 0:
                    return ctx
        except Exception:  # noqa: BLE001
            pass

    print(
        "Warning: Python has no root CA certificates configured; TLS checks may fail. "
        "On macOS run 'Install Certificates.command' or pass --insecure.",
        file=sys.stderr,
    )
    return ctx


async def send_probe_and_read(
    addrs: list[tuple[int, str]],
    port: int,
    use_tls: bool,
    verify_tls: bool,
    host: str,
    host_header: str,
    path: str,
    scheme: str,
    use_ws: bool,
    timeout: float,
) -> tuple[int | None, str, dict[str, str], str, str | None, str | None]:
    """
    Connect, optionally verify TLS, send WS Upgrade or HTTP GET, and return:
    ``(status_code, reason_phrase, headers, body_text, expected_accept, cert_filter_kw)``.
    """
    ssl_ctx: ssl.SSLContext | None = None
    if use_tls:
        if verify_tls:
            ssl_ctx = get_verified_ssl_context()
        else:
            ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE

    reader, writer = await open_socket_with_fallback(
        addrs=addrs,
        port=port,
        ssl_ctx=ssl_ctx,
        server_hostname=host,
        timeout=timeout,
    )
    try:
        cert_kw: str | None = None
        if use_tls:
            ssl_obj = writer.get_extra_info("ssl_object")
            if ssl_obj is not None:
                peercert = ssl_obj.getpeercert() if verify_tls else None
                der_bytes = ssl_obj.getpeercert(binary_form=True)
                cert_text = extract_peercert_text(peercert, der_bytes)
                cert_kw = find_filter_keyword(cert_text)

        if use_ws:
            payload, expected_accept = build_ws_upgrade_request(path, host_header, scheme)
        else:
            payload = build_http_get_request(path, host_header)
            expected_accept = None

        writer.write(payload)
        await asyncio.wait_for(writer.drain(), timeout=timeout)
        status_code, reason_phrase, headers, body_text = await read_http_response(reader, timeout)
        return status_code, reason_phrase, headers, body_text, expected_accept, cert_kw
    finally:
        writer.close()
        try:
            await asyncio.wait_for(writer.wait_closed(), timeout=0.5)
        except Exception:  # noqa: BLE001
            pass


async def probe_relay(
    relay: dict[str, Any],
    timeout: float,
    insecure: bool = False,
) -> dict[str, Any]:
    """Probe a single relay entry and return updated relay metadata."""
    updated = dict(relay)
    raw_url = str(relay.get("url", "")).strip()
    relay_type = str(relay.get("type", "")).strip().lower()
    checked_at = utc_now_iso()

    parsed = normalize_url(raw_url)
    if parsed is None:
        updated.update(
            {
                "status": "unreachable",
                "blocked": False,
                "httpStatus": None,
                "latencyMs": None,
                "reason": "Invalid or unsupported relay URL",
                "checkedAt": checked_at,
            }
        )
        return updated

    scheme, host, port, path, host_header = parsed
    use_tls = scheme in ("wss", "https")
    prefer_ws = scheme in ("wss", "ws") or relay_type in ("wisp", "eaglercraft", "websocket")

    addrs, dns_err, dns_blocked = await resolve_addresses(host, port, timeout)
    if dns_err:
        updated.update(
            {
                "status": "blocked" if dns_blocked else "unreachable",
                "blocked": dns_blocked,
                "httpStatus": None,
                "latencyMs": None,
                "reason": dns_err,
                "checkedAt": checked_at,
            }
        )
        return updated

    start = time.monotonic()
    try:
        (
            status_code,
            reason_phrase,
            headers,
            body_text,
            expected_accept,
            cert_kw,
        ) = await send_probe_and_read(
            addrs=addrs,
            port=port,
            use_tls=use_tls,
            verify_tls=not insecure,
            host=host,
            host_header=host_header,
            path=path,
            scheme=scheme,
            use_ws=prefer_ws,
            timeout=timeout,
        )
        latency_ms = round((time.monotonic() - start) * 1000.0, 1)

        if cert_kw and not insecure:
            updated.update(
                {
                    "status": "blocked",
                    "blocked": True,
                    "httpStatus": status_code,
                    "latencyMs": latency_ms,
                    "reason": f"TLS certificate filter match '{cert_kw}'",
                    "checkedAt": checked_at,
                }
            )
            return updated

        # If WS probe got a non-101 response that isn't an immediate block/5xx
        # (e.g. Bare/HTTP endpoint responding 400/405/426 to Upgrade), run HTTP fallback.
        if prefer_ws and status_code in (400, 405, 426):
            headers_blob = " ".join(f"{k}: {v}" for k, v in headers.items())
            if not (find_filter_keyword(headers_blob) or find_filter_keyword(body_text)):
                try:
                    (
                        fb_status,
                        fb_reason,
                        fb_headers,
                        fb_body,
                        _,
                        _,
                    ) = await send_probe_and_read(
                        addrs=addrs,
                        port=port,
                        use_tls=use_tls,
                        verify_tls=not insecure,
                        host=host,
                        host_header=host_header,
                        path=path,
                        scheme=scheme,
                        use_ws=False,
                        timeout=timeout,
                    )
                    if fb_status is not None:
                        status_code, reason_phrase, headers, body_text = (
                            fb_status,
                            fb_reason,
                            fb_headers,
                            fb_body,
                        )
                        expected_accept = None
                except Exception:  # noqa: BLE001
                    pass

        status, blocked, reason = classify_http_response(
            status_code=status_code,
            reason_phrase=reason_phrase,
            headers=headers,
            body_text=body_text,
            expected_ws_accept=expected_accept,
            scheme=scheme,
        )
        updated.update(
            {
                "status": status,
                "blocked": blocked,
                "httpStatus": status_code,
                "latencyMs": latency_ms,
                "reason": reason,
                "checkedAt": checked_at,
            }
        )
        return updated

    except ssl.SSLCertVerificationError as exc:
        # Inspect unverified peer cert & HTTP response to distinguish MITM filter
        # block pages from ordinary expired/self-signed server certificates.
        latency_ms = round((time.monotonic() - start) * 1000.0, 1)
        try:
            (
                fb_status,
                _,
                fb_headers,
                fb_body,
                _,
                cert_kw,
            ) = await send_probe_and_read(
                addrs=addrs,
                port=port,
                use_tls=True,
                verify_tls=False,
                host=host,
                host_header=host_header,
                path=path,
                scheme=scheme,
                use_ws=False,
                timeout=min(timeout, 4.0),
            )
            headers_blob = " ".join(f"{k}: {v}" for k, v in fb_headers.items())
            kw = cert_kw or find_filter_keyword(headers_blob) or find_filter_keyword(fb_body)
            if kw:
                updated.update(
                    {
                        "status": "blocked",
                        "blocked": True,
                        "httpStatus": fb_status,
                        "latencyMs": latency_ms,
                        "reason": f"TLS MITM block page detected ('{kw}')",
                        "checkedAt": checked_at,
                    }
                )
                return updated
            if fb_status in (301, 302, 303, 307, 308, 403, 451):
                updated.update(
                    {
                        "status": "blocked",
                        "blocked": True,
                        "httpStatus": fb_status,
                        "latencyMs": latency_ms,
                        "reason": f"TLS intercept returned HTTP {fb_status}",
                        "checkedAt": checked_at,
                    }
                )
                return updated
        except Exception:  # noqa: BLE001
            pass

        updated.update(
            {
                "status": "unreachable",
                "blocked": False,
                "httpStatus": None,
                "latencyMs": latency_ms,
                "reason": f"TLS verification failed: {exc.verify_message or exc}",
                "checkedAt": checked_at,
            }
        )
        return updated

    except ssl.SSLError as exc:
        updated.update(
            {
                "status": "unreachable",
                "blocked": False,
                "httpStatus": None,
                "latencyMs": round((time.monotonic() - start) * 1000.0, 1),
                "reason": f"TLS handshake error: {exc}",
                "checkedAt": checked_at,
            }
        )
        return updated

    except asyncio.TimeoutError:
        updated.update(
            {
                "status": "unreachable",
                "blocked": False,
                "httpStatus": None,
                "latencyMs": None,
                "reason": f"Timeout after {timeout:.1f}s",
                "checkedAt": checked_at,
            }
        )
        return updated

    except ConnectionRefusedError:
        updated.update(
            {
                "status": "unreachable",
                "blocked": False,
                "httpStatus": None,
                "latencyMs": None,
                "reason": "Connection refused",
                "checkedAt": checked_at,
            }
        )
        return updated

    except (ConnectionResetError, EOFError) as exc:
        updated.update(
            {
                "status": "unreachable",
                "blocked": False,
                "httpStatus": None,
                "latencyMs": round((time.monotonic() - start) * 1000.0, 1),
                "reason": f"Connection reset/closed ({exc.__class__.__name__})",
                "checkedAt": checked_at,
            }
        )
        return updated

    except OSError as exc:
        updated.update(
            {
                "status": "unreachable",
                "blocked": False,
                "httpStatus": None,
                "latencyMs": None,
                "reason": f"Network error: {exc.strerror or exc}",
                "checkedAt": checked_at,
            }
        )
        return updated


def compute_summary(relays: list[dict[str, Any]]) -> dict[str, int]:
    """Compute top-level summary counts from relay entries."""
    counts = {
        "total": len(relays),
        "reachable": 0,
        "blocked": 0,
        "unreachable": 0,
        "unchecked": 0,
    }
    for relay in relays:
        if relay.get("blocked") is True or relay.get("status") == "blocked":
            counts["blocked"] += 1
        elif relay.get("status") == "reachable":
            counts["reachable"] += 1
        elif relay.get("status") == "unreachable":
            counts["unreachable"] += 1
        else:
            counts["unchecked"] += 1
    return counts


def atomic_write_json(path: Path, data: dict[str, Any]) -> None:
    """Atomically write ``data`` as pretty JSON to ``path``."""
    path.parent.mkdir(parents=True, exist_ok=True)
    target_mode = (path.stat().st_mode & 0o777) if path.exists() else 0o644
    fd, tmp_name = tempfile.mkstemp(
        prefix=f".{path.name}.",
        suffix=".tmp",
        dir=str(path.parent),
    )
    tmp_path = Path(tmp_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(tmp_path, target_mode)
        os.replace(tmp_path, path)
    except Exception:
        try:
            tmp_path.unlink(missing_ok=True)
        except OSError:
            pass
        raise


def matches_pattern(url: str, pattern: str) -> bool:
    """Match ``pattern`` against ``url`` via exact, glob, or case-insensitive substring."""
    pat = pattern.strip()
    if not pat:
        return False
    url_lower = url.lower()
    pat_lower = pat.lower()
    if url_lower == pat_lower:
        return True
    if any(ch in pat for ch in "*?["):
        return fnmatch.fnmatch(url_lower, pat_lower)
    return pat_lower in url_lower


def apply_manual_tags(
    relays: list[dict[str, Any]],
    mark_blocked: list[str],
    unblock: list[str],
) -> tuple[int, int]:
    """Apply ``--mark-blocked`` and ``--unblock`` tags in place; return counts."""
    marked = 0
    unblocked = 0
    now = utc_now_iso()

    for relay in relays:
        url = str(relay.get("url", ""))
        if any(matches_pattern(url, pat) for pat in mark_blocked):
            relay["blocked"] = True
            relay["status"] = "blocked"
            relay["reason"] = "Manually marked blocked"
            relay["checkedAt"] = now
            marked += 1
        elif any(matches_pattern(url, pat) for pat in unblock):
            relay["blocked"] = False
            if relay.get("status") == "blocked":
                relay["status"] = "unchecked"
            relay["reason"] = "Manually unblocked"
            relay["checkedAt"] = now
            unblocked += 1

    return marked, unblocked


def resolve_input_path(file_arg: str) -> Path:
    """Resolve JSON path, falling back to script directory for default filename."""
    candidate = Path(file_arg)
    if candidate.exists() or file_arg != "wasm-relays.json":
        return candidate
    sibling = Path(__file__).resolve().parent / file_arg
    if sibling.exists():
        return sibling
    return candidate


async def check_all_relays(
    relays: list[dict[str, Any]],
    concurrency: int,
    timeout: float,
    quiet: bool,
    insecure: bool = False,
) -> list[dict[str, Any]]:
    """Probe all relays concurrently bounded by ``concurrency``."""
    sem = asyncio.Semaphore(max(1, concurrency))
    results: list[dict[str, Any] | None] = [None] * len(relays)
    completed = 0
    total = len(relays)

    async def worker(idx: int, relay: dict[str, Any]) -> None:
        nonlocal completed
        async with sem:
            res = await probe_relay(relay, timeout=timeout, insecure=insecure)
            results[idx] = res
            completed += 1
            if not quiet:
                lat = f"{res['latencyMs']}ms" if res.get("latencyMs") is not None else "-"
                print(
                    f"[{completed}/{total}] {res.get('status', 'unknown').upper():11s} "
                    f"{lat:>8s}  {res.get('url', '')}  ({res.get('reason', '')})",
                    file=sys.stderr,
                )

    await asyncio.gather(*(worker(i, r) for i, r in enumerate(relays)))
    return [r for r in results if r is not None]


def print_only_working(relays: list[dict[str, Any]]) -> None:
    """Print only reachable, non-blocked relays to stdout."""
    working = [
        r
        for r in relays
        if r.get("status") == "reachable" and not r.get("blocked")
    ]
    if not working:
        print("No working relays found.")
        return
    for r in working:
        rtype = r.get("type") or "-"
        lat = f"{r['latencyMs']}ms" if r.get("latencyMs") is not None else "-"
        print(f"{r.get('url', '')}\t{rtype}\t{lat}")


def build_parser() -> argparse.ArgumentParser:
    """Create CLI argument parser."""
    parser = argparse.ArgumentParser(
        description="Concurrently probe Lunamix WASM relays and update wasm-relays.json atomically.",
    )
    parser.add_argument(
        "--file",
        default="wasm-relays.json",
        help="Path to the relays JSON file (default: wasm-relays.json)",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=20,
        help="Maximum concurrent relay checks (default: 20)",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=8.0,
        help="Per-relay network timeout in seconds (default: 8.0)",
    )
    parser.add_argument(
        "--mark-blocked",
        action="append",
        default=[],
        metavar="PATTERN_OR_URL",
        help="Manually mark matching relay URL(s) as blocked (repeatable)",
    )
    parser.add_argument(
        "--unblock",
        action="append",
        default=[],
        metavar="PATTERN_OR_URL",
        help="Manually remove blocked tag from matching relay URL(s) (repeatable)",
    )
    parser.add_argument(
        "--only-working",
        action="store_true",
        help="Print only reachable, non-blocked relays",
    )
    parser.add_argument(
        "--no-probe",
        action="store_true",
        help="Skip live network checks and read/print from existing JSON",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress per-relay progress output",
    )
    parser.add_argument(
        "--insecure",
        action="store_true",
        help="Skip TLS certificate verification if your Python environment lacks root CAs",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    """CLI entrypoint."""
    parser = build_parser()
    args = parser.parse_args(argv)

    json_path = resolve_input_path(args.file)
    if not json_path.exists():
        print(f"Error: relay file not found: {json_path}", file=sys.stderr)
        return 1

    try:
        with json_path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        print(f"Error reading {json_path}: {exc}", file=sys.stderr)
        return 1

    if not isinstance(data, dict) or not isinstance(data.get("relays"), list):
        print(
            f"Error: {json_path} must be a JSON object containing a 'relays' array.",
            file=sys.stderr,
        )
        return 1

    relays: list[dict[str, Any]] = data["relays"]

    if args.mark_blocked or args.unblock:
        marked, unblocked = apply_manual_tags(relays, args.mark_blocked, args.unblock)
        data["relays"] = relays
        data["summary"] = compute_summary(relays)
        data["updatedAt"] = utc_now_iso()
        atomic_write_json(json_path, data)
        if not args.quiet:
            print(
                f"Updated {json_path}: marked {marked} blocked, unblocked {unblocked}.",
                file=sys.stderr,
            )
        if args.only_working:
            print_only_working(relays)
        else:
            print(json.dumps(data["summary"], indent=2))
        return 0

    if not args.no_probe:
        relays = asyncio.run(
            check_all_relays(
                relays=relays,
                concurrency=args.concurrency,
                timeout=args.timeout,
                quiet=args.quiet or args.only_working,
                insecure=args.insecure,
            )
        )
        data["relays"] = relays
        data["summary"] = compute_summary(relays)
        data["updatedAt"] = utc_now_iso()
        atomic_write_json(json_path, data)
    else:
        data["summary"] = compute_summary(relays)

    if args.only_working:
        print_only_working(relays)
    else:
        s = data["summary"]
        print(
            f"Checked {s['total']} relays -> "
            f"reachable: {s['reachable']}, "
            f"blocked: {s['blocked']}, "
            f"unreachable: {s['unreachable']}, "
            f"unchecked: {s['unchecked']}"
        )
        if s["unreachable"] > 0 and not args.quiet:
            top_reasons = Counter(
                str(r.get("reason") or "Unknown")
                for r in relays
                if r.get("status") == "unreachable"
            ).most_common(3)
            if top_reasons:
                joined = "; ".join(f"{reason} (x{count})" for reason, count in top_reasons)
                print(f"Top unreachable reasons: {joined}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
