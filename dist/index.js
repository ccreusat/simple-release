import { cosmiconfigSync } from 'cosmiconfig';
import { execa } from 'execa';
import { Octokit } from '@octokit/rest';
import { readFileSync, writeFileSync } from 'fs';
import semver from 'semver';
import simpleGit from 'simple-git';

const RELEASE_BRANCH = ["master", "main"];
const PRERELEASE_BRANCH = ["alpha", "beta", "rc", "next"];

const moduleName = "phnx";
const explorer = cosmiconfigSync(moduleName);
const defaultConfig = {
    git: {
        handle_working_tree: true,
        customPrefix: "v",
        /* commit: {
          message: "chore: release",
        }, */
    },
    github: {
        enableReleaseNotes: true,
    },
    npm: {
        versioning: true,
        publish: true,
    },
    baseBranch: "main",
    releaseBranches: [
        {
            name: "alpha",
            prerelease: true,
            enableReleaseNotes: false,
        },
        {
            name: "beta",
            prerelease: true,
            enableReleaseNotes: false,
        },
        {
            name: "rc",
            prerelease: true,
            enableReleaseNotes: false,
        },
    ],
};
const userConfig = explorer.search();
const config = { ...defaultConfig, ...userConfig?.config };
const git = simpleGit();
var ReleaseType;
(function (ReleaseType) {
    ReleaseType["Release"] = "release";
    ReleaseType["Prerelease"] = "prerelease";
})(ReleaseType || (ReleaseType = {}));
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
async function determineReleaseType() {
    try {
        const currentBranch = await getCurrentBranch();
        if (RELEASE_BRANCH.includes(currentBranch)) {
            return ReleaseType.Release;
        }
        else if (PRERELEASE_BRANCH.includes(currentBranch)) {
            return ReleaseType.Prerelease;
        }
        else if (config.releaseBranches.find((branch) => branch.name === currentBranch)) {
            return config.releaseBranches.find((branch) => branch.name === currentBranch)?.prerelease
                ? ReleaseType.Prerelease
                : ReleaseType.Release;
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
        const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
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
        return commits.all;
    }
    catch (error) {
        console.error("Something wrong happened:", error);
        process.exit(1);
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
        else {
            return "patch";
        }
    }
    catch (error) {
        console.error("Erreur lors de la détermination de la version:", error);
        throw error;
    }
}
async function updatePackageVersion(nextVersion) {
    try {
        const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
        pkg.version = nextVersion;
        writeFileSync(new URL("../package.json", import.meta.url), JSON.stringify(pkg, null, 2));
    }
    catch (error) {
        console.error("Erreur", error);
        throw error;
    }
}
async function getNextVersion() {
    try {
        const releaseType = await determineReleaseType();
        const currentBranch = await getCurrentBranch();
        const versionType = await determineVersion();
        const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
        let nextVersion;
        if (releaseType === ReleaseType.Prerelease) {
            nextVersion = semver.inc(pkg.version, "prerelease", currentBranch);
        }
        else {
            nextVersion = semver.inc(pkg.version, versionType);
        }
        await updatePackageVersion(nextVersion);
        return nextVersion;
    }
    catch (error) {
        console.error("Erreur: ", error);
        throw error;
    }
}
async function publishToNpm() {
    try {
        const currentBranch = await getCurrentBranch();
        const releaseType = await determineReleaseType();
        if (releaseType === ReleaseType.Prerelease) {
            await execa("npm", ["publish", "--tag", currentBranch]);
        }
        else {
            await execa("npm", ["publish"]);
        }
        console.log("Package publié sur npm");
    }
    catch (error) {
        console.error("Erreur lors de la publication sur npm:", error);
        throw error;
    }
}
async function createTag(prefix = "v", nextVersion) {
    try {
        const { name } = await git.addTag(`${prefix}${nextVersion}`);
        return name;
    }
    catch (error) {
        console.error("Erreur lors de la publication sur npm:", error);
        throw error;
    }
}
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
async function createGithubRelease(owner = "ccreusat", repo = "simple-release", tag_name) {
    try {
        const releaseNotes = "Notes de release..."; // Remplacer par vos notes de release
        await octokit.repos.createRelease({
            owner,
            repo,
            tag_name,
            name: tag_name,
            body: releaseNotes,
            draft: false,
            prerelease: (await determineReleaseType()) === ReleaseType.Prerelease,
        });
        console.log("Release GitHub créée avec succès");
    }
    catch (error) {
        console.error("Erreur lors de la création de la release GitHub:", error);
        throw error;
    }
}
async function createGitlabRelease() {
    try {
        const response = await fetch(`https://gitlab.com/api/v4/projects/${config?.gitlab?.projectId}/releases`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // "PRIVATE-TOKEN": config?.gitlab?.token,
            },
            body: JSON.stringify({
                name: `v${await determineVersion()}`,
                tag_name: `v${await determineVersion()}`,
                description: "Notes de release...",
            }),
        });
        if (!response.ok) {
            throw new Error(`Échec de la création de la release GitLab : ${response.statusText}`);
        }
        console.log("Release GitLab créée avec succès");
    }
    catch (error) {
        console.error("Erreur lors de la création de la release GitLab:", error);
        throw error;
    }
}
async function pushContent(nextVersion) {
    try {
        const currentBranch = await getCurrentBranch();
        const statusSummary = await git.status();
        const filesToAdd = statusSummary.files.map((file) => file.path);
        const releaseType = await determineReleaseType();
        const gitMessage = config.git.commit?.message ||
            `chore: ${releaseType === ReleaseType.Prerelease ? "prerelease" : "release"}: ${nextVersion}`;
        await git.add(filesToAdd);
        await git.commit(gitMessage);
        await git.push("origin", currentBranch);
    }
    catch (error) {
        console.error("Erreur:", error);
        throw error;
    }
}
// --- Fonction Principale ---
async function createRelease() {
    const currentBranch = await getCurrentBranch();
    const currentVersion = await getCurrentPackageVersion();
    const lastTag = await getLastTag();
    const nextVersion = await getNextVersion();
    const newTag = await createTag(config.git.customPrefix, nextVersion);
    console.log({ currentVersion, lastTag, newTag, nextVersion });
    try {
        if (config.git.handle_working_tree)
            await pushContent(nextVersion);
        if (config.npm.publish)
            await publishToNpm();
        if (config.github?.enableReleaseNotes) {
            if (!config.releaseBranches.find((branch) => branch.name === currentBranch)
                ?.enableReleaseNotes) {
                return;
            }
            await createGithubRelease("ccreusat", "simple-release", newTag);
        }
        if (config.gitlab) {
            if (!config.releaseBranches.find((branch) => branch.name === currentBranch)
                ?.enableReleaseNotes) {
                return;
            }
            await createGitlabRelease();
        }
    }
    catch (error) {
        console.error("Erreur globale lors de la création de la release:", error);
        throw error;
    }
}
// --- Exécution ---
createRelease()
    .then(() => console.log("Release terminée avec succès"))
    .catch((error) => console.error("Erreur lors de la release:", error));
