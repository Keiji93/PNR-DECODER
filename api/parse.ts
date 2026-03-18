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
      "airline": "Airline name.",
      "flightNumber": "Flight number (e.g., MS758).",
      "departureAirportCode": "3-letter IATA code for departure airport.",
      "departureAirportName": "Full name of departure airport.",
      "departureCity": "City name for departure.",
      "departureDate": "Departure date (e.g., 'Sun 4 Oct').",
      "departureTime": "Departure time (e.g., '15:40').",
      "arrivalAirportCode": "3-letter IATA code for arrival airport.",
      "arrivalAirportName": "Full name of arrival airport.",
      "arrivalCity": "City name for arrival.",
      "arrivalDate": "Arrival date (e.g., 'Sun 4 Oct').",
      "arrivalTime": "Arrival time (e.g., '21:10').",
      "cabinClass": "Cabin class (e.g., Economy, Business, First).",
      "duration": "Flight duration (e.g., '4h 30m').",
      "layover": "Layover time if applicable, otherwise '-'.",
      "aircraft": "Aircraft type (e.g., 'Airbus A321-100/200 Ceo').",
      "status": "Flight status (e.g., Confirmed, HK).",
      "price": "The individual price for this specific flight segment (e.g., '184.00 EUR'). Look for it near the end of the segment details."
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
