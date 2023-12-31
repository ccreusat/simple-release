import chalk from "chalk";
import { execa } from "execa";
import { readFileSync, writeFileSync } from "fs";
import simpleGit, { DefaultLogFields, ListLogLine } from "simple-git";
import { getNextVersion } from "version-next";
import { PRERELEASE_BRANCH } from "./constants/default-branch";
import axios from "axios";

const git = simpleGit();

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
);

async function getLastTag() {
  try {
    const tag = await git.tags();
    const lastTag = tag.latest;

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

interface CommitCounts {
  type: string;
  count: number;
}

async function getCurrentBranch() {
  try {
    const branchSummary = await git.branch();
    const currentBranch = branchSummary.current;
    // console.log("currentBranch", chalk.greenBright(currentBranch));

    return currentBranch;
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

async function incrementVersion(pkgVersion: number, releaseType: string) {
  const currentBranch = await getCurrentBranch();

  const nextVersion = getNextVersion(String(pkgVersion), {
    type: releaseType,
    stage: PRERELEASE_BRANCH.includes(currentBranch) ? currentBranch : "",
  });

  console.log({ nextVersion });

  return nextVersion;
}

function parsedCommits(commits: readonly (DefaultLogFields & ListLogLine)[]) {
  const commitCounts: CommitCounts[] = [];

  for (const commit of commits) {
    const regex = /^(chore|fix|feat)\b/i;
    const match = commit.message.match(/^([^\s:]+)/);

    if (match && regex.test(match[0])) {
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

  return commitCounts;
}

function determineReleaseType(
  commits: readonly (DefaultLogFields & ListLogLine)[],
  commitCounts: CommitCounts[]
) {
  const mostFrequentType = commitCounts.reduce(
    (mostFrequent, entry) => {
      return entry.count > mostFrequent.count ? entry : mostFrequent;
    },
    { type: "", count: 0 }
  );

  const hasBreakingChange = commits.some(
    (commit) =>
      commit.message.includes("BREAKING CHANGE") || commit.message.includes("!")
  );

  const finalReleaseType = hasBreakingChange
    ? "major"
    : mostFrequentType.type === "feat"
    ? "minor"
    : "patch";

  return finalReleaseType;
}

function updatePackageJson(version: string): void {
  const path = `${process.cwd()}/package.json`;
  const packageJson = JSON.parse(readFileSync(path, "utf-8"));

  packageJson.version = version;

  writeFileSync(path, JSON.stringify(packageJson, null, 2), "utf-8");
}

async function pushContent(nextVersion: string) {
  const currentBranch = await getCurrentBranch();
  const statusSummary = await git.status();
  const filesToAdd = statusSummary.files.map((file) => file.path);

  await git.add(filesToAdd);
  await git.commit(`chore: release: ${nextVersion}`);
  await git.push("origin", currentBranch);
}

async function createReleaseNote(owner, repo, tag, token, releaseNote) {
  console.log({ owner, repo, tag, token, releaseNote });
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;

  try {
    // Créer une nouvelle release en utilisant l'API GitHub
    const response = await axios.post(
      apiUrl,
      {
        tag_name: tag,
        name: `Release ${tag}`,
        body: releaseNote,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    console.log(`Release créée avec succès : ${response.data.html_url}`);
  } catch (error) {
    console.error("Erreur lors de la création de la release :", error.message);
  }
}

function prepareReleaseNote(commits) {
  let releaseNote = "## Release Note\n\n";
  /* const formatedCommits = commits.map((commit) => {
    return {
      message: commit.message,
      author: commit.author_name,
    };
  }); */

  for (const type in commits) {
    console.log({ type });
    if (type === "fix") {
      releaseNote += `### Fixes\n\n`;
      for (const commit of commits[type]) {
        releaseNote += `- ${commit.message}. Thank you ${commit.author_name}\n`;
      }
      releaseNote += "\n";
    }
    if (type === "chore") {
      releaseNote += `### Chore\n\n`;
      for (const commit of commits[type]) {
        releaseNote += `- ${commit.message}. Thank you ${commit.author_name}\n`;
      }
      releaseNote += "\n";
    }
  }

  console.log({ releaseNote });

  return releaseNote;

  /* console.log(commits.map((commit) => commit)); */
  // return formatedCommits;
}

function groupCommitsByType(commits) {
  const groupedCommits = {};

  for (const commit of commits) {
    const match = commit.message.match(/^(chore|fix|feat):/i);

    if (match && match[1]) {
      const type = match[1].toLowerCase();
      if (!groupedCommits[type]) {
        groupedCommits[type] = [];
      }
      groupedCommits[type].push(commit);
    }
  }

  return groupedCommits;
}

async function run() {
  const commits = await getLastCommits();

  const commitCounts = parsedCommits(commits);
  const releaseType = determineReleaseType(commits, commitCounts);

  const nextVersion = await incrementVersion(pkg.version, releaseType);

  updatePackageJson(nextVersion);

  console.log({ releaseType, nextVersion });

  await pushContent(nextVersion);

  await execa("git", ["tag", `v${nextVersion}`]);
  await execa("git", ["push", "--tags"]);

  // Remplacez les valeurs suivantes par vos informations GitHub
  const owner = "ccreusat";
  const repo = "simple-release";
  // const token = process.env.GITHUB_TOKEN;
  const token = "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";

  const groupCommits = groupCommitsByType(commits);
  // const releaseNote = prepareReleaseNote(groupCommits);

  const releaseNote = "Contenu de la release note...\n\nAutres détails...";

  // createReleaseNote(owner, repo, nextVersion, token, releaseNote);
  // generateReleaseNote(owner, repo, token);
}

run();
