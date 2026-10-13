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
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { listingImage } from '@/lib/photos';
import {
  createListing,
  placeOrder,
  saveListing,
  type BusinessCategory,
  type Listing,
} from '@/lib/market-client';
import { ImagePicker } from '@/components/app/image-picker';
import { useErrorText, useT } from '@/i18n/client';

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
  const t = useT();
  const errorText = useErrorText();

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
      setError(cause instanceof Error ? cause.message : t('market.orderFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      {listingImage({ title: listing.title, id: listing.id, imageUrl: listing.coverUrl }) ? (
        <img
          src={listingImage({ title: listing.title, id: listing.id, imageUrl: listing.coverUrl })!}
          alt=""
          className="aspect-[4/3] w-full object-cover"
        />
      ) : null}

      <div className="flex items-center gap-1.5 px-4 pt-4">
        <Badge variant="neutral" size="sm">
          {listing.kind === 'SERVICE' ? <Wrench className="size-3" /> : <Package className="size-3" />}
          {t(`enums.business.${listing.category}`)}
        </Badge>
        {soldOut ? (
          <Badge variant="warning" size="sm">
            {t('market.soldOut')}
          </Badge>
        ) : null}
        <button
          type="button"
          onClick={() => void toggleSave()}
          disabled={busy}
          aria-label={listing.saved ? t('market.remove') : t('market.saveListing')}
          aria-pressed={listing.saved}
          className="text-ink-subtle hover:text-ink hover:bg-surface-raised ml-auto grid size-8 place-items-center rounded-lg transition-colors disabled:opacity-50"
        >
          <Bookmark className={cn('size-4', listing.saved && 'text-accent fill-current')} />
        </button>
      </div>

      <div className="flex flex-1 flex-col px-4 pt-2 pb-4">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 min-w-0 text-[0.9375rem] font-medium leading-snug">
            {listing.title}
          </h3>

          <p className="num mt-1.5 text-[1.0625rem] font-semibold">
            {listing.price.display}
            {listing.negotiable ? (
              <span className="text-ink-subtle ml-1.5 font-sans text-xs font-normal">
                {t('market.negotiable')}
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
                href={`/market?business=${listing.business.slug}`}
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
            {listing.kind === 'PRODUCT' && !soldOut ? <span>· {t('market.left', { n: listing.quantity })}</span> : null}
          </div>
        </div>

        {error ? <p className="text-danger mt-2.5 text-xs">{errorText(error)}</p> : null}

        <div className="mt-3.5 flex items-center gap-2">
          {listing.isMine ? (
            <Badge>{t('market.yours')}</Badge>
          ) : soldOut ? (
            <Badge>{t('market.sold')}</Badge>
          ) : ordered ? (
            <p className="text-module-nearby flex items-center gap-1.5 text-xs">
              <Check className="size-3.5" /> {t('market.orderSent')}
            </p>
          ) : (
            <Button size="sm" variant="secondary" className="w-full" onClick={() => void order()} disabled={busy}>
              <ShoppingBag className="size-4" /> {t('market.requestToBuy')}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export function MarketBoard({ listings, city }: { listings: Listing[]; city: string | null }) {
  const router = useRouter();
  const t = useT();
  const errorText = useErrorText();

  const [items, setItems] = useState(listings);
  const [category, setCategory] = useState<BusinessCategory | ''>('');
  const [query, setQuery] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const params = useSearchParams();
  const [composing, setComposing] = useState(params.get('new') === '1');
  const [spotlight, setSpotlight] = useState<string | null>(params.get('listing'));
  const businessSlug = params.get('business');
  const businessName = businessSlug ? listings.find((listing) => listing.business?.slug === businessSlug)?.business?.name ?? businessSlug : null;

  useEffect(() => {
    if (!spotlight) return;
    document.getElementById(`listing-${spotlight}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = window.setTimeout(() => setSpotlight(null), 2600);
    return () => window.clearTimeout(timer);
  }, [spotlight]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [newCategory, setNewCategory] = useState<BusinessCategory>('RETAIL');
  const [cover, setCover] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = items.filter((listing) => {
    if (businessSlug && listing.business?.slug !== businessSlug) return false;
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
      setError(t('market.nameIt'));
      return;
    }

    if (!Number.isFinite(value) || value < 0) {
      setError(t('market.enterPrice'));
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
        coverUrl: cover ?? undefined,
      });

      setItems((current) => [created, ...current]);
      setCover(null);
      setTitle('');
      setPrice('');
      setDescription('');
      setQuantity('1');
      setComposing(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('market.createFailed'));
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
            placeholder={city ? t('market.searchIn', { city }) : t('market.search')}
            className="pl-9"
          />
        </div>

        <Button size="sm" onClick={() => setComposing((value) => !value)}>
          {composing ? <X className="size-4" /> : <Plus className="size-4" />}
          {composing ? t('common.cancel') : t('market.sell')}
        </Button>
      </div>

      {businessName ? (
        <div className="border-line bg-surface mt-4 flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm">
          <Store className="text-ink-muted size-4" />
          <span className="flex-1">{t('market.fromBusiness', { name: businessName })}</span>
          <Link href="/market" className="text-accent font-medium hover:underline">
            {t('market.showAll')}
          </Link>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {CATEGORIES.map((entry) => (
          <button
            key={entry.value}
            type="button"
            onClick={() => setCategory(entry.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              category === entry.value
                ? 'bg-accent text-accent-ink border-transparent'
                : 'border-border text-ink-muted hover:text-ink hover:border-ink-subtle',
            )}
          >
            {entry.value ? t(`enums.business.${entry.value}`) : t('market.everything')}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setSavedOnly((value) => !value)}
          className={cn(
            'ml-auto flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            savedOnly
              ? 'bg-accent text-accent-ink border-transparent'
              : 'border-border text-ink-muted hover:text-ink hover:border-ink-subtle',
          )}
        >
          <Bookmark className={cn('size-3.5', savedOnly && 'fill-current')} />
          {t('market.saved')}
        </button>
      </div>

      {composing ? (
        <Card className="mt-5 p-5">
          <form onSubmit={submit} className="space-y-4">
            <ImagePicker folder="listings" value={cover} onChange={setCover} label={t('social.picker.listingPhoto')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('market.form.what')}>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t('market.form.whatPlaceholder')}
                  autoFocus
                />
              </Field>
              <Field label={t('market.form.price')} hint={t('market.form.priceHint')}>
                <Input
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  inputMode="decimal"
                  placeholder="25000"
                />
              </Field>
            </div>

            <Field label={t('market.form.description')} hint={t('common.optional')}>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder={t('market.form.descriptionPlaceholder')}
                className="border-border bg-surface placeholder:text-ink-subtle focus-visible:ring-accent/40 w-full rounded-lg border px-3 py-2 text-[0.875rem] outline-none focus-visible:ring-2"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('market.form.howMany')}>
                <Input
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  inputMode="numeric"
                />
              </Field>
              <Field label={t('market.form.category')}>
                <select
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value as BusinessCategory)}
                  className="border-border bg-surface focus-visible:ring-accent/40 h-10 w-full rounded-lg border px-3 text-[0.875rem] outline-none focus-visible:ring-2"
                >
                  {CATEGORIES.filter((entry) => entry.value).map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {t(`enums.business.${entry.value as BusinessCategory}`)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {error ? <p className="text-danger text-xs">{errorText(error)}</p> : null}

            <Button type="submit" disabled={busy}>
              {busy ? t('market.form.listing') : t('market.form.putUp')}
            </Button>
          </form>
        </Card>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<ShoppingBag className="size-6" />}
          title={items.length === 0 ? t('market.empty.noneTitle') : t('market.empty.noMatchTitle')}
          description={
            items.length === 0
              ? t('market.empty.noneBody')
              : t('market.empty.noMatchBody')
          }
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((listing) => (
            <div
              key={listing.id}
              id={`listing-${listing.slug}`}
              className={cn('scroll-mt-24 rounded-2xl transition', spotlight === listing.slug && 'ring-accent ring-2 ring-offset-4 ring-offset-[var(--ground)]')}
            >
              <ListingCard
                listing={listing}
                onChange={(next) =>
                  setItems((current) => current.map((entry) => (entry.id === next.id ? next : entry)))
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
