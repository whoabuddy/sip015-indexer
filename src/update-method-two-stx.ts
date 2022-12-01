import { getStackingData } from "./stx/stx-update-address-stackingdata";
import { updateStxVoteData } from "./stx/stx-update-address-votedata";
import { updateStxVoteTxs } from "./stx/stx-update-address-votetxs";
import { getStxTxs } from "./stx/stx-update-txs";
import { Env } from "./types";
import { awaitAll, dbgLog, STX_ADDRESS_NO, STX_ADDRESS_YES } from "./utils";

export async function updateMethodTwoTxData(env: Env): Promise<void> {
  dbgLog("get or fetch all vote transactions");
  const [yesTxList, noTxList] = await Promise.all([
    getStxTxs(STX_ADDRESS_YES, env),
    getStxTxs(STX_ADDRESS_NO, env),
  ]);

  dbgLog("compiling vote txs per address");
  await updateStxVoteTxs(env, [yesTxList, noTxList]);

  dbgLog("transaction fetching and assembly complete");

  return;
}
export async function updateMethodTwoStackingData(env: Env): Promise<void> {
  dbgLog("getting list of known addresses from kv");
  const kvKnownAddresses = await env.sip015_index.get(
    "sip015-stx-knownaddresses",
    {
      type: "text",
    }
  );
  if (kvKnownAddresses) {
    const knownAddresses = JSON.parse(kvKnownAddresses) as string[];
    dbgLog(`knownAddresses: ${knownAddresses.length}`);
    await awaitAll(env, knownAddresses, getStackingData);
  }

  dbgLog("stacking data assembly complete");
  return;
}
export async function updateMethodTwoVoteData(env: Env): Promise<void> {
  dbgLog("updating vote data for all known users");
  await updateStxVoteData(env);
  return;
}
