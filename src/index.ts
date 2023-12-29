#!/usr/bin/env node
import fs from "fs";
import chalk from "chalk";
import { cosmiconfig } from "cosmiconfig";
import { simpleGit } from "simple-git";
import { getNextVersion } from "version-next";

const moduleName = "phnix";
const explorer = cosmiconfig(moduleName);
const git = simpleGit();

const pkg = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")
);

async function getConfig() {
  try {
    const result = await explorer.search();
    if (!result || !result.config) {
      throw new Error();
    }
    return result.config;
  } catch (error) {
    console.error(chalk.redBright.bold("No config file found"));
    process.exit(1);
  }
}

async function getStatus() {
  try {
    const status = await git.status();
    const isClean = status.files.length === 0;

    if (!isClean) throw new Error();

    console.log(chalk.greenBright(isClean));

    return isClean;
  } catch (error) {
    console.error(chalk.redBright("Working tree is not clean"));
    process.exit(1);
  }
}

async function isInitialized() {
  try {
    const isInitialized = await git.checkIsRepo();

    if (!isInitialized) throw new Error();

    console.log(chalk.greenBright("Le repo est déjà initialisé."));
    console.log(
      "🚀 ~ file: index.ts:42 ~ isInitialized:",
      chalk.green(isInitialized)
    );
    return isInitialized;
  } catch (error) {
    console.log(chalk.redBright("Le repo n'est pas initialisé."));
    process.exit(1);
  }
}

async function getCurrentBranch() {
  try {
    const branchSummary = await git.branch();
    const currentBranch = branchSummary.current;
    console.log(
      "🚀 ~ file: index.ts:84 ~ currentBranch:",
      chalk.greenBright(currentBranch)
    );

    return branchSummary.current;
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

async function getLatestCommits() {
  try {
    const tags = await git.tags();
    const lastTag = tags.latest;

    if (lastTag) {
      console.log(
        "🚀 ~ file: index.ts:58 ~ lastTag:",
        chalk.greenBright(lastTag)
      );
    } else {
      console.log("No tag found");
    }

    const commits = await git.log({ from: lastTag });

    return commits.all;
  } catch (error) {
    console.error("Something wrong happened:", error);
    process.exit(1);
  }
}

console.log("🚀 ~ file: index.ts:78 ~ pkg:", pkg.version);

// Using try-catch for better error handling
try {
  await isInitialized();
  await getStatus();
  await getCurrentBranch();

  const nextVersion = getNextVersion(pkg.version, {
    type: "patch",
    stage: "alpha",
  });
  console.log(
    "🚀 ~ file: index.ts:90 ~ nextVersion:",
    chalk.greenBright(nextVersion)
  );

  await getConfig();
  const allCommits = await getLatestCommits();
  console.log(
    "🚀 ~ file: index.ts:94 ~ allCommits:",
    chalk.greenBright(allCommits.length)
  );

  // Continue with the rest of your logic here...
} catch (error) {
  console.error(chalk.redBright("An error occurred:"), error);
  process.exit(1);
}