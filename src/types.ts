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
  status?: string;
  price?: string;
  stops?: string;
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

export interface HotelSegment {
  checkInDate: string;
  checkOutDate: string;
  hotelName: string;
  address: string;
  amenities: string;
  bedType: string;
  avgPerNight: string;
  estimatedTotal: string;
  cancellationPolicy: string;
}

export interface CarSegment {
  model: string;
  totalPrice: string;
  ratePlan: string;
  supplier: string;
  acrissCode: string;
  locationName?: string;
  pickUpDropOffLocation: string;
  instructions: string;
  mileage: string;
  pickUpDate?: string;
  pickUpTime?: string;
  dropOffDate?: string;
  dropOffTime?: string;
}

export interface ParsedPNR {
  pnr: string;
  bookingReference: string;
  flights: FlightSegment[];
  trains?: TrainSegment[];
  hotels?: HotelSegment[];
  cars?: CarSegment[];
  priceBreakdown?: PriceBreakdown;
  passengers: string[];
}
