import { Copy, Check, FileText, Plus, Trash2, Loader2, Train } from 'lucide-react';
import { ParsedPNR, TrainSegment, FlightSegment } from '../types';
import { motion } from 'motion/react';
import { useState, useRef, useEffect } from 'react';
import { parsePNR } from '../services/geminiService';

type OfferOption = {
  id: string;
  totalPrice: string;
  cabin: string;
  baggage: string;
  changesOption: 'fee' | 'free';
  changesFee: string;
  refundabilityOption: 'non_refundable' | 'fully_refundable' | 'refundable_fee';
  refundabilityFee: string;
};

const getIntroSentence = (language: 'en' | 'fr', type: 'offer' | 'modification', hasFlights: boolean, hasTrains: boolean, totalOffers: number, variantIndex: number) => {
  const isMultiple = totalOffers > 1;
  
  if (type === 'modification') {
    if (language === 'fr') {
      const variants = [
        `Veuillez trouver ci-dessous votre nouvel itinéraire proposé ainsi que le coût de la modification :`,
        `Voici les détails de votre nouvel itinéraire et le coût associé à cette modification :`,
        `Veuillez examiner la proposition de modification ci-dessous, incluant les nouveaux horaires et les frais applicables :`,
        `Comme demandé, voici les détails de la modification de votre voyage et le tarif correspondant :`
      ];
      return variants[variantIndex % variants.length];
    } else {
      const variants = [
        `Please review the proposed new itinerary and the cost to make this change:`,
        `Here are the details for your updated itinerary along with the modification cost:`,
        `Please find below the proposed changes to your journey and the associated fees:`,
        `As requested, here is the modified itinerary and the applicable fare difference:`
      ];
      return variants[variantIndex % variants.length];
    }
  }

  let productEn = 'travel';
  let productFr = 'voyage';
  if (hasFlights && hasTrains) {
    productEn = 'flight and train';
    productFr = 'vol et de train';
  } else if (hasFlights) {
    productEn = 'flight';
    productFr = 'vol';
  } else if (hasTrains) {
    productEn = 'train';
    productFr = 'train';
  }

  if (language === 'fr') {
    const offerWord = isMultiple ? 'propositions' : 'proposition';
    const optionWord = isMultiple ? 'options' : 'option';
    const variants = [
      `Veuillez trouver ci-dessous notre ${offerWord} de ${productFr} :`,
      `Voici ${isMultiple ? 'les' : 'la'} ${optionWord} de ${productFr} que nous avons trouvée${isMultiple ? 's' : ''} pour vous :`,
      `Nous avons le plaisir de vous soumettre ${isMultiple ? 'ces' : 'cette'} ${offerWord} de ${productFr} pour votre prochain voyage :`,
      `Comme convenu, veuillez examiner ${isMultiple ? 'les' : 'la'} ${optionWord} de ${productFr} ci-dessous :`
    ];
    return variants[variantIndex % variants.length];
  } else {
    const offerWord = isMultiple ? 'offers' : 'offer';
    const optionWord = isMultiple ? 'options' : 'option';
    const variants = [
      `Please review the following ${productEn} ${offerWord}:`,
      `Here ${isMultiple ? 'are' : 'is'} the ${productEn} ${optionWord} we have put together for your trip:`,
      `We are pleased to provide the following ${productEn} ${offerWord} for your review:`,
      `As requested, please find below the ${productEn} ${optionWord} for your upcoming journey:`
    ];
    return variants[variantIndex % variants.length];
  }
};

const getOutroSentence = (language: 'en' | 'fr', type: 'offer' | 'modification', totalOffers: number, variantIndex: number) => {
  const isMultiple = totalOffers > 1;

  if (type === 'modification') {
    if (language === 'fr') {
      const variants = [
        `Merci de nous confirmer si vous souhaitez procéder à cette modification.`,
        `N'hésitez pas à nous faire savoir si cette modification vous convient.`,
        `Dans l'attente de votre confirmation pour valider ces changements.`,
        `Veuillez nous indiquer si nous pouvons finaliser cette modification pour vous.`
      ];
      return variants[variantIndex % variants.length];
    } else {
      const variants = [
        `Please confirm if you would like to proceed with this change.`,
        `Let us know if this updated itinerary works for you.`,
        `We look forward to your confirmation to finalize these changes.`,
        `Please advise if we should go ahead and process this modification.`
      ];
      return variants[variantIndex % variants.length];
    }
  }

  if (language === 'fr') {
    const variants = isMultiple ? [
      `Merci de nous indiquer quelle option vous convient le mieux, ou si vous souhaitez d'autres ajustements.`,
      `Faites-nous savoir laquelle de ces propositions a votre préférence.`,
      `Nous restons à votre disposition pour affiner ces options selon vos besoins.`,
      `Dans l'attente de votre retour pour réserver l'option de votre choix.`
    ] : [
      `Merci de nous indiquer si cette proposition vous convient, ou si vous souhaitez d'autres ajustements.`,
      `Faites-nous savoir si cette option répond à vos attentes.`,
      `Nous restons à votre disposition pour affiner cette proposition selon vos besoins.`,
      `Dans l'attente de votre retour pour procéder à la réservation.`
    ];
    return variants[variantIndex % variants.length];
  } else {
    const variants = isMultiple ? [
      `Please let us know which of these options works best for you, or if you need any further adjustments.`,
      `Kindly advise which offer you prefer so we can proceed with the booking.`,
      `We remain at your disposal should you wish to explore other alternatives.`,
      `Looking forward to hearing which option suits your travel plans.`
    ] : [
      `Please let us know if you would like to confirm this offer or if you need any further adjustments.`,
      `Kindly advise if this option works for you so we can proceed with the booking.`,
      `We remain at your disposal should you wish to explore other alternatives.`,
      `Looking forward to your confirmation to secure this itinerary.`
    ];
    return variants[variantIndex % variants.length];
  }
};

