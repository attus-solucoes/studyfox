export async function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      let text = '';

      if (e.target?.result instanceof ArrayBuffer) {
        const bytes = new Uint8Array(e.target.result);
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
          for (let j = 0; j < chunk.length; j++) {
            text += String.fromCharCode(chunk[j]);
          }
        }
      } else if (typeof e.target?.result === 'string') {
        text = e.target.result;
      }

      const cleaned = text
        .replace(/[^\x20-\x7E\xC0-\xFF\u00C0-\u024F\n\r\t]/g, ' ')
        .replace(/\s{3,}/g, '\n')
        .trim()
        .substring(0, 12000);

      if (cleaned.length < 50) {
        reject(new Error('Texto insuficiente extraído do arquivo. Tente colar o texto manualmente.'));
        return;
      }

      resolve(cleaned);
    };

    reader.onerror = reject;

    if (file.type === 'application/pdf') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file, 'utf-8');
    }
  });
}

export function extractTextFromString(text: string): string {
  return text.trim().substring(0, 12000);
}
