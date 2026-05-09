export const FARE_DATA = [
  { name: 'Cebu Terminal', city: 'Cebu City', fromCebu: 'PHP 0', toCebu: 'PHP 150' },
  { name: 'Talisay City', city: 'Talisay City', fromCebu: 'PHP 20', toCebu: 'PHP 140' },
  { name: 'Minglanilla', city: 'Municipality of Minglanilla', fromCebu: 'PHP 30', toCebu: 'PHP 130' },
  { name: 'Naga', city: 'City of Naga', fromCebu: 'PHP 40', toCebu: 'PHP 120' },
  { name: 'Balirong', city: 'City of Naga', fromCebu: 'PHP 50', toCebu: 'PHP 110' },
  { name: 'Uling', city: 'City of Naga', fromCebu: 'PHP 60', toCebu: 'PHP 100' },
  { name: 'Lutopan', city: 'Toledo City', fromCebu: 'PHP 70', toCebu: 'PHP 90' },
  { name: 'Juan Climaco', city: 'Toledo City', fromCebu: 'PHP 80', toCebu: 'PHP 80' },
  { name: 'Ilihan', city: 'Toledo City', fromCebu: 'PHP 90', toCebu: 'PHP 70' },
  { name: 'Sangi', city: 'Toledo City', fromCebu: 'PHP 100', toCebu: 'PHP 60' },
  { name: 'Luray', city: 'Pinamungahan', fromCebu: 'PHP 110', toCebu: 'PHP 50' },
  { name: 'Bato', city: 'Pinamungahan', fromCebu: 'PHP 120', toCebu: 'PHP 40' },
  { name: 'Tajao', city: 'Pinamungahan', fromCebu: 'PHP 130', toCebu: 'PHP 30' },
  { name: 'Cabangon', city: 'Pinamungahan', fromCebu: 'PHP 140', toCebu: 'PHP 20' },
  { name: 'Pinamungajan Terminal', city: 'Pinamungahan', fromCebu: 'PHP 150', toCebu: 'PHP 0' },
];

export const SCHEDULES = {
  'cebu-to-pinamungajan': {
    label: 'CEBU TO PINAMUNGAHAN',
    origin: 'Cebu South Bus Terminal',
    destination: 'Pinamungajan Terminal',
    monday: [
      '7:25 AM', '7:45 AM', '8:05 AM', '8:25 AM', '8:45 AM', '9:05 AM',
      '2:45 PM', '3:30 PM', '4:15 PM', '5:00 PM', '5:45 PM', '6:30 PM',
    ],
    other: [
      '7:45 AM', '8:30 AM', '9:15 AM', '10:00 AM', '10:45 AM', '11:30 AM',
      '2:45 PM', '3:30 PM', '4:15 PM', '5:00 PM', '5:45 PM', '6:30 PM',
    ],
  },
  'pinamungajan-to-cebu': {
    label: 'PINAMUNGAHAN TO CEBU',
    origin: 'Pinamungajan Terminal',
    destination: 'Cebu South Bus Terminal',
    monday: [
      '3:40 AM', '4:00 AM', '4:20 AM', '4:40 AM', '5:00 AM', '5:20 AM',
      '11:25 AM', '12:00 PM', '12:45 PM', '1:30 PM', '2:15 PM', '3:00 PM',
    ],
    other: [
      '4:00 AM', '4:45 AM', '5:30 AM', '6:15 AM', '7:00 AM', '7:45 AM',
      '11:15 AM', '12:00 PM', '12:45 PM', '1:30 PM', '2:15 PM', '3:00 PM',
    ],
  },
} as const;

export const ROUTE_STOPS = [
  { name: 'Cebu South Bus Terminal', city: 'Cebu City', landmark: 'Main city terminal' },
  { name: 'Talisay City', city: 'Talisay City', landmark: 'South Road Properties access' },
  { name: 'Minglanilla', city: 'Minglanilla', landmark: 'Town proper' },
  { name: 'City of Naga', city: 'Naga', landmark: 'Naga public market area' },
  { name: 'Balirong', city: 'Naga', landmark: 'Mountain route entry' },
  { name: 'Uling', city: 'Naga', landmark: 'Uling road junction' },
  { name: 'Lutopan', city: 'Toledo City', landmark: 'Lutopan crossing' },
  { name: 'Juan Climaco', city: 'Toledo City', landmark: 'Barangay road stop' },
  { name: 'Ilihan', city: 'Toledo City', landmark: 'Barangay Ilihan area' },
  { name: 'Sangi', city: 'Toledo City', landmark: 'Sangi crossing' },
  { name: 'Luray', city: 'Pinamungahan', landmark: 'Pinamungahan boundary route' },
  { name: 'Bato', city: 'Pinamungahan', landmark: 'Barangay Bato stop' },
  { name: 'Tajao', city: 'Pinamungahan', landmark: 'Barangay Tajao stop' },
  { name: 'Cabangon', city: 'Pinamungahan', landmark: 'Final barangay stop' },
  { name: 'Pinamungajan Terminal', city: 'Pinamungahan', landmark: 'Main municipal terminal' },
];

export const OFFLINE_TRANSPORT_DATA = {
  cachedAt: new Date().toISOString(),
  fares: FARE_DATA,
  schedules: SCHEDULES,
  stops: ROUTE_STOPS,
};

export type RouteKey = keyof typeof SCHEDULES;