export function ItineraryView({ data }: { data: ParsedPNR }) {
  const [primaryItinerary, setPrimaryItinerary] = useState<ParsedPNR>(data);
  useEffect(() => {
    setPrimaryItinerary(data);
  }, [data]);

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
    cabin: '',
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

  const handleBookingRefChange = (index: number, val: string) => {
    if (index === 0) {
      setPrimaryItinerary(prev => ({ ...prev, bookingReference: val }));
    } else {
      setAdditionalItineraries(prev => {
        const newItin = [...prev];
        newItin[index - 1] = { ...newItin[index - 1], bookingReference: val };
        return newItin;
      });
    }
  };

  const handleTrainTarifChange = (itineraryIndex: number, trainIndex: number, newTarif: string) => {
    if (itineraryIndex === 0) {
      setPrimaryItinerary(prev => {
        const newTrains = [...(prev.trains || [])];
        newTrains[trainIndex] = { ...newTrains[trainIndex], tarif: newTarif };
        return { ...prev, trains: newTrains };
      });
    } else {
      setAdditionalItineraries(prev => {
        const newItineraries = [...prev];
        const newTrains = [...(newItineraries[itineraryIndex - 1].trains || [])];
        newTrains[trainIndex] = { ...newTrains[trainIndex], tarif: newTarif };
        newItineraries[itineraryIndex - 1] = { ...newItineraries[itineraryIndex - 1], trains: newTrains };
        return newItineraries;
      });
    }
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
    } catch (err: any) {
      console.error(err);
      setPnrError(`Error: ${err.message || 'Failed to parse PNR. Please check the text and try again.'}`);
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
  const allItineraries = [primaryItinerary, ...additionalItineraries];
  
  const getRouteTitle = (itinerary: ParsedPNR) => {
    const flights = itinerary.flights || [];
    const trains = itinerary.trains || [];
    
    if (flights.length > 0) {
      const routeCities = flights.map(f => f.departureCity || f.departureAirportCode);
      routeCities.push(flights[flights.length - 1].arrivalCity || flights[flights.length - 1].arrivalAirportCode);
      return routeCities.join(' → ');
    } else if (trains.length > 0) {
      const routeCities = trains.map(t => t.departureStation);
      routeCities.push(trains[trains.length - 1].arrivalStation);
      return routeCities.join(' → ');
    }
    return 'Unknown Route';
  };

  const routeTitle = getRouteTitle(primaryItinerary);

  const getSegmentPrefix = (idx: number, total: number, isTrain: boolean = false) => {
    if (idx === 0) return isTrain ? "Aller: " : "Outbound: ";
    if (idx === total - 1 && total > 1) return isTrain ? "Retour: " : "Return: ";
    return `Segment ${idx + 1}: `;
  };

  type FlightBound = {
    type: string;
    flights: FlightSegment[];
    departureCity: string;
    arrivalCity: string;
    totalDuration: string;
  };

  const groupFlightsIntoBounds = (flights: FlightSegment[]): FlightBound[] => {
    if (!flights || flights.length === 0) return [];
    const bounds: FlightBound[] = [];
    let currentBound: FlightSegment[] = [flights[0]];

    for (let i = 1; i < flights.length; i++) {
      const prev = flights[i - 1];
      const curr = flights[i];
      const first = flights[0];

      const departsFromPrevArrival = 
        (curr.departureAirportCode && curr.departureAirportCode === prev.arrivalAirportCode) ||
        (curr.departureCity && curr.departureCity === prev.arrivalCity);
        
      const arrivesAtOriginalDeparture = 
        (curr.arrivalAirportCode && curr.arrivalAirportCode === first.departureAirportCode) ||
        (curr.arrivalCity && curr.arrivalCity === first.departureCity);

      if (departsFromPrevArrival && !arrivesAtOriginalDeparture) {
        currentBound.push(curr);
      } else {
        bounds.push({ type: '', flights: currentBound, departureCity: '', arrivalCity: '', totalDuration: '' });
        currentBound = [curr];
      }
    }
    if (currentBound.length > 0) {
      bounds.push({ type: '', flights: currentBound, departureCity: '', arrivalCity: '', totalDuration: '' });
    }

    return bounds.map((b, idx) => {
      let typeStr = `Segment ${idx + 1}`;
      if (idx === 0) typeStr = 'Outbound';
      else if (idx === bounds.length - 1 && bounds.length > 1) typeStr = 'Return';

      const firstF = b.flights[0];
      const lastF = b.flights[b.flights.length - 1];
      const depCity = firstF.departureCity || firstF.departureAirportCode;
      const arrCity = lastF.arrivalCity || lastF.arrivalAirportCode;

      let totalMins = 0;
      let durationStr = '';
      b.flights.forEach(f => {
        const hm = (f.duration || '').match(/(\d+)\s*h/i);
        const mm = (f.duration || '').match(/(\d+)\s*m/i);
        if (hm) totalMins += parseInt(hm[1], 10) * 60;
        if (mm) totalMins += parseInt(mm[1], 10);
        
        const hl = (f.layover || '').match(/(\d+)\s*h/i);
        const ml = (f.layover || '').match(/(\d+)\s*m/i);
        if (hl) totalMins += parseInt(hl[1], 10) * 60;
        if (ml) totalMins += parseInt(ml[1], 10);
      });
      if (totalMins > 0) {
         const h = Math.floor(totalMins / 60);
         const m = totalMins % 60;
         durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
      }

      return {
        type: typeStr,
        flights: b.flights,
        departureCity: depCity,
        arrivalCity: arrCity,
        totalDuration: durationStr
      };
    });
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

  const generateEmailHtml = (type: 'itinerary' | 'offer' | 'modification' = 'itinerary', variantIndex: number = 0) => {
    let html = `<div style="font-family: Arial, sans-serif; font-weight: normal; color: #000; max-width: 1000px; line-height: 1.5;">`;
    
    const totalOffers = Object.values(itineraryOffers).reduce((acc, offers) => acc + offers.length, 0);
    const hasFlights = allItineraries.some(it => it.flights && it.flights.length > 0);
    const hasTrains = allItineraries.some(it => it.trains && it.trains.length > 0);

    if (type === 'offer' || type === 'modification') {
      if (language === 'fr') {
        html += `<p style="margin-bottom: 16px; font-weight: normal;">Bonjour ${customerName || ''},</p>`;
        html += `<p style="margin-bottom: 24px; font-weight: normal;">Merci de nous avoir contactés.</p>`;
        const refStr = primaryItinerary.bookingReference && primaryItinerary.bookingReference !== 'UNKNOWN' ? primaryItinerary.bookingReference : '';
        if (allItineraries.length === 1 && refStr) {
          html += `<p style="margin-bottom: 24px; font-weight: normal;">Référence de réservation : <strong style="color: #000; font-size: 16px;">${refStr}</strong></p>`;
        }
        html += `<p style="margin-bottom: 24px; font-weight: normal;">${getIntroSentence('fr', type, hasFlights, hasTrains, totalOffers, variantIndex)}</p>`;
        if (travellerName) {
          html += `<p style="margin-bottom: 24px; font-weight: normal;"><strong>Passager :</strong> ${travellerName}</p>`;
        }
      } else {
        html += `<p style="margin-bottom: 16px; font-weight: normal;">Dear ${customerName || '(name)'},</p>`;
        html += `<p style="margin-bottom: 24px; font-weight: normal;">Thank you for reaching out.</p>`;
        const refStr = primaryItinerary.bookingReference && primaryItinerary.bookingReference !== 'UNKNOWN' ? primaryItinerary.bookingReference : '';
        if (allItineraries.length === 1 && refStr) {
          html += `<p style="margin-bottom: 24px; font-weight: normal;">Booking Ref: <strong style="color: #000; font-size: 16px;">${refStr}</strong></p>`;
        }
        html += `<p style="margin-bottom: 24px; font-weight: normal;">${getIntroSentence('en', type, hasFlights, hasTrains, totalOffers, variantIndex)}</p>`;
        if (travellerName) {
          html += `<p style="margin-bottom: 24px; font-weight: normal;"><strong>Traveller:</strong> ${travellerName}</p>`;
        }
      }
    }

    if (type === 'itinerary') {
      html += `<h2 style="font-size: 16px; font-weight: bold; margin-bottom: 24px;">Flight Itinerary: ${routeTitle}</h2>`;
    }

    allItineraries.forEach((itinerary, itIdx) => {
      const hasBookingRef = itinerary.bookingReference && itinerary.bookingReference.trim() !== '' && itinerary.bookingReference !== 'UNKNOWN';
      if (allItineraries.length > 1) {
        html += `<h3 style="font-size: 15px; font-weight: bold; margin-bottom: ${hasBookingRef ? '8px' : '24px'}; color: #334155;">Itinerary ${itIdx + 1}</h3>`;
        if (hasBookingRef) {
          const refLabel = language === 'fr' ? 'Réf de dossier :' : 'Booking Ref:';
          html += `<p style="margin-bottom: 24px; font-size: 14px; color: #475569; font-weight: normal;"><strong>${refLabel}</strong> <strong style="font-family: monospace; color: #000; font-size: 16px;">${itinerary.bookingReference}</strong></p>`;
        }
      }
      
      const flights = itinerary.flights || [];
      const trains = itinerary.trains || [];

      const flightBounds = groupFlightsIntoBounds(flights);
      flightBounds.forEach((bound) => {
        const titleName = language === 'fr' ? (bound.type === 'Outbound' ? 'Aller' : bound.type === 'Return' ? 'Retour' : bound.type) : bound.type;

        html += `
        <div style="margin-bottom: 32px;">
          <div style="margin-bottom: 12px; font-size: 15px;">
            <span style="font-weight: bold; text-decoration: underline;">${titleName}: ${bound.departureCity} &rarr; ${bound.arrivalCity}</span>
            ${bound.totalDuration ? `<span style="margin-left: 12px; font-weight: normal; color: #334155;">${bound.totalDuration}</span>` : ''}
          </div>
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border: none; width: 100%; border-collapse: collapse; font-size: 14px; text-align: left; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
            <thead>
              <tr style="background-color: #f8fafc;" bgcolor="#f8fafc">
                <th align="left" style="text-align: left; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-left: none; border-right: none; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 10%;">Date</th>
                <th align="left" style="text-align: left; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-left: none; border-right: none; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 8%;">Flight</th>
                <th align="left" style="text-align: left; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-left: none; border-right: none; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 12%;">Carrier</th>
                <th align="left" style="text-align: left; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-left: none; border-right: none; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 22%;">Departs</th>
                <th align="left" style="text-align: left; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-left: none; border-right: none; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 22%;">Arrives</th>
                <th align="left" style="text-align: left; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-left: none; border-right: none; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 8%;">Cabin</th>
                <th align="left" style="text-align: left; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-left: none; border-right: none; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 8%;">Duration</th>
                <th align="left" style="text-align: left; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-left: none; border-right: none; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 6%;">Layover</th>
              </tr>
            </thead>
            <tbody>
        `;
        
        bound.flights.forEach((flight) => {
          html += `
              <tr>
                <td align="left" style="text-align: left; padding: 16px 12px; border-bottom: 1px solid #e2e8f0; border-top: none; border-left: none; border-right: none; vertical-align: top;">${flight.departureDate || '-'}</td>
                <td align="left" style="text-align: left; padding: 16px 12px; border-bottom: 1px solid #e2e8f0; border-top: none; border-left: none; border-right: none; vertical-align: top;">${flight.flightNumber || '-'}</td>
                <td align="left" style="text-align: left; padding: 16px 12px; border-bottom: 1px solid #e2e8f0; border-top: none; border-left: none; border-right: none; vertical-align: top;">
                  ${flight.flightNumber && flight.flightNumber.includes(' ') && flight.flightNumber.split(' ')[0].length === 2 ? 
                    `<img src="https://raw.githubusercontent.com/Keiji93/PNR-DECODER/main/public/airlines-logos/${flight.flightNumber.split(' ')[0].toUpperCase()}.png" alt="${flight.airline}" width="68" style="max-width: 68px; height: auto; display: block; margin-bottom: 6px; background-color: white; border-radius: 4px; padding: 2px;" onerror="this.style.display='none'" />` : ''}
                  <div style="font-weight: bold; font-size: 11px; font-style: italic; color: #64748b;">${flight.airline || '-'}</div>
                </td>
                <td align="left" style="text-align: left; padding: 16px 12px; border-bottom: 1px solid #e2e8f0; border-top: none; border-left: none; border-right: none; vertical-align: top;">
                  <div style="color: #334155;">${flight.departureAirportName || flight.departureAirportCode} (${flight.departureAirportCode})</div>
                  <div style="font-weight: bold; margin-top: 4px;">${flight.departureTime || '-'}</div>
                </td>
                <td align="left" style="text-align: left; padding: 16px 12px; border-bottom: 1px solid #e2e8f0; border-top: none; border-left: none; border-right: none; vertical-align: top;">
                  <div style="color: #334155;">${flight.arrivalAirportName || flight.arrivalAirportCode} (${flight.arrivalAirportCode})</div>
                  <div style="font-weight: bold; margin-top: 4px;">${flight.arrivalTime || '-'}</div>
                </td>
                <td align="left" style="text-align: left; padding: 16px 12px; border-bottom: 1px solid #e2e8f0; border-top: none; border-left: none; border-right: none; vertical-align: top; color: #475569;">${flight.cabinClass || '-'}</td>
                <td align="left" style="text-align: left; padding: 16px 12px; border-bottom: 1px solid #e2e8f0; border-top: none; border-left: none; border-right: none; vertical-align: top; color: #475569;">
                  <div>${flight.duration || '-'}</div>
                  ${flight.stops && flight.stops !== '0' && flight.stops !== '-' ? `<div style="font-size: 11px; color: #ea580c; margin-top: 4px; font-weight: bold; text-transform: uppercase;">${flight.stops} Stop${flight.stops === '1' ? '' : 's'}</div>` : ''}
                </td>
                <td align="left" style="text-align: left; padding: 16px 12px; border-bottom: 1px solid #e2e8f0; border-top: none; border-left: none; border-right: none; vertical-align: top; color: #475569;">${flight.layover || '-'}</td>
              </tr>
          `;
        });

        html += `
            </tbody>
          </table>
        </div>
        `;
      });

      trains.forEach((train, idx) => {
        const prefix = getSegmentPrefix(idx, trains.length, true);
        const dep = train.departureStation;
        const arr = train.arrivalStation;

        html += `
        <div style="margin-bottom: 32px;">
          <div style="margin-bottom: 8px; font-size: 15px;">
            <span style="font-weight: bold; text-decoration: underline;">${prefix}${dep} &rarr; ${arr}</span>
          </div>
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border: none; width: 100%; border-collapse: collapse; font-size: 14px; text-align: left; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
            <thead>
              <tr style="background-color: #f8fafc;" bgcolor="#f8fafc">
                <th align="left" style="text-align: left; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-left: none; border-right: none; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 10%;">Date</th>
                <th align="left" style="text-align: left; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-left: none; border-right: none; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 10%;">Train</th>
                <th align="left" style="text-align: left; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-left: none; border-right: none; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 20%;">Départ</th>
                <th align="left" style="text-align: left; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-left: none; border-right: none; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 20%;">Arrivée</th>
                <th align="left" style="text-align: left; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-left: none; border-right: none; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 10%;">Classe</th>
                <th align="left" style="text-align: left; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-left: none; border-right: none; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 10%;">Tarif</th>
                <th align="left" style="text-align: left; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-left: none; border-right: none; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 10%;">Transfert</th>
                <th align="left" style="text-align: left; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-left: none; border-right: none; padding: 8px 12px; font-weight: normal; color: #1e293b; width: 10%;">Durée</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td align="left" style="text-align: left; padding: 16px 12px; border-bottom: 1px solid #e2e8f0; border-top: none; border-left: none; border-right: none; vertical-align: top;">${train.date || '-'}</td>
                <td align="left" style="text-align: left; padding: 16px 12px; border-bottom: 1px solid #e2e8f0; border-top: none; border-left: none; border-right: none; vertical-align: top;">${train.trainNumber || '-'}</td>
                <td align="left" style="text-align: left; padding: 16px 12px; border-bottom: 1px solid #e2e8f0; border-top: none; border-left: none; border-right: none; vertical-align: top;">
                  <div style="color: #334155;">${train.departureStation}</div>
                  <div style="font-weight: bold; margin-top: 4px;">${train.departureTime || '-'}</div>
                </td>
                <td align="left" style="text-align: left; padding: 16px 12px; border-bottom: 1px solid #e2e8f0; border-top: none; border-left: none; border-right: none; vertical-align: top;">
                  <div style="color: #334155;">${train.arrivalStation}</div>
                  <div style="font-weight: bold; margin-top: 4px;">${train.arrivalTime || '-'}</div>
                </td>
                <td align="left" style="text-align: left; padding: 16px 12px; border-bottom: 1px solid #e2e8f0; border-top: none; border-left: none; border-right: none; vertical-align: top; color: #475569;">${train.cabinClass || '-'}</td>
                <td align="left" style="text-align: left; padding: 16px 12px; border-bottom: 1px solid #e2e8f0; border-top: none; border-left: none; border-right: none; vertical-align: top; color: #475569;">${train.tarif || '-'}</td>
                <td align="left" style="text-align: left; padding: 16px 12px; border-bottom: 1px solid #e2e8f0; border-top: none; border-left: none; border-right: none; vertical-align: top; color: #475569;">${train.transfer || 'Direct'}</td>
                <td align="left" style="text-align: left; padding: 16px 12px; border-bottom: 1px solid #e2e8f0; border-top: none; border-left: none; border-right: none; vertical-align: top; color: #475569;">${train.duration || '-'}</td>
              </tr>
            </tbody>
          </table>
          ${train.price ? `<div style="margin-top: 12px; text-align: right; font-size: 14px; font-weight: bold; color: #0f172a;">Prix : ${train.price}</div>` : ''}
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
              if (offer.cabin) {
                html += `    <li><strong>Cabine :</strong> ${offer.cabin}</li>`;
              }
              html += `    <li><strong>Bagages :</strong> ${offer.baggage || 'Non spécifié'}</li>`;
              html += `    <li><strong>Modifications :</strong> ${getChangesText('fr', offer)}</li>`;
              html += `    <li><strong>Annulation :</strong> ${getRefundabilityText('fr', offer)}</li>`;
              html += `  </ul>`;
            } else {
              const priceLabel = type === 'modification' ? 'Modification Cost:' : 'Price:';
              html += `  <p style="margin-bottom: 16px;"><strong>${priceLabel}</strong> ${offer.totalPrice || 'TBD'}</p>`;
              html += `  <p style="margin-bottom: 8px;"><strong>Fare conditions:</strong></p>`;
              html += `  <ul style="margin-top: 0; margin-bottom: 0; padding-left: 20px;">`;
              if (offer.cabin) {
                html += `    <li><strong>Cabin:</strong> ${offer.cabin}</li>`;
              }
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
        html += `  <p style="margin-bottom: 16px; font-weight: normal;">${getOutroSentence('fr', type, totalOffers, variantIndex)}</p>`;
        html += `  <p style="margin-bottom: 0; font-weight: normal;">Cordialement,</p>`;
      } else {
        html += `  <p style="margin-bottom: 16px; font-weight: normal;">${getOutroSentence('en', type, totalOffers, variantIndex)}</p>`;
        html += `  <p style="margin-bottom: 0; font-weight: normal;">Kind regards,</p>`;
      }
    }

    html += `</div>`;
    return html;
  };

  const generatePlainText = (type: 'itinerary' | 'offer' | 'modification' = 'itinerary', variantIndex: number = 0) => {
    let text = '';
    
    const totalOffers = Object.values(itineraryOffers).reduce((acc, offers) => acc + offers.length, 0);
    const hasFlights = allItineraries.some(it => it.flights && it.flights.length > 0);
    const hasTrains = allItineraries.some(it => it.trains && it.trains.length > 0);

    if (type === 'offer' || type === 'modification') {
      if (language === 'fr') {
        text += `Bonjour ${customerName || ''},\n\n`;
        text += `Merci de nous avoir contactés.\n\n`;
        const refStr = primaryItinerary.bookingReference && primaryItinerary.bookingReference !== 'UNKNOWN' ? primaryItinerary.bookingReference : '';
        if (allItineraries.length === 1 && refStr) {
          text += `Référence de réservation : ${refStr}\n\n`;
        }
        text += `${getIntroSentence('fr', type, hasFlights, hasTrains, totalOffers, variantIndex)}\n\n`;
        if (travellerName) {
          text += `Passager : ${travellerName}\n\n`;
        }
      } else {
        text += `Dear ${customerName || '(name)'},\n\n`;
        text += `Thank you for reaching out.\n\n`;
        const refStr = primaryItinerary.bookingReference && primaryItinerary.bookingReference !== 'UNKNOWN' ? primaryItinerary.bookingReference : '';
        if (allItineraries.length === 1 && refStr) {
          text += `Booking Ref: ${refStr}\n\n`;
        }
        text += `${getIntroSentence('en', type, hasFlights, hasTrains, totalOffers, variantIndex)}\n\n`;
        if (travellerName) {
          text += `Traveller: ${travellerName}\n\n`;
        }
      }
    } else {
      text += `Flight Itinerary: ${routeTitle}\n\n`;
    }

    allItineraries.forEach((itinerary, itIdx) => {
      const hasBookingRef = itinerary.bookingReference && itinerary.bookingReference.trim() !== '' && itinerary.bookingReference !== 'UNKNOWN';
      if (allItineraries.length > 1) {
        text += `--- Itinerary ${itIdx + 1} ---\n`;
        if (hasBookingRef) {
          const refLabel = language === 'fr' ? 'Réf de dossier :' : 'Booking Ref:';
          text += `${refLabel} ${itinerary.bookingReference}\n`;
        }
        text += `\n`;
      }
      
      const flights = itinerary.flights || [];
      const flightBounds = groupFlightsIntoBounds(flights);
      flightBounds.forEach((bound) => {
        const titleName = language === 'fr' ? (bound.type === 'Outbound' ? 'Aller' : bound.type === 'Return' ? 'Retour' : bound.type) : bound.type;
        text += `${titleName}: ${bound.departureCity} -> ${bound.arrivalCity}   ${bound.totalDuration}\n`;
        text += `Date\tFlight\tCarrier\tDeparts\tArrives\tCabin\tDuration\tLayover\n`;
        bound.flights.forEach((flight) => {
          const stopsText = flight.stops && flight.stops !== '0' && flight.stops !== '-' ? ` (${flight.stops} Stop${flight.stops === '1' ? '' : 's'})` : '';
          text += `${flight.departureDate || '-'}\t${flight.flightNumber || '-'}\t${flight.airline || '-'}\t${flight.departureAirportCode} ${flight.departureTime}\t${flight.arrivalAirportCode} ${flight.arrivalTime}\t${flight.cabinClass || '-'}\t${flight.duration || '-'}${stopsText}\t${flight.layover || '-'}\n`;
        });
        text += `\n`;
      });

      const trains = itinerary.trains || [];

      trains.forEach((train, idx) => {
        const prefix = getSegmentPrefix(idx, trains.length, true);
        const dep = train.departureStation;
        const arr = train.arrivalStation;

        text += `${prefix}${dep} -> ${arr}\n`;
        text += `Date\tTrain\tDépart\tArrivée\tClasse\tTarif\tTransfert\tDurée\n`;
        text += `${train.date || '-'}\t${train.trainNumber || '-'}\t${train.departureStation} ${train.departureTime || '-'}\t${train.arrivalStation} ${train.arrivalTime || '-'}\t${train.cabinClass || '-'}\t${train.tarif || '-'}\t${train.transfer || 'Direct'}\t${train.duration || '-'}\n`;
        if (train.price) text += `Prix : ${train.price}\n`;
        text += `\n`;
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
            if (offer.cabin) {
              text += `- Cabine : ${offer.cabin}\n`;
            }
            text += `- Bagages : ${offer.baggage || 'Non spécifié'}\n`;
            text += `- Modifications : ${getChangesText('fr', offer)}\n`;
            text += `- Annulation : ${getRefundabilityText('fr', offer)}\n\n`;
          } else {
            const priceLabel = type === 'modification' ? 'Modification Cost:' : 'Price:';
            text += `${priceLabel} ${offer.totalPrice || 'TBD'}\n\n`;
            text += `Fare conditions:\n`;
            if (offer.cabin) {
              text += `- Cabin: ${offer.cabin}\n`;
            }
            text += `- Baggage: ${offer.baggage || 'Not specified'}\n`;
            text += `- Changes: ${getChangesText('en', offer)}\n`;
            text += `- Cancellation: ${getRefundabilityText('en', offer)}\n\n`;
          }
        });
      }
    });

    if (type === 'offer' || type === 'modification') {
      if (language === 'fr') {
        text += `${getOutroSentence('fr', type, totalOffers, variantIndex)}\n\n`;
        text += `Cordialement,`;
      } else {
        text += `${getOutroSentence('en', type, totalOffers, variantIndex)}\n\n`;
        text += `Kind regards,`;
      }
    }

    return text;
  };

  const handleCopy = async (type: 'itinerary' | 'offer' | 'modification' = 'itinerary') => {
    try {
      const variantIndex = Math.floor(Math.random() * 4);
      const html = generateEmailHtml(type, variantIndex);
      const text = generatePlainText(type, variantIndex);
      
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
    const routeTitle = getRouteTitle(itinerary);
    const flights = itinerary.flights || [];
    const trains = itinerary.trains || [];

    return (
      <div key={index} className={`bg-white shadow-sm border border-slate-200 p-8 overflow-x-auto ${isAdditional ? 'rounded-xl mt-6' : 'rounded-b-xl'}`}>
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isAdditional ? `Itinerary ${index + 1}: ${routeTitle}` : `Itinerary: ${routeTitle}`}
            </h2>
            {(itinerary.passengers || []).length > 0 && (
              <p className="text-sm text-slate-600 mt-1">Passengers: {(itinerary.passengers || []).join(', ')}</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <label className="text-sm font-semibold text-slate-700">Booking Ref:</label>
              <input 
                type="text" 
                value={(!itinerary.bookingReference || itinerary.bookingReference === 'UNKNOWN') ? '' : itinerary.bookingReference} 
                onChange={(e) => handleBookingRefChange(index, e.target.value)}
                placeholder="Optional PNR" 
                className="w-32 border border-slate-300 rounded px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
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

        {groupFlightsIntoBounds(flights).map((bound, bIdx) => (
          <div key={`bound-${bIdx}`} className="mb-10 last:mb-0">
            <div className="flex items-baseline gap-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 underline decoration-slate-300 underline-offset-4">
                {bound.type}: {bound.departureCity} → {bound.arrivalCity}
              </h3>
              {bound.totalDuration && <span className="text-slate-800 font-medium">{bound.totalDuration}</span>}
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
                </tr>
              </thead>
              <tbody className="text-sm text-slate-900">
                {bound.flights.map((flight, fIdx) => (
                  <tr key={`flight-${bIdx}-${fIdx}`} className="border-b border-slate-100">
                    <td className="py-4 px-3 align-top">{flight.departureDate}</td>
                    <td className="py-4 px-3 align-top">{flight.flightNumber}</td>
                    <td className="py-4 px-3 align-top">
                      <div className="flex flex-col items-start gap-1">
                        {flight.flightNumber && flight.flightNumber.includes(' ') && flight.flightNumber.split(' ')[0].length === 2 && (
                          <img 
                            src={`/airlines-logos/${flight.flightNumber.split(' ')[0].toUpperCase()}.png`}
                            alt={flight.airline}
                            className="w-16 h-auto object-contain bg-white rounded shadow-sm p-1"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <span className="text-xs font-bold italic text-slate-500">{flight.airline}</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 align-top">
                      <div className="text-slate-700">{flight.departureAirportName || flight.departureAirportCode} ({flight.departureAirportCode})</div>
                      <div className="font-bold mt-1">{flight.departureTime}</div>
                    </td>
                    <td className="py-4 px-3 align-top">
                      <div className="text-slate-700">{flight.arrivalAirportName || flight.arrivalAirportCode} ({flight.arrivalAirportCode})</div>
                      <div className="font-bold mt-1">{flight.arrivalTime}</div>
                    </td>
                    <td className="py-4 px-3 align-top text-slate-600">{flight.cabinClass || '-'}</td>
                    <td className="py-4 px-3 align-top text-slate-600">
                      <div>{flight.duration || '-'}</div>
                      {flight.stops && flight.stops !== '0' && flight.stops !== '-' && (
                        <div className="text-[11px] text-orange-600 mt-1 font-bold uppercase tracking-wider">
                          {flight.stops} Stop{flight.stops === '1' ? '' : 's'}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-3 align-top text-slate-600">{flight.layover || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bound.flights.some(f => f.price) && (
              <div className="mt-4 flex justify-end">
                <span className="inline-block bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold text-slate-800">
                  Price: {bound.flights.map(f => f.price).filter(Boolean).join(' + ')}
                </span>
              </div>
            )}
          </div>
        ))}

        {trains.map((train, idx) => (
          <div key={`train-${idx}`} className="mb-10 last:mb-0">
            <div className="flex items-baseline gap-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 underline decoration-slate-300 underline-offset-4">
                {getSegmentPrefix(idx, trains.length, true)}{train.departureStation} → {train.arrivalStation}
              </h3>
            </div>
            
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-sm text-slate-800">
                  <th className="py-2 px-3 font-medium w-[10%]">Date</th>
                  <th className="py-2 px-3 font-medium w-[10%]">Train</th>
                  <th className="py-2 px-3 font-medium w-[20%]">Départ</th>
                  <th className="py-2 px-3 font-medium w-[20%]">Arrivée</th>
                  <th className="py-2 px-3 font-medium w-[10%]">Classe</th>
                  <th className="py-2 px-3 font-medium w-[10%]">Tarif</th>
                  <th className="py-2 px-3 font-medium w-[10%]">Transfert</th>
                  <th className="py-2 px-3 font-medium w-[10%]">Durée</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-900">
                <tr className="border-b border-slate-100">
                  <td className="py-4 px-3 align-top">{train.date}</td>
                  <td className="py-4 px-3 align-top">{train.trainNumber}</td>
                  <td className="py-4 px-3 align-top">
                    <div className="text-slate-700">{train.departureStation}</div>
                    <div className="font-bold mt-1">{train.departureTime}</div>
                  </td>
                  <td className="py-4 px-3 align-top">
                    <div className="text-slate-700">{train.arrivalStation}</div>
                    <div className="font-bold mt-1">{train.arrivalTime}</div>
                  </td>
                  <td className="py-4 px-3 align-top text-slate-600">{train.cabinClass || '-'}</td>
                  <td className="py-4 px-3 align-top text-slate-600">
                    <select 
                      value={train.tarif || ''} 
                      onChange={(e) => handleTrainTarifChange(index, idx, e.target.value)}
                      className="border border-slate-300 rounded px-2 py-1 text-sm bg-white"
                    >
                      <option value="">Select...</option>
                      <option value="Flexible">Flexible</option>
                      <option value="Semi-Flexible">Semi-Flexible</option>
                      <option value="Non-Flexible">Non-Flexible</option>
                      <option value="FLEX PREMIÈRE">FLEX PREMIÈRE</option>
                      <option value="STANDARD SECONDE">STANDARD SECONDE</option>
                    </select>
                  </td>
                  <td className="py-4 px-3 align-top text-slate-600">{train.transfer || 'Direct'}</td>
                  <td className="py-4 px-3 align-top text-slate-600">{train.duration || '-'}</td>
                </tr>
              </tbody>
            </table>
            {train.price && (
              <div className="mt-4 flex justify-end">
                <span className="inline-block bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold text-slate-800">
                  Prix : {train.price}
                </span>
              </div>
            )}
          </div>
        ))}
        
        {flights.length === 0 && trains.length === 0 && (
          <div className="text-center p-8 text-slate-500">
            No flight or train segments could be parsed.
          </div>
        )}

        {itinerary.priceBreakdown && (
          <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg max-w-sm ml-auto">
            <h4 className="text-sm font-bold text-slate-800 mb-3">Price Breakdown</h4>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Ticket:</span>
                <span className="font-medium text-slate-900">{itinerary.priceBreakdown.ticket || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span>Accommodation:</span>
                <span className="font-medium text-slate-900">{itinerary.priceBreakdown.accommodation || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span>Ancillary Services:</span>
                <span className="font-medium text-slate-900">{itinerary.priceBreakdown.ancillaryServices || '-'}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 mt-2">
                <span className="font-bold text-slate-800">Total Price:</span>
                <span className="font-bold text-slate-900">{itinerary.priceBreakdown.totalPrice || '-'}</span>
              </div>
            </div>
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
                <div className={`grid grid-cols-1 md:grid-cols-2 ${flights.length > 0 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
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
                  {flights.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Cabin</label>
                      <select 
                        value={offer.cabin} 
                        onChange={e => updateOffer(index, offer.id, 'cabin', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b87c] focus:border-transparent bg-white"
                      >
                        <option value="">Select...</option>
                        <option value="Business Full Flex">Business Full Flex</option>
                        <option value="Business Flex">Business Flex</option>
                        <option value="Business Semi Flex">Business Semi Flex</option>
                        <option value="Business Standard">Business Standard</option>
                        <option value="Premium Economy Full Flex">Premium Economy Full Flex</option>
                        <option value="Premium Economy Semi Flex">Premium Economy Semi Flex</option>
                        <option value="Premium Economy">Premium Economy</option>
                        <option value="Economy Full Flex">Economy Full Flex</option>
                        <option value="Economy Semi Flex">Economy Semi Flex</option>
                        <option value="Economy">Economy</option>
                      </select>
                    </div>
                  )}
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
            <span>{(data.flights || []).length > 0 ? `${data.flights![0].departureDate} - ${data.flights![0].airline}` : 'Flight Itinerary'}</span>
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
        {renderItineraryTable(primaryItinerary, 0)}
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
