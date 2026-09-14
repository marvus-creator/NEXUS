const UNSPLASH = 'https://images.unsplash.com';

function photo(id: string, width: number, quality = 80) {
  return `${UNSPLASH}/${id}?auto=format&fit=crop&w=${width}&q=${quality}`;
}

export type Imagery = {
  src: string;
  alt: string;
};

export const imagery = {
  heroCity: {
    src: photo('photo-1496568816309-51d7c20e3b21', 2400, 82),
    alt: 'City skyline at dusk as the lights come on',
  },
  cafeFriends: {
    src: photo('photo-1523240795612-9a054b0db644', 1400),
    alt: 'Friends working together at a table surrounded by books',
  },
  liveEvent: {
    src: photo('photo-1492684223066-81342ee5ff30', 1400),
    alt: 'Confetti falling over a crowd at a concert',
  },
  team: {
    src: photo('photo-1517048676732-d65bc937f952', 1400),
    alt: 'Hands taking notes around a shared table',
  },
  coworking: {
    src: photo('photo-1531482615713-2afd69097998', 1400),
    alt: 'Colleagues looking at a laptop screen together',
  },
  students: {
    src: photo('photo-1543269865-cbf427effbad', 1400),
    alt: 'Students studying together around a laptop',
  },
  community: {
    src: photo('photo-1529156069898-49953e39b3ac', 1400),
    alt: 'Friends standing arm in arm looking out at a view',
  },
  storefront: {
    src: photo('photo-1441986300917-64674bd600d8', 1400),
    alt: 'Interior of an independent clothing store',
  },
  workspace: {
    src: photo('photo-1504384308090-c894fdcc538d', 1400),
    alt: 'Open-plan office full of people working',
  },
  meeting: {
    src: photo('photo-1552664730-d307ca884978', 1400),
    alt: 'Team planning against a wall of sticky notes',
  },
  classroom: {
    src: photo('photo-1498243691581-b145c3f54a5a', 1400),
    alt: 'Library stacks lined with books',
  },
  outdoors: {
    src: photo('photo-1511632765486-a01980e01a18', 1400),
    alt: 'Friends arm in arm watching the sunset from a hilltop',
  },
  travel: {
    src: photo('photo-1516483638261-f4dbaf036963', 1400),
    alt: 'Colourful cliffside town above the sea',
  },
  landscape: {
    src: photo('photo-1470071459604-3b5ec3a7fe05', 2000, 78),
    alt: 'Sunrise breaking over green hills',
  },
} satisfies Record<string, Imagery>;

export const heroVideoSrc = process.env.NEXT_PUBLIC_HERO_VIDEO ?? null;
