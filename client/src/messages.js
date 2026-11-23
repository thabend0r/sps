// ---------------------------------------------------------------------------
//  All texts the kids see. Edit freely!
//
//  - Groups are checked top to bottom; the first group whose `minMinutes`
//    is <= the minutes left is used.
//  - Within a group one text is picked. The pick is fixed per stop, so all
//    devices show the same text and it doesn't change on refresh.
//  - {stad} is replaced with the city (visiting: where Sint is now,
//    traveling: where Sint is going). Near the end {stad} is "jouw buurt".
// ---------------------------------------------------------------------------

/** Rough ETA shown in the big text. Not per second: in blocks. */
export const etaBlocks = [
  { minMinutes: 180, text: 'nog heel lang…' },
  { minMinutes: 120, text: 'meer dan 2 uur' },
  { minMinutes: 90,  text: 'ongeveer 2 uur' },
  { minMinutes: 60,  text: 'ruim een uur' },
  { minMinutes: 45,  text: 'ongeveer een uur' },
  { minMinutes: 25,  text: 'een half uurtje' },
  { minMinutes: 15,  text: 'een kwartiertje' },
  { minMinutes: 5,   text: 'bijna hier!' },
  { minMinutes: 1,   text: 'nog maar heel even!' },
  { minMinutes: 0,   text: 'NU!' },
];

/** Before Sint sets off (more than 3 hours before delivery). */
export const waitingMessages = [
  'Sinterklaas is nog in het Pakjeshuis…',
  'De Pieten pakken nog de laatste cadeautjes in 🎁',
  'Ozosnel wordt nog geborsteld 🐴',
  'Sinterklaas zoekt zijn mijter…',
];

/** While Sint is in a city. */
export const visitMessages = [
  {
    minMinutes: 120,
    texts: [
      'Sinterklaas is in {stad}!',
      'De Pieten laden de zakken in {stad}.',
      'Sinterklaas leest het Grote Boek in {stad}… sta jij erin?',
      'Ozosnel heeft er zin in vandaag 🐴',
    ],
  },
  {
    minMinutes: 30,
    texts: [
      'Piet is even de weg kwijt in {stad}…',
      'Ozosnel krijgt een wortel in {stad} 🥕',
      'Sinterklaas zwaait naar de kinderen in {stad}!',
      'De Pieten strooien pepernoten in {stad}!',
      'Piet zoekt een schoorsteen in {stad}… verkeerd huis!',
      'Sinterklaas drinkt een warme chocomel in {stad} ☕',
    ],
  },
  {
    minMinutes: 15,
    texts: [
      'Oh… spannend… hij komt dichterbij!',
      'De Pieten hebben jouw adres gevonden!',
    ],
  },
  {
    minMinutes: 0,
    texts: [
      'Oh… spannend… hij is in de buurt!!',
      'Bijna hier! Hoor je al hoefgetrappel?',
      'Zet je schoen maar klaar… 👞',
      'Ssst… luister eens goed…',
    ],
  },
];

/** While Sint is on the way to the next stop. */
export const travelMessages = [
  {
    minMinutes: 30,
    texts: [
      'Ozosnel galoppeert naar {stad}! 🐴',
      'Over de daken op weg naar {stad}…',
      'Piet leest de kaart… volgens mij moeten we naar {stad}!',
      'Hop hop hop, paardje in galop… naar {stad}!',
    ],
  },
  {
    minMinutes: 0,
    texts: [
      'Ozosnel draaft extra snel, hij weet waar hij heen moet!',
      'Hij komt eraan… op weg naar {stad}!',
      'Piet heeft jouw straat op de kaart gevonden!',
    ],
  },
];

/** At or after delivery time. */
export const arrivedMessages = [
  'Sinterklaas is geweest! Kijk eens bij de deur… 🎁',
];

/** Label above/before the city name. */
export const locationLabels = {
  waiting: 'Nu in:',
  visiting: 'Nu in:',
  traveling: 'Onderweg naar:',
  arrived: 'Nu bij:',
};
export const waitingPlace = 'het Pakjeshuis';

// ---------------------------------------------------------------------------

function findGroup(list, minutesLeft) {
  return list.find((g) => minutesLeft >= g.minMinutes) ?? list[list.length - 1];
}

export function etaText(minutesLeft) {
  return findGroup(etaBlocks, minutesLeft).text;
}

/** rnd: a number in [0,1) that is fixed for this stop. */
export function messageFor(state, rnd) {
  const choose = (texts) => texts[Math.floor(rnd * texts.length)];
  let text;
  switch (state.phase) {
    case 'waiting':   text = choose(waitingMessages); break;
    case 'arrived':   text = choose(arrivedMessages); break;
    case 'visiting':  text = choose(findGroup(visitMessages, state.minutesLeft).texts); break;
    case 'traveling': text = choose(findGroup(travelMessages, state.minutesLeft).texts); break;
  }
  return text.replaceAll('{stad}', state.city?.name ?? '');
}
