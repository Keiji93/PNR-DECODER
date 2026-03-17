import { GoogleGenAI, Type } from '@google/genai';
import { ParsedPNR } from '../types';

export async function parsePNR(rawPnr: string): Promise<ParsedPNR> {
  const response = await fetch('/api/parse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rawPnr }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to parse PNR (Status: ${response.status})`);
  }

  return response.json() as Promise<ParsedPNR>;
}
