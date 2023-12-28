#!/usr/bin/env ts-node

import chalk from "chalk";

import { getConfig } from "./lib/find-cosmiconfig";
import { getCurrentBranch } from "./lib/get-current-branch";
import { getGitStatus } from "./lib/get-status";
import { prerelease } from "./lib/prerelease";
import { checkIsRepo } from "./lib/check-is-repo";

async function run() {
  const config = await getConfig();
  await checkIsRepo();
  await getGitStatus();
  const currentBranch = await getCurrentBranch();
  try {
    console.log({ ...config });

    await prerelease();
  } catch (error) {
    console.error(chalk.red(`Unable to version "${currentBranch}"`));
    process.exit(1);
  }
}

run();
