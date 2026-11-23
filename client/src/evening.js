// Evening look: after dark (on Sint's clock, so it also works in demo mode)
// the map turns dusky blue and the banner becomes a starry night sky.

export const EVENING = {
  fromHour: 17, // evening starts at 17:00 ...
  untilHour: 7, // ... and lasts until 07:00
};

export function isEvening(ms) {
  const h = new Date(ms).getHours();
  return h >= EVENING.fromHour || h < EVENING.untilHour;
}

/** Sprinkle twinkling stars (only visible in evening mode) into an element. */
export function addStars(container, count = 40) {
  const sky = document.createElement('div');
  sky.className = 'night-sky';
  sky.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i++) {
    const star = document.createElement('span');
    star.className = 'star';
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.animationDelay = `${Math.random() * 3}s`;
    star.style.animationDuration = `${2 + Math.random() * 3}s`;
    const size = 1 + Math.random() * 2.5;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    sky.append(star);
  }
  const moon = document.createElement('span');
  moon.className = 'moon';
  sky.append(moon);
  container.prepend(sky);
}
