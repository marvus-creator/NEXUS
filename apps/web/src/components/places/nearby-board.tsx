'use client';

import { Badge, Button, Card, EmptyState, Field, Input, Textarea, cn } from '@nexus/ui';
import {
  Bookmark,
  Coffee,
  Dumbbell,
  Landmark,
  MapPin,
  Navigation,
  Plus,
  Star,
  Store,
  UtensilsCrossed,
  Wrench,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { placesClient, type PlaceSummary } from '@/lib/places-client';
import { PlacesMap } from './places-map';

const CATEGORIES = [
  { value: '', label: 'All', icon: MapPin },
  { value: 'CAFE', label: 'Cafés', icon: Coffee },
  { value: 'RESTAURANT', label: 'Food', icon: UtensilsCrossed },
  { value: 'WORKSPACE', label: 'Workspaces', icon: Landmark },
  { value: 'VENUE', label: 'Venues', icon: Landmark },
  { value: 'STORE', label: 'Stores', icon: Store },
  { value: 'SPORT', label: 'Sport', icon: Dumbbell },
  { value: 'SERVICE', label: 'Services', icon: Wrench },
] as const;

const CATEGORY_TINT: Record<string, string> = {
  CAFE: 'var(--module-events)',
  RESTAURANT: 'var(--module-events)',
  WORKSPACE: 'var(--accent)',
  VENUE: 'var(--module-people)',
  STORE: 'var(--module-discover)',
  SPORT: 'var(--module-nearby)',
  ATTRACTION: 'var(--module-ai)',
  SERVICE: 'var(--ink-subtle)',
  OTHER: 'var(--ink-subtle)',
};

export function NearbyBoard({ places, city }: { places: PlaceSummary[]; city: string | null }) {
  const router = useRouter();

  const [items, setItems] = useState(places);
  const [category, setCategory] = useState<string>('');
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [located, setLocated] = useState(false);
  const [composing, setComposing] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [newCategory, setNewCategory] = useState('CAFE');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    setItems(places);
  }, [places]);

  useEffect(() => {
    if (!selectedId) return;
    cardRefs.current.get(selectedId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);

  const visible = items.filter((place) => {
    if (category && place.category !== category) return false;
    if (query.trim().length >= 2) {
      const term = query.trim().toLowerCase();
      return (
        place.name.toLowerCase().includes(term) ||
        (place.address ?? '').toLowerCase().includes(term) ||
        (place.description ?? '').toLowerCase().includes(term)
      );
    }
    return true;
  });

  async function useMyLocation() {
    if (!navigator.geolocation) {
      setError('This browser cannot share a location.');
      return;
    }

    setLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setMe({ lat: position.coords.latitude, lng: position.coords.longitude });
        try {
          const nearby = await placesClient.nearby({
            lat: String(position.coords.latitude),
            lng: String(position.coords.longitude),
          });

          setItems(nearby);
          setLocated(true);
        } catch (caught) {
          setError((caught as Error).message);
        } finally {
          setLocating(false);
        }
      },
      () => {
        setError('Location permission was refused, so distances stay hidden.');
        setLocating(false);
      },
      { timeout: 8000 },
    );
  }

  async function save(place: PlaceSummary) {
    const next = !place.saved;

    setItems((current) =>
      current.map((item) => (item.id === place.id ? { ...item, saved: next } : item)),
    );

    try {
      await placesClient.savePlace(place.slug, next);
    } catch {
      setItems((current) =>
        current.map((item) => (item.id === place.id ? { ...item, saved: !next } : item)),
      );
    }
  }

  async function addPlace() {
    if (!name.trim()) return;

    setBusy(true);
    setError(null);

    try {
      await placesClient.createPlace({
        name: name.trim(),
        category: newCategory,
        address: address.trim() || undefined,
        description: description.trim() || undefined,
        city: city ?? undefined,
        latitude: picked?.lat,
        longitude: picked?.lng,
      });

      setPicked(null);
      setName('');
      setAddress('');
      setDescription('');
      setComposing(false);
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="border-line bg-surface relative h-[22rem] overflow-hidden rounded-xl border sm:h-[26rem]">
        <PlacesMap
          places={visible}
          tints={CATEGORY_TINT}
          selectedId={selectedId}
          onSelect={setSelectedId}
          me={me}
          picking={composing}
          picked={picked}
          onPick={setPicked}
        />
        {composing ? (
          <div className="bg-surface-raised/95 border-line pointer-events-none absolute left-3 top-3 rounded-lg border px-3 py-2 text-xs backdrop-blur">
            {picked ? 'Pinned. Tap again to move it.' : 'Tap the map to pin where it is.'}
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={located ? 'secondary' : 'primary'}
          loading={locating}
          onClick={() => void useMyLocation()}
        >
          <Navigation /> {located ? 'Distances on' : 'Use my location'}
        </Button>

        <div className="max-w-xs flex-1">
          <Input
            value={query}
            placeholder="Search places"
            className="h-9"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <Button
          size="sm"
          className="ml-auto"
          variant={composing ? 'secondary' : 'primary'}
          onClick={() => {
            setComposing((value) => !value);
            setPicked(null);
          }}
        >
          {composing ? <X /> : <Plus />}
          {composing ? 'Cancel' : 'Add place'}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {CATEGORIES.map((item) => {
          const Icon = item.icon;
          const active = category === item.value;

          return (
            <button
              key={item.value || 'all'}
              type="button"
              onClick={() => setCategory(item.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'border-accent bg-accent text-accent-ink'
                  : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
              )}
            >
              <Icon className="size-3" />
              {item.label}
            </button>
          );
        })}
      </div>

      {composing ? (
        <Card className="mt-4 p-5">
          <div className="flex flex-col gap-4">
            <Field label="What is it called?">
              <Input
                autoFocus
                value={name}
                placeholder="Question Coffee"
                onChange={(event) => setName(event.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Address" hint="Optional">
                <Input
                  value={address}
                  placeholder="KG 7 Ave"
                  onChange={(event) => setAddress(event.target.value)}
                />
              </Field>

              <div>
                <p className="text-ink mb-2 text-sm font-medium">Category</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.filter((item) => item.value).map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setNewCategory(item.value)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        newCategory === item.value
                          ? 'border-accent bg-accent text-accent-ink'
                          : 'border-line text-ink-muted hover:text-ink',
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Field label="What is it like?" hint="Optional">
              <Textarea
                value={description}
                placeholder="Quiet enough to work, open until 22:00"
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>

            {error ? <p className="text-danger text-sm">{error}</p> : null}

            <Button
              onClick={addPlace}
              loading={busy}
              disabled={!name.trim()}
              className="self-start"
            >
              Add place
            </Button>
          </div>
        </Card>
      ) : null}

      {error && !composing ? <p className="text-danger mt-4 text-sm">{error}</p> : null}

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {visible.length === 0 ? (
          <div className="md:col-span-2">
            <EmptyState
              icon={<MapPin />}
              title="No places yet"
              description="Add the cafés, venues and workspaces you actually use. Everyone in your city sees them."
              action={
                <Button size="sm" onClick={() => setComposing(true)}>
                  <Plus /> Add place
                </Button>
              }
            />
          </div>
        ) : (
          visible.map((place) => (
            <div
              key={place.id}
              ref={(node) => {
                if (node) cardRefs.current.set(place.id, node);
                else cardRefs.current.delete(place.id);
              }}
              onClick={() => setSelectedId(place.id)}
              className={cn(
                'rounded-xl transition-shadow',
                selectedId === place.id &&
                  'ring-accent ring-2 ring-offset-2 ring-offset-[var(--ground)]',
              )}
            >
              <Card interactive className="p-5">
                <div className="flex items-start gap-3.5">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `color-mix(in oklab, ${CATEGORY_TINT[place.category] ?? 'var(--accent)'} 14%, transparent)`,
                      color: CATEGORY_TINT[place.category] ?? 'var(--accent)',
                    }}
                  >
                    <MapPin className="size-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[0.9375rem] font-semibold">{place.name}</p>
                      {place.verified ? (
                        <Badge variant="success" size="sm">
                          Verified
                        </Badge>
                      ) : null}
                    </div>

                    <p className="text-ink-subtle mt-0.5 truncate text-xs capitalize">
                      {place.category.toLowerCase()}
                      {place.address ? ` · ${place.address}` : ''}
                    </p>

                    {place.description ? (
                      <p className="text-ink-muted mt-2 line-clamp-2 text-sm leading-relaxed">
                        {place.description}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                      {place.rating !== null ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="text-warning size-3 fill-current" />
                          <span className="font-mono">{place.rating}</span>
                          <span className="text-ink-subtle">({place.reviewCount})</span>
                        </span>
                      ) : (
                        <span className="text-ink-subtle">No reviews yet</span>
                      )}

                      {place.distanceKm !== null ? (
                        <span className="text-ink-muted inline-flex items-center gap-1">
                          <Navigation className="size-3" />
                          {place.distanceKm < 1
                            ? `${Math.round(place.distanceKm * 1000)} m`
                            : `${place.distanceKm} km`}
                        </span>
                      ) : null}

                      {place.eventCount > 0 ? (
                        <Badge size="sm">{place.eventCount} upcoming</Badge>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void save(place);
                    }}
                    aria-label={place.saved ? `Unsave ${place.name}` : `Save ${place.name}`}
                    className={cn(
                      'transition-colors',
                      place.saved ? 'text-accent' : 'text-ink-subtle hover:text-ink',
                    )}
                  >
                    <Bookmark className={cn('size-4', place.saved && 'fill-current')} />
                  </button>
                </div>
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
