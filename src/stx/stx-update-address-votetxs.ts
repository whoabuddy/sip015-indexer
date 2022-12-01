import { Transaction } from "@stacks/stacks-blockchain-api-types";
import {
  Env,
  StxTxList,
  StxVoteDataPerAddress,
  StxVoteTxPerAddress,
} from "../types";
import { awaitAll, dbgLog } from "../utils";

const votesByAddress: StxVoteTxPerAddress = {};

export async function updateStxVoteTxs(
  env: Env,
  voteTxs: StxTxList[]
): Promise<void> {
  dbgLog("getting list of known addresses");
  const knownAddresses: string[] = [];
  voteTxs.map((txList) => {
    return txList.results.map((tx) => {
      knownAddresses.push(tx.sender_address);
    });
  });
  dbgLog(`knownAddresses length: ${knownAddresses.length}`);
  const uniqueKnownAddresses = Array.from(new Set(knownAddresses));
  dbgLog(`uniqueKnownAddresses length: ${uniqueKnownAddresses.length}`);
  await env.sip015_index.put(
    "sip015-stx-knownaddresses",
    JSON.stringify(uniqueKnownAddresses)
  );

  dbgLog("deleting unknown addresses from kv");
  // get all keys from the kv store
  const kvKeyList = await env.sip015_index.list();
  // filter out the keys that are not sip015-stx-usertxs-*
  const kvUserTxsKeyList = kvKeyList.keys.filter((key) => {
    return key.name.startsWith("sip015-stx-userdata-");
  });
  // filter out the keys that are not in the knownAddresses list
  const kvUnknownAddressesKeyList = kvUserTxsKeyList.filter((key) => {
    return !uniqueKnownAddresses.includes(key.name.split("-")[3]);
  });
  // delete the unknown addresses
  for await (const key of kvUnknownAddressesKeyList) {
    dbgLog(`deleting ${key.name}`);
    await env.sip015_index.delete(key.name);
  }

  dbgLog("compiling vote txs per address");
  uniqueKnownAddresses.map((address) => {
    voteTxs.map((txList) => {
      txList.results.map((tx) => {
        if (tx.sender_address === address) {
          if (!votesByAddress[address]) {
            votesByAddress[address] = [];
          }
          votesByAddress[address].push(tx);
        }
      });
    });
  });

  dbgLog("udpating vote txs per address");
  await awaitAll(env, uniqueKnownAddresses, updateVotesPerAddress);

  return;
}

async function updateVotesPerAddress(env: Env, address: string): Promise<void> {
  const value: StxVoteDataPerAddress | null = await env.sip015_index.get(
    `sip015-stx-userdata-${address}`,
    {
      type: "json",
    }
  );
  if (value && value.txs) {
    dbgLog(`found vote txs in KV`);
    dbgLog(`txid: ${value.txs[0].tx_id}`);
    const voteTxs = value.txs as Transaction[];
    if (voteTxs.length === votesByAddress[address].length) {
      dbgLog(
        `vote txs are the same length (${voteTxs.length} - ${votesByAddress[address].length}), skipping`
      );
      return;
    }
    dbgLog(
      `vote txs are different lengths (${voteTxs.length} - ${votesByAddress[address].length}), updating`
    );
  }
  dbgLog(`updating value in KV: ${address}`);
  const voteData: StxVoteDataPerAddress = {
    stackingData: value?.stackingData,
    txs: votesByAddress[address],
  };
  await env.sip015_index.put(
    `sip015-stx-userdata-${address}`,
    JSON.stringify(voteData)
  );
  return;
}
