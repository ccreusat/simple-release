#!/usr/bin/env node

import chalk from "chalk";

import { getConfig } from "./find-cosmiconfig.js";
import { getCurrentBranch } from "./get-current-branch.js";
import { getGitStatus } from "./get-status.js";

const config = await getConfig();

console.log({ ...config });

const currentBranch = await getCurrentBranch();

function getVersionPreid() {
  const preid = config.prerelease.find(
    (prereleaseBranch) => prereleaseBranch === currentBranch
  );

  if (!preid) {
    console.error(
      chalk.red(
        `Aucun préfixe de version défini pour la branche "${currentBranch}".`
      )
    );
    process.exit(1);
  }

  return preid;
}

async function run() {
  try {
    const versionPrefix = getVersionPreid();

    const isClean = await getGitStatus();

    console.log(isClean);

    if (!isClean) return;
    // Exécutez la commande npm version prerelease avec le préfixe de version
    await execa("npm", ["version", "prerelease", "--preid", versionPrefix]);
  } catch (error) {
    console.error(chalk.red(`Unable to version "${currentBranch}"`));
    process.exit(1);
  }
}

run();

// console.log(config.prerelease.includes(CURRENT_BRANCH));
