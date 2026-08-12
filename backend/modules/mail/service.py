"""Outbound email, fail-soft by design.

Configuration lives in `system_settings` (Admin → Settings), so credentials
can be pasted after deployment without a rebuild. Until `mail_enabled` is
"true" and SMTP is filled in, every send quietly no-ops with a log line —
in-app notifications are the primary channel, email is reinforcement.

A failed send NEVER fails the request that triggered it: losing an email is
acceptable, losing a project creation because the SMTP host was down is not.
That is why `send_later` runs on its own database session in a background
task instead of riding the caller's transaction.

Uses stdlib smtplib in a worker thread — no new dependency, and SMTP is
cheap at this volume.
"""
from __future__ import annotations

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from sqlalchemy import select

logger = logging.getLogger(__name__)

SETTING_KEYS = (
    "mail_enabled",
    "smtp_host",
    "smtp_port",
    "smtp_user",
    "smtp_password",
    "smtp_from",
    "smtp_tls",
    "app_base_url",
)


async def _load_config(db) -> dict:
    from modules.settings.models import SystemSetting

    rows = (
        await db.execute(
            select(SystemSetting.key, SystemSetting.value).where(
                SystemSetting.key.in_(SETTING_KEYS)
            )
        )
    ).all()
    return {k: (v or "") for k, v in rows}


def _configured(cfg: dict) -> bool:
    return (
        cfg.get("mail_enabled", "").strip().lower() == "true"
        and bool(cfg.get("smtp_host", "").strip())
        and bool(cfg.get("smtp_from", "").strip())
    )


async def base_url(db) -> str:
    """Where links in emails point. A setting first, the configured CORS
    origin second — never a hardcoded domain, so the same build deploys to
    nav.madhur.dev today and navdashboard.com tomorrow."""
    cfg = await _load_config(db)
    if cfg.get("app_base_url", "").strip():
        return cfg["app_base_url"].strip().rstrip("/")
    from core.config import settings

    origins = [
        o.strip()
        for o in (getattr(settings, "CORS_ORIGINS", "") or "").split(",")
        if o.strip() and o.strip() != "*"
    ]
    return origins[0].rstrip("/") if origins else ""


def _send_sync(cfg: dict, to: list[str], subject: str, text: str, html: str | None):
    msg = EmailMessage()
    msg["From"] = cfg["smtp_from"]
    msg["To"] = ", ".join(to)
    msg["Subject"] = subject
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")

    port = int(cfg.get("smtp_port") or "587")
    host = cfg["smtp_host"]
    use_tls = cfg.get("smtp_tls", "true").strip().lower() != "false"
    if port == 465:
        server: smtplib.SMTP = smtplib.SMTP_SSL(host, port, timeout=20)
    else:
        server = smtplib.SMTP(host, port, timeout=20)
    try:
        if use_tls and port != 465:
            server.starttls()
        if cfg.get("smtp_user"):
            server.login(cfg["smtp_user"], cfg.get("smtp_password", ""))
        server.send_message(msg)
    finally:
        server.quit()


async def send_mail(
    *, to: list[str] | str, subject: str, text: str, html: str | None = None
) -> bool:
    """Send one email on a fresh session. Returns False (and logs) on any
    failure or when mail is not configured — never raises."""
    recipients = [to] if isinstance(to, str) else [t for t in to if t]
    recipients = [r.strip() for r in recipients if r and r.strip()]
    if not recipients:
        return False
    try:
        from core.database import async_session_factory

        async with async_session_factory() as db:
            cfg = await _load_config(db)
        if not _configured(cfg):
            logger.info("Mail not configured — skipped: %r to %s", subject, recipients)
            return False
        await asyncio.to_thread(_send_sync, cfg, recipients, subject, text, html)
        logger.info("Mail sent: %r to %s", subject, recipients)
        return True
    except Exception:  # noqa: BLE001 — fail-soft is the contract
        logger.exception("Mail send failed: %r to %s", subject, recipients)
        return False


def send_later(*, to: list[str] | str, subject: str, text: str, html: str | None = None):
    """Fire-and-forget from inside a request handler."""
    asyncio.get_running_loop().create_task(
        send_mail(to=to, subject=subject, text=text, html=html)
    )
