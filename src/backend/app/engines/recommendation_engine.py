"""
app/engines/recommendation_engine.py
ASTRA — Rule-based operational recommendation engine.

Loads three YAML rule files at startup:
  - staffing_rules.yaml    → officer + tow truck counts
  - barricade_rules.yaml   → barricade count + placement notes
  - escalation_rules.yaml  → escalation level thresholds

All rules are pure Python logic — no ML inference here.
"""

import yaml
from pathlib import Path

from app.schemas.recommendation_response import EscalationLevel, RecommendationResponse

_RULES_DIR = Path(__file__).resolve().parent.parent / "rules"


def load_rules() -> dict:
    """Load all YAML rule files. Called once at startup."""
    rules = {}
    for name in ("staffing_rules", "barricade_rules", "escalation_rules"):
        path = _RULES_DIR / f"{name}.yaml"
        with open(path, encoding="utf-8") as f:
            rules[name] = yaml.safe_load(f)
    return rules


def _lookup_staffing(rules: dict, event_cause: str, vehicle_type: str, severity: str) -> dict:
    """
    Look up officer + tow truck counts from staffing_rules.yaml.
    Falls back through: exact match → cause-only match → default.
    """
    staffing = rules.get("staffing_rules", {})
    cause_key = event_cause.lower().replace(" ", "_")
    veh_key = (vehicle_type or "unknown").lower().replace(" ", "_")
    sev_key = severity.lower()

    # Try: cause → vehicle_type → severity
    entry = (
        staffing.get(cause_key, {}).get(veh_key, {}).get(sev_key)
        or staffing.get(cause_key, {}).get("default", {}).get(sev_key)
        or staffing.get("default", {})
    )

    return {
        "officers": int(entry.get("officers", 2)),
        "tow_trucks": int(entry.get("tow_trucks", 0)),
    }


def _lookup_barricades(rules: dict, event_cause: str, severity: str) -> dict:
    barricades = rules.get("barricade_rules", {})
    cause_key = event_cause.lower().replace(" ", "_")
    sev_key = severity.lower()

    entry = (
        barricades.get(cause_key, {}).get(sev_key)
        or barricades.get("default", {}).get(sev_key)
        or barricades.get("default", {}).get("low", {})
    )
    return {
        "barricades": int(entry.get("barricades", 2)),
        "notes": entry.get("notes", ""),
    }


def _determine_escalation(
    rules: dict,
    closure_probability: float,
    risk_score: float,
    severity: str,
) -> EscalationLevel:
    escalation_rules = rules.get("escalation_rules", {}).get("thresholds", [])

    for rule in sorted(escalation_rules, key=lambda r: r.get("priority", 0), reverse=True):
        cond_closure = closure_probability >= rule.get("min_closure_prob", 0.0)
        cond_risk = risk_score >= rule.get("min_risk_score", 0.0)
        cond_severity = severity.lower() in [s.lower() for s in rule.get("severity_includes", ["low", "high"])]

        if cond_closure and cond_risk and cond_severity:
            return EscalationLevel(rule["level"])

    return EscalationLevel.LOW


def generate_recommendation(
    rules: dict,
    event_cause: str,
    vehicle_type: str,
    severity: str,
    closure_probability: float,
    risk_score: float,
) -> RecommendationResponse:
    """
    Generate an operational recommendation from ML outputs + rule engine.

    Args:
        rules:               Loaded rule dicts (from load_rules())
        event_cause:         e.g. "vehicle_breakdown"
        vehicle_type:        e.g. "heavy_vehicle"
        severity:            "High" | "Low"
        closure_probability: float 0–1
        risk_score:          float 0–10 (from spatial engine)

    Returns:
        RecommendationResponse
    """
    staffing = _lookup_staffing(rules, event_cause, vehicle_type, severity)
    barricades_info = _lookup_barricades(rules, event_cause, severity)
    escalation = _determine_escalation(rules, closure_probability, risk_score, severity)

    # Build human-readable action directives
    actions = [
        f"Deploy {staffing['officers']} traffic officer(s) to the incident site.",
        f"Place {barricades_info['barricades']} barricade(s) around the affected area.",
    ]
    if staffing["tow_trucks"] > 0:
        actions.append(f"Dispatch {staffing['tow_trucks']} tow truck(s) immediately.")
    if barricades_info["notes"]:
        actions.append(f"Barricade note: {barricades_info['notes']}")
    if escalation in (EscalationLevel.HIGH, EscalationLevel.CRITICAL):
        actions.append("Escalate to Traffic Control Centre — senior supervisor response required.")
    if closure_probability >= 0.60:
        actions.append("High road closure probability — activate diversion routes.")

    return RecommendationResponse(
        officers_required=staffing["officers"],
        barricades_required=barricades_info["barricades"],
        tow_trucks_required=staffing["tow_trucks"],
        escalation_level=escalation,
        actions=actions,
        notes=barricades_info.get("notes") or None,
    )
