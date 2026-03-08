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
