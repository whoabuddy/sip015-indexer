import { StacksMainnet } from "micro-stacks/network";
import throttledQueue from "throttled-queue";
import { Env } from "./types";

/////////////////////////
// CONSTANTS
/////////////////////////

// logging config
const ENABLE_LOGS = true;

// BTC
// https://explorer.btc.com/btc/adapter?type=api-doc
export const BTC_API = "https://chain.api.btc.com/v3/address/";
export const BTC_ADDRESS_YES = "11111111111111X6zHB1ZC2FmtnqJ";
export const BTC_ADDRESS_NO = "1111111111111117CrbcZgemVNFx8";
export const BTC_VOTE_START = 762550;
export const BTC_VOTE_END = 766750;

// STX
export const STX_NETWORK = new StacksMainnet();
export const STX_API = "https://stacks-node-api.mainnet.stacks.co";
export const STX_ADDRESS_YES = "SP00000000000003SCNSJTCHE66N2PXHX";
export const STX_ADDRESS_NO = "SP00000000000000DSQJTCHE66XE1NHQ";
export const STX_VOTE_START = 82914;
export const STX_VOTE_END = 87114;
export const POX_CONTRACT = "SP000000000000000000002Q6VF78.pox";
export const POX_FUNCTION = "get-stacker-info";

/////////////////////////
// HELPERS
/////////////////////////

// logging
export const dbgLog = (msg: string) => ENABLE_LOGS && console.log(msg);
export const printDivider = () => console.log(`------------------------------`);

// generic queue throttled to 1 request per second
export const throttle = throttledQueue(1, 750, true);

// throttled fetch that returns JSON on success
export const fetchJson = async (url: string): Promise<any> => {
  dbgLog(`fetchJson: ${url.slice(0, 25)}...${url.slice(-25)}`);
  const response = await throttle(() => fetch(url));
  if (response.status === 200) {
    const json = await response.json();
    return json;
  }
  throw new Error(
    `fetchJson: ${url} ${response.status} ${response.statusText}`
  );
};

// perform an action across a series of promises
// provides both the environment and element of the list
// credit: https://stackoverflow.com/a/58531652
export const awaitAll = async (env: Env, list: string[], asyncFn: Function) => {
  const promises: any = [];
  list.forEach((x) => promises.push(asyncFn(env, x)));
  return Promise.all(promises);
};

// check if all items in an array are equal
export const allEqual = (arr: string[]) => arr.every((v) => v === arr[0]);
