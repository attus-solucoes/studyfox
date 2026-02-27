export async function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const cleaned = text
        .replace(/[^\x20-\x7E\xC0-\xFF\u00C0-\u024F\n\r\t]/g, ' ')
        .replace(/\s{3,}/g, '\n')
        .trim()
        .substring(0, 12000);
      resolve(cleaned);
    };
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}

export function extractTextFromString(text: string): string {
  return text.trim().substring(0, 12000);
}
