import { GoogleGenAI, Type } from '@google/genai';
import { ParsedPNR } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function parsePNR(rawPnr: string): Promise<ParsedPNR> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Parse the following raw GDS PNR text and extract the booking reference, passengers, and flight segments. If some information is missing, do your best to infer or leave it blank. Raw PNR:\n\n${rawPnr}`,
    config: {
      systemInstruction: "You are an expert travel agent system. Your job is to parse raw, cryptic PNR (Passenger Name Record) strings from systems like Amadeus, Sabre, and Galileo, and extract the structured data perfectly.",
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
          }
        },
        required: ["bookingReference", "passengers", "flights"]
      }
    }
  });

  const jsonStr = response.text || "{}";
  return JSON.parse(jsonStr) as ParsedPNR;
}
