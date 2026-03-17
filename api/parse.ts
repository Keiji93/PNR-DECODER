import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rawPnr } = req.body;
  if (!rawPnr) {
    return res.status(400).json({ error: 'Missing rawPnr' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing in environment variables.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Parse the following raw GDS PNR or train itinerary text and extract the booking reference, passengers, flight segments, train segments, and price breakdown. If some information is missing, do your best to infer or leave it blank. Raw PNR:\n\n${rawPnr}`,
      config: {
        systemInstruction: "You are an expert travel agent system. Your job is to parse raw, cryptic PNR (Passenger Name Record) strings from systems like Amadeus, Sabre, Galileo, or train itineraries (like SNCF), and extract the structured data perfectly.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bookingReference: { type: Type.STRING, description: "The 6-character alphanumeric PNR / Booking Reference code. If not found, return 'UNKNOWN'." },
            passengers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of passenger names found in the PNR. Format as 'First Last' if possible."
            },
            flights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  airline: { type: Type.STRING, description: "Airline name." },
                  flightNumber: { type: Type.STRING, description: "Flight number (e.g., MS758)." },
                  departureAirportCode: { type: Type.STRING, description: "3-letter IATA code for departure airport." },
                  departureAirportName: { type: Type.STRING, description: "Full name of departure airport." },
                  departureCity: { type: Type.STRING, description: "City name for departure." },
                  departureDate: { type: Type.STRING, description: "Departure date (e.g., 'Sun 4 Oct')." },
                  departureTime: { type: Type.STRING, description: "Departure time (e.g., '15:40')." },
                  arrivalAirportCode: { type: Type.STRING, description: "3-letter IATA code for arrival airport." },
                  arrivalAirportName: { type: Type.STRING, description: "Full name of arrival airport." },
                  arrivalCity: { type: Type.STRING, description: "City name for arrival." },
                  arrivalDate: { type: Type.STRING, description: "Arrival date (e.g., 'Sun 4 Oct')." },
                  arrivalTime: { type: Type.STRING, description: "Arrival time (e.g., '21:10')." },
                  cabinClass: { type: Type.STRING, description: "Cabin class (e.g., Economy, Business, First)." },
                  duration: { type: Type.STRING, description: "Flight duration (e.g., '4h 30m')." },
                  layover: { type: Type.STRING, description: "Layover time if applicable, otherwise '-'." },
                  aircraft: { type: Type.STRING, description: "Aircraft type (e.g., 'Airbus A321-100/200 Ceo')." },
                  status: { type: Type.STRING, description: "Flight status (e.g., Confirmed, HK)." }
                },
                required: ["airline", "flightNumber", "departureAirportCode", "arrivalAirportCode", "departureDate", "departureTime", "arrivalTime"]
              }
            },
            trains: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING, description: "Date of the train journey (e.g., '18 Mars'). Translate to French format like '18 Mars'." },
                  trainNumber: { type: Type.STRING, description: "Train number (e.g., 'SNF 6111')." },
                  departureStation: { type: Type.STRING, description: "Departure station name." },
                  departureTime: { type: Type.STRING, description: "Departure time." },
                  arrivalStation: { type: Type.STRING, description: "Arrival station name." },
                  arrivalTime: { type: Type.STRING, description: "Arrival time." },
                  cabinClass: { type: Type.STRING, description: "Cabin class (e.g., '1st' or '2nd')." },
                  tarif: { type: Type.STRING, description: "Tarif type, such as 'Flexible', 'Semi-Flexible', 'Tarif FLEX PREMIÈRE', etc." },
                  transfer: { type: Type.STRING, description: "Transfer info, e.g., 'Direct'." },
                  duration: { type: Type.STRING, description: "Duration of the journey (e.g., '3h19')." },
                  price: { type: Type.STRING, description: "Price for this segment." }
                },
                required: ["date", "trainNumber", "departureStation", "departureTime", "arrivalStation", "arrivalTime"]
              }
            },
            priceBreakdown: {
              type: Type.OBJECT,
              properties: {
                ticket: { type: Type.STRING },
                accommodation: { type: Type.STRING },
                ancillaryServices: { type: Type.STRING },
                totalPrice: { type: Type.STRING }
              }
            }
          },
          required: ["bookingReference", "passengers"]
        }
      }
    });

    let jsonStr = response.text || "{}";
    jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    
    const parsedData = JSON.parse(jsonStr);
    return res.status(200).json(parsedData);
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to parse PNR' });
  }
}
