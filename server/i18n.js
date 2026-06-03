/**
 * Server-side i18n for automated notifications (email subjects + SMS + WhatsApp).
 * ─────────────────────────────────────────────────────────────────────────────
 * Supported languages: en (English), sw (Swahili), fr (French), it (Italian), de (German)
 *
 * Resolution order when sending:
 *   1. Explicit `lang` on the booking/payment record
 *   2. `language` on the Client entity
 *   3. Accept-Language (server-side — rare, mostly for public endpoints)
 *   4. Default: 'en'
 *
 * How to use in a translation function:
 *   t('booking_received.subject', lang, { ref: 'ABC-001' })
 */

const DEFAULT_LANG = 'en';
const SUPPORTED    = ['en', 'sw', 'fr', 'it', 'de'];

function normaliseLang(lang) {
  if (!lang) return DEFAULT_LANG;
  const code = String(lang).toLowerCase().slice(0, 2);
  return SUPPORTED.includes(code) ? code : DEFAULT_LANG;
}

// Given an Accept-Language header, pick the best supported language.
function pickFromAcceptLanguage(headerValue) {
  if (!headerValue) return DEFAULT_LANG;
  const parts = String(headerValue).split(',').map(p => {
    const [tag, qRaw] = p.trim().split(';');
    const q = qRaw && /q=(\d*\.?\d+)/.test(qRaw) ? Number(RegExp.$1) : 1;
    return { code: tag.toLowerCase().slice(0, 2), q };
  }).sort((a, b) => b.q - a.q);
  for (const p of parts) if (SUPPORTED.includes(p.code)) return p.code;
  return DEFAULT_LANG;
}

