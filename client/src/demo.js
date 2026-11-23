// PHASE 1 DEMO DATA – replaced by the real route simulation in phase 2.

export const demoHome = { lat: 52.1561, lng: 5.3878 }; // Amersfoort centrum

// Hard-coded hops ending at the house, with fake "minutes left".
export const demoRoute = [
  { city: 'Den Helder',  lat: 52.9563, lng: 4.7608, minutesLeft: 200 },
  { city: 'Alkmaar',     lat: 52.6324, lng: 4.7534, minutesLeft: 150 },
  { city: 'Amsterdam',   lat: 52.3676, lng: 4.9041, minutesLeft: 110 },
  { city: 'Utrecht',     lat: 52.0907, lng: 5.1214, minutesLeft: 70 },
  { city: 'Zeist',       lat: 52.0894, lng: 5.2331, minutesLeft: 40 },
  { city: 'Leusden',     lat: 52.1319, lng: 5.4294, minutesLeft: 20 },
  { city: 'jouw straat', lat: 52.1540, lng: 5.3850, minutesLeft: 8 },
  { city: 'jouw huis',   lat: 52.1561, lng: 5.3878, minutesLeft: 0 },
];

export const demoHopSeconds = 4;
