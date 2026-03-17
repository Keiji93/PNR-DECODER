import { Copy, Check, FileText, Plus, Trash2, Loader2 } from 'lucide-react';
import { ParsedPNR } from '../types';
import { motion } from 'motion/react';
import { useState, useRef } from 'react';
import { parsePNR } from '../services/geminiService';

type OfferOption = {
  id: string;
  totalPrice: string;
  baggage: string;
  changesOption: 'fee' | 'free';
  changesFee: string;
  refundabilityOption: 'non_refundable' | 'fully_refundable' | 'refundable_fee';
  refundabilityFee: string;
};

export function ItineraryView({ data }: { data: ParsedPNR }) {
  const [copied, setCopied] = useState(false);
  const [copiedOffer, setCopiedOffer] = useState(false);
  const [copiedMod, setCopiedMod] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // Offer form state
  const [customerName, setCustomerName] = useState('');
  const [travellerName, setTravellerName] = useState('');
  const [language, setLanguage] = useState<'en' | 'fr'>('en');
  
  // Additional itineraries state
  const [additionalItineraries, setAdditionalItineraries] = useState<ParsedPNR[]>([]);
  const [isAddingItinerary, setIsAddingItinerary] = useState(false);
  const [newPnrRaw, setNewPnrRaw] = useState('');
  const [isParsingPnr, setIsParsingPnr] = useState(false);
  const [pnrError, setPnrError] = useState<string | null>(null);

  const createDefaultOffer = (): OfferOption => ({
    id: Math.random().toString(36).substring(7),
    totalPrice: '',
    baggage: '',
    changesOption: 'fee',
    changesFee: '',
    refundabilityOption: 'non_refundable',
    refundabilityFee: ''
  });

  const [itineraryOffers, setItineraryOffers] = useState<Record<number, OfferOption[]>>({
    0: [createDefaultOffer()]
  });

  const addOffer = (itineraryIndex: number) => {
    setItineraryOffers(prev => {
      const current = prev[itineraryIndex] || [];
      return {
        ...prev,
        [itineraryIndex]: [...current, createDefaultOffer()]
      };
    });
  };

  const removeOffer = (itineraryIndex: number, id: string) => {
    setItineraryOffers(prev => {
      const current = prev[itineraryIndex] || [];
      return {
        ...prev,
        [itineraryIndex]: current.filter(o => o.id !== id)
      };
    });
  };

  const updateOffer = (itineraryIndex: number, id: string, field: keyof OfferOption, value: string) => {
    setItineraryOffers(prev => {
      const current = prev[itineraryIndex] || [];
      return {
        ...prev,
        [itineraryIndex]: current.map(o => o.id === id ? { ...o, [field]: value } : o)
      };
    });
  };

  const handleAddItinerary = async () => {
    if (!newPnrRaw.trim()) return;
    setIsParsingPnr(true);
    setPnrError(null);
    try {
      const parsed = await parsePNR(newPnrRaw);
      const newIndex = additionalItineraries.length + 1;
      setAdditionalItineraries([...additionalItineraries, parsed]);
      setItineraryOffers(prev => ({
        ...prev,
        [newIndex]: [createDefaultOffer()]
      }));
      setNewPnrRaw('');
      setIsAddingItinerary(false);
    } catch (err) {
      console.error(err);
      setPnrError('Failed to parse PNR. Please check the text and try again.');
    } finally {
      setIsParsingPnr(false);
    }
  };

  const removeItinerary = (index: number) => {
    setAdditionalItineraries(additionalItineraries.filter((_, i) => i !== index));
    setItineraryOffers(prev => {
      const newOffers: Record<number, OfferOption[]> = { 0: prev[0] };
      let newIdx = 1;
      for (let i = 0; i < additionalItineraries.length; i++) {
        if (i !== index) {
          newOffers[newIdx] = prev[i + 1] || [];
          newIdx++;
        }
      }
      return newOffers;
    });
  };

  // Generate route title
  const allItineraries = [data, ...additionalItineraries];
  const routeCities = data.flights.map(f => f.departureCity || f.departureAirportCode);
  if (data.flights.length > 0) {
    routeCities.push(data.flights[data.flights.length - 1].arrivalCity || data.flights[data.flights.length - 1].arrivalAirportCode);
  }
  const routeTitle = routeCities.join(' → ');

  const getSegmentPrefix = (idx: number, total: number) => {
    if (idx === 0) return "Outbound: ";
    if (idx === total - 1 && total > 1) return "Return: ";
    return `Segment ${idx + 1}: `;
  };

  const getChangesText = (lang: 'en' | 'fr', offer: OfferOption) => {
    if (offer.changesOption === 'fee') {
      const feeText = offer.changesFee || (lang === 'fr' ? '[montant]' : '[amount]');
      return lang === 'fr' 
        ? `Modifications autorisées moyennant des frais de ${feeText} + toute différence tarifaire applicable`
        : `Changes permitted against a fee of ${feeText} + any fare difference applicable`;
    } else {
      return lang === 'fr'
        ? `Modifications autorisées + toute différence tarifaire applicable`
        : `Changes permitted + any fare difference applicable`;
    }
  };

  const getRefundabilityText = (lang: 'en' | 'fr', offer: OfferOption) => {
    if (offer.refundabilityOption === 'non_refundable') {
      return lang === 'fr' ? `Non remboursable en cas d'annulation` : `Non Refundable in case of cancellation`;
    } else if (offer.refundabilityOption === 'fully_refundable') {
      return lang === 'fr' ? `Remboursement intégral en cas d'annulation` : `Fully refundable in case of cancellation`;
    } else {
      const feeText = offer.refundabilityFee || (lang === 'fr' ? '[montant]' : '[amount]');
      return lang === 'fr'
        ? `Remboursable moyennant des frais de ${feeText} en cas d'annulation`
        : `Refundable against a fee of ${feeText} in case of cancellation`;
    }
  };

  const generateEmailHtml = (type: 'itinerary' | 'offer' | 'modification' = 'itinerary') => {
    let html = `<div style="font-family: Arial, sans-serif; color: #000; max-width: 1000px; line-height: 1.5;">`;
    
    if (type === 'offer' || type === 'modification') {
      if (language === 'fr') {
        html += `<p style="margin-bottom: 16px;">Bonjour ${customerName || ''},</p>`;
        html += `<p style="margin-bottom: 16px;">Merci de nous avoir contactés.</p>`;
        if (type === 'modification') {
          html += `<p style="margin-bottom: 24px;">Veuillez trouver ci-dessous votre nouvel itinéraire proposé ainsi que le coût de la modification :</p>`;
        } else {
          html += `<p style="margin-bottom: 24px;">Veuillez trouver ci-dessous notre proposition de vol :</p>`;
        }
        if (travellerName) {
          html += `<p style="margin-bottom: 16px;"><strong>Passager(s) :</strong> ${travellerName}</p>`;
        }
      } else {
        html += `<p style="margin-bottom: 16px;">Dear ${customerName || '(name)'},</p>`;
        html += `<p style="margin-bottom: 16px;">Thank you for reaching out.</p>`;
        if (type === 'modification') {
          html += `<p style="margin-bottom: 24px;">Please review the proposed new itinerary and the cost to make this change:</p>`;
        } else {
          html += `<p style="margin-bottom: 24px;">Please review the following flight offer:</p>`;
        }
        if (travellerName) {
          html += `<p style="margin-bottom: 16px;"><strong>Traveller(s):</strong> ${travellerName}</p>`;
        }
      }
    }

    if (type === 'itinerary') {
      html += `<h2 style="font-size: 16px; font-weight: bold; margin-bottom: 24px;">Flight Itinerary: ${routeTitle}</h2>`;
    }

    allItineraries.forEach((itinerary, itIdx) => {
      if (allItineraries.length > 1) {
        html += `<h3 style="font-size: 15px; font-weight: bold; margin-bottom: 16px; color: #334155;">Itinerary ${itIdx + 1}</h3>`;
      }
      
      itinerary.flights.forEach((flight, idx) => {
        const prefix = getSegmentPrefix(idx, itinerary.flights.length);
        const dep = flight.departureCity || flight.departureAirportCode;
        const arr = flight.arrivalCity || flight.arrivalAirportCode;

        html += `
        <div style="margin-bottom: 32px;">
          <div style="margin-bottom: 8px; font-size: 15px;">
            <span style="font-weight: bold; text-decoration: underline;">${prefix}${dep} &rarr; ${arr}</span>
            ${flight.duration ? `<span style="margin-left: 12px; font-weight: normal;">${flight.duration}</span>` : ''}
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 10%;">Date</th>
                <th style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 8%;">Flight</th>
                <th style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 12%;">Carrier</th>
                <th style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 22%;">Departs</th>
                <th style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 22%;">Arrives</th>
                <th style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 8%;">Cabin</th>
                <th style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 8%;">Duration</th>
                <th style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 6%;">Layover</th>
                <th style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 14%;">Aircraft</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top;">${flight.departureDate || '-'}</td>
                <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top;">${flight.flightNumber || '-'}</td>
                <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; font-weight: bold; font-style: italic; color: #334155;">${flight.airline || '-'}</td>
                <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                  <div style="color: #334155;">${flight.departureAirportName || flight.departureAirportCode} (${flight.departureAirportCode})</div>
                  <div style="font-weight: bold; margin-top: 4px;">${flight.departureTime || '-'}</div>
                </td>
                <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                  <div style="color: #334155;">${flight.arrivalAirportName || flight.arrivalAirportCode} (${flight.arrivalAirportCode})</div>
                  <div style="font-weight: bold; margin-top: 4px;">${flight.arrivalTime || '-'}</div>
                </td>
                <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; color: #475569;">${flight.cabinClass || '-'}</td>
                <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; color: #475569;">${flight.duration || '-'}</td>
                <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; color: #475569;">${flight.layover || '-'}</td>
                <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; color: #475569;">${flight.aircraft || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        `;
      });

      if (type === 'offer' || type === 'modification') {
        const offers = itineraryOffers[itIdx] || [];
        if (offers.length > 0) {
          html += `<div style="margin-top: 16px; margin-bottom: 32px;">`;
          offers.forEach((offer, index) => {
            const isMultiple = offers.length > 1;
            if (isMultiple) {
              html += `<h4 style="margin-bottom: 12px; font-size: 14px; color: #0f172a;">Option ${index + 1}</h4>`;
            }
            html += `<div style="margin-bottom: 24px; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">`;
            if (language === 'fr') {
              const priceLabel = type === 'modification' ? 'Coût de la modification :' : 'Prix :';
              html += `  <p style="margin-bottom: 16px;"><strong>${priceLabel}</strong> ${offer.totalPrice || 'À déterminer'}</p>`;
              html += `  <p style="margin-bottom: 8px;"><strong>Conditions tarifaires :</strong></p>`;
              html += `  <ul style="margin-top: 0; margin-bottom: 0; padding-left: 20px;">`;
              html += `    <li><strong>Bagages :</strong> ${offer.baggage || 'Non spécifié'}</li>`;
              html += `    <li><strong>Modifications :</strong> ${getChangesText('fr', offer)}</li>`;
              html += `    <li><strong>Annulation :</strong> ${getRefundabilityText('fr', offer)}</li>`;
              html += `  </ul>`;
            } else {
              const priceLabel = type === 'modification' ? 'Modification Cost:' : 'Price:';
              html += `  <p style="margin-bottom: 16px;"><strong>${priceLabel}</strong> ${offer.totalPrice || 'TBD'}</p>`;
              html += `  <p style="margin-bottom: 8px;"><strong>Fare conditions:</strong></p>`;
              html += `  <ul style="margin-top: 0; margin-bottom: 0; padding-left: 20px;">`;
              html += `    <li><strong>Baggage:</strong> ${offer.baggage || 'Not specified'}</li>`;
              html += `    <li><strong>Changes:</strong> ${getChangesText('en', offer)}</li>`;
              html += `    <li><strong>Cancellation:</strong> ${getRefundabilityText('en', offer)}</li>`;
              html += `  </ul>`;
            }
            html += `</div>`;
          });
          html += `</div>`;
        }
      }
    });

    if (type === 'offer' || type === 'modification') {
      if (language === 'fr') {
        if (type === 'modification') {
          html += `  <p style="margin-bottom: 16px;">Veuillez nous confirmer si vous souhaitez procéder à cette modification.</p>`;
        } else {
          html += `  <p style="margin-bottom: 16px;">N'hésitez pas à nous indiquer si vous souhaitez confirmer l'une de ces offres ou si vous avez besoin d'autres ajustements.</p>`;
        }
        html += `  <p style="margin-bottom: 0;">Cordialement,</p>`;
      } else {
        if (type === 'modification') {
          html += `  <p style="margin-bottom: 16px;">Please confirm if you would like to proceed with this change.</p>`;
        } else {
          html += `  <p style="margin-bottom: 16px;">Please let us know if you would like to confirm one of these offers or if you need any further adjustments.</p>`;
        }
        html += `  <p style="margin-bottom: 0;">Kind regards,</p>`;
      }
    }

    html += `</div>`;
    return html;
  };

  const generatePlainText = (type: 'itinerary' | 'offer' | 'modification' = 'itinerary') => {
    let text = '';
    
    if (type === 'offer' || type === 'modification') {
      if (language === 'fr') {
        text += `Bonjour ${customerName || ''},\n\n`;
        text += `Merci de nous avoir contactés.\n\n`;
        if (type === 'modification') {
          text += `Veuillez trouver ci-dessous votre nouvel itinéraire proposé ainsi que le coût de la modification :\n\n`;
        } else {
          text += `Veuillez trouver ci-dessous notre proposition de vol :\n\n`;
        }
        if (travellerName) {
          text += `Passager(s) : ${travellerName}\n\n`;
        }
      } else {
        text += `Dear ${customerName || '(name)'},\n\n`;
        text += `Thank you for reaching out.\n\n`;
        if (type === 'modification') {
          text += `Please review the proposed new itinerary and the cost to make this change:\n\n`;
        } else {
          text += `Please review the following flight offer:\n\n`;
        }
        if (travellerName) {
          text += `Traveller(s): ${travellerName}\n\n`;
        }
      }
    } else {
      text += `Flight Itinerary: ${routeTitle}\n\n`;
    }

    allItineraries.forEach((itinerary, itIdx) => {
      if (allItineraries.length > 1) {
        text += `--- Itinerary ${itIdx + 1} ---\n\n`;
      }
      itinerary.flights.forEach((flight, idx) => {
        const prefix = getSegmentPrefix(idx, itinerary.flights.length);
        const dep = flight.departureCity || flight.departureAirportCode;
        const arr = flight.arrivalCity || flight.arrivalAirportCode;

        text += `${prefix}${dep} -> ${arr}   ${flight.duration || ''}\n`;
        text += `Date\tFlight\tCarrier\tDeparts\tArrives\tCabin\tDuration\tLayover\tAircraft\n`;
        text += `${flight.departureDate || '-'}\t${flight.flightNumber || '-'}\t${flight.airline || '-'}\t${flight.departureAirportCode} ${flight.departureTime || '-'}\t${flight.arrivalAirportCode} ${flight.arrivalTime || '-'}\t${flight.cabinClass || '-'}\t${flight.duration || '-'}\t${flight.layover || '-'}\t${flight.aircraft || '-'}\n\n`;
      });

      if (type === 'offer' || type === 'modification') {
        const offers = itineraryOffers[itIdx] || [];
        offers.forEach((offer, index) => {
          if (offers.length > 1) {
            text += `Option ${index + 1}\n`;
            text += `--------\n`;
          }
          if (language === 'fr') {
            const priceLabel = type === 'modification' ? 'Coût de la modification :' : 'Prix :';
            text += `${priceLabel} ${offer.totalPrice || 'À déterminer'}\n\n`;
            text += `Conditions tarifaires :\n`;
            text += `- Bagages : ${offer.baggage || 'Non spécifié'}\n`;
            text += `- Modifications : ${getChangesText('fr', offer)}\n`;
            text += `- Annulation : ${getRefundabilityText('fr', offer)}\n\n`;
          } else {
            const priceLabel = type === 'modification' ? 'Modification Cost:' : 'Price:';
            text += `${priceLabel} ${offer.totalPrice || 'TBD'}\n\n`;
            text += `Fare conditions:\n`;
            text += `- Baggage: ${offer.baggage || 'Not specified'}\n`;
            text += `- Changes: ${getChangesText('en', offer)}\n`;
            text += `- Cancellation: ${getRefundabilityText('en', offer)}\n\n`;
          }
        });
      }
    });

    if (type === 'offer' || type === 'modification') {
      if (language === 'fr') {
        if (type === 'modification') {
          text += `Veuillez nous confirmer si vous souhaitez procéder à cette modification.\n\n`;
        } else {
          text += `N'hésitez pas à nous indiquer si vous souhaitez confirmer l'une de ces offres ou si vous avez besoin d'autres ajustements.\n\n`;
        }
        text += `Cordialement,`;
      } else {
        if (type === 'modification') {
          text += `Please confirm if you would like to proceed with this change.\n\n`;
        } else {
          text += `Please let us know if you would like to confirm one of these offers or if you need any further adjustments.\n\n`;
        }
        text += `Kind regards,`;
      }
    }

    return text;
  };

  const handleCopy = async (type: 'itinerary' | 'offer' | 'modification' = 'itinerary') => {
    try {
      const html = generateEmailHtml(type);
      const text = generatePlainText(type);
      
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      });
      
      await navigator.clipboard.write([clipboardItem]);
      if (type === 'offer') {
        setCopiedOffer(true);
        setTimeout(() => setCopiedOffer(false), 2000);
      } else if (type === 'modification') {
        setCopiedMod(true);
        setTimeout(() => setCopiedMod(false), 2000);
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy', err);
      // Fallback for older browsers
      navigator.clipboard.writeText(generatePlainText(type));
      if (type === 'offer') {
        setCopiedOffer(true);
        setTimeout(() => setCopiedOffer(false), 2000);
      } else if (type === 'modification') {
        setCopiedMod(true);
        setTimeout(() => setCopiedMod(false), 2000);
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const renderItineraryTable = (itinerary: ParsedPNR, index: number, isAdditional: boolean = false) => {
    const routeCities = itinerary.flights.map(f => f.departureCity || f.departureAirportCode);
    if (itinerary.flights.length > 0) {
      routeCities.push(itinerary.flights[itinerary.flights.length - 1].arrivalCity || itinerary.flights[itinerary.flights.length - 1].arrivalAirportCode);
    }
    const routeTitle = routeCities.join(' → ');

    return (
      <div key={index} className={`bg-white shadow-sm border border-slate-200 p-8 overflow-x-auto ${isAdditional ? 'rounded-xl mt-6' : 'rounded-b-xl'}`}>
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isAdditional ? `Itinerary ${index + 1}: ${routeTitle}` : `Flight Itinerary: ${routeTitle}`}
            </h2>
            {itinerary.passengers.length > 0 && (
              <p className="text-sm text-slate-600 mt-1">Passengers: {itinerary.passengers.join(', ')}</p>
            )}
            {isAdditional && itinerary.bookingReference !== 'UNKNOWN' && (
              <p className="text-sm text-slate-600 mt-1">Booking Ref: <span className="font-mono text-slate-800">{itinerary.bookingReference}</span></p>
            )}
          </div>
          {isAdditional && (
            <button 
              onClick={() => removeItinerary(index - 1)}
              className="text-slate-400 hover:text-red-500 transition-colors p-2"
              title="Remove Itinerary"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {itinerary.flights.map((flight, idx) => (
          <div key={idx} className="mb-10 last:mb-0">
            <div className="flex items-baseline gap-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 underline decoration-slate-300 underline-offset-4">
                {getSegmentPrefix(idx, itinerary.flights.length)}{flight.departureCity || flight.departureAirportCode} → {flight.arrivalCity || flight.arrivalAirportCode}
              </h3>
              {flight.duration && <span className="text-slate-800 font-medium">{flight.duration}</span>}
            </div>
            
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-sm text-slate-800">
                  <th className="py-2 px-3 font-medium w-[10%]">Date</th>
                  <th className="py-2 px-3 font-medium w-[8%]">Flight</th>
                  <th className="py-2 px-3 font-medium w-[12%]">Carrier</th>
                  <th className="py-2 px-3 font-medium w-[22%]">Departs</th>
                  <th className="py-2 px-3 font-medium w-[22%]">Arrives</th>
                  <th className="py-2 px-3 font-medium w-[8%]">Cabin</th>
                  <th className="py-2 px-3 font-medium w-[8%]">Duration</th>
                  <th className="py-2 px-3 font-medium w-[6%]">Layover</th>
                  <th className="py-2 px-3 font-medium w-[14%]">Aircraft</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-900">
                <tr className="border-b border-slate-100">
                  <td className="py-4 px-3 align-top">{flight.departureDate}</td>
                  <td className="py-4 px-3 align-top">{flight.flightNumber}</td>
                  <td className="py-4 px-3 align-top font-bold italic text-slate-700">{flight.airline}</td>
                  <td className="py-4 px-3 align-top">
                    <div className="text-slate-700">{flight.departureAirportName || flight.departureAirportCode} ({flight.departureAirportCode})</div>
                    <div className="font-bold mt-1">{flight.departureTime}</div>
                  </td>
                  <td className="py-4 px-3 align-top">
                    <div className="text-slate-700">{flight.arrivalAirportName || flight.arrivalAirportCode} ({flight.arrivalAirportCode})</div>
                    <div className="font-bold mt-1">{flight.arrivalTime}</div>
                  </td>
                  <td className="py-4 px-3 align-top text-slate-600">{flight.cabinClass || '-'}</td>
                  <td className="py-4 px-3 align-top text-slate-600">{flight.duration || '-'}</td>
                  <td className="py-4 px-3 align-top text-slate-600">{flight.layover || '-'}</td>
                  <td className="py-4 px-3 align-top text-slate-600">{flight.aircraft || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
        
        {itinerary.flights.length === 0 && (
          <div className="text-center p-8 text-slate-500">
            No flight segments could be parsed.
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-200">
          <h3 className="text-md font-bold text-slate-900 mb-4">Offers for {isAdditional ? `Itinerary ${index + 1}` : 'this Itinerary'}</h3>
          <div className="space-y-4">
            {(itineraryOffers[index] || []).map((offer, offerIdx) => (
              <div key={offer.id} className="relative border border-slate-200 rounded-lg p-4 bg-slate-50">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-slate-800">Option {offerIdx + 1}</h4>
                  {(itineraryOffers[index] || []).length > 1 && (
                    <button 
                      onClick={() => removeOffer(index, offer.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                      title="Remove Option"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Total Price / Mod Cost</label>
                    <input 
                      type="text" 
                      value={offer.totalPrice} 
                      onChange={e => updateOffer(index, offer.id, 'totalPrice', e.target.value)} 
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b87c] focus:border-transparent bg-white" 
                      placeholder="e.g. € 1,250.00" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Baggage</label>
                    <input 
                      type="text" 
                      value={offer.baggage} 
                      onChange={e => updateOffer(index, offer.id, 'baggage', e.target.value)} 
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b87c] focus:border-transparent bg-white" 
                      placeholder={language === 'fr' ? "ex: 1x 23kg inclus" : "e.g. 1x 23kg included"} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Changes</label>
                    <div className="flex flex-col gap-2">
                      <select 
                        value={offer.changesOption} 
                        onChange={e => updateOffer(index, offer.id, 'changesOption', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b87c] focus:border-transparent bg-white"
                      >
                        <option value="fee">Fee + Fare difference</option>
                        <option value="free">Free + Fare difference</option>
                      </select>
                      {offer.changesOption === 'fee' && (
                        <input 
                          type="text" 
                          value={offer.changesFee} 
                          onChange={e => updateOffer(index, offer.id, 'changesFee', e.target.value)} 
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b87c] focus:border-transparent bg-white" 
                          placeholder={language === 'fr' ? "Montant (ex: 150€)" : "Amount (e.g. €150)"} 
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Refundability</label>
                    <div className="flex flex-col gap-2">
                      <select 
                        value={offer.refundabilityOption} 
                        onChange={e => updateOffer(index, offer.id, 'refundabilityOption', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b87c] focus:border-transparent bg-white"
                      >
                        <option value="non_refundable">Non Refundable</option>
                        <option value="fully_refundable">Fully Refundable</option>
                        <option value="refundable_fee">Refundable against a fee</option>
                      </select>
                      {offer.refundabilityOption === 'refundable_fee' && (
                        <input 
                          type="text" 
                          value={offer.refundabilityFee} 
                          onChange={e => updateOffer(index, offer.id, 'refundabilityFee', e.target.value)} 
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b87c] focus:border-transparent bg-white" 
                          placeholder={language === 'fr' ? "Montant (ex: 150€)" : "Amount (e.g. €150)"} 
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <button 
              onClick={() => addOffer(index)}
              className="flex items-center gap-1 text-sm font-medium text-[#00b87c] hover:text-[#009866] transition-colors py-2"
            >
              <Plus className="w-4 h-4" /> Add another option
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-6xl mx-auto"
    >
      {/* Draft Offer Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-900">Draft Email Options</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Language:</label>
            <select 
              value={language} 
              onChange={e => setLanguage(e.target.value as 'en' | 'fr')}
              className="border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b87c] focus:border-transparent bg-white"
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Customer Name</label>
            <input 
              type="text" 
              value={customerName} 
              onChange={e => setCustomerName(e.target.value)} 
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b87c] focus:border-transparent" 
              placeholder="e.g. John Doe" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Traveller Name(s)</label>
            <input 
              type="text" 
              value={travellerName} 
              onChange={e => setTravellerName(e.target.value)} 
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b87c] focus:border-transparent" 
              placeholder="e.g. Jane Doe" 
            />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button 
            onClick={() => handleCopy('modification')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            {copiedMod ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedMod ? 'Modification Copied!' : 'Copy Modification Email'}
          </button>
          <button 
            onClick={() => handleCopy('offer')}
            className="flex items-center gap-2 bg-[#00b87c] hover:bg-[#009866] text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            {copiedOffer ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedOffer ? 'Offer Copied!' : 'Copy Offer Email'}
          </button>
        </div>
      </div>

      {/* Top Bar matching screenshot */}
      <div className="bg-[#242424] rounded-t-xl p-3 flex justify-between items-center text-white">
        <div className="flex items-center gap-4 text-sm px-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>{data.flights.length > 0 ? `${data.flights[0].departureDate} - ${data.flights[0].airline}` : 'Flight Itinerary'}</span>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-gray-400">Booking Ref:</span>
             <span className="font-mono text-yellow-400">{data.bookingReference}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleCopy('itinerary')}
            className="flex items-center gap-2 bg-[#00b87c] hover:bg-[#009866] text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Itinerary Only'}
          </button>
          <button className="bg-[#1f3d32] text-[#00b87c] hover:bg-[#162b23] px-4 py-1.5 rounded-full text-sm font-medium transition-colors">
            Download PDF
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div ref={tableRef}>
        {renderItineraryTable(data, 0)}
        {additionalItineraries.map((itinerary, idx) => renderItineraryTable(itinerary, idx + 1, true))}
        
        <div className="mt-6">
          {!isAddingItinerary ? (
            <button 
              onClick={() => setIsAddingItinerary(true)}
              className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors py-3 px-6 border-2 border-dashed border-indigo-200 rounded-xl hover:bg-indigo-50 w-full justify-center"
            >
              <Plus className="w-5 h-5" /> Add another itinerary
            </button>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-indigo-200 p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Add Additional Itinerary</h3>
              <textarea
                value={newPnrRaw}
                onChange={(e) => setNewPnrRaw(e.target.value)}
                placeholder="Paste another Amadeus, Sabre, or Galileo PNR here..."
                className="w-full h-32 p-3 text-sm font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none outline-none mb-3"
                spellCheck={false}
              />
              {pnrError && (
                <div className="mb-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                  {pnrError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleAddItinerary}
                  disabled={!newPnrRaw.trim() || isParsingPnr}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  {isParsingPnr ? <><Loader2 className="w-4 h-4 animate-spin" /> Parsing...</> : 'Add Itinerary'}
                </button>
                <button
                  onClick={() => {
                    setIsAddingItinerary(false);
                    setNewPnrRaw('');
                    setPnrError(null);
                  }}
                  className="text-sm font-medium text-slate-600 hover:text-slate-800 py-2 px-4"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
