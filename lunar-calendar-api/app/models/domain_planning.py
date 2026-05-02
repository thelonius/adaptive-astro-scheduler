"""
Pydantic models for Planning-related API responses.
Used by /api/v1/planning/* endpoints.
"""
from datetime import datetime
from typing import List, Optional, Tuple, Any
from pydantic import BaseModel, Field


# ── VoC Moon ────────────────────────────────────────────────────

class VoCLastAspect(BaseModel):
    planet: str
    aspect: str
    exact_at: datetime


class VoCWindow(BaseModel):
    voc_start: datetime
    voc_end: datetime
    duration_hours: float
    last_aspect: VoCLastAspect
    new_sign: str


class VoCResponse(BaseModel):
    start: datetime
    end: datetime
    windows: List[VoCWindow]
    total_count: int


# ── Dispositors ─────────────────────────────────────────────────

class DispositorChainResult(BaseModel):
    chain: List[str]
    signs: List[str]
    status: str            # "domicile" | "mutual_reception" | "cycle"
    final_dispositor: Optional[str]
    cycle_nodes: List[str]


class DispositorMapEntry(BaseModel):
    sign: str
    ruler: str


class DispositorResponse(BaseModel):
    datetime_utc: str
    system: str
    full_map: dict
    final_dispositors: List[str]
    mutual_receptions: List[Any]
    chains: dict


# ── Best Windows (Planning Optimizer) ───────────────────────────

class PlanningWindow(BaseModel):
    start: datetime
    end: datetime
    score: float = Field(..., ge=0.0, le=1.0)
    reasons: List[str]
    action_type: str = Field(..., description="GREEN | YELLOW | RED")


# ── Aspect Perfections ──────────────────────────────────────────

class AspectPerfectionsRequest(BaseModel):
    start: datetime = Field(..., description="Window start (UTC)")
    end: datetime = Field(..., description="Window end (UTC), exclusive")
    pairs: List[Tuple[str, str]] = Field(
        ...,
        description=(
            "Planet pairs to scan, e.g. [['Moon','Jupiter'], ['Sun','Venus']]. "
            "Order within a pair is preserved in the response."
        ),
        min_length=1,
    )
    aspects: List[str] = Field(
        ...,
        description="Aspect names from the engine's aspect_defs (e.g. 'conjunction', 'sextile', 'square', 'trine', 'opposition').",
        min_length=1,
    )


class AspectPerfectionEntry(BaseModel):
    planet_a: str
    planet_b: str
    aspect: str
    exact_at: datetime


class AspectPerfectionsResponse(BaseModel):
    start: datetime
    end: datetime
    count: int
    perfections: List[AspectPerfectionEntry]
