// src/utils/excelExport.js
export async function exportToXlsx(rows, {
  sheetName = "Hoja1",
  filePrefix = "export",
  fileName,          // si lo pasas, ignora filePrefix
  headers,           // opcional: orden/selección de columnas -> ['Código','Proyecto',...]
} = {}) {
  const XLSX = await import("xlsx");

  // Si mandas headers, fuerza orden/columnas; si no, usa llaves del JSON
  const ws = headers
    ? XLSX.utils.json_to_sheet(rows, { header: headers })
    : XLSX.utils.json_to_sheet(rows);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const safeName = fileName || `${filePrefix}_${today}.xlsx`;

  XLSX.writeFile(wb, safeName);
}
