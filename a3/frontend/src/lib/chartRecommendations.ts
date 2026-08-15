import { ColumnSchema } from "./types";

export interface ChartRecommendation {
  type: "area" | "bar" | "scatter" | "donut" | "radar" | "histogram" | "horizontal_bar" | "boxplot";
  title: string;
  reason: string;
  suggestedX: string;
  suggestedY: string;
  confidence: number;
}

export function getChartRecommendations(columns: ColumnSchema[]): ChartRecommendation[] {
  const recs: ChartRecommendation[] = [];
  if (!columns || columns.length === 0) return recs;

  const dateCols = columns.filter((c) => c.type === "date");
  const numCols = columns.filter((c) => c.type === "numeric");
  const strCols = columns.filter((c) => c.type === "string" || c.type === "boolean");

  // 1. Time-series Line/Area recommendation
  if (dateCols.length > 0 && numCols.length > 0) {
    recs.push({
      type: "area",
      title: "Time-Series Trend",
      reason: `Temporal column '${dateCols[0].name}' mapped with metric '${numCols[0].name}' is optimal for trend analysis.`,
      suggestedX: dateCols[0].name,
      suggestedY: numCols[0].name,
      confidence: 0.98,
    });
  }

  // 2. Categorical Bar chart recommendation
  if (strCols.length > 0 && numCols.length > 0) {
    recs.push({
      type: "bar",
      title: "Categorical Performance",
      reason: `Dimension '${strCols[0].name}' allows clear comparative aggregations against '${numCols[0].name}'.`,
      suggestedX: strCols[0].name,
      suggestedY: numCols[0].name,
      confidence: 0.95,
    });
  }

  // 3. Scatter Plot / Correlation recommendation
  if (numCols.length >= 2) {
    recs.push({
      type: "scatter",
      title: "Feature Correlation",
      reason: `Two continuous numeric variables ('${numCols[0].name}' vs '${numCols[1].name}') are ideal for regression inspection.`,
      suggestedX: numCols[0].name,
      suggestedY: numCols[1].name,
      confidence: 0.90,
    });
  }

  // 4. Donut Chart recommendation
  if (strCols.length > 0) {
    const lowCardCol = strCols.find((c) => c.unique_count <= 8) || strCols[0];
    recs.push({
      type: "donut",
      title: "Share & Composition",
      reason: `Low-cardinality dimension '${lowCardCol.name}' presents clean proportional slice breakdown.`,
      suggestedX: lowCardCol.name,
      suggestedY: numCols.length > 0 ? numCols[0].name : lowCardCol.name,
      confidence: 0.85,
    });
  }

  // 5. Histogram recommendation
  if (numCols.length > 0) {
    recs.push({
      type: "histogram",
      title: "Value Distribution",
      reason: `Inspect density distribution and skewness of '${numCols[0].name}'.`,
      suggestedX: numCols[0].name,
      suggestedY: numCols[0].name,
      confidence: 0.80,
    });
  }

  return recs;
}
