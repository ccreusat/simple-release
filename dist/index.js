import { cosmiconfigSync } from 'cosmiconfig';
import 'execa';
import { Octokit } from '@octokit/rest';
import { readFileSync } from 'fs';
import semver from 'semver';
import simpleGit from 'simple-git';

const RELEASE_BRANCHES = ["master", "main"];
const PRERELEASE_BRANCHES = ["alpha", "beta", "rc", "next"];

const moduleName = "phnx";
const explorer = cosmiconfigSync(moduleName);
function getPackageJson() {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    return pkg;
}
const defaultConfig = {
    git: {
        handle_working_tree: true,
        tagPrefix: "v",
    },
    github: {
        createGithubRelease: true,
    },
    npm: {
        publish: true,
    },
    baseBranch: "main",
    releaseBranches: [
        {
            name: "alpha",
            prerelease: true,
            createGithubRelease: false,
        },
        {
            name: "beta",
            prerelease: true,
            createGithubRelease: false,
        },
        {
            name: "rc",
            prerelease: true,
            createGithubRelease: false,
        },
    ],
};
const userConfig = explorer.search();
const config = { ...defaultConfig, ...userConfig?.config };
const git = simpleGit();
var LibReleaseType;
(function (LibReleaseType) {
    LibReleaseType["Release"] = "release";
    LibReleaseType["Prerelease"] = "prerelease";
})(LibReleaseType || (LibReleaseType = {}));
async function getCurrentBranch() {
    try {
        const branchSummary = await git.branch();
        const currentBranch = branchSummary.current;
        return currentBranch;
    }
    catch (error) {
        console.error("Erreur lors de la récupération de la branche actuelle:", error);
        throw error;
    }
}
async function determineReleaseType(currentBranch) {
    try {
        if (RELEASE_BRANCHES.includes(currentBranch)) {
            return LibReleaseType.Release;
        }
        else if (PRERELEASE_BRANCHES.includes(currentBranch)) {
            return LibReleaseType.Prerelease;
        }
        else if (config.releaseBranches.find((branch) => branch.name === currentBranch)) {
            return config.releaseBranches.find((branch) => branch.name === currentBranch)?.prerelease
                ? LibReleaseType.Prerelease
                : LibReleaseType.Release;
        }
        throw new Error(`La branche ${currentBranch} n'est pas configurée pour une release ou une prerelease.`);
    }
    catch (error) {
        console.error("Erreur lors de la détermination du type de release:", error);
        throw error;
    }
}
function getCurrentPackageVersion() {
    try {
        const pkg = getPackageJson();
        const packageVersion = pkg.version;
        return packageVersion;
    }
    catch (error) {
        console.error("Erreur lors de la lecture de la version actuelle du package:", error);
        throw error;
    }
}
async function getLastCommits() {
    try {
        const lastTag = await getLastTag();
        const commits = await git.log({ from: lastTag, to: "HEAD" });
        if (commits.all.length === 0)
            throw new Error("No commits found since last tag");
        return commits.all;
    }
    catch (error) {
        console.error(error);
        throw error;
    }
}
async function getLastTag() {
    try {
        const tag = await git.tags();
        const lastTag = tag.latest;
        if (!lastTag)
            throw new Error();
        return lastTag;
    }
    catch (error) {
        console.error("Erreur lors de la récupération du dernier tag:", error);
        throw error;
    }
}
async function determineVersion() {
    try {
        const commits = await getLastCommits();
        console.log({ commits });
        let fixCount = 0;
        let featCount = 0;
        let breakingChangeCount = 0;
        commits.forEach((commit) => {
            if (commit.message.startsWith("feat:")) {
                featCount++;
            }
            else if (commit.message.startsWith("fix:")) {
                fixCount++;
            }
            if (commit.message.includes("BREAKING CHANGE:") ||
                commit.message.startsWith("BREAKING CHANGE:")) {
                breakingChangeCount++;
            }
        });
        if (breakingChangeCount > 0) {
            return "major";
        }
        else if (featCount >= fixCount) {
            return "minor";
        }
        else if (fixCount >= featCount) {
            return "patch";
        }
    }
    catch (error) {
        console.error("Erreur lors de la détermination de la version:", error);
        throw error;
    }
}
async function getNextVersion(branch, releaseType, versionType) {
    const pkg = getPackageJson();
    try {
        let nextVersion;
        if (releaseType === LibReleaseType.Prerelease) {
            nextVersion = semver.inc(pkg.version, "prerelease", branch);
        }
        else {
            nextVersion = semver.inc(pkg.version, versionType);
        }
        return nextVersion;
    }
    catch (error) {
        console.error("Erreur: ", error);
        throw error;
    }
}
new Octokit({ auth: process.env.GITHUB_TOKEN });
// --- Fonction Principale ---
async function createRelease() {
    const currentBranch = await getCurrentBranch();
    const releaseType = await determineReleaseType(currentBranch);
    const versionType = await determineVersion();
    const currentVersion = await getCurrentPackageVersion();
    console.log({ versionType });
    const nextVersion = await getNextVersion(currentBranch, releaseType, versionType);
    const lastTag = await getLastTag();
    const commits = await getLastCommits();
    console.table({ currentVersion, lastTag, nextVersion, commits });
}
createRelease()
    .then(() => console.log("Release terminée avec succès"))
    .catch((error) => console.error("Erreur lors de la release:", error));
