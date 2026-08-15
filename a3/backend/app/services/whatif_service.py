"""
What-If Simulation Service — parameter sensitivity modeling and driver variable impact calculators.
"""

from typing import List, Dict, Any
from ..schemas.whatif import WhatIfRequest, WhatIfResponse, WhatIfVariableImpact


def run_what_if_simulation(
    headers: List[str],
    rows: List[Dict[str, Any]],
    req: WhatIfRequest
) -> WhatIfResponse:
    """Simulate variations in driver variables and project the impact on target metric."""
    target_metric = req.target_metric
    valid_rows = [r for r in rows if isinstance(r.get(target_metric), (int, float))]
    
    if not valid_rows:
        return WhatIfResponse(
            target_metric=target_metric,
            scenario_name=req.scenario_name,
            baseline_total=0.0,
            simulated_total=0.0,
            delta_value=0.0,
            delta_percentage=0.0,
            baseline_avg=0.0,
            simulated_avg=0.0,
            variable_impacts=[],
            simulation_points=[]
        )

    baseline_vals = [float(r[target_metric]) for r in valid_rows]
    baseline_total = sum(baseline_vals)
    baseline_avg = baseline_total / len(baseline_vals)

    # Compute compound multiplier from driver adjustments
    compound_multiplier = 1.0
    impacts: List[WhatIfVariableImpact] = []

    for adj in req.driver_variables:
        var_name = adj.variable_name
        pct = adj.percentage_change
        multiplier = 1.0 + (pct / 100.0)
        compound_multiplier *= multiplier

        # Compute baseline average for this variable
        var_vals = [float(r[var_name]) for r in valid_rows if isinstance(r.get(var_name), (int, float))]
        var_avg = sum(var_vals) / len(var_vals) if var_vals else 0.0
        sim_var_avg = var_avg * multiplier

        impacts.append(WhatIfVariableImpact(
            variable=var_name,
            baseline_avg=round(var_avg, 2),
            simulated_avg=round(sim_var_avg, 2),
            delta_pct=pct,
            contribution_to_target=round((multiplier - 1.0) * 100, 2)
        ))

    simulated_total = baseline_total * compound_multiplier
    simulated_avg = baseline_avg * compound_multiplier
    delta_value = simulated_total - baseline_total
    delta_pct = ((compound_multiplier - 1.0) * 100.0)

    # Sample trajectory points
    dim_col = next((h for h in headers if h != target_metric and any(k in h.lower() for k in ("date", "month", "time", "id", "name"))), headers[0])
    points = []
    for idx, r in enumerate(valid_rows[:20]):
        base_v = float(r[target_metric])
        sim_v = base_v * compound_multiplier
        lbl = str(r.get(dim_col, f"Point {idx+1}"))
        points.append({
            "label": lbl,
            "baseline": round(base_v, 2),
            "simulated": round(sim_v, 2),
            "delta": round(sim_v - base_v, 2)
        })

    return WhatIfResponse(
        target_metric=target_metric,
        scenario_name=req.scenario_name,
        baseline_total=round(baseline_total, 2),
        simulated_total=round(simulated_total, 2),
        delta_value=round(delta_value, 2),
        delta_percentage=round(delta_pct, 2),
        baseline_avg=round(baseline_avg, 2),
        simulated_avg=round(simulated_avg, 2),
        variable_impacts=impacts,
        simulation_points=points,
        disclaimer="Notice: Simulated values are analytical approximations based on mathematical drivers and not guaranteed future predictions."
    )
