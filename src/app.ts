import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { registerSnapHandler } from '@farcaster/snap-hono';
import { getDashboardData, getTopRecipients, getBalance, getTopHolders } from './token.js';
import { buildDashboardPage } from './pages/dashboard.js';
import { buildActivityPage } from './pages/activity.js';
import { buildBalanceInputPage, buildBalanceResultPage } from './pages/balance.js';
import { buildLeaderboardPage } from './pages/leaderboard.js';

const app = new Hono();

// Allow the Farcaster emulator (and any client) to reach this snap
app.use('*', cors({ origin: '*' }));

// Skip JFS verification for POC - pass explicitly since Vercel Edge may not expose process.env to snap-hono
const skipJFS = { skipJFSVerification: true } as any;

function getBaseUrl(req: Request): string {
  if (process.env.SNAP_PUBLIC_BASE_URL) {
    const url = process.env.SNAP_PUBLIC_BASE_URL.replace(/\/$/, '');
    return url.startsWith('http') ? url : `https://${url}`;
  }
  const forwarded = req.headers.get('x-forwarded-host');
  const proto = req.headers.get('x-forwarded-proto') ?? 'http';
  if (forwarded) {
    return `${proto}://${forwarded}`;
  }
  const host = req.headers.get('host') ?? 'localhost:3003';
  return `http://${host}`;
}

// ── Dashboard (landing page) ───────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const baseUrl = getBaseUrl(ctx.request);

  if (ctx.action.type === 'get') {
    const data = await getDashboardData();
    return buildDashboardPage(data, baseUrl);
  }

  // POST to root = "Back" from activity page
  const data = await getDashboardData();
  return buildDashboardPage(data, baseUrl);
}, skipJFS);

// ── Activity page ──────────────────────────────────────────

registerSnapHandler(
  app,
  async (ctx) => {
    const baseUrl = getBaseUrl(ctx.request);
    const recipients = await getTopRecipients(5);
    return buildActivityPage(recipients, baseUrl);
  },
  { path: '/activity', ...skipJFS },
);

// ── Balance input page ─────────────────────────────────────

registerSnapHandler(
  app,
  async (ctx) => {
    const baseUrl = getBaseUrl(ctx.request);
    return buildBalanceInputPage(baseUrl);
  },
  { path: '/balance-input', ...skipJFS },
);

// ── Balance result (POST with address input) ───────────────

registerSnapHandler(
  app,
  async (ctx) => {
    const baseUrl = getBaseUrl(ctx.request);
    if (ctx.action.type === 'get') {
      return buildBalanceInputPage(baseUrl);
    }
    const address = (ctx.action.inputs?.address as string) || '';
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return buildBalanceInputPage(baseUrl);
    }
    const balance = await getBalance(address as `0x${string}`);
    return buildBalanceResultPage(address, balance, baseUrl);
  },
  { path: '/balance', ...skipJFS },
);

// ── Leaderboard page ───────────────────────────────────────

registerSnapHandler(
  app,
  async (ctx) => {
    const baseUrl = getBaseUrl(ctx.request);
    const holders = await getTopHolders(5);
    return buildLeaderboardPage(holders, baseUrl);
  },
  { path: '/leaderboard', ...skipJFS },
);

export default app;
