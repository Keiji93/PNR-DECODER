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

export interface TrainSegment {
  date: string;
  trainNumber: string;
  departureStation: string;
  departureTime: string;
  arrivalStation: string;
  arrivalTime: string;
  cabinClass?: string;
  tarif?: string;
  transfer?: string;
  duration?: string;
  price?: string;
}

export interface PriceBreakdown {
  ticket?: string;
  accommodation?: string;
  ancillaryServices?: string;
  totalPrice?: string;
}

export interface ParsedPNR {
  bookingReference: string;
  passengers: string[];
  flights?: FlightSegment[];
  trains?: TrainSegment[];
  priceBreakdown?: PriceBreakdown;
}
