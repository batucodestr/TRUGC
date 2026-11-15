"""Durum değişikliği denetim kaydı yardımcısı."""

from .models import StatusLog


def log_status_change(entity_type: str, entity, old: str, new: str, *, actor=None, note: str = "") -> StatusLog | None:
    """``old != new`` ise bir ``StatusLog`` satırı yazar."""
    if old == new:
        return None
    return StatusLog.objects.create(
        entity_type=entity_type,
        entity_id=entity.pk,
        from_status=old or "",
        to_status=new,
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        note=note[:255],
    )