// ── Message catalogue ────────────────────────────────────────────────────────
// Keys are scoped `area.key`. Values may contain {placeholders} filled in by t().
const MESSAGES = {
  en: {
    'email.booking_received.subject'  : 'Booking Received — {ref}',
    'email.booking_confirmed.subject' : 'Booking Confirmed ✅ — {ref}',
    'email.payment_receipt.subject'   : 'Payment Receipt — {ref}',
    'email.upcoming_trip.subject'     : 'Your Safari Starts in 7 Days! — {ref}',
    'email.booking_cancelled.subject' : 'Booking Cancellation Notice — {ref}',
    'email.invoice.subject'           : 'Invoice {ref}',
    'email.overdue.subject'           : '⚠️ Payment Overdue — Invoice {ref}',
    'email.quote.subject'             : 'Your Safari Quote {ref}',

    'email.greeting'                  : 'Dear {name}',
    'email.greeting_fallback'         : 'Valued Guest',
    'email.booking_received.title'    : 'Booking Received',
    'email.booking_confirmed.title'   : 'Booking Confirmed!',
    'email.booking_confirmed.sub'     : 'We look forward to welcoming you on your safari adventure.',
    'email.payment_received.title'    : 'Amount Received',
    'email.payment_thanks'            : 'Thank you for your payment.',
    'email.next_steps_title'          : 'What happens next?',
    'email.next_steps_body'           : 'Our team will contact you with your detailed itinerary, packing list, and all pre-departure information closer to your travel date.',
    'email.cta.pay_now'               : 'Pay Now',
    'email.cta.pay_balance'           : 'Pay Balance',
    'email.cta.accept_quote'          : 'Accept Quote & Pay Deposit',
    'email.valid_until'               : 'Valid until {date}',
    'email.label.booking_ref'         : 'Booking Reference',
    'email.label.package'             : 'Package',
    'email.label.departure'           : 'Departure',
    'email.label.return'              : 'Return',
    'email.label.guests'              : 'Guests',
    'email.label.total_amount'        : 'Total Amount',
    'email.label.amount_paid'         : 'Amount Paid',
    'email.label.balance_due'         : 'Balance Due',
    'email.label.fully_paid'          : '✓ Fully Paid',
    'email.label.booking_summary'     : 'Booking Summary',
    'email.label.payment_summary'     : 'Payment Summary',
    'email.label.receipt_details'     : 'Receipt Details',
    'email.label.payment_ref'         : 'Payment Reference',
    'email.label.invoice_number'      : 'Invoice Number',
    'email.label.payment_date'        : 'Payment Date',
    'email.label.method'              : 'Method',
    'email.label.special_requests'    : 'Special Requests',
    'email.label.notes'               : 'Notes',

    'sms.booking_received'  : '{company}: Booking {ref} received for "{pkg}" on {date}. We\'ll confirm shortly.',
    'sms.booking_confirmed' : '{company}: Booking {ref} CONFIRMED. {start}-{end}, {guests} guest(s). See email for details.',
    'sms.payment_receipt'   : '{company}: Payment of {amount} received (ref {ref}). Thank you!',
    'sms.upcoming_reminder' : '{company}: Your safari "{pkg}" ({ref}) starts in 7 days on {date}. Pack neutrals, binoculars, sunscreen!',
    'sms.overdue'           : '{company}: Invoice {ref} is OVERDUE. Outstanding: {balance}. Please settle ASAP.',

    'wa.booking_received.header' : '*{company}* — Booking Received',
    'wa.booking_received.body'   : 'Hi {name}, we\'ve received your booking.',
    'wa.booking_received.pay'    : 'Pay deposit: {link}',
    'wa.booking_received.outro'  : 'Our team will confirm shortly.',
    'wa.booking_confirmed.header': '*{company}* — Booking Confirmed ✅',
    'wa.booking_confirmed.body'  : 'Great news {name}! Your safari is confirmed.',
    'wa.booking_confirmed.balance': 'Balance due: {balance}',
    'wa.booking_confirmed.outro' : 'We\'ll send your full itinerary soon.',
    'wa.payment_receipt.header'  : '*{company}* — Payment Receipt',
    'wa.payment_receipt.body'    : 'Thank you {name}! We\'ve received your payment.',
    'wa.upcoming.header'         : '*{company}* — Your Adventure Awaits! 🦁',
    'wa.upcoming.body'           : 'Hi {name}, your safari starts in *7 days*!',
    'wa.upcoming.checklist_title': '*Pre-departure checklist:*',
    'wa.upcoming.chk1'           : 'Passport valid 6+ months',
    'wa.upcoming.chk2'           : 'Visa confirmed',
    'wa.upcoming.chk3'           : 'Neutral-coloured clothing',
    'wa.upcoming.chk4'           : 'Binoculars, sunscreen, repellent',
    'wa.upcoming.chk5'           : 'Travel insurance in place',
    'wa.upcoming.outro'          : 'See you soon! 🌍',

    'voucher.scan_here'          : 'Scan at pickup & park entry',
    'scan.pickup'                : 'Pickup',
    'scan.park_entry'            : 'Park Entry',
    'scan.lodge_checkin'         : 'Lodge Check-in',
    'scan.dropoff'               : 'Drop-off',
  },

  sw: {
    'email.booking_received.subject'  : 'Uhifadhi Umepokelewa — {ref}',
    'email.booking_confirmed.subject' : 'Uhifadhi Umethibitishwa ✅ — {ref}',
    'email.payment_receipt.subject'   : 'Risiti ya Malipo — {ref}',
    'email.upcoming_trip.subject'     : 'Safari Yako Inaanza Siku 7! — {ref}',
    'email.booking_cancelled.subject' : 'Taarifa ya Kufuta Uhifadhi — {ref}',
    'email.invoice.subject'           : 'Ankara {ref}',
    'email.overdue.subject'           : '⚠️ Malipo Yamechelewa — Ankara {ref}',
    'email.quote.subject'             : 'Nukuu Yako ya Safari {ref}',

    'email.greeting'                  : 'Mpendwa {name}',
    'email.greeting_fallback'         : 'Mgeni Mpendwa',
    'email.booking_received.title'    : 'Uhifadhi Umepokelewa',
    'email.booking_confirmed.title'   : 'Uhifadhi Umethibitishwa!',
    'email.booking_confirmed.sub'     : 'Tunasubiri kwa hamu kukukaribisha kwenye safari yako.',
    'email.payment_received.title'    : 'Kiasi Kilichopokelewa',
    'email.payment_thanks'            : 'Asante kwa malipo yako.',
    'email.next_steps_title'          : 'Hatua zinazofuata?',
    'email.next_steps_body'           : 'Timu yetu itawasiliana nawe ikiwa na ratiba kamili, orodha ya vifaa, na taarifa zote za kabla ya kusafiri karibu na tarehe ya safari yako.',
    'email.cta.pay_now'               : 'Lipa Sasa',
    'email.cta.pay_balance'           : 'Lipa Salio',
    'email.cta.accept_quote'          : 'Kubali Nukuu & Lipa Awali',
    'email.valid_until'               : 'Inatumika hadi {date}',
    'email.label.booking_ref'         : 'Nambari ya Uhifadhi',
    'email.label.package'             : 'Pakiti',
    'email.label.departure'           : 'Kuondoka',
    'email.label.return'              : 'Kurudi',
    'email.label.guests'              : 'Wageni',
    'email.label.total_amount'        : 'Kiasi Jumla',
    'email.label.amount_paid'         : 'Kiasi Kilicholipwa',
    'email.label.balance_due'         : 'Salio',
    'email.label.fully_paid'          : '✓ Imelipwa Kamili',
    'email.label.booking_summary'     : 'Muhtasari wa Uhifadhi',
    'email.label.payment_summary'     : 'Muhtasari wa Malipo',
    'email.label.receipt_details'     : 'Maelezo ya Risiti',
    'email.label.payment_ref'         : 'Kumbukumbu ya Malipo',
    'email.label.invoice_number'      : 'Nambari ya Ankara',
    'email.label.payment_date'        : 'Tarehe ya Malipo',
    'email.label.method'              : 'Njia',
    'email.label.special_requests'    : 'Maombi Maalum',
    'email.label.notes'               : 'Maelezo',

    'sms.booking_received'  : '{company}: Uhifadhi {ref} umepokelewa kwa "{pkg}" tarehe {date}. Tutathibitisha hivi karibuni.',
    'sms.booking_confirmed' : '{company}: Uhifadhi {ref} UMETHIBITISHWA. {start}-{end}, wageni {guests}. Angalia barua pepe kwa maelezo.',
    'sms.payment_receipt'   : '{company}: Malipo ya {amount} yamepokelewa (kumbk. {ref}). Asante!',
    'sms.upcoming_reminder' : '{company}: Safari yako "{pkg}" ({ref}) inaanza siku 7 tarehe {date}. Leta nguo za kahawia, darubini, lotion ya jua!',
    'sms.overdue'           : '{company}: Ankara {ref} IMECHELEWA. Salio: {balance}. Tafadhali lipa haraka.',

    'wa.booking_received.header' : '*{company}* — Uhifadhi Umepokelewa',
    'wa.booking_received.body'   : 'Habari {name}, tumepokea uhifadhi wako.',
    'wa.booking_received.pay'    : 'Lipa awali: {link}',
    'wa.booking_received.outro'  : 'Timu yetu itathibitisha hivi karibuni.',
    'wa.booking_confirmed.header': '*{company}* — Uhifadhi Umethibitishwa ✅',
    'wa.booking_confirmed.body'  : 'Habari njema {name}! Safari yako imethibitishwa.',
    'wa.booking_confirmed.balance': 'Salio: {balance}',
    'wa.booking_confirmed.outro' : 'Tutatuma ratiba yako kamili hivi karibuni.',
    'wa.payment_receipt.header'  : '*{company}* — Risiti ya Malipo',
    'wa.payment_receipt.body'    : 'Asante {name}! Tumepokea malipo yako.',
    'wa.upcoming.header'         : '*{company}* — Safari Yako Inakaribia! 🦁',
    'wa.upcoming.body'           : 'Habari {name}, safari yako inaanza *siku 7*!',
    'wa.upcoming.checklist_title': '*Orodha ya kabla ya kusafiri:*',
    'wa.upcoming.chk1'           : 'Paspoti inatumika miezi 6+',
    'wa.upcoming.chk2'           : 'Viza imethibitishwa',
    'wa.upcoming.chk3'           : 'Nguo za rangi ya kahawia',
    'wa.upcoming.chk4'           : 'Darubini, lotion ya jua, dawa ya wadudu',
    'wa.upcoming.chk5'           : 'Bima ya safari imewekwa',
    'wa.upcoming.outro'          : 'Tutaonana hivi karibuni! 🌍',

    'voucher.scan_here'          : 'Chanja wakati wa kuchukuliwa & kuingia bustani',
    'scan.pickup'                : 'Kuchukuliwa',
    'scan.park_entry'            : 'Kuingia Bustani',
    'scan.lodge_checkin'         : 'Kuingia Lodge',
    'scan.dropoff'               : 'Kuondolewa',
  },

  fr: {
    'email.booking_received.subject'  : 'Réservation reçue — {ref}',
    'email.booking_confirmed.subject' : 'Réservation confirmée ✅ — {ref}',
    'email.payment_receipt.subject'   : 'Reçu de paiement — {ref}',
    'email.upcoming_trip.subject'     : 'Votre safari commence dans 7 jours ! — {ref}',
    'email.booking_cancelled.subject' : 'Avis d\'annulation de réservation — {ref}',
    'email.invoice.subject'           : 'Facture {ref}',
    'email.overdue.subject'           : '⚠️ Paiement en retard — Facture {ref}',
    'email.quote.subject'             : 'Votre devis safari {ref}',

    'email.greeting'                  : 'Cher/Chère {name}',
    'email.greeting_fallback'         : 'Cher/Chère voyageur(se)',
    'email.booking_received.title'    : 'Réservation reçue',
    'email.booking_confirmed.title'   : 'Réservation confirmée !',
    'email.booking_confirmed.sub'     : 'Nous avons hâte de vous accueillir pour votre aventure safari.',
    'email.payment_received.title'    : 'Montant reçu',
    'email.payment_thanks'            : 'Merci pour votre paiement.',
    'email.next_steps_title'          : 'Et maintenant ?',
    'email.next_steps_body'           : 'Notre équipe vous contactera avec votre itinéraire détaillé, la liste d\'affaires et toutes les informations avant le départ à l\'approche de votre voyage.',
    'email.cta.pay_now'               : 'Payer maintenant',
    'email.cta.pay_balance'           : 'Payer le solde',
    'email.cta.accept_quote'          : 'Accepter le devis & payer l\'acompte',
    'email.valid_until'               : 'Valable jusqu\'au {date}',
    'email.label.booking_ref'         : 'Référence de réservation',
    'email.label.package'             : 'Forfait',
    'email.label.departure'           : 'Départ',
    'email.label.return'              : 'Retour',
    'email.label.guests'              : 'Voyageurs',
    'email.label.total_amount'        : 'Montant total',
    'email.label.amount_paid'         : 'Montant payé',
    'email.label.balance_due'         : 'Solde dû',
    'email.label.fully_paid'          : '✓ Entièrement payé',
    'email.label.booking_summary'     : 'Récapitulatif de réservation',
    'email.label.payment_summary'     : 'Récapitulatif de paiement',
    'email.label.receipt_details'     : 'Détails du reçu',
    'email.label.payment_ref'         : 'Référence de paiement',
    'email.label.invoice_number'      : 'Numéro de facture',
    'email.label.payment_date'        : 'Date de paiement',
    'email.label.method'              : 'Méthode',
    'email.label.special_requests'    : 'Demandes spéciales',
    'email.label.notes'               : 'Notes',

    'sms.booking_received'  : '{company} : Réservation {ref} reçue pour « {pkg} » le {date}. Confirmation sous peu.',
    'sms.booking_confirmed' : '{company} : Réservation {ref} CONFIRMÉE. {start}-{end}, {guests} voyageur(s). Détails par e-mail.',
    'sms.payment_receipt'   : '{company} : Paiement de {amount} reçu (réf {ref}). Merci !',
    'sms.upcoming_reminder' : '{company} : Votre safari « {pkg} » ({ref}) commence dans 7 jours, le {date}. Prévoir vêtements neutres, jumelles, crème solaire !',
    'sms.overdue'           : '{company} : Facture {ref} EN RETARD. Solde : {balance}. Merci de régler au plus vite.',

    'wa.booking_received.header' : '*{company}* — Réservation reçue',
    'wa.booking_received.body'   : 'Bonjour {name}, nous avons bien reçu votre réservation.',
    'wa.booking_received.pay'    : 'Payer l\'acompte : {link}',
    'wa.booking_received.outro'  : 'Notre équipe va confirmer sous peu.',
    'wa.booking_confirmed.header': '*{company}* — Réservation confirmée ✅',
    'wa.booking_confirmed.body'  : 'Bonne nouvelle {name} ! Votre safari est confirmé.',
    'wa.booking_confirmed.balance': 'Solde dû : {balance}',
    'wa.booking_confirmed.outro' : 'Nous vous enverrons l\'itinéraire complet très bientôt.',
    'wa.payment_receipt.header'  : '*{company}* — Reçu de paiement',
    'wa.payment_receipt.body'    : 'Merci {name} ! Nous avons bien reçu votre paiement.',
    'wa.upcoming.header'         : '*{company}* — Votre aventure vous attend ! 🦁',
    'wa.upcoming.body'           : 'Bonjour {name}, votre safari commence dans *7 jours* !',
    'wa.upcoming.checklist_title': '*Liste avant départ :*',
    'wa.upcoming.chk1'           : 'Passeport valide 6 mois+',
    'wa.upcoming.chk2'           : 'Visa confirmé',
    'wa.upcoming.chk3'           : 'Vêtements de couleur neutre',
    'wa.upcoming.chk4'           : 'Jumelles, crème solaire, anti-moustiques',
    'wa.upcoming.chk5'           : 'Assurance voyage en place',
    'wa.upcoming.outro'          : 'À très bientôt ! 🌍',

    'voucher.scan_here'          : 'Scanner au ramassage & à l\'entrée du parc',
    'scan.pickup'                : 'Ramassage',
    'scan.park_entry'            : 'Entrée du parc',
    'scan.lodge_checkin'         : 'Arrivée au lodge',
    'scan.dropoff'               : 'Dépose',
  },

  it: {
    'email.booking_received.subject'  : 'Prenotazione ricevuta — {ref}',
    'email.booking_confirmed.subject' : 'Prenotazione confermata ✅ — {ref}',
    'email.payment_receipt.subject'   : 'Ricevuta di pagamento — {ref}',
    'email.upcoming_trip.subject'     : 'Il tuo safari inizia tra 7 giorni! — {ref}',
    'email.booking_cancelled.subject' : 'Avviso di annullamento prenotazione — {ref}',
    'email.invoice.subject'           : 'Fattura {ref}',
    'email.overdue.subject'           : '⚠️ Pagamento scaduto — Fattura {ref}',
    'email.quote.subject'             : 'Il tuo preventivo safari {ref}',

    'email.greeting'                  : 'Gentile {name}',
    'email.greeting_fallback'         : 'Gentile ospite',
    'email.booking_received.title'    : 'Prenotazione ricevuta',
    'email.booking_confirmed.title'   : 'Prenotazione confermata!',
    'email.booking_confirmed.sub'     : 'Non vediamo l\'ora di accoglierti per la tua avventura safari.',
    'email.payment_received.title'    : 'Importo ricevuto',
    'email.payment_thanks'            : 'Grazie per il tuo pagamento.',
    'email.next_steps_title'          : 'Cosa succede ora?',
    'email.next_steps_body'           : 'Il nostro team ti contatterà con l\'itinerario dettagliato, la lista del bagaglio e tutte le informazioni pre-partenza in prossimità della data del viaggio.',
    'email.cta.pay_now'               : 'Paga ora',
    'email.cta.pay_balance'           : 'Paga saldo',
    'email.cta.accept_quote'          : 'Accetta preventivo & paga caparra',
    'email.valid_until'               : 'Valido fino al {date}',
    'email.label.booking_ref'         : 'Riferimento prenotazione',
    'email.label.package'             : 'Pacchetto',
    'email.label.departure'           : 'Partenza',
    'email.label.return'              : 'Ritorno',
    'email.label.guests'              : 'Ospiti',
    'email.label.total_amount'        : 'Importo totale',
    'email.label.amount_paid'         : 'Importo pagato',
    'email.label.balance_due'         : 'Saldo dovuto',
    'email.label.fully_paid'          : '✓ Completamente pagato',
    'email.label.booking_summary'     : 'Riepilogo prenotazione',
    'email.label.payment_summary'     : 'Riepilogo pagamento',
    'email.label.receipt_details'     : 'Dettagli ricevuta',
    'email.label.payment_ref'         : 'Riferimento pagamento',
    'email.label.invoice_number'      : 'Numero fattura',
    'email.label.payment_date'        : 'Data pagamento',
    'email.label.method'              : 'Metodo',
    'email.label.special_requests'    : 'Richieste speciali',
    'email.label.notes'               : 'Note',

    'sms.booking_received'  : '{company}: Prenotazione {ref} ricevuta per "{pkg}" il {date}. Conferma a breve.',
    'sms.booking_confirmed' : '{company}: Prenotazione {ref} CONFERMATA. {start}-{end}, {guests} ospite/i. Dettagli via email.',
    'sms.payment_receipt'   : '{company}: Pagamento di {amount} ricevuto (rif {ref}). Grazie!',
    'sms.upcoming_reminder' : '{company}: Il tuo safari "{pkg}" ({ref}) inizia tra 7 giorni il {date}. Porta abiti neutri, binocolo, crema solare!',
    'sms.overdue'           : '{company}: Fattura {ref} SCADUTA. Saldo: {balance}. Saldare al più presto.',

    'wa.booking_received.header' : '*{company}* — Prenotazione Ricevuta',
    'wa.booking_received.body'   : 'Ciao {name}, abbiamo ricevuto la tua prenotazione.',
    'wa.booking_received.pay'    : 'Paga caparra: {link}',
    'wa.booking_received.outro'  : 'Il nostro team confermerà a breve.',
    'wa.booking_confirmed.header': '*{company}* — Prenotazione Confermata ✅',
    'wa.booking_confirmed.body'  : 'Ottime notizie {name}! Il tuo safari è confermato.',
    'wa.booking_confirmed.balance': 'Saldo dovuto: {balance}',
    'wa.booking_confirmed.outro' : 'Ti invieremo l\'itinerario completo molto presto.',
    'wa.payment_receipt.header'  : '*{company}* — Ricevuta di Pagamento',
    'wa.payment_receipt.body'    : 'Grazie {name}! Abbiamo ricevuto il tuo pagamento.',
    'wa.upcoming.header'         : '*{company}* — La tua avventura ti aspetta! 🦁',
    'wa.upcoming.body'           : 'Ciao {name}, il tuo safari inizia tra *7 giorni*!',
    'wa.upcoming.checklist_title': '*Lista pre-partenza:*',
    'wa.upcoming.chk1'           : 'Passaporto valido 6+ mesi',
    'wa.upcoming.chk2'           : 'Visto confermato',
    'wa.upcoming.chk3'           : 'Abbigliamento color neutro',
    'wa.upcoming.chk4'           : 'Binocolo, crema solare, repellente',
    'wa.upcoming.chk5'           : 'Assicurazione viaggio attiva',
    'wa.upcoming.outro'          : 'A presto! 🌍',

    'voucher.scan_here'          : 'Scansiona al ritiro e all\'ingresso del parco',
    'scan.pickup'                : 'Ritiro',
    'scan.park_entry'            : 'Ingresso parco',
    'scan.lodge_checkin'         : 'Check-in lodge',
    'scan.dropoff'               : 'Rilascio',
  },

  de: {
    'email.booking_received.subject'  : 'Buchung eingegangen — {ref}',
    'email.booking_confirmed.subject' : 'Buchung bestätigt ✅ — {ref}',
    'email.payment_receipt.subject'   : 'Zahlungsbeleg — {ref}',
    'email.upcoming_trip.subject'     : 'Ihre Safari beginnt in 7 Tagen! — {ref}',
    'email.booking_cancelled.subject' : 'Stornierungsbenachrichtigung — {ref}',
    'email.invoice.subject'           : 'Rechnung {ref}',
    'email.overdue.subject'           : '⚠️ Zahlung überfällig — Rechnung {ref}',
    'email.quote.subject'             : 'Ihr Safari-Angebot {ref}',

    'email.greeting'                  : 'Sehr geehrte/r {name}',
    'email.greeting_fallback'         : 'Sehr geehrter Gast',
    'email.booking_received.title'    : 'Buchung eingegangen',
    'email.booking_confirmed.title'   : 'Buchung bestätigt!',
    'email.booking_confirmed.sub'     : 'Wir freuen uns darauf, Sie zu Ihrem Safari-Abenteuer begrüßen zu dürfen.',
    'email.payment_received.title'    : 'Erhaltener Betrag',
    'email.payment_thanks'            : 'Vielen Dank für Ihre Zahlung.',
    'email.next_steps_title'          : 'Wie geht es weiter?',
    'email.next_steps_body'           : 'Unser Team wird sich mit Ihnen in Verbindung setzen und Ihnen nähere Informationen zu Ihrem Reiseplan, Ihrer Packliste und allen vorreisebezogenen Details rechtzeitig vor Ihrem Reisetermin mitteilen.',
    'email.cta.pay_now'               : 'Jetzt bezahlen',
    'email.cta.pay_balance'           : 'Restbetrag zahlen',
    'email.cta.accept_quote'          : 'Angebot annehmen & Anzahlung leisten',
    'email.valid_until'               : 'Gültig bis {date}',
    'email.label.booking_ref'         : 'Buchungsnummer',
    'email.label.package'             : 'Paket',
    'email.label.departure'           : 'Abreise',
    'email.label.return'               : 'Rückkehr',
    'email.label.guests'              : 'Gäste',
    'email.label.total_amount'        : 'Gesamtbetrag',
    'email.label.amount_paid'         : 'Gezahlter Betrag',
    'email.label.balance_due'         : 'Offener Betrag',
    'email.label.fully_paid'          : '✓ Vollständig bezahlt',
    'email.label.booking_summary'     : 'Buchungsübersicht',
    'email.label.payment_summary'     : 'Zahlungsübersicht',
    'email.label.receipt_details'     : 'Belegdetails',
    'email.label.payment_ref'         : 'Zahlungsreferenz',
    'email.label.invoice_number'      : 'Rechnungsnummer',
    'email.label.payment_date'        : 'Zahlungsdatum',
    'email.label.method'              : 'Methode',
    'email.label.special_requests'    : 'Sonderwünsche',
    'email.label.notes'               : 'Hinweise',

    'sms.booking_received'  : '{company}: Buchung {ref} eingegangen für „{pkg}" am {date}. Bestätigung folgt in Kürze.',
    'sms.booking_confirmed' : '{company}: Buchung {ref} BESTÄTIGT. {start}-{end}, {guests} Gast/Gäste. Details per E-Mail.',
    'sms.payment_receipt'   : '{company}: Zahlung von {amount} erhalten (Ref {ref}). Vielen Dank!',
    'sms.upcoming_reminder' : '{company}: Ihre Safari „{pkg}" ({ref}) beginnt in 7 Tagen am {date}. Bitte neutrale Kleidung, Fernglas, Sonnencreme mitbringen!',
    'sms.overdue'           : '{company}: Rechnung {ref} ÜBERFÄLLIG. Offener Betrag: {balance}. Bitte umgehend begleichen.',

    'wa.booking_received.header' : '*{company}* — Buchung eingegangen',
    'wa.booking_received.body'   : 'Hallo {name}, wir haben Ihre Buchung erhalten.',
    'wa.booking_received.pay'    : 'Anzahlung leisten: {link}',
    'wa.booking_received.outro'  : 'Unser Team bestätigt in Kürze.',
    'wa.booking_confirmed.header': '*{company}* — Buchung bestätigt ✅',
    'wa.booking_confirmed.body'  : 'Gute Nachrichten {name}! Ihre Safari ist bestätigt.',
    'wa.booking_confirmed.balance': 'Offener Betrag: {balance}',
    'wa.booking_confirmed.outro' : 'Wir senden Ihnen in Kürze den kompletten Reiseplan.',
    'wa.payment_receipt.header'  : '*{company}* — Zahlungsbeleg',
    'wa.payment_receipt.body'    : 'Vielen Dank {name}! Wir haben Ihre Zahlung erhalten.',
    'wa.upcoming.header'         : '*{company}* — Ihr Abenteuer wartet! 🦁',
    'wa.upcoming.body'           : 'Hallo {name}, Ihre Safari beginnt in *7 Tagen*!',
    'wa.upcoming.checklist_title': '*Checkliste vor der Abreise:*',
    'wa.upcoming.chk1'           : 'Reisepass 6+ Monate gültig',
    'wa.upcoming.chk2'           : 'Visum bestätigt',
    'wa.upcoming.chk3'           : 'Kleidung in neutralen Farben',
    'wa.upcoming.chk4'           : 'Fernglas, Sonnencreme, Insektenschutz',
    'wa.upcoming.chk5'           : 'Reiseversicherung abgeschlossen',
    'wa.upcoming.outro'          : 'Bis bald! 🌍',

    'voucher.scan_here'          : 'Bei Abholung und Parkeinfahrt scannen',
    'scan.pickup'                : 'Abholung',
    'scan.park_entry'            : 'Parkeinfahrt',
    'scan.lodge_checkin'         : 'Lodge Check-in',
    'scan.dropoff'               : 'Absetzen',
  },
};

