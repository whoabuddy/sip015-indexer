import { Env } from "./types";
import {
  updateMethodOneStackingData,
  updateMethodOneTxData,
  updateMethodOneVoteData,
} from "./update-method-one-btc";
import {
  updateMethodTwoStackingData,
  updateMethodTwoTxData,
  updateMethodTwoVoteData,
} from "./update-method-two-stx";
import { dbgLog, printDivider } from "./utils";

// three schedules per wrangler.toml
export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    switch (controller.cron) {
      case "0 */1 * * *":
        // every hour at 0min update transaction data
        ctx.waitUntil(updateTxData(env));
        break;
      case "20 */1 * * *":
        // every hour at 20min update stacking data
        ctx.waitUntil(updateStackingData(env));
        break;
      case "40 */1 * * *":
        // every hour at 40min update voting data
        ctx.waitUntil(updateVotingData(env));
        break;
    }
  },
};

async function updateTxData(env: Env): Promise<void> {
  printDivider();
  dbgLog("updating all tx data");
  await Promise.all([updateMethodOneTxData(env), updateMethodTwoTxData(env)]);
  return;
}

async function updateStackingData(env: Env): Promise<void> {
  printDivider();
  dbgLog("updating all stacking data");
  await Promise.all([
    updateMethodOneStackingData(env),
    updateMethodTwoStackingData(env),
  ]);
  return;
}

async function updateVotingData(env: Env): Promise<void> {
  printDivider();
  dbgLog("updating all voting data");
  await Promise.all([
    updateMethodOneVoteData(env),
    updateMethodTwoVoteData(env),
  ]);
  return;
}
