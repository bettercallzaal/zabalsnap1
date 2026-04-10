import type { TopRecipient, TokenDashboardData } from '../token.js';
import { ZABAL } from '../token.js';
import { formatTokenAmount, shortenAddress } from '../utils.js';

export function buildActivityPage(recipients: TopRecipient[], baseUrl: string, data: TokenDashboardData) {
  const bars = recipients.map((r) => ({
    label: `${shortenAddress(r.address)} ${formatTokenAmount(r.amount)}`,
    value: Number(r.amount / BigInt(1e18)),
  }));

  const maxVal = bars.length > 0 ? Math.max(...bars.map((b) => b.value)) : 1;

  // Compute real supply breakdown percentages from on-chain data
  const burnedPct = data.totalSupply > 0n
    ? Number(data.burned * 10000n / data.totalSupply) / 100
    : 0;
  const zaalPct = data.totalSupply > 0n
    ? Number(data.zaalBalance * 10000n / data.totalSupply) / 100
    : 0;
  const distributedPct = data.totalSupply > 0n
    ? Number(data.distributed * 10000n / data.totalSupply) / 100
    : 0;

  return {
    version: '1.0' as const,
    theme: { accent: 'amber' as const },
    ui: {
      root: 'page',
      elements: {
        page: {
          type: 'stack' as const,
          props: { direction: 'vertical' as const, gap: 'md' as const },
          children: ['title', 'recipients_label', 'recipients_chart', 'supply_label', 'supply_chart', 'btn_row'],
        },
        title: {
          type: 'text' as const,
          props: { content: 'ZABAL Activity', weight: 'bold' as const },
        },
        recipients_label: {
          type: 'text' as const,
          props: { content: 'Top Recipients from ZAAL', size: 'sm' as const },
        },
        recipients_chart: {
          type: 'bar_chart' as const,
          props: {
            bars: bars.length > 0 ? bars : [{ label: 'No transfers yet', value: 0 }],
            color: 'amber' as const,
            max: maxVal || 1,
          },
        },
        supply_label: {
          type: 'text' as const,
          props: { content: 'Supply Breakdown', size: 'sm' as const },
        },
        supply_chart: {
          type: 'bar_chart' as const,
          props: {
            bars: [
              { label: `Burned (${burnedPct.toFixed(1)}%)`, value: burnedPct },
              { label: `ZAAL Wallet (${zaalPct.toFixed(1)}%)`, value: zaalPct },
              { label: `Distributed (${distributedPct.toFixed(1)}%)`, value: distributedPct },
            ],
            color: 'green' as const,
            max: 100,
          },
        },
        btn_row: {
          type: 'stack' as const,
          props: { direction: 'horizontal' as const, gap: 'sm' as const, justify: 'between' as const },
          children: ['back_btn', 'share_btn', 'basescan_btn'],
        },
        back_btn: {
          type: 'button' as const,
          props: { label: 'Back', icon: 'arrow-left' as const },
          on: {
            press: {
              action: 'submit' as const,
              params: { target: `${baseUrl}/` },
            },
          },
        },
        share_btn: {
          type: 'button' as const,
          props: { label: 'Share', icon: 'share' as const },
          on: {
            press: {
              action: 'compose_cast' as const,
              params: {
                text: `$ZABAL supply: ${burnedPct.toFixed(1)}% burned, ${distributedPct.toFixed(1)}% distributed to the community`,
                embeds: [`${baseUrl}/activity`],
              },
            },
          },
        },
        basescan_btn: {
          type: 'button' as const,
          props: { label: 'BaseScan', variant: 'primary' as const, icon: 'external-link' as const },
          on: {
            press: {
              action: 'open_url' as const,
              params: {
                target: `https://basescan.org/token/${ZABAL.address}`,
              },
            },
          },
        },
      },
    },
  };
}
