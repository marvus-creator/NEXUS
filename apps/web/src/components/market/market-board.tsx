'use client';

import { Badge, Button, Card, EmptyState, Field, Input, cn } from '@nexus/ui';
import {
  Bookmark,
  Check,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Store,
  Wrench,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { listingImage } from '@/lib/photos';
import {
  createListing,
  placeOrder,
  saveListing,
  type BusinessCategory,
  type Listing,
} from '@/lib/market-client';

const CATEGORIES: { value: BusinessCategory | ''; label: string }[] = [
  { value: '', label: 'Everything' },
  { value: 'FOOD', label: 'Food' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'TECH', label: 'Tech' },
  { value: 'SERVICES', label: 'Services' },
  { value: 'CRAFTS', label: 'Crafts' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'AGRICULTURE', label: 'Agriculture' },
  { value: 'TRANSPORT', label: 'Transport' },
];

const CATEGORY_TINT: Record<string, string> = {
  FOOD: 'var(--module-events)',
  RETAIL: 'var(--module-discover)',
  TECH: 'var(--accent)',
  SERVICES: 'var(--module-people)',
  CRAFTS: 'var(--module-learn)',
  EDUCATION: 'var(--module-learn)',
  AGRICULTURE: 'var(--module-nearby)',
  TRANSPORT: 'var(--module-ai)',
  HEALTH: 'var(--module-nearby)',
  OTHER: 'var(--ink-subtle)',
};

function ListingCard({
  listing,
  onChange,
}: {
  listing: Listing;
  onChange: (next: Listing) => void;
}) {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ordered, setOrdered] = useState(false);

  const soldOut =
    listing.status === 'SOLD' || (listing.kind === 'PRODUCT' && listing.quantity === 0);

  async function toggleSave() {
    setBusy(true);

    try {
      const result = await saveListing(listing.slug, !listing.saved);
      onChange({ ...listing, saved: result.saved });
    } finally {
      setBusy(false);
    }
  }

  async function order() {
    setBusy(true);
    setError(null);

    try {
      await placeOrder(listing.slug, { quantity: 1 });
      setOrdered(true);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not place that order.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="group flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={listingImage({ title: listing.title, id: listing.id, imageUrl: listing.coverUrl })}
          alt=""
          className="size-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
          {listing.kind === 'SERVICE' ? (
            <Wrench className="size-3" />
          ) : (
            <Package className="size-3" />
          )}
          <span className="capitalize">{listing.category.toLowerCase()}</span>
        </span>
        <button
          type="button"
          onClick={() => void toggleSave()}
          disabled={busy}
          aria-label={listing.saved ? 'Remove from saved' : 'Save listing'}
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70 disabled:opacity-50"
        >
          <Bookmark className={cn('size-4', listing.saved && 'fill-current text-[#60A5FA]')} />
        </button>
        {soldOut ? (
          <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-black">
            Sold out
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 min-w-0 text-[0.9375rem] font-semibold leading-snug">
            {listing.title}
          </h3>

          <p className="num text-accent mt-1.5 text-[1.0625rem] font-semibold">
            {listing.price.display}
            {listing.negotiable ? (
              <span className="text-ink-subtle ml-1.5 font-sans text-xs font-normal">
                negotiable
              </span>
            ) : null}
          </p>

          {listing.description ? (
            <p className="text-ink-muted mt-1.5 line-clamp-2 text-[0.8125rem] leading-relaxed">
              {listing.description}
            </p>
          ) : null}

          <div className="text-ink-subtle mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
            {listing.business ? (
              <Link
                href={`/market/business/${listing.business.slug}`}
                className="hover:text-ink flex items-center gap-1 transition-colors"
              >
                <Store className="size-3.5" />
                {listing.business.name}
              </Link>
            ) : listing.seller ? (
              <Link
                href={`/u/${listing.seller.username}`}
                className="hover:text-ink transition-colors"
              >
                {listing.seller.displayName}
              </Link>
            ) : null}
            {listing.city ? <span>· {listing.city}</span> : null}
            {listing.kind === 'PRODUCT' && !soldOut ? <span>· {listing.quantity} left</span> : null}
          </div>
        </div>

        {error ? <p className="text-danger mt-2.5 text-xs">{error}</p> : null}

        <div className="mt-3.5 flex items-center gap-2">
          {listing.isMine ? (
            <Badge>Your listing</Badge>
          ) : soldOut ? (
            <Badge>Sold</Badge>
          ) : ordered ? (
            <p className="text-module-nearby flex items-center gap-1.5 text-xs">
              <Check className="size-3.5" /> Order sent, waiting on the seller
            </p>
          ) : (
            <Button size="sm" className="w-full" onClick={() => void order()} disabled={busy}>
              <ShoppingBag className="size-4" /> Request to buy
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export function MarketBoard({ listings, city }: { listings: Listing[]; city: string | null }) {
  const router = useRouter();

  const [items, setItems] = useState(listings);
  const [category, setCategory] = useState<BusinessCategory | ''>('');
  const [query, setQuery] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [newCategory, setNewCategory] = useState<BusinessCategory>('RETAIL');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = items.filter((listing) => {
    if (category && listing.category !== category) return false;
    if (savedOnly && !listing.saved) return false;

    if (query.trim().length >= 2) {
      const term = query.trim().toLowerCase();
      return (
        listing.title.toLowerCase().includes(term) ||
        (listing.description ?? '').toLowerCase().includes(term)
      );
    }

    return true;
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const value = Number(price);

    if (title.trim().length < 2) {
      setError('Give it a name people would search for.');
      return;
    }

    if (!Number.isFinite(value) || value < 0) {
      setError('Enter a price.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const created = await createListing({
        title: title.trim(),
        description: description.trim() || undefined,
        price: value,
        quantity: Number(quantity) || 1,
        category: newCategory,
      });

      setItems((current) => [created, ...current]);
      setTitle('');
      setPrice('');
      setDescription('');
      setQuantity('1');
      setComposing(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create that listing.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="text-ink-subtle pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={city ? `Search the market in ${city}` : 'Search the market'}
            className="pl-9"
          />
        </div>

        <Button size="sm" onClick={() => setComposing((value) => !value)}>
          {composing ? <X className="size-4" /> : <Plus className="size-4" />}
          {composing ? 'Cancel' : 'Sell something'}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {CATEGORIES.map((entry) => (
          <button
            key={entry.value}
            type="button"
            onClick={() => setCategory(entry.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              category === entry.value
                ? 'bg-accent border-transparent text-white'
                : 'border-border text-ink-muted hover:text-ink hover:border-ink-subtle',
            )}
          >
            {entry.label}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setSavedOnly((value) => !value)}
          className={cn(
            'ml-auto flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            savedOnly
              ? 'bg-accent border-transparent text-white'
              : 'border-border text-ink-muted hover:text-ink hover:border-ink-subtle',
          )}
        >
          <Bookmark className={cn('size-3.5', savedOnly && 'fill-current')} />
          Saved
        </button>
      </div>

      {composing ? (
        <Card className="mt-5 p-5">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="What are you selling?">
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Second-hand study desk"
                  autoFocus
                />
              </Field>
              <Field label="Price" hint="In your own currency">
                <Input
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  inputMode="decimal"
                  placeholder="25000"
                />
              </Field>
            </div>

            <Field label="Description" hint="Optional">
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="Condition, collection point, anything a buyer would ask."
                className="border-border bg-surface placeholder:text-ink-subtle focus-visible:ring-accent/40 w-full rounded-lg border px-3 py-2 text-[0.875rem] outline-none focus-visible:ring-2"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="How many">
                <Input
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  inputMode="numeric"
                />
              </Field>
              <Field label="Category">
                <select
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value as BusinessCategory)}
                  className="border-border bg-surface focus-visible:ring-accent/40 h-10 w-full rounded-lg border px-3 text-[0.875rem] outline-none focus-visible:ring-2"
                >
                  {CATEGORIES.filter((entry) => entry.value).map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {error ? <p className="text-danger text-xs">{error}</p> : null}

            <Button type="submit" disabled={busy}>
              {busy ? 'Listing…' : 'Put it up'}
            </Button>
          </form>
        </Card>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<ShoppingBag className="size-6" />}
          title={items.length === 0 ? 'Nothing for sale yet' : 'Nothing matches that'}
          description={
            items.length === 0
              ? 'The market fills up when people list things. Put something up and it appears here.'
              : 'Try a different category or clear the search.'
          }
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onChange={(next) =>
                setItems((current) => current.map((entry) => (entry.id === next.id ? next : entry)))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
