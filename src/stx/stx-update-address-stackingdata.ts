import { AddressStxBalanceResponse } from "@stacks/stacks-blockchain-api-types";
import { Env, StxVoteDataPerAddress } from "../types";
import { dbgLog, fetchJson, STX_API, STX_VOTE_START } from "../utils";

async function fetchStackingData(address: string) {
  const url = new URL(`extended/v1/address/${address}/stx`, STX_API);
  url.searchParams.set("until_block", STX_VOTE_START.toString());
  dbgLog(`fetching stacking data for ${address}`);
  const stackingData: AddressStxBalanceResponse = await fetchJson(
    url.toString()
  );
  return stackingData;
}

export async function getStackingData(
  env: Env,
  address: string
): Promise<void> {
  // get stacking data from KV if it exists
  const value: StxVoteDataPerAddress | null = await env.sip015_index.get(
    `sip015-stx-userdata-${address}`,
    {
      type: "json",
    }
  );

  if (value && value.stackingData) {
    dbgLog(`found in KV: ${address}`);
    return;
  }
  // otherwise fetch and store in KV
  dbgLog(`not found in KV, fetching from API`);
  const stackingData = await fetchStackingData(address);
  const voteData: StxVoteDataPerAddress = {
    stackingData: stackingData,
    txs: value?.txs,
  };
  await env.sip015_index.put(
    `sip015-stx-userdata-${address}`,
    JSON.stringify(voteData)
  );
}
