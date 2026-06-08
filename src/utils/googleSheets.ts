import { SpreadsheetRow } from "../types";

/**
 * Extracts Google Spreadsheet ID and Grid ID (GID) from standard Google Sheet URL formats.
 */
export function extractSpreadsheetInfo(url: string): { id: string; gid: string } {
  try {
    let id = "1KRnOhcR1-5STvHMnDtm9Hmafm9egkMv1yHYoa9qjn6A";
    let gid = "192673282";

    // Regex to match spreadsheet ID
    const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (idMatch && idMatch[1]) {
      id = idMatch[1];
    }

    // Regex to match gid
    const gidMatch = url.match(/gid=([0-9]+)/);
    if (gidMatch && gidMatch[1]) {
      gid = gidMatch[1];
    } else {
      // If gid is edit or not found, try to see if single gid is specified
      const editMatch = url.match(/#gid=([0-9]+)/);
      if (editMatch && editMatch[1]) {
        gid = editMatch[1];
      }
    }

    return { id, gid };
  } catch (error) {
    return {
      id: "1KRnOhcR1-5STvHMnDtm9Hmafm9egkMv1yHYoa9qjn6A",
      gid: "192673282"
    };
  }
}

/**
 * Robust CSV parser that handles quotes and commas correctly.
 */
export function parseCSV(text: string): SpreadsheetRow[] {
  const lines: string[][] = [];
  let currentRow: string[] = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentRow[currentRow.length - 1] += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push("");
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip LF
      }
      lines.push(currentRow);
      currentRow = [""];
    } else {
      currentRow[currentRow.length - 1] += char;
    }
  }

  if (currentRow.length > 1 || currentRow[0] !== "") {
    lines.push(currentRow);
  }

  if (lines.length === 0) return [];

  const headers = lines[0].map(h => h.trim());
  const data: SpreadsheetRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowValues = lines[i];
    if (rowValues.length === 1 && rowValues[0] === '') continue; // Skip empty rows

    const obj: SpreadsheetRow = {};
    headers.forEach((header, index) => {
      if (header) {
        const val = rowValues[index] !== undefined ? rowValues[index].trim() : "";
        
        // Attempt to convert to appropriate types for downstream math
        if (val === "") {
          obj[header] = "";
        } else if (!isNaN(Number(val)) && val !== "NaN" && !val.includes("-") && !val.includes("/")) {
          obj[header] = Number(val);
        } else {
          obj[header] = val;
        }
      }
    });
    data.push(obj);
  }

  return data;
}

/**
 * Fetches sheet data via the CSV export endpoint
 */
export async function fetchSpreadsheetData(urlOrId: string, customGid?: string): Promise<SpreadsheetRow[]> {
  let id = urlOrId;
  let gid = customGid || "0";

  // Check if it's a URL
  if (urlOrId.includes("docs.google.com")) {
    const extracted = extractSpreadsheetInfo(urlOrId);
    id = extracted.id;
    gid = customGid || extracted.gid;
  }

  const exportUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
  
  const response = await fetch(exportUrl);
  if (!response.ok) {
    throw new Error(`Error de red al intentar obtener los datos (${response.status})`);
  }
  const text = await response.text();
  return parseCSV(text);
}
