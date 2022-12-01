import {
  AddressStxBalanceResponse,
  Transaction,
} from "@stacks/stacks-blockchain-api-types";

// for getting KV data
export interface KVKeys {
  name: string;
}

// KV binding
export interface Env {
  sip015_index: KVNamespace;
}

// transaction list per yes/no vote address
export interface StxTxList {
  totalProcessed: number;
  totalQueried: number;
  totalResults: number;
  lastUpdated: string;
  results: Transaction[];
}

// vote transactions per voting address
export interface StxVoteTxPerAddress {
  [key: string]: Transaction[];
}

// vote data per voting address
export interface StxVoteDataPerAddress {
  stackingData?: AddressStxBalanceResponse;
  txs?: Transaction[];
}

// vote data per voting address in one object
export interface StxVoteData {
  [key: string]: StxVoteDataPerAddress;
}

export interface StxInvalidVoteReasons {
  [key: string]: string;
}

// overall vote object, stored in KV
export interface StxVoteMethodData {
  validVotes: StxVoteData;
  invalidVotes: StxVoteData;
  invalidVoteReasons: StxInvalidVoteReasons;
}

// metadata for overall vote object
export interface StxMethodVoteStats {
  lastUpdated: string;
  totalVotes: {
    yes: number;
    no: number;
  };
  totalAmounts: {
    yes: number;
    no: number;
  };
  totalTxs?: {
    yes: number;
    no: number;
  };
}
