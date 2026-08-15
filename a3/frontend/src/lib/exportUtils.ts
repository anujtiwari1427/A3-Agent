export function downloadBlob(content: string | Blob, filename: string, mimeType: string) {
  const blob = typeof content === "string" ? new Blob([content], { type: mimeType }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportTableToCSV(headers: string[], rows: Record<string, any>[], filename: string = "export.csv") {
  const csvRows: string[] = [];
  csvRows.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","));

  rows.forEach((row) => {
    const values = headers.map((h) => {
      const v = row[h] !== undefined && row[h] !== null ? String(row[h]) : "";
      return `"${v.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(","));
  });

  downloadBlob(csvRows.join("\n"), filename, "text/csv;charset=utf-8;");
}

export function exportToJSON(data: any, filename: string = "export.json") {
  downloadBlob(JSON.stringify(data, null, 2), filename, "application/json");
}

export function exportToMarkdown(markdownContent: string, filename: string = "report.md") {
  downloadBlob(markdownContent, filename, "text/markdown");
}

export function exportSvgToFile(svgElement: SVGSVGElement, filename: string = "chart.svg") {
  const svgString = new XMLSerializer().serializeToString(svgElement);
  downloadBlob(svgString, filename, "image/svg+xml;charset=utf-8");
}

export function exportSvgToPng(svgElement: SVGSVGElement, filename: string = "chart.png", scale: number = 2) {
  const svgString = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = () => {
    const canvas = document.createElement("canvas");
    const rect = svgElement.getBoundingClientRect();
    canvas.width = (rect.width || 800) * scale;
    canvas.height = (rect.height || 400) * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Dark background matching platform
    ctx.fillStyle = "#06080f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(image, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, filename, "image/png");
      }
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  image.src = url;
}
