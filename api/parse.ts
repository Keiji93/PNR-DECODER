import Groq from 'groq-sdk';
import moment from 'moment-timezone';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const airportTimezones = require('airport-timezone');

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
    
You MUST return a valid JSON object matching this exact structure (do not include markdown formatting, just the raw JSON). CRITICAL: You MUST extract and maintain the exact chronological order of flights, trains, hotels, and cars as they appear in the raw text. Do NOT invert the itinerary:
{
  "bookingReference": "The 6-character alphanumeric PNR / Booking Reference code. If not found, return 'UNKNOWN'. CRITICAL: Do NOT confuse a flight number string like 'TO7071' or 'AF7349' for a booking reference.",
  "passengers": ["List of passenger names found in the PNR. Format as 'First Last' if possible. CRITICAL: Do NOT confuse 6-letter city routing pairs like 'MPLORY' or 'CDGMSP' as passenger names."],
  "flights": [
    {
      "airline": "The FULL name of the airline (e.g., 'Uzbekistan Airways', 'British Airways'). Do NOT output just the 2-letter carrier code. CRITICAL: In strings like 'TO7071', 'TO' is the airline code (Transavia). Do NOT ignore the flight just because it spans a single line.",
      "flightNumber": "The 2-character carrier code AND the flight number combined (e.g., 'HY 045' or 'MS 758'). DO NOT forget the carrier code.",
      "departureAirportCode": "3-letter IATA code for departure airport. CRITICAL: In the PNR routing string (e.g., 'MRSCDG' or 'CDGMSP'), the FIRST 3 letters ('MRS' or 'CDG') are ALWAYS the Departure airport. DO NOT INVERT IN ANY CIRCUMSTANCE.",
      "departureAirportName": "The FULL official name of the departure airport (e.g., 'Tashkent Intl Airport'). Do NOT output the 3-letter code here. If unknown, output City + Airport.",
      "departureCity": "City name for departure.",
      "departureDate": "Departure date (e.g., 'Sun 4 Oct' or '02MAY').",
      "departureTime": "Departure time with a colon (e.g., '18:00'). NEVER omit the colon. If it is '1800', rewrite it as '18:00'.",
      "arrivalAirportCode": "3-letter IATA code for arrival airport. CRITICAL: In the PNR routing string (e.g., 'MRSCDG' or 'CDGMSP'), the LAST 3 letters ('CDG' or 'MSP') are ALWAYS the Arrival airport. DO NOT INVERT IN ANY CIRCUMSTANCE.",
      "arrivalAirportName": "The FULL official name of the arrival airport. Do NOT output the 3-letter code here. If unknown, output City + Airport.",
      "arrivalCity": "City name for arrival.",
      "arrivalDate": "Arrival date.",
      "arrivalTime": "Arrival time with a colon (e.g., '18:55'). NEVER omit the colon. If it is '1855', rewrite it as '18:55'.",
      "cabinClass": "Cabin class (e.g., Economy, Business, First).",
      "duration": "The actual flight duration (e.g., '8h 50m'). Extract this from the PNR if available. If NOT explicitly written, you MUST calculate it accurately using this specific formula adjusting for timezones: 1. Convert Departure to UTC (Departure Time + Offset). 2. Convert Arrival to UTC (Arrival Time + Offset). 3. Calculate Difference: Duration = (Arrival Time_UTC + 24 if next day) - Departure Time_UTC. Example: JFK (UTC-4) at 19:30 to CDG (UTC+1) at 07:20 -> Dep(23:30 UTC), Arr(06:20 UTC next day -> 30:20), Duration = 30:20 - 23:30 = 6h 50m. Always use this exact UTC math!",
      "layover": "Layover time if applicable. If not explicitly written, calculate it by checking the time between the very previous flight's arrival and this flight's departure, again accounting for time zones if they differ. Otherwise '-'.",
      "stops": "The number of stops for this flight segment (e.g., '0' for direct, '1' for one stop). Look for a standalone digit in the PNR string near the end, or specifically indicate it if clearly written. If unknown or not found, return '0'.",
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
  "hotels": [
    {
      "checkInDate": "e.g., '14MAR'",
      "checkOutDate": "e.g., '17MAR'",
      "hotelName": "e.g., 'Holiday Inn Express Ogden by IHG'",
      "address": "e.g., '2245 S 1200 W, Ogden UT 84407'",
      "amenities": "e.g., 'Free breakfast'",
      "bedType": "e.g., 'King'",
      "avgPerNight": "e.g., 'EUR 104'",
      "estimatedTotal": "e.g., 'EUR 355.12'",
      "cancellationPolicy": "e.g., 'Cancel before 30/03/2026 18:00 local hotel time.'"
    }
  ],
  "cars": [
    {
      "model": "e.g., 'Peugeot e-208 or similar'",
      "totalPrice": "e.g., 'EUR 63'",
      "ratePlan": "e.g., 'EUR 53 / daily'",
      "supplier": "e.g., 'Supplied By Hertz (ZE)', extract just the supplier name",
      "acrissCode": "e.g., 'ECAE - Economy / 2/4 Door...'",
      "pickUpLocationName": "CRITICAL: You MUST deduce the exact Pick-up Airport/Station name. Example: 'JAMAICA, NY' means 'John F. Kennedy International Airport'. Keep blank ONLY if it's a strict street address.",
      "pickUpLocation": "e.g., '312 FEDERAL CIR, JAMAICA, United States of America'",
      "dropOffLocationName": "CRITICAL: You MUST deduce the exact Drop-off Airport/Station name if applicable. Leave blank if not found or same as pick-up.",
      "dropOffLocation": "e.g., '23320 AUTOPILOT DR, DULLES, United States of America'. ONLY populate if explicitly listed as different from pick-up.",
      "instructions": "e.g., 'Take Airport-provided transportation...'",
      "mileage": "e.g., 'Unlimited mileage'"
    }
  ],
  "priceBreakdown": {
    "ticket": "Ticket price",
    "accommodation": "Accommodation price",
    "ancillaryServices": "Ancillary services price",
    "totalPrice": "Total price"
  }
}

If some information is missing, do your best to infer or leave it blank. Omit the flights or trains arrays if none are found. IT IS ABSOLUTELY CRITICAL THAT YOU OUTPUT ALL ARRAYS IN CHRONOLOGICAL ORDER (the exact same order they appear in the PNR). DO NOT READ BOTTOM-TO-TOP.`;

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

    if (parsedData.flights && Array.isArray(parsedData.flights)) {
      const currentYear = new Date().getFullYear();
      
      for (let i = 0; i < parsedData.flights.length; i++) {
        const f = parsedData.flights[i];
        if (f.departureDate && f.departureTime && f.arrivalDate && f.arrivalTime && f.departureAirportCode && f.arrivalAirportCode) {
          const depTzMatch = airportTimezones.find((a: any) => a.code === f.departureAirportCode);
          const arrTzMatch = airportTimezones.find((a: any) => a.code === f.arrivalAirportCode);
          
          if (depTzMatch && arrTzMatch) {
            const depStr = `${currentYear}-${f.departureDate.replace(/ /g, '')} ${f.departureTime}`;
            const arrStr = `${currentYear}-${f.arrivalDate.replace(/ /g, '')} ${f.arrivalTime}`;
            
            const formats = ['YYYY-DDMMM HH:mm', 'YYYY-DMMM HH:mm', 'YYYY-DDMM HH:mm'];
            const mDep = moment.tz(depStr, formats, depTzMatch.timezone);
            const mArr = moment.tz(arrStr, formats, arrTzMatch.timezone);
            
            if (mDep.isValid() && mArr.isValid()) {
              let diffMins = mArr.diff(mDep, 'minutes');
              
              if (diffMins < 0 && diffMins > -24 * 60) {
                mArr.add(1, 'days');
                diffMins = mArr.diff(mDep, 'minutes');
              } else if (diffMins < -24 * 60) {
                mArr.add(1, 'years');
                diffMins = mArr.diff(mDep, 'minutes');
              }
              
              if (diffMins >= 0 && diffMins < 48 * 60) {
                const h = Math.floor(diffMins / 60);
                const m = diffMins % 60;
                f.duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
              }
            }
            
            if (i > 0) {
              const prevF = parsedData.flights[i - 1];
              if (prevF.arrivalAirportCode === f.departureAirportCode && prevF.arrivalDate && prevF.arrivalTime) {
                 const prevArrTzMatch = airportTimezones.find((a: any) => a.code === prevF.arrivalAirportCode);
                 if (prevArrTzMatch) {
                    const prevArrStr = `${currentYear}-${prevF.arrivalDate.replace(/ /g, '')} ${prevF.arrivalTime}`;
                    const mPrevArr = moment.tz(prevArrStr, formats, prevArrTzMatch.timezone);
                    
                    if (mPrevArr.isValid() && mDep.isValid()) {
                       let layoverMins = mDep.diff(mPrevArr, 'minutes');
                       
                       if (layoverMins < 0 && layoverMins > -24 * 60) {
                          mDep.add(1, 'days');
                          layoverMins = mDep.diff(mPrevArr, 'minutes');
                       } else if (layoverMins < -24 * 60) {
                          mDep.add(1, 'years');
                          layoverMins = mDep.diff(mPrevArr, 'minutes');
                       }
                       
                       if (layoverMins >= 0 && layoverMins < 48 * 60) {
                          const lh = Math.floor(layoverMins / 60);
                          const lm = layoverMins % 60;
                          
                          prevF.layover = lh > 0 ? `${lh}h ${lm}m` : `${lm}m`;
                          f.layover = '-'; 
                       }
                    }
                 }
              }
            }
          }
        }
      }
    }

    return res.status(200).json(parsedData);
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to parse PNR' });
  }
}
