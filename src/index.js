#!/usr/bin/env node

import chalk from "chalk";

import { getConfig } from "./find-cosmiconfig.js";
import { getCurrentBranch } from "./get-current-branch.js";
import { getGitStatus } from "./get-status.js";
import { prerelease } from "./prerelease.js";

const config = await getConfig();

console.log({ ...config });

const currentBranch = await getCurrentBranch();

async function run() {
  try {
    const isClean = await getGitStatus();

    if (!isClean) {
      console.error(chalk.red("Working tree is not clean"));
      process.exit(1);
    }
    // Exécutez la commande npm version prerelease avec le préfixe de version
    await prerelease(preid);
  } catch (error) {
    console.error(chalk.red(`Unable to version "${currentBranch}"`));
    process.exit(1);
  }
}

run();
