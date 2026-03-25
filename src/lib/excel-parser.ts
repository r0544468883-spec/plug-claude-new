import readXlsxFile from 'read-excel-file';

// URL detection regex
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

/**
 * Parse a file and extract all URLs from it
 */
export const parseFile = async (file: File): Promise<string[]> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'xlsx' || extension === 'xls') {
    return parseExcelFile(file);
  } else if (extension === 'csv') {
    return parseCsvFile(file);
  } else if (extension === 'txt') {
    return parseTextFile(file);
  }
  
  throw new Error('Unsupported file format. Please use .xlsx, .xls, .csv, or .txt files.');
};

/**
 * Parse Excel file (.xlsx, .xls) using read-excel-file (safe alternative to xlsx)
 */
const parseExcelFile = async (file: File): Promise<string[]> => {
  const urls: string[] = [];
  
  try {
    // read-excel-file returns rows as arrays of cell values
    const rows = await readXlsxFile(file);
    
    for (const row of rows) {
      for (const cell of row) {
        if (typeof cell === 'string') {
          const matches = cell.match(URL_REGEX);
          if (matches) {
            urls.push(...matches);
          }
        } else if (cell !== null && cell !== undefined) {
          // Convert non-string values to string and check for URLs
          const cellStr = String(cell);
          const matches = cellStr.match(URL_REGEX);
          if (matches) {
            urls.push(...matches);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error('Failed to parse Excel file. Please ensure the file is valid.');
  }
  
  return deduplicateUrls(urls);
};

/**
 * Parse CSV file
 */
const parseCsvFile = async (file: File): Promise<string[]> => {
  const text = await file.text();
  const urls: string[] = [];
  
  // Split by common delimiters and newlines
  const lines = text.split(/[\r\n]+/);
  
  for (const line of lines) {
    const matches = line.match(URL_REGEX);
    if (matches) {
      urls.push(...matches);
    }
  }
  
  return deduplicateUrls(urls);
};

/**
 * Parse text file
 */
const parseTextFile = async (file: File): Promise<string[]> => {
  const text = await file.text();
  const urls: string[] = [];
  
  const matches = text.match(URL_REGEX);
  if (matches) {
    urls.push(...matches);
  }
  
  return deduplicateUrls(urls);
};

/**
 * Parse pasted text content
 */
export const parseTextContent = (text: string): string[] => {
  const urls: string[] = [];
  
  // Split by newlines and extract URLs
  const lines = text.split(/[\r\n]+/);
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if the entire line is a URL
    if (trimmed.match(/^https?:\/\//i)) {
      urls.push(trimmed);
    } else {
      // Try to extract URLs from the line
      const matches = trimmed.match(URL_REGEX);
      if (matches) {
        urls.push(...matches);
      }
    }
  }
  
  return deduplicateUrls(urls);
};

/**
 * Remove duplicates and clean URLs
 */
const deduplicateUrls = (urls: string[]): string[] => {
  const cleaned = urls
    .map(url => url.trim())
    .filter(url => url.length > 0)
    // Remove trailing punctuation that might have been captured
    .map(url => url.replace(/[.,;:!?)]+$/, ''));
  
  return [...new Set(cleaned)];
};

/**
 * Validate URLs for job scraping
 */
export const validateJobUrls = (urls: string[]): { valid: string[]; invalid: string[] } => {
  const valid: string[] = [];
  const invalid: string[] = [];
  
  for (const url of urls) {
    try {
      const parsed = new URL(url);
      
      // Only allow http/https
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        invalid.push(url);
        continue;
      }
      
      // Block internal/private IPs
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname.startsWith('127.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname === '0.0.0.0'
      ) {
        invalid.push(url);
        continue;
      }
      
      valid.push(url);
    } catch {
      invalid.push(url);
    }
  }
  
  return { valid, invalid };
};

/**
 * Get supported file types for file input
 */
export const SUPPORTED_FILE_TYPES = '.xlsx,.xls,.csv,.txt';

/**
 * Check if a file type is supported
 */
export const isSupportedFileType = (file: File): boolean => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return ['xlsx', 'xls', 'csv', 'txt'].includes(extension || '');
};