// Simple {placeholder} substitution. Leaves unknown placeholders intact.
function format(template, vars = {}) {
  if (!template) return '';
  return String(template).replace(/\{(\w+)\}/g, (m, key) =>
    vars[key] != null ? String(vars[key]) : m
  );
}

function t(key, lang = DEFAULT_LANG, vars = {}) {
  const code = normaliseLang(lang);
  const catalogue = MESSAGES[code] || MESSAGES[DEFAULT_LANG];
  const raw = catalogue[key] ?? MESSAGES[DEFAULT_LANG][key] ?? key;
  return format(raw, vars);
}

// Localised date — matches existing server style.
function fmtDate(d, lang = DEFAULT_LANG) {
  if (!d) return '—';
  const localeMap = { en: 'en-US', sw: 'sw-TZ', fr: 'fr-FR', it: 'it-IT', de: 'de-DE' };
  const locale = localeMap[normaliseLang(lang)] || 'en-US';
  try { return new Date(d).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' }); }
  catch { return String(d); }
}

function fmtDateShort(d, lang = DEFAULT_LANG) {
  if (!d) return '';
  const localeMap = { en: 'en-GB', sw: 'sw-TZ', fr: 'fr-FR', it: 'it-IT', de: 'de-DE' };
  const locale = localeMap[normaliseLang(lang)] || 'en-GB';
  try { return new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'short' }); }
  catch { return String(d).slice(0, 10); }
}

module.exports = {
  SUPPORTED, DEFAULT_LANG,
  normaliseLang, pickFromAcceptLanguage,
  t, format, fmtDate, fmtDateShort,
};
