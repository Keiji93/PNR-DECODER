import { useState } from 'react';
import { Plane, ArrowRight, Loader2, FileText } from 'lucide-react';
import { parsePNR } from './services/geminiService';
import { ParsedPNR } from './types';
import { ItineraryView } from './components/ItineraryView';

export default function App() {
  const [rawPnr, setRawPnr] = useState('');
  const [parsedData, setParsedData] = useState<ParsedPNR | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDecode = async () => {
    if (!rawPnr.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await parsePNR(rawPnr);
      setParsedData(data);
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes('GEMINI_API_KEY')) {
        setError(err.message);
      } else {
        setError('Failed to parse PNR. Please check the text and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadExample = () => {
    setRawPnr(`1.SMITH/JOHN MR 2.SMITH/JANE MRS
1 BA 117 J 12OCT LHRJFK HK2 0825 1110
2 BA 116 J 20OCT JFKLHR HK2 2015 0815+1
TKT/TIME LIMIT
1.T-10OCT
PHONES
1.LON 020 7123 4567-H
REMARKS
1.OSI BA VIP PAX`);
  };

  return (
    <div className="min-h-screen bg-[#f3f0ff] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600">
            <Plane className="w-6 h-6" />
            <span className="text-xl font-bold tracking-tight text-slate-900">PNR Decoder</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {!parsedData ? (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-3">
                Decode raw PNRs instantly.
              </h1>
              <p className="text-lg text-slate-600">
                Paste your cryptic GDS itinerary below and we'll convert it into a beautiful, readable format.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <FileText className="w-4 h-4" />
                  Raw PNR Text
                </div>
                <button
                  onClick={loadExample}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Load Example
                </button>
              </div>
              <textarea
                value={rawPnr}
                onChange={(e) => setRawPnr(e.target.value)}
                placeholder="Paste Amadeus, Sabre, or Galileo PNR here..."
                className="w-full h-64 p-4 text-sm font-mono text-slate-700 bg-transparent border-none focus:ring-0 resize-none outline-none"
                spellCheck={false}
              />
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={handleDecode}
                  disabled={!rawPnr.trim() || isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all active:scale-[0.98]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Decoding...
                    </>
                  ) : (
                    <>
                      Convert Itinerary
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <button 
                onClick={() => setParsedData(null)}
                className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-2"
              >
                ← Back to Input
              </button>
            </div>
            <ItineraryView data={parsedData} />
          </div>
        )}
      </main>
    </div>
  );
}
