const BASE = process.env.API_BASE ?? 'http://localhost:4000/api/v1';

const checks = [];

function record(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

class Jar {
  constructor() {
    this.cookies = new Map();
  }

  absorb(response) {
    for (const line of response.headers.getSetCookie?.() ?? []) {
      const [pair] = line.split(';');
      const index = pair.indexOf('=');
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      if (value === '') this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  header() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

async function call(path, { method = 'GET', body, jar } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const cookie = jar?.header();
  if (cookie) headers.Cookie = cookie;

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (jar) jar.absorb(response);

  let payload = null;
  try {
    payload = await response.json();
  } catch {}

  return { status: response.status, body: payload };
}

const stamp = Date.now();
const HOUR = 3600000;

async function makeUser(tag, { verify = true } = {}) {
  const jar = new Jar();
  const username = `${tag}${stamp}`.slice(0, 24);
  const email = `${tag}.${stamp}@nexus.local`;

  const registered = await call('/auth/register', {
    method: 'POST',
    jar,
    body: { email, password: 'correct-horse-battery', displayName: `${tag} tester`, username },
  });

  if (verify && registered.body?.verificationToken) {
    await call('/auth/verify-email', {
      method: 'POST',
      body: { token: registered.body.verificationToken },
    });
    await call('/auth/login', {
      method: 'POST',
      jar,
      body: { email, password: 'correct-horse-battery' },
    });
  }

  return { jar, username };
}


async function main() {
  const health = await call('/health');
  if (health.status !== 200) {
    console.error('API not reachable.');
    process.exit(1);
  }

  const owner = await makeUser('shop');
  const buyer = await makeUser('cust');
  const staff = await makeUser('crew');
  const stranger = await makeUser('rand');

  const business = await call('/businesses', {
    method: 'POST',
    jar: owner.jar,
    body: {
      name: `Kigali Coffee Roasters ${stamp}`,
      tagline: 'Beans roasted in Nyamirambo',
      category: 'FOOD',
      city: 'Kigali',
      phone: '+250788000000',
    },
  });
  record('business created', business.status === 201 && Boolean(business.body?.slug), business.body?.slug);
  record('creator is the owner', business.body?.myRole === 'OWNER', business.body?.myRole);
  record('business inherits the profile currency', business.body?.currency === 'RWF', business.body?.currency);

  const shopSlug = business.body?.slug;

  const badPlace = await call('/businesses', {
    method: 'POST',
    jar: owner.jar,
    body: { name: 'Nowhere Ltd', placeSlug: 'place-that-does-not-exist' },
  });
  record('cannot attach a business to a place that does not exist', badPlace.status === 404, `status ${badPlace.status}`);

  const strangerEdit = await call(`/businesses/${shopSlug}`, {
    method: 'PATCH',
    jar: stranger.jar,
    body: { tagline: 'hijacked' },
  });
  record('a stranger cannot edit your business', strangerEdit.status === 403, `status ${strangerEdit.status}`);

  const hired = await call(`/businesses/${shopSlug}/team`, {
    method: 'POST',
    jar: owner.jar,
    body: { username: staff.username, role: 'STAFF' },
  });
  record('owner can add staff', hired.status === 201, `status ${hired.status}`);

  const staffEdit = await call(`/businesses/${shopSlug}`, {
    method: 'PATCH',
    jar: staff.jar,
    body: { tagline: 'staff cannot do this' },
  });
  record('staff cannot edit the business', staffEdit.status === 403, `status ${staffEdit.status}`);

  const staffHire = await call(`/businesses/${shopSlug}/team`, {
    method: 'POST',
    jar: staff.jar,
    body: { username: stranger.username, role: 'STAFF' },
  });
  record('staff cannot hire', staffHire.status === 403, `status ${staffHire.status}`);

  const staffDelete = await call(`/businesses/${shopSlug}`, { method: 'DELETE', jar: staff.jar });
  record('only an owner can close the business', staffDelete.status === 403, `status ${staffDelete.status}`);

  const detail = await call(`/businesses/${shopSlug}`, { jar: buyer.jar });
  record('anyone can read an active business', detail.status === 200 && detail.body?.team?.length === 2, `${detail.body?.team?.length} on the team`);
  record('a reader has no role on it', detail.body?.myRole === null);

  const mine = await call('/businesses?scope=mine', { jar: staff.jar });
  record('staff sees the business under mine', (mine.body ?? []).some((entry) => entry.slug === shopSlug));

  const listing = await call('/listings', {
    method: 'POST',
    jar: owner.jar,
    body: {
      title: `Single origin, 250g ${stamp}`,
      description: 'Washed bourbon from Huye.',
      price: 5000,
      quantity: 3,
      category: 'FOOD',
      condition: 'NEW',
      businessSlug: shopSlug,
      city: 'Kigali',
    },
  });
  record('listing created under the business', listing.status === 201, `status ${listing.status}`);
  record('RWF is stored without cents', listing.body?.priceMinor === 5000, `priceMinor ${listing.body?.priceMinor}`);
  record('RWF renders with no decimal places', !/[.,]\d\d$/.test(listing.body?.price?.display ?? ''), listing.body?.price?.display);
  record('listing carries the business', listing.body?.business?.slug === shopSlug);

  const listingSlug = listing.body?.slug;

  const usd = await call('/listings', {
    method: 'POST',
    jar: owner.jar,
    body: { title: `Consulting hour ${stamp}`, price: 12.5, currency: 'USD', kind: 'SERVICE' },
  });
  record('USD is stored in cents', usd.body?.priceMinor === 1250, `priceMinor ${usd.body?.priceMinor}`);
  record('a service carries no condition', usd.body?.condition === null);

  const junkCurrency = await call('/listings', {
    method: 'POST',
    jar: owner.jar,
    body: { title: 'Priced in nothing', price: 10, currency: 'XYZ' },
  });
  record('an unknown currency is refused', junkCurrency.status === 400, `status ${junkCurrency.status}`);

  const strangerListing = await call('/listings', {
    method: 'POST',
    jar: stranger.jar,
    body: { title: 'Selling under your name', price: 100, businessSlug: shopSlug },
  });
  record('you cannot list under a business you are not on', strangerListing.status === 403, `status ${strangerListing.status}`);

  const staffListing = await call('/listings', {
    method: 'POST',
    jar: staff.jar,
    body: { title: `Staff pick ${stamp}`, price: 2000, businessSlug: shopSlug },
  });
  record('staff can list under the business', staffListing.status === 201, `status ${staffListing.status}`);

  const foreignEdit = await call(`/listings/${listingSlug}`, {
    method: 'PATCH',
    jar: stranger.jar,
    body: { price: 1 },
  });
  record('you cannot edit a listing that is not yours', foreignEdit.status === 403, `status ${foreignEdit.status}`);

  const saved = await call(`/listings/${listingSlug}/save`, {
    method: 'POST',
    jar: buyer.jar,
    body: { saved: true },
  });
  record('a listing can be saved', saved.body?.saved === true);

  const savedList = await call('/listings?saved=true', { jar: buyer.jar });
  record('saved listings can be listed back', (savedList.body ?? []).some((entry) => entry.slug === listingSlug));

  const searched = await call(`/listings?q=${stamp}`, { jar: buyer.jar });
  record('listings are searchable', (searched.body ?? []).length >= 1, `${searched.body?.length} found`);

  const wallet = await call('/wallet', { jar: buyer.jar });
  record('a wallet exists on first look', wallet.status === 200 && Boolean(wallet.body?.wallet?.id));
  record('a new wallet is empty', wallet.body?.wallet?.balance?.minor === 0, `${wallet.body?.wallet?.balance?.minor}`);
  record('the wallet says the rails are not connected', wallet.body?.rails?.connected === false);
  record('the rails note explains why', (wallet.body?.rails?.note ?? '').includes('payment provider'));

  const selfSend = await call('/wallet/transfer', {
    method: 'POST',
    jar: buyer.jar,
    body: { username: buyer.username, amount: 10 },
  });
  record('you cannot send money to yourself', selfSend.status === 400, `status ${selfSend.status}`);

  const brokeSend = await call('/wallet/transfer', {
    method: 'POST',
    jar: buyer.jar,
    body: { username: owner.username, amount: 100 },
  });
  record('an empty wallet cannot send', brokeSend.status === 400, `status ${brokeSend.status}`);

  const ghostSend = await call('/wallet/transfer', {
    method: 'POST',
    jar: buyer.jar,
    body: { username: 'nobody_at_all_here', amount: 10 },
  });
  record('sending to nobody is a 404', ghostSend.status === 404, `status ${ghostSend.status}`);

  const granted = await call('/wallet/dev-grant', {
    method: 'POST',
    jar: buyer.jar,
    body: { amount: 50000 },
  });
  record('a development grant funds the wallet', granted.body?.balance?.minor === 50000, `${granted.body?.balance?.minor}`);

  const sent = await call('/wallet/transfer', {
    method: 'POST',
    jar: buyer.jar,
    body: { username: owner.username, amount: 1000, memo: 'for the beans' },
  });
  record('a transfer leaves the sender', sent.body?.balance?.minor === 49000, `${sent.body?.balance?.minor}`);

  const ownerWallet = await call('/wallet', { jar: owner.jar });
  record('a transfer arrives with the recipient', ownerWallet.body?.wallet?.balance?.minor === 1000, `${ownerWallet.body?.wallet?.balance?.minor}`);
  record('the recipient sees who sent it', ownerWallet.body?.history?.[0]?.counterparty?.profile?.username === buyer.username);
  record('the recipient side is a credit', ownerWallet.body?.history?.[0]?.direction === 'CREDIT');
  record('the memo survives', ownerWallet.body?.history?.[0]?.transaction?.memo === 'for the beans');

  const negative = await call('/wallet/transfer', {
    method: 'POST',
    jar: buyer.jar,
    body: { username: owner.username, amount: -500 },
  });
  record('a negative transfer is refused', negative.status === 400, `status ${negative.status}`);

  const zero = await call('/wallet/transfer', {
    method: 'POST',
    jar: buyer.jar,
    body: { username: owner.username, amount: 0 },
  });
  record('a zero transfer is refused', zero.status === 400, `status ${zero.status}`);

  const racer = await makeUser('race');
  await call('/wallet/dev-grant', { method: 'POST', jar: racer.jar, body: { amount: 1000 } });

  const [raceA, raceB] = await Promise.all([
    call('/wallet/transfer', { method: 'POST', jar: racer.jar, body: { username: owner.username, amount: 800 } }),
    call('/wallet/transfer', { method: 'POST', jar: racer.jar, body: { username: buyer.username, amount: 800 } }),
  ]);
  const raceWins = [raceA, raceB].filter((result) => result.status === 201 || result.status === 200).length;
  record('two simultaneous transfers cannot both drain the wallet', raceWins === 1, `${raceWins} succeeded`);

  const racerWallet = await call('/wallet', { jar: racer.jar });
  record('the racing wallet never goes negative', (racerWallet.body?.wallet?.balance?.minor ?? -1) >= 0, `${racerWallet.body?.wallet?.balance?.minor}`);

  const ownOrder = await call(`/listings/${listingSlug}/order`, {
    method: 'POST',
    jar: owner.jar,
    body: { quantity: 1 },
  });
  record('you cannot order your own listing', ownOrder.status === 400, `status ${ownOrder.status}`);

  const tooMany = await call(`/listings/${listingSlug}/order`, {
    method: 'POST',
    jar: buyer.jar,
    body: { quantity: 99 },
  });
  record('you cannot order more than the stock', tooMany.status === 400, `status ${tooMany.status}`);

  const order = await call(`/listings/${listingSlug}/order`, {
    method: 'POST',
    jar: buyer.jar,
    body: { quantity: 2, note: 'Ground for espresso please' },
  });
  record('an order can be placed', order.status === 201 && Boolean(order.body?.code), order.body?.code);
  record('the order totals quantity times price', order.body?.total?.minor === 10000, `${order.body?.total?.minor}`);
  record('a new order is pending', order.body?.status === 'PENDING');
  record('a new order is unpaid', order.body?.paid === false);

  const orderCode = order.body?.code;

  const earlyPay = await call(`/orders/${orderCode}/pay`, { method: 'POST', jar: buyer.jar });
  record('an unaccepted order cannot be paid', earlyPay.status === 400, `status ${earlyPay.status}`);

  const buyerAccept = await call(`/orders/${orderCode}/accept`, { method: 'POST', jar: buyer.jar });
  record('the buyer cannot accept their own order', buyerAccept.status === 403, `status ${buyerAccept.status}`);

  const strangerRead = await call(`/orders/${orderCode}`, { jar: stranger.jar });
  record('an outsider cannot read the order', strangerRead.status === 404, `status ${strangerRead.status}`);

  const accepted = await call(`/orders/${orderCode}/accept`, { method: 'POST', jar: owner.jar });
  record('the seller can accept', accepted.body?.status === 'ACCEPTED', accepted.body?.status);

  const afterAccept = await call(`/listings/${listingSlug}`, { jar: owner.jar });
  record('accepting takes the stock down', afterAccept.body?.quantity === 1, `${afterAccept.body?.quantity} left`);

  const acceptTwice = await call(`/orders/${orderCode}/accept`, { method: 'POST', jar: owner.jar });
  record('an order cannot be accepted twice', acceptTwice.status === 400, `status ${acceptTwice.status}`);

  const lateCancel = await call(`/orders/${orderCode}/cancel`, { method: 'POST', jar: buyer.jar });
  record('an accepted order cannot be cancelled by the buyer', lateCancel.status === 400, `status ${lateCancel.status}`);

  const sellerPay = await call(`/orders/${orderCode}/pay`, { method: 'POST', jar: owner.jar });
  record('the seller cannot pay the buyer’s order', sellerPay.status === 403, `status ${sellerPay.status}`);

  const balanceBefore = (await call('/wallet', { jar: buyer.jar })).body?.wallet?.balance?.minor;
  const sellerBefore = (await call('/wallet', { jar: owner.jar })).body?.wallet?.balance?.minor;

  const paid = await call(`/orders/${orderCode}/pay`, { method: 'POST', jar: buyer.jar });
  record('an accepted order can be paid', paid.body?.paid === true && paid.body?.status === 'FULFILLED', paid.body?.status);

  const balanceAfter = (await call('/wallet', { jar: buyer.jar })).body?.wallet?.balance?.minor;
  const sellerAfter = (await call('/wallet', { jar: owner.jar })).body?.wallet?.balance?.minor;

  record('paying debits the buyer by the total', balanceBefore - balanceAfter === 10000, `${balanceBefore} -> ${balanceAfter}`);
  record('paying credits the seller by the same', sellerAfter - sellerBefore === 10000, `${sellerBefore} -> ${sellerAfter}`);

  const payTwice = await call(`/orders/${orderCode}/pay`, { method: 'POST', jar: buyer.jar });
  record('an order cannot be paid twice', payTwice.status === 400, `status ${payTwice.status}`);

  const buyerRefund = await call(`/orders/${orderCode}/refund`, { method: 'POST', jar: buyer.jar });
  record('a buyer cannot refund themselves', buyerRefund.status === 403, `status ${buyerRefund.status}`);

  const refunded = await call(`/orders/${orderCode}/refund`, { method: 'POST', jar: owner.jar });
  record('the seller can refund', Boolean(refunded.body?.refundReference), refunded.body?.refundReference);

  const balanceRefunded = (await call('/wallet', { jar: buyer.jar })).body?.wallet?.balance?.minor;
  const sellerRefunded = (await call('/wallet', { jar: owner.jar })).body?.wallet?.balance?.minor;
  record('a refund puts the buyer back where they were', balanceRefunded === balanceBefore, `${balanceRefunded} vs ${balanceBefore}`);
  record('a refund takes it back off the seller', sellerRefunded === sellerBefore, `${sellerRefunded} vs ${sellerBefore}`);

  const refundTwice = await call(`/orders/${orderCode}/refund`, { method: 'POST', jar: owner.jar });
  record('an order cannot be refunded twice', refundTwice.status === 400, `status ${refundTwice.status}`);

  const history = await call('/wallet', { jar: buyer.jar });
  const kinds = (history.body?.history ?? []).map((entry) => entry.transaction?.kind);
  record('the ledger keeps the payment and its reversal', kinds.filter((kind) => kind === 'ORDER_PAYMENT').length === 2, kinds.join(','));

  const declineOrder = await call(`/listings/${listingSlug}/order`, {
    method: 'POST',
    jar: buyer.jar,
    body: { quantity: 1 },
  });
  const declined = await call(`/orders/${declineOrder.body?.code}/decline`, { method: 'POST', jar: owner.jar });
  record('an order can be declined', declined.body?.status === 'DECLINED', declined.body?.status);

  const stockAfterDecline = await call(`/listings/${listingSlug}`, { jar: owner.jar });
  record('declining leaves the stock alone', stockAfterDecline.body?.quantity === 1, `${stockAfterDecline.body?.quantity} left`);

  const cancelOrder = await call(`/listings/${listingSlug}/order`, {
    method: 'POST',
    jar: buyer.jar,
    body: { quantity: 1 },
  });
  const cancelled = await call(`/orders/${cancelOrder.body?.code}/cancel`, { method: 'POST', jar: buyer.jar });
  record('a buyer can cancel while it is pending', cancelled.body?.status === 'CANCELLED', cancelled.body?.status);

  const lastOrder = await call(`/listings/${listingSlug}/order`, {
    method: 'POST',
    jar: buyer.jar,
    body: { quantity: 1 },
  });
  await call(`/orders/${lastOrder.body?.code}/accept`, { method: 'POST', jar: owner.jar });
  const soldOut = await call(`/listings/${listingSlug}`, { jar: owner.jar });
  record('selling the last one marks the listing sold', soldOut.body?.status === 'SOLD', soldOut.body?.status);

  const orderSoldOut = await call(`/listings/${listingSlug}/order`, {
    method: 'POST',
    jar: stranger.jar,
    body: { quantity: 1 },
  });
  record('a sold listing takes no more orders', orderSoldOut.status === 400, `status ${orderSoldOut.status}`);

  const buying = await call('/orders?scope=buying', { jar: buyer.jar });
  const selling = await call('/orders?scope=selling', { jar: owner.jar });
  record('buyers see what they ordered', (buying.body ?? []).length >= 4, `${buying.body?.length}`);
  record('sellers see what was ordered from them', (selling.body ?? []).length >= 4, `${selling.body?.length}`);

  const lastOwnerOut = await call(`/businesses/${shopSlug}/team/${owner.username}`, {
    method: 'DELETE',
    jar: owner.jar,
  });
  record('the last owner cannot be removed', lastOwnerOut.status === 400, `status ${lastOwnerOut.status}`);

  const firedStaff = await call(`/businesses/${shopSlug}/team/${staff.username}`, {
    method: 'DELETE',
    jar: owner.jar,
  });
  record('an owner can remove staff', firedStaff.body?.removed === true);

  const closed = await call(`/businesses/${shopSlug}`, { method: 'DELETE', jar: owner.jar });
  record('an owner can close the business', closed.body?.deleted === true);

  const closedRead = await call(`/businesses/${shopSlug}`, { jar: buyer.jar });
  record('a closed business is gone from public view', closedRead.status === 404, `status ${closedRead.status}`);

  const anonMarket = await call('/listings');
  record('the marketplace requires auth', anonMarket.status === 401, `status ${anonMarket.status}`);

  const anonWallet = await call('/wallet');
  record('the wallet requires auth', anonWallet.status === 401, `status ${anonWallet.status}`);

  const failed = checks.filter((check) => !check.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
