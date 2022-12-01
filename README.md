# SIP-015 Indexer

A set of scripts that cache and update voting statistics for SIP-015.

The architecture uses Cloudflare [Workers](https://developers.cloudflare.com/workers/) and [KV](https://developers.cloudflare.com/workers/runtime-apis/kv/).

It is automatically invoked via the cron schedule outlined in `wrangler.toml` and runs three methods once per hour. This allows for up to [15 minutes execution time](https://developers.cloudflare.com/workers/platform/limits/#unbound-usage-model).

> **ALPHA:** Currently method 2 data is being finalized, once done the same structure and data collection will be applied to method 1.

1. Update transactions for each method
2. Update stacking data for each method
3. Update voting data for each method

The resulting data is stored in Cloudflare KV, and accessible through the [SIP-015 API](https://api.sip015.xyz) ([GitHub](https://github.com/whoabuddy/sip015-api)).

Types for each object queried/stored can be found in [types.ts](./types.ts).
