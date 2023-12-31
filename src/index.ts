import chalk from "chalk";
import parser from "conventional-commits-parser";
import { readFileSync, writeFileSync } from "fs";
import simpleGit, { DefaultLogFields, ListLogLine } from "simple-git";

const git = simpleGit();

async function getLastTag() {
  try {
    const tag = await git.raw(["describe", "--tags", "--abbrev=0"]);
    const lastTag = tag.trim();

    if (!lastTag) throw new Error();

    console.log("lastTag", chalk.greenBright(lastTag));
    return lastTag;
  } catch (error) {
    console.error(chalk.redBright("No tag found", error));
    process.exit(1);
  }
}

async function getLastCommits() {
  try {
    const lastTag = await getLastTag();
    const commits = await git.log({ from: lastTag, to: "HEAD" });

    return commits.all;
  } catch (error) {
    console.error("Something wrong happened:", error);
    process.exit(1);
  }
}

function getCommitMessages() {
  // Lire les commits depuis le fichier ou autre source
  return readFileSync("path/to/your/commitlog.txt", "utf-8");
}

function parseCommits(
  commitMessages: readonly (DefaultLogFields & ListLogLine)[]
) {
  // Parser les commits
  const commits: any[] = [];
  parser({ commit: { delimiters: ["\n"] } })
    .on("data", (parsedCommit: any) => {
      commits.push(parsedCommit);
    })
    .end(commitMessages);
  return commits;
}

function determineReleaseType(
  commits: readonly (DefaultLogFields & ListLogLine)[]
) {
  for (const commit of commits) {
    if (commit.message.startsWith === "feat") {
      return "minor";
    } else if (commit.message.startsWith === "fix") {
      return "patch";
    }
    // Ajouter d'autres conditions si nécessaire pour d'autres types de changements
  }
  return "patch"; // Version de correctif par défaut si aucun type spécifique n'est détecté
}

function incrementVersion(currentVersion: string, releaseType: string): string {
  // Logique pour incrémenter la version
  const [major, minor, patch] = currentVersion.split(".").map(Number);
  if (releaseType === "major") {
    return `${major + 1}.0.0`;
  } else if (releaseType === "minor") {
    return `${major}.${minor + 1}.0`;
  } else {
    return `${major}.${minor}.${patch + 1}`;
  }
}

function updatePackageJson(version: string): void {
  // Mettre à jour le fichier package.json avec la nouvelle version
  const packageJsonPath = "path/to/your/package.json";
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  packageJson.version = version;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf-8");
}

async function run() {
  // const commitMessages = getCommitMessages();
  const commitMessages = await getLastCommits();

  // console.log({ commitMessages });
  //const commits = parseCommits(commitMessages);
  const releaseType = determineReleaseType(commitMessages);

  console.log({ commitMessages, releaseType });

  /* if (releaseType !== "none") {
    const currentVersion = "1.0.0"; // Remplacez par la version actuelle de votre projet
    const newVersion = incrementVersion(currentVersion, releaseType);
    console.log(`Incrémenter la version de ${currentVersion} à ${newVersion}`);
    updatePackageJson(newVersion);
  } else {
    console.log(
      "Aucun changement majeur ou correctif détecté. Aucune incrémentation de version nécessaire."
    );
  } */
}

run();
