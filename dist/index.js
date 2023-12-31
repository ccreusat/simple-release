import chalk from 'chalk';
import { readFileSync } from 'fs';
import simpleGit from 'simple-git';
import { getNextVersion } from 'version-next';

const git = simpleGit();
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
async function getLastTag() {
    try {
        const tag = await git.raw(["describe", "--tags", "--abbrev=0"]);
        const lastTag = tag.trim();
        if (!lastTag)
            throw new Error();
        console.log("lastTag", chalk.greenBright(lastTag));
        return lastTag;
    }
    catch (error) {
        console.error(chalk.redBright("No tag found", error));
        process.exit(1);
    }
}
async function getLastCommits() {
    try {
        const lastTag = await getLastTag();
        const commits = await git.log({ from: lastTag, to: "HEAD" });
        return commits.all;
    }
    catch (error) {
        console.error("Something wrong happened:", error);
        process.exit(1);
    }
}
async function getCurrentBranch() {
    try {
        const branchSummary = await git.branch();
        const currentBranch = branchSummary.current;
        // console.log("currentBranch", chalk.greenBright(currentBranch));
        return currentBranch;
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
}
async function incrementVersion(pkgVersion, releaseType) {
    const currentBranch = await getCurrentBranch();
    console.log({ pkgVersion });
    const nextVersion = getNextVersion(String(pkgVersion), {
        type: releaseType,
        stage: currentBranch,
    });
    return nextVersion;
}
function parseCommits(commits) {
    const commitCounts = [];
    for (const commit of commits) {
        const regex = /^(chore|fix|feat)\b/i;
        const match = commit.message.match(/^([^\s:]+)/);
        if (match && regex.test(match[0])) {
            const type = match[0].toLowerCase();
            const existingCommit = commitCounts.find((commit) => commit.type === type);
            if (existingCommit) {
                existingCommit.count++;
            }
            else {
                commitCounts.push({ type, count: 1 });
            }
        }
    }
    return commitCounts;
}
function determineReleaseType(commits, commitCounts) {
    const mostFrequentType = commitCounts.reduce((mostFrequent, entry) => {
        return entry.count > mostFrequent.count ? entry : mostFrequent;
    }, { type: "", count: 0 });
    const hasBreakingChange = commits.some((commit) => commit.message.includes("BREAKING CHANGE") || commit.message.includes("!"));
    const finalReleaseType = hasBreakingChange
        ? "major"
        : mostFrequentType.type === "fix" || mostFrequentType.type === "chore"
            ? "patch"
            : "minor";
    return finalReleaseType;
}
async function run() {
    const commits = await getLastCommits();
    const commitCounts = parseCommits(commits);
    const releaseType = determineReleaseType(commits, commitCounts);
    // isSemantic();
    const nextVersion = await incrementVersion(pkg.version, releaseType);
    console.log({ nextVersion });
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
