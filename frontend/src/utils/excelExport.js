export async function exportToXlsx(rows, {
  sheetName = "Hoja1",
  filePrefix = "export",
  fileName,          
  headers,           
} = {}) {

  // Nota de seguridad:
  // La librería 'xlsx' tiene una vulnerabilidad conocida (sin fix al momento).
  // Se utiliza únicamente para exportación local, no para leer archivos externos.
  const XLSX = await import("xlsx");

  const ws = headers
    ? XLSX.utils.json_to_sheet(rows, { header: headers })
    : XLSX.utils.json_to_sheet(rows);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const today = new Date().toISOString().slice(0, 10); 
  const safeName = fileName || `${filePrefix}_${today}.xlsx`;

  XLSX.writeFile(wb, safeName);
}
