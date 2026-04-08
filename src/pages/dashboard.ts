import type { TokenDashboardData } from '../token.js';
import { ZABAL } from '../token.js';
import { formatTokenAmount, formatUsd } from '../utils.js';

export function buildDashboardPage(data: TokenDashboardData, baseUrl: string) {
  const price = formatUsd(data.priceUsd);
  const mcap = formatUsd(data.marketCapUsd);
  const burned = formatTokenAmount(data.burned);
  const distributed = formatTokenAmount(data.distributed);

  const burnPct = Number(data.burned * 10000n / data.totalSupply) / 100;

  return {
    version: '1.0' as const,
    theme: { accent: 'amber' as const },
    ui: {
      root: 'page',
      elements: {
        page: {
          type: 'stack' as const,
          props: { direction: 'vertical' as const, gap: 'md' as const },
          children: ['header', 'stats', 'divider', 'burns_section', 'btn_row_1', 'btn_row_2', 'btn_row_3'],
        },
        header: {
          type: 'item' as const,
          props: { title: '$ZABAL', description: "Zaal's Community Token on Base" },
          children: ['chain_badge'],
        },
        chain_badge: {
          type: 'badge' as const,
          props: { label: 'Base', color: 'blue' as const },
        },
        stats: {
          type: 'item_group' as const,
          props: { separator: true },
          children: ['price_item', 'mcap_item', 'holders_item'],
        },
        price_item: {
          type: 'item' as const,
          props: { title: 'Price', description: price },
        },
        mcap_item: {
          type: 'item' as const,
          props: { title: 'Market Cap', description: mcap },
        },
        holders_item: {
          type: 'item' as const,
          props: { title: 'Holders', description: `${data.holders}` },
        },
        divider: {
          type: 'separator' as const,
          props: {},
        },
        burns_section: {
          type: 'stack' as const,
          props: { direction: 'vertical' as const, gap: 'sm' as const },
          children: ['burned_item', 'burn_progress', 'distributed_item'],
        },
        burned_item: {
          type: 'item' as const,
          props: { title: `Burned: ${burned} ZABAL`, description: 'Sent to dead address' },
          children: ['burn_badge'],
        },
        burn_badge: {
          type: 'badge' as const,
          props: { label: 'Deflationary', color: 'red' as const, icon: 'flame' as const },
        },
        burn_progress: {
          type: 'progress' as const,
          props: {
            value: burnPct,
            max: 100,
            label: `${burnPct.toFixed(2)}% of supply burned`,
          },
        },
        distributed_item: {
          type: 'item' as const,
          props: { title: `Sent from ZAAL: ${distributed} ZABAL`, description: 'Community distributions' },
          children: ['dist_badge'],
        },
        dist_badge: {
          type: 'badge' as const,
          props: { label: 'Community', color: 'green' as const, icon: 'send' as const },
        },
        btn_row_1: {
          type: 'stack' as const,
          props: { direction: 'horizontal' as const, gap: 'sm' as const },
          children: ['swap_btn', 'send_btn'],
        },
        btn_row_2: {
          type: 'stack' as const,
          props: { direction: 'horizontal' as const, gap: 'sm' as const },
          children: ['more_btn', 'leaderboard_btn'],
        },
        btn_row_3: {
          type: 'stack' as const,
          props: { direction: 'horizontal' as const, gap: 'sm' as const },
          children: ['balance_btn', 'newsletter_btn', 'share_btn'],
        },
        swap_btn: {
          type: 'button' as const,
          props: { label: 'Swap', icon: 'refresh-cw' as const },
          on: {
            press: {
              action: 'swap_token' as const,
              params: { buyToken: ZABAL.caip19 },
            },
          },
        },
        send_btn: {
          type: 'button' as const,
          props: { label: 'Send', icon: 'coins' as const },
          on: {
            press: {
              action: 'send_token' as const,
              params: { token: ZABAL.caip19 },
            },
          },
        },
        more_btn: {
          type: 'button' as const,
          props: { label: 'Transfers', variant: 'primary' as const },
          on: {
            press: {
              action: 'submit' as const,
              params: { target: `${baseUrl}/activity` },
            },
          },
        },
        leaderboard_btn: {
          type: 'button' as const,
          props: { label: 'Top Holders', icon: 'bar-chart' as const },
          on: {
            press: {
              action: 'submit' as const,
              params: { target: `${baseUrl}/leaderboard` },
            },
          },
        },
        balance_btn: {
          type: 'button' as const,
          props: { label: 'Balance', icon: 'wallet' as const },
          on: {
            press: {
              action: 'submit' as const,
              params: { target: `${baseUrl}/balance-input` },
            },
          },
        },
        newsletter_btn: {
          type: 'button' as const,
          props: { label: 'Year of the ZABAL', icon: 'book-open' as const },
          on: {
            press: {
              action: 'open_url' as const,
              params: { target: 'https://paragraph.xyz/@zabal' },
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
                text: '$ZABAL - the community token for The ZAO on Base',
                embeds: [baseUrl],
              },
            },
          },
        },
      },
    },
  };
}
