import Groq from 'groq-sdk';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rawPnr } = req.body;
  if (!rawPnr) {
    return res.status(400).json({ error: 'Missing rawPnr' });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GROQ_API_KEY is missing in environment variables.' });
    }

    const groq = new Groq({ apiKey });
    
    const systemPrompt = `You are an expert travel agent system. Your job is to parse raw, cryptic PNR (Passenger Name Record) strings from systems like Amadeus, Sabre, Galileo, or train itineraries (like SNCF), and extract the structured data perfectly.
    
You MUST return a valid JSON object matching this exact structure (do not include markdown formatting, just the raw JSON):
{
  "bookingReference": "The 6-character alphanumeric PNR / Booking Reference code. If not found, return 'UNKNOWN'.",
  "passengers": ["List of passenger names found in the PNR. Format as 'First Last' if possible."],
  "flights": [
    {
      "airline": "The FULL name of the airline (e.g., 'Uzbekistan Airways', 'British Airways'). Do NOT output just the 2-letter carrier code (e.g., do not output 'HY'). Translate it. If unknown, leave it blank rather than giving a 2-letter code.",
      "flightNumber": "The 2-character carrier code AND the flight number combined (e.g., 'HY 045' or 'MS 758'). DO NOT forget the carrier code.",
      "departureAirportCode": "3-letter IATA code for departure airport.",
      "departureAirportName": "The FULL official name of the departure airport (e.g., 'Tashkent Intl Airport'). Do NOT output the 3-letter code here. If unknown, output City + Airport.",
      "departureCity": "City name for departure.",
      "departureDate": "Departure date (e.g., 'Sun 4 Oct' or '02MAY').",
      "departureTime": "Departure time with a colon (e.g., '18:00'). NEVER omit the colon. If it is '1800', rewrite it as '18:00'.",
      "arrivalAirportCode": "3-letter IATA code for arrival airport.",
      "arrivalAirportName": "The FULL official name of the arrival airport. Do NOT output the 3-letter code here. If unknown, output City + Airport.",
      "arrivalCity": "City name for arrival.",
      "arrivalDate": "Arrival date.",
      "arrivalTime": "Arrival time with a colon (e.g., '18:55'). NEVER omit the colon. If it is '1855', rewrite it as '18:55'.",
      "cabinClass": "Cabin class (e.g., Economy, Business, First).",
      "duration": "EXTREMELY IMPORTANT: The true flight duration (e.g., '8h 50m'). Extract this directly from the PNR text if it exists. NEVER calculate this manually from the departure and arrival times, because they are in different time zones and your calculation will be completely wrong for long-haul flights. If the duration is not explicitly stated in the text, you MUST return '-'.",
      "layover": "Layover time if applicable. Do NOT try to calculate this manually, extract it only if written. Otherwise '-'.",
      "aircraft": "Aircraft type (e.g., 'Boeing 737' or 'A320'). If not present, try to infer or use '-'.",
      "status": "Flight status (e.g., Confirmed, HK).",
      "price": "The individual price for this specific flight segment (e.g., '184.00 EUR'). Look for it near the end."
    }
  ],
  "trains": [
    {
      "date": "Date of the train journey (e.g., '18 Mars'). Translate to French format like '18 Mars'.",
      "trainNumber": "Train number (e.g., 'SNF 6111').",
      "departureStation": "Departure station name.",
      "departureTime": "Departure time.",
      "arrivalStation": "Arrival station name.",
      "arrivalTime": "Arrival time.",
      "cabinClass": "Cabin class (e.g., '1st' or '2nd').",
      "tarif": "Tarif type, such as 'Flexible', 'Semi-Flexible', 'FLEX PREMIÈRE', etc.",
      "transfer": "Transfer info, e.g., 'Direct'.",
      "duration": "Duration of the journey (e.g., '3h19').",
      "price": "The individual price for this specific train segment (e.g., '184.00 EUR' or '138.00 EUR'). It usually appears after the ticket type like 'E-billet'."
    }
  ],
  "priceBreakdown": {
    "ticket": "Ticket price",
    "accommodation": "Accommodation price",
    "ancillaryServices": "Ancillary services price",
    "totalPrice": "Total price"
  }
}

If some information is missing, do your best to infer or leave it blank. Omit the flights or trains arrays if none are found.`;

    let response;
    let retries = 3;
    let delay = 1000;

    for (let i = 0; i < retries; i++) {
      try {
        response = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Parse the following raw GDS PNR or train itinerary text and extract the booking reference, passengers, flight segments, train segments, and price breakdown in JSON format.\n\nRaw PNR:\n\n${rawPnr}` }
          ],
          model: 'llama-3.3-70b-versatile',
          response_format: { type: 'json_object' },
          temperature: 0,
        });
        break; // Success, exit retry loop
      } catch (error: any) {
        const isUnavailable = error?.status === 503 || error?.message?.includes('503');
        if (isUnavailable && i < retries - 1) {
          console.warn(`Model overloaded (503), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        } else {
          // If we run out of retries or it's a different error, throw it
          throw error;
        }
      }
    }

    let jsonStr = response?.choices[0]?.message?.content || "{}";
    jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    
    const parsedData = JSON.parse(jsonStr);
    return res.status(200).json(parsedData);
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to parse PNR' });
  }
}
