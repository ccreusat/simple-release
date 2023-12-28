#!/usr/bin/env ts-node

import chalk from "chalk";

import { getConfig } from "./lib/find-cosmiconfig";
import { getCurrentBranch } from "./lib/get-current-branch";
import { getGitStatus } from "./lib/get-status";
import { prerelease } from "./lib/prerelease";
import { checkIsRepo } from "./lib/check-is-repo";

const config = await getConfig();

console.log({ ...config });

const currentBranch = await getCurrentBranch();

async function run() {
  try {
    const isGitRepo = await checkIsRepo();
    if (!isGitRepo) return;

    const isClean = await getGitStatus();

    if (!isClean) {
      console.error(chalk.red("Working tree is not clean"));
      process.exit(1);
    }
    // Exécutez la commande npm version prerelease avec le préfixe de version
    await prerelease();
  } catch (error) {
    console.error(chalk.red(`Unable to version "${currentBranch}"`));
    process.exit(1);
  }
}

run();
