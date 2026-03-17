import { Plane, Clock } from 'lucide-react';
import { FlightSegment } from '../types';

export function TicketCard({ segment }: { segment: FlightSegment }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
      <div className="p-5 border-b border-slate-200 border-dashed flex justify-between items-center bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
            {segment.airline.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{segment.airline}</p>
            <p className="text-sm text-slate-500">Flight {segment.flightNumber}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            {segment.status || 'Confirmed'}
          </span>
          {segment.cabinClass && (
            <p className="text-xs text-slate-500 mt-1">{segment.cabinClass}</p>
          )}
        </div>
      </div>

      <div className="p-5 flex items-center justify-between relative">
        {/* Departure */}
        <div className="flex-1">
          <p className="text-3xl font-bold text-slate-900">{segment.departureAirportCode}</p>
          <p className="text-sm font-medium text-slate-700 mt-1">{segment.departureCity || 'Departure'}</p>
          <div className="flex items-center gap-1.5 mt-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" />
            <span>{segment.departureDateTime}</span>
          </div>
        </div>

        {/* Connection Line */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 relative">
          <div className="w-full h-px border-t-2 border-dashed border-slate-300 absolute top-1/2 -translate-y-1/2"></div>
          <div className="bg-white px-2 relative z-10 text-indigo-500">
            <Plane className="w-6 h-6" />
          </div>
        </div>

        {/* Arrival */}
        <div className="flex-1 text-right">
          <p className="text-3xl font-bold text-slate-900">{segment.arrivalAirportCode}</p>
          <p className="text-sm font-medium text-slate-700 mt-1">{segment.arrivalCity || 'Arrival'}</p>
          <div className="flex items-center justify-end gap-1.5 mt-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" />
            <span>{segment.arrivalDateTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
