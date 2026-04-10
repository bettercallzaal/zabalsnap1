import { createPublicClient, http, parseAbi, type Address } from 'viem';
import { base } from 'viem/chains';

// ── Constants ──────────────────────────────────────────────

export const ZABAL = {
  address: '0xbB48f19B0494Ff7C1fE5Dc2032aeEE14312f0b07' as Address,
  chainId: 8453,
  decimals: 18,
  symbol: 'ZABAL',
  caip19: 'eip155:8453/erc20:0xbB48f19B0494Ff7C1fE5Dc2032aeEE14312f0b07',
  zaalAddress: '0x7234c36A71ec237c2Ae7698e8916e0735001E9Af' as Address,
  burnAddress: '0x000000000000000000000000000000000000dEaD' as Address,
} as const;

const erc20Abi = parseAbi([
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

const client = createPublicClient({
  chain: base,
  transport: http(),
});

// ── Types ──────────────────────────────────────────────────

export interface TokenDashboardData {
  totalSupply: bigint;
  burned: bigint;
  zaalBalance: bigint;
  distributed: bigint;
  holders: number;
  priceUsd: number;
  marketCapUsd: number;
}

export interface TopRecipient {
  address: Address;
  amount: bigint;
}

// ── Data Fetching ──────────────────────────────────────────

async function fetchPrice(): Promise<{ priceUsd: number; marketCapUsd: number }> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${ZABAL.address}`
    );
    const data = await res.json() as any;
    const pair = data?.pairs?.[0];
    if (pair) {
      return {
        priceUsd: parseFloat(pair.priceUsd) || 0.000000141,
        marketCapUsd: pair.marketCap || pair.fdv || 14100,
      };
    }
  } catch {
    // fallback on error
  }
  return { priceUsd: 0.000000141, marketCapUsd: 14100 };
}

export async function getDashboardData(): Promise<TokenDashboardData> {
  const [totalSupply, burned, zaalBalance] = await client.multicall({
    contracts: [
      { address: ZABAL.address, abi: erc20Abi, functionName: 'totalSupply' },
      { address: ZABAL.address, abi: erc20Abi, functionName: 'balanceOf', args: [ZABAL.burnAddress] },
      { address: ZABAL.address, abi: erc20Abi, functionName: 'balanceOf', args: [ZABAL.zaalAddress] },
    ],
  });

  const supply = totalSupply.result ?? 0n;
  const burnedAmt = burned.result ?? 0n;
  const zaalBal = zaalBalance.result ?? 0n;

  const distributed = supply - burnedAmt - zaalBal;

  const [{ priceUsd, marketCapUsd }, holders] = await Promise.all([
    fetchPrice(),
    getHolderCount(),
  ]);

  return {
    totalSupply: supply,
    burned: burnedAmt,
    zaalBalance: zaalBal,
    distributed,
    holders,
    priceUsd,
    marketCapUsd,
  };
}

export async function getHolderCount(): Promise<number> {
  try {
    const currentBlock = await client.getBlockNumber();
    const fromBlock = currentBlock - 1_300_000n; // ~30 days

    const logs = await client.getLogs({
      address: ZABAL.address,
      event: {
        type: 'event',
        name: 'Transfer',
        inputs: [
          { type: 'address', name: 'from', indexed: true },
          { type: 'address', name: 'to', indexed: true },
          { type: 'uint256', name: 'value' },
        ],
      },
      fromBlock: fromBlock > 0n ? fromBlock : 0n,
      toBlock: 'latest',
    });

    const recipients = new Set<string>();
    for (const log of logs) {
      const to = log.args.to as string;
      if (
        to &&
        to.toLowerCase() !== ZABAL.burnAddress.toLowerCase() &&
        to !== '0x0000000000000000000000000000000000000000'
      ) {
        recipients.add(to.toLowerCase());
      }
    }

    return recipients.size || 340; // fallback if no logs
  } catch {
    return 340;
  }
}

export async function getTopRecipients(limit: number = 5): Promise<TopRecipient[]> {
  try {
    // Get recent block (~last 30 days on Base, ~2s blocks)
    const currentBlock = await client.getBlockNumber();
    const fromBlock = currentBlock - 1_300_000n; // ~30 days

    const logs = await client.getLogs({
      address: ZABAL.address,
      event: {
        type: 'event',
        name: 'Transfer',
        inputs: [
          { type: 'address', name: 'from', indexed: true },
          { type: 'address', name: 'to', indexed: true },
          { type: 'uint256', name: 'value' },
        ],
      },
      args: { from: ZABAL.zaalAddress },
      fromBlock: fromBlock > 0n ? fromBlock : 0n,
      toBlock: 'latest',
    });

    const totals = new Map<string, bigint>();
    for (const log of logs) {
      const to = log.args.to as string;
      const value = log.args.value as bigint;
      if (to && value) {
        totals.set(to, (totals.get(to) ?? 0n) + value);
      }
    }

    return [...totals.entries()]
      .filter(([addr]) => addr.toLowerCase() !== ZABAL.burnAddress.toLowerCase())
      .sort((a, b) => (b[1] > a[1] ? 1 : -1))
      .slice(0, limit)
      .map(([address, amount]) => ({ address: address as Address, amount }));
  } catch {
    return [];
  }
}

export async function getBalance(address: Address): Promise<bigint> {
  const balance = await client.readContract({
    address: ZABAL.address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  });
  return balance;
}

export async function getTopHolders(limit: number = 5): Promise<Array<{ address: Address; balance: bigint }>> {
  try {
    // Get recent block (~last 30 days)
    const currentBlock = await client.getBlockNumber();
    const fromBlock = currentBlock - 1_300_000n;

    const logs = await client.getLogs({
      address: ZABAL.address,
      event: {
        type: 'event',
        name: 'Transfer',
        inputs: [
          { type: 'address', name: 'from', indexed: true },
          { type: 'address', name: 'to', indexed: true },
          { type: 'uint256', name: 'value' },
        ],
      },
      fromBlock: fromBlock > 0n ? fromBlock : 0n,
      toBlock: 'latest',
    });

    // Collect unique addresses
    const addresses = new Set<string>();
    for (const log of logs) {
      if (log.args.to) addresses.add(log.args.to as string);
      if (log.args.from) addresses.add(log.args.from as string);
    }

    addresses.delete(ZABAL.burnAddress.toLowerCase());
    addresses.delete(ZABAL.burnAddress);
    addresses.delete('0x0000000000000000000000000000000000000000');

    const addrArray = [...addresses].slice(0, 20) as Address[];
    if (addrArray.length === 0) return [];

    const balances = await client.multicall({
      contracts: addrArray.map((addr) => ({
        address: ZABAL.address,
        abi: erc20Abi,
        functionName: 'balanceOf' as const,
        args: [addr],
      })),
    });

    return addrArray
      .map((addr, i) => ({
        address: addr,
        balance: (balances[i].result as bigint) ?? 0n,
      }))
      .filter((h) => h.balance > 0n)
      .sort((a, b) => (b.balance > a.balance ? 1 : -1))
      .slice(0, limit);
  } catch {
    return [];
  }
}
