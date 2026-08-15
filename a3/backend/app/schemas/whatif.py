from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class ParameterAdjustment(BaseModel):
    variable_name: str
    percentage_change: float  # e.g., +10.0 for +10%, -15.0 for -15%
    absolute_delta: Optional[float] = None


class WhatIfRequest(BaseModel):
    target_metric: str
    scenario_name: str = "Custom Scenario"
    formula_type: str = "multiplicative"  # "multiplicative" | "linear_combination" | "custom_drivers"
    driver_variables: List[ParameterAdjustment]
    baseline_filters: Optional[Dict[str, Any]] = None


class WhatIfVariableImpact(BaseModel):
    variable: str
    baseline_avg: float
    simulated_avg: float
    delta_pct: float
    contribution_to_target: float


class WhatIfResponse(BaseModel):
    target_metric: str
    scenario_name: str
    baseline_total: float
    simulated_total: float
    delta_value: float
    delta_percentage: float
    baseline_avg: float
    simulated_avg: float
    variable_impacts: List[WhatIfVariableImpact]
    disclaimer: str = "Notice: Simulated values are analytical approximations based on mathematical drivers and not guaranteed future predictions."
    simulation_points: List[Dict[str, Any]] = []
