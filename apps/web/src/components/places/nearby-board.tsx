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
import { CATEGORY_COLOR, placeImage } from '@/lib/photos';
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

const CATEGORY_TINT: Record<string, string> = CATEGORY_COLOR;

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
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[200px] flex-1 sm:max-w-sm">
          <Input
            value={query}
            placeholder="Search places in Kigali"
            className="h-10 rounded-xl"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Button variant="secondary" loading={locating} onClick={() => void useMyLocation()}>
          <Navigation /> {located ? 'Distances on' : 'Use my location'}
        </Button>
        <Button
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

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((item) => {
          const active = category === item.value;
          const count = item.value
            ? items.filter((place) => place.category === item.value).length
            : items.length;

          return (
            <button
              key={item.value || 'all'}
              type="button"
              onClick={() => setCategory(item.value)}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition',
                active
                  ? 'bg-ink text-ground border-transparent'
                  : 'border-line bg-surface text-ink hover:border-line-strong',
              )}
            >
              {item.value ? (
                <span
                  className="size-2 rounded-full"
                  style={{ background: CATEGORY_COLOR[item.value] }}
                />
              ) : null}
              {item.label}
              <span className={cn('num text-[11px]', active ? 'opacity-70' : 'text-ink-muted')}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_400px]">
        <div className="border-line bg-surface relative h-[26rem] overflow-hidden rounded-2xl border lg:sticky lg:top-20 lg:h-[calc(100dvh-7rem)]">
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

        <div className="min-w-0">
          {composing ? (
            <Card className="mb-4 p-5">
              <div className="flex flex-col gap-4">
                <Field label="What is it called?">
                  <Input
                    autoFocus
                    value={name}
                    placeholder="Question Coffee"
                    onChange={(event) => setName(event.target.value)}
                  />
                </Field>
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
                            ? 'bg-ink text-ground border-transparent'
                            : 'border-line text-ink-muted hover:text-ink',
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Field label="What is it like?" hint="Optional">
                  <Textarea
                    value={description}
                    placeholder="Quiet enough to work, open until 22:00"
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </Field>
                <p className="text-ink-muted text-xs">
                  {picked ? 'Location pinned on the map.' : 'Tap the map to pin its location.'}
                </p>
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

          {error && !composing ? <p className="text-danger mb-3 text-sm">{error}</p> : null}

          <Card className="overflow-hidden">
            <div className="border-line flex items-baseline justify-between border-b px-4 py-3.5">
              <div>
                <div className="font-display text-xl font-bold tracking-tight">Nearby</div>
                <div className="text-ink-muted text-xs">
                  {located
                    ? 'Sorted by distance from you'
                    : `Popular around ${city ?? 'you'} right now`}
                </div>
              </div>
              <span className="num text-ink-muted text-xs">{visible.length} places</span>
            </div>

            {visible.length === 0 ? (
              <EmptyState
                icon={<MapPin />}
                title="No places here"
                description="Add the cafés, venues and workspaces you actually use. Everyone in your city sees them."
                action={
                  <Button size="sm" onClick={() => setComposing(true)}>
                    <Plus /> Add place
                  </Button>
                }
              />
            ) : (
              <div className="divide-line divide-y">
                {visible.map((place) => (
                  <div
                    key={place.id}
                    ref={(node) => {
                      if (node) cardRefs.current.set(place.id, node);
                      else cardRefs.current.delete(place.id);
                    }}
                    onClick={() => setSelectedId(place.id)}
                    className={cn(
                      'flex cursor-pointer gap-3 p-3 transition',
                      selectedId === place.id ? 'bg-accent/[0.08]' : 'hover:bg-surface-raised',
                    )}
                  >
                    <img
                      src={placeImage(place)}
                      alt=""
                      className="size-[76px] shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-semibold">{place.name}</p>
                        {place.distanceKm !== null ? (
                          <span className="num text-ink-muted shrink-0 text-xs">
                            {place.distanceKm < 1
                              ? `${Math.round(place.distanceKm * 1000)} m`
                              : `${place.distanceKm} km`}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-ink-muted mt-0.5 flex items-center gap-1.5 truncate text-xs">
                        <span
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ background: CATEGORY_COLOR[place.category] }}
                        />
                        <span className="capitalize">{place.category.toLowerCase()}</span>
                        {place.address ? <span className="truncate">· {place.address}</span> : null}
                      </p>
                      <div className="mt-1.5 flex items-center gap-3 text-xs">
                        {place.rating !== null ? (
                          <span className="inline-flex items-center gap-1">
                            <Star className="fill-module-events text-module-events size-3" />
                            <span className="num font-semibold">{place.rating}</span>
                            <span className="text-ink-muted">({place.reviewCount})</span>
                          </span>
                        ) : (
                          <span className="text-ink-subtle">No reviews yet</span>
                        )}
                        {place.eventCount > 0 ? (
                          <span className="text-module-events font-medium">
                            {place.eventCount} upcoming
                          </span>
                        ) : null}
                        {place.verified ? (
                          <Badge variant="success" size="sm">
                            Verified
                          </Badge>
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
                        'self-start p-1 transition-colors',
                        place.saved ? 'text-accent' : 'text-ink-subtle hover:text-ink',
                      )}
                    >
                      <Bookmark className={cn('size-4', place.saved && 'fill-current')} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
