// ---------------------------------------------------------------------------
//  All texts the kids see. Edit freely!
//
//  - Groups are checked top to bottom; the first group whose `minMinutes`
//    is <= the minutes left is used.
//  - Within a group a random text is picked (and kept until Sint moves on).
//  - {stad} is replaced with the city Sinterklaas is in right now.
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

/** Status messages, grouped by how many minutes are left. */
export const messages = [
  {
    minMinutes: 120,
    texts: [
      'Sinterklaas is vertrokken uit {stad}!',
      'Ozosnel heeft er zin in vandaag 🐴',
      'De Pieten laden de zakken in {stad}.',
      'Sinterklaas leest het Grote Boek in {stad}… staat jij erin?',
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
      'Ozosnel draaft extra snel, hij weet waar hij heen moet!',
    ],
  },
  {
    minMinutes: 1,
    texts: [
      'Oh… spannend… hij is in de buurt!!',
      'Bijna hier! Hoor je al hoefgetrappel?',
      'Zet je schoen maar klaar… 👞',
      'Ssst… luister eens goed…',
    ],
  },
  {
    minMinutes: 0,
    texts: [
      'Sinterklaas is geweest! Kijk eens bij de deur… 🎁',
    ],
  },
];

function findGroup(list, minutesLeft) {
  return list.find((g) => minutesLeft >= g.minMinutes) ?? list[list.length - 1];
}

export function etaText(minutesLeft) {
  return findGroup(etaBlocks, minutesLeft).text;
}

export function pickMessage(minutesLeft, city) {
  const { texts } = findGroup(messages, minutesLeft);
  const text = texts[Math.floor(Math.random() * texts.length)];
  return text.replaceAll('{stad}', city);
}
