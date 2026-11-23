// Address autocomplete using PDOK Locatieserver (Dutch government, free, no key).
// Called straight from the browser: our own server never sees the address.

const PDOK = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1';

export async function suggestAddresses(query, signal) {
  const url = `${PDOK}/suggest?q=${encodeURIComponent(query)}&fq=type:adres&rows=6`;
  const res = await fetch(url, { signal, referrerPolicy: 'no-referrer' });
  if (!res.ok) throw new Error(`PDOK ${res.status}`);
  const data = await res.json();
  return data.response.docs.map((d) => ({ id: d.id, label: d.weergavenaam }));
}

export async function lookupAddress(id) {
  const url = `${PDOK}/lookup?id=${encodeURIComponent(id)}&fl=weergavenaam,centroide_ll`;
  const res = await fetch(url, { referrerPolicy: 'no-referrer' });
  if (!res.ok) throw new Error(`PDOK ${res.status}`);
  const doc = (await res.json()).response.docs[0];
  const m = doc?.centroide_ll?.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
  if (!m) throw new Error('Geen coördinaten gevonden');
  return { label: doc.weergavenaam, lat: Number(m[2]), lng: Number(m[1]) };
}

/** Wires an <input> + <ul> into a keyboard-friendly autocomplete. */
export function attachAutocomplete(input, list, onChoose) {
  let items = [];
  let active = -1;
  let controller;
  let timer;

  function render() {
    list.innerHTML = '';
    items.forEach((item, i) => {
      const li = document.createElement('li');
      li.role = 'option';
      li.textContent = item.label;
      li.id = `sugg-${i}`;
      li.ariaSelected = String(i === active);
      li.addEventListener('mousedown', (e) => {
        e.preventDefault(); // keep focus in the input
        choose(i);
      });
      list.append(li);
    });
    list.hidden = items.length === 0;
    input.setAttribute('aria-expanded', String(items.length > 0));
    if (active >= 0) input.setAttribute('aria-activedescendant', `sugg-${active}`);
    else input.removeAttribute('aria-activedescendant');
  }

  function close() {
    items = [];
    active = -1;
    render();
  }

  function choose(i) {
    const item = items[i];
    if (!item) return;
    input.value = item.label;
    close();
    onChoose(item);
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 3) return close();
    timer = setTimeout(async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        items = await suggestAddresses(q, controller.signal);
        active = -1;
        render();
      } catch (err) {
        if (err.name !== 'AbortError') close();
      }
    }, 250);
  });

  input.addEventListener('keydown', (e) => {
    if (list.hidden) return;
    if (e.key === 'ArrowDown') { active = (active + 1) % items.length; render(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { active = (active - 1 + items.length) % items.length; render(); e.preventDefault(); }
    else if (e.key === 'Enter') { if (active >= 0) { choose(active); e.preventDefault(); } }
    else if (e.key === 'Escape') close();
  });

  input.addEventListener('blur', () => setTimeout(close, 100));
}
