import PQueue from "p-queue";

export const etherscanQueue = new PQueue({
  interval: 200,
  intervalCap: 1,
  concurrency: 1,
});

export const alchemyQueue = new PQueue({
  interval: 200,
  intervalCap: 1,
  concurrency: 2,
});
