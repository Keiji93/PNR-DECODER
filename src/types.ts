export interface FlightSegment {
  airline: string;
  flightNumber: string;
  departureAirportCode: string;
  departureAirportName?: string;
  departureCity?: string;
  departureDate: string;
  departureTime: string;
  arrivalAirportCode: string;
  arrivalAirportName?: string;
  arrivalCity?: string;
  arrivalDate: string;
  arrivalTime: string;
  cabinClass?: string;
  duration?: string;
  layover?: string;
  aircraft?: string;
  status?: string;
}

export interface ParsedPNR {
  bookingReference: string;
  passengers: string[];
  flights: FlightSegment[];
}
