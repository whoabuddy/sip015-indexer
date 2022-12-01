import { Transaction } from "@stacks/stacks-blockchain-api-types";
import { Env, StxTxList } from "../types";
import { dbgLog, fetchJson, STX_API } from "../utils";

export async function getStxTxs(address: string, env: Env): Promise<StxTxList> {
  dbgLog("getting stx transactions from kv");
  const { value, metadata } = await env.sip015_index.getWithMetadata(
    `sip015-stx-votetxs-${address}`,
    {
      type: "json",
    }
  );

  // if it exists, check against current API total
  if (value && metadata) {
    dbgLog(`found in KV: ${address}`);
    const apiTxList = await fetchStxTxs(address, false);
    const apiTotal = apiTxList.totalQueried;
    if (apiTotal === (metadata as StxTxList).totalQueried) {
      dbgLog(`totals match, responding with KV data`);
      const txList = {
        ...(metadata as StxTxList),
        results: value as Transaction[],
      };
      return txList;
    }
  }

  // otherwise, fetch all TX from API and store in KV
  dbgLog(`fetching fresh transaction data from the API`);
  const txList = await fetchStxTxs(address, true);
  dbgLog(`storing transaction data in KV`);
  await env.sip015_index.put(
    `sip015-stx-votetxs-${address}`,
    JSON.stringify(txList.results),
    {
      metadata: {
        totalProcessed: txList.totalProcessed,
        totalQueried: txList.totalQueried,
        totalResults: txList.totalResults,
        lastUpdated: txList.lastUpdated,
      },
    }
  );
  return txList;
}

async function fetchStxTxs(
  address: string,
  checkAll = false
): Promise<StxTxList> {
  let counter = 0;
  let limit = 50;
  let total = 0;
  let txResults = [];

  const url = new URL(`/extended/v1/address/${address}/transactions`, STX_API);
  dbgLog(`fetching transactions for ${address}`);
  do {
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("offset", counter.toString());
    const data = await fetchJson(url.toString());
    if (total === 0) total = data.total;
    for (const tx of data.results) {
      txResults.push(tx);
      counter++;
    }
    checkAll && dbgLog(`counter: ${counter} total: ${total}`);
  } while (checkAll && counter < total);

  const finalTxList = {
    totalProcessed: counter,
    totalQueried: total,
    totalResults: txResults.length,
    lastUpdated: new Date().toISOString(),
    results: txResults,
  };
  return finalTxList;
}
