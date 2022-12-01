import {
  Env,
  KVKeys,
  StxMethodVoteStats,
  StxInvalidVoteReasons,
  StxVoteData,
  StxVoteMethodData,
} from "../types";
import {
  awaitAll,
  dbgLog,
  STX_ADDRESS_NO,
  STX_ADDRESS_YES,
  STX_VOTE_END,
  STX_VOTE_START,
} from "../utils";

// setup initial object
const voteData: StxVoteData = {};

async function getVotesByAddress(env: Env, key: string): Promise<void> {
  // get the value for a given key
  const value = await env.sip015_index.get(key);
  if (value) {
    const address = key.split("-")[3];
    voteData[address] = JSON.parse(value);
  }
  return;
}

async function filterInvalidVotes(
  voteData: StxVoteData
): Promise<StxVoteMethodData> {
  const validVotes: StxVoteData = {};
  const invalidVotes: StxVoteData = {};
  const invalidVoteReasons: StxInvalidVoteReasons = {};
  for (const [address] of Object.entries(voteData)) {
    dbgLog(`checking ${address}`);
    const txs = voteData[address].txs;
    const stackingData = voteData[address].stackingData;
    if (txs && stackingData) {
      if (txs.length > 1) {
        dbgLog(`invalid vote: voted more than once`);
        invalidVotes[address] = voteData[address];
        invalidVoteReasons[address] = "voted more than once";
        continue;
      }
      if (txs[0].tx_status !== "success") {
        dbgLog(`invalid vote: tx failed`);
        invalidVotes[address] = voteData[address];
        invalidVoteReasons[address] = "tx failed";
        continue;
      }
      if (
        txs[0].block_height < STX_VOTE_START ||
        txs[0].block_height > STX_VOTE_END
      ) {
        dbgLog(`invalid vote: tx outside voting period`);
        invalidVotes[address] = voteData[address];
        invalidVoteReasons[address] = "tx outside voting period";
        continue;
      }
      if (stackingData.locked === "0") {
        dbgLog(`invalid vote: not stacking`);
        invalidVotes[address] = voteData[address];
        invalidVoteReasons[address] = "not stacking";
        continue;
      }
      validVotes[address] = voteData[address];
    } else {
      dbgLog(`invalid vote: no txs or stacking data`);
      invalidVotes[address] = voteData[address];
      invalidVoteReasons[address] = "no txs or stacking data";
      continue;
    }
  }
  return { validVotes, invalidVotes, invalidVoteReasons };
}

async function getVoteStats(
  validVotes: StxVoteData
): Promise<StxMethodVoteStats> {
  const voteStats = {
    totalVotes: {
      yes: 0,
      no: 0,
    },
    totalAmounts: {
      yes: 0,
      no: 0,
    },
    lastUpdated: new Date().toISOString(),
  };
  for (const address in validVotes) {
    const txs = validVotes[address].txs;
    const stackingData = validVotes[address].stackingData;
    if (txs && stackingData) {
      if (txs[0].tx_type === "token_transfer") {
        switch (txs[0].token_transfer.recipient_address) {
          case STX_ADDRESS_YES:
            voteStats.totalVotes.yes += 1;
            voteStats.totalAmounts.yes += parseInt(stackingData.locked);
            break;
          case STX_ADDRESS_NO:
            voteStats.totalVotes.no += 1;
            voteStats.totalAmounts.no += parseInt(stackingData.locked);
            break;
          default:
            dbgLog("invalid vote: tx recipient not yes or no");
            continue;
        }
      }
    }
  }
  return voteStats;
}

export async function updateStxVoteData(env: Env): Promise<void> {
  const kvKeyList = await env.sip015_index.list();
  // filter out the keys that are not sip015-stx-userdata-*
  const kvUserTxsKeyList: KVKeys[] = kvKeyList.keys.filter((key) => {
    return key.name.startsWith("sip015-stx-userdata-");
  });
  // create an array of the key names
  const kvUserTxsKeyNames = kvUserTxsKeyList.map((key) => {
    return key.name;
  });
  // set the values for each key in one object
  await awaitAll(env, kvUserTxsKeyNames, getVotesByAddress);
  dbgLog(`voteData length: ${Object.keys(voteData).length}`);

  // filter out invalid votes
  const { validVotes, invalidVotes, invalidVoteReasons } =
    await filterInvalidVotes(voteData);
  dbgLog(`validVotes: ${Object.keys(validVotes).length}`);
  dbgLog(`invalidVotes: ${Object.keys(invalidVotes).length}`);

  // get valid vote stats
  const methodTwoVoteStats = await getVoteStats(validVotes);

  // add transaction counts to vote stats
  methodTwoVoteStats.totalTxs = {
    yes: 0,
    no: 0,
  };
  for (const [address] of Object.entries(voteData)) {
    const txs = voteData[address].txs;
    if (txs) {
      if (txs[0].tx_type === "token_transfer") {
        switch (txs[0].token_transfer.recipient_address) {
          case STX_ADDRESS_YES:
            methodTwoVoteStats.totalTxs.yes += txs.length;
            break;
          case STX_ADDRESS_NO:
            methodTwoVoteStats.totalTxs.no += txs.length;
            break;
          default:
            dbgLog("invalid vote: tx recipient not yes or no");
            continue;
        }
      }
    }
  }
  dbgLog(`voteStats: ${JSON.stringify(methodTwoVoteStats)}`);

  // assemble the voting data for method two
  const methodTwoVoteData: StxVoteMethodData = {
    validVotes,
    invalidVotes,
    invalidVoteReasons,
  };

  // store the results in kv
  await env.sip015_index.put(
    "sip015-stx-method2-vote",
    JSON.stringify(methodTwoVoteData),
    { metadata: { ...methodTwoVoteStats } }
  );

  return;
}
