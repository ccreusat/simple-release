#!/usr/bin/env node

import chalk from "chalk";

import { getConfig } from "./find-cosmiconfig.js";
import { getCurrentBranch } from "./get-current-branch.js";
import { getGitStatus } from "./get-status.js";
import { execa } from "execa";

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

async function prerelease() {
  try {
    const result = await execa("npm", [
      "version",
      "prerelease",
      "--preid",
      "alpha",
    ]);

    console.log({ result });
  } catch (error) {
    console.log(error);
    // console.error(chalk.red(`${error}`));
  }
}

async function run() {
  try {
    const versionPrefix = getVersionPreid();
    const isClean = await getGitStatus();

    if (!isClean) {
      console.error(chalk.red("Working tree is not clean"));
      process.exit(1);
    }
    // Exécutez la commande npm version prerelease avec le préfixe de version
    const result = await execa("npm", [
      "version",
      "prerelease",
      "--preid",
      versionPrefix,
    ]);
    console.log(chalk.green(stdout));
  } catch (error) {
    console.error(chalk.red(`Unable to version "${currentBranch}"`));
    process.exit(1);
  }
}

prerelease();
