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

interface CommitCounts {
  type: string;
  count: number;
}

function parseCommits(commits: readonly (DefaultLogFields & ListLogLine)[]) {
  const commitCounts: CommitCounts[] = [];

  for (const commit of commits) {
    const match = commit.message.match(/^([^\s:]+)/);

    if (match) {
      const type = match[0].toLowerCase();
      const existingCommit = commitCounts.find(
        (commit) => commit.type === type
      );

      if (existingCommit) {
        existingCommit.count++;
      } else {
        commitCounts.push({ type, count: 1 });
      }
    }
  }

  console.log("Nombre de commits par type :", commitCounts);
  return commitCounts;
}

function determineReleaseType(
  commits: readonly (DefaultLogFields & ListLogLine)[],
  commitCounts: CommitCounts[]
) {
  const mostFrequentType = commitCounts.reduce(
    (mostFrequent, entry) => {
      console.log({ mostFrequent, entry });
      return entry.count > mostFrequent.count ? entry : mostFrequent;
    },
    { type: "", count: 0 }
  );

  console.log({ mostFrequentType });

  // Vérifier s'il y a un "BREAKING CHANGE" dans les messages de commit
  const hasBreakingChange = commits.some((commit) =>
    commit.message.includes("BREAKING CHANGE")
  );

  const objectLiteral = {
    fix: "patch",
    chore: "patch",
    feat: "minor",
  };

  const finalReleaseType = hasBreakingChange
    ? "major"
    : mostFrequentType.type === "fix" || mostFrequentType.type === "chore"
    ? "patch"
    : "minor";

  // Ajuster le type de version en fonction de la présence d'un "BREAKING CHANGE"
  /* const finalReleaseType = hasBreakingChange
    ? "major"
    : mostFrequentType.type === "feat"
    ? "minor"
    : "patch"; */

  // console.log({ releaseType, hasBreakingChange, finalReleaseType });

  // console.log("Type de version détecté :", finalReleaseType);

  console.log({ finalReleaseType });
}

function updatePackageJson(version: string): void {
  // Mettre à jour le fichier package.json avec la nouvelle version
  const packageJsonPath = "path/to/your/package.json";
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  packageJson.version = version;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf-8");
}

async function run() {
  const commits = await getLastCommits();
  const commitCounts = parseCommits(commits);
  const releaseType = determineReleaseType(commits, commitCounts);

  // console.log({ commitMessages, releaseType });

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
