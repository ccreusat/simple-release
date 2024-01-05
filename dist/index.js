import { cosmiconfigSync } from 'cosmiconfig';
import { execa } from 'execa';
import { Octokit } from '@octokit/rest';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import semver from 'semver';
import simpleGit from 'simple-git';

const RELEASE_BRANCHES = ["master", "main"];
const PRERELEASE_BRANCHES = ["alpha", "beta", "rc", "next"];

const moduleName = "phnx";
const explorer = cosmiconfigSync(moduleName);
const metadataFilePath = "./versions-metadata.json";
function readMetadata() {
    if (existsSync(metadataFilePath)) {
        return JSON.parse(readFileSync(metadataFilePath, "utf8"));
    }
    else {
        return { versions: [] };
    }
}
function writeMetadata(metadata) {
    writeFileSync(metadataFilePath, JSON.stringify(metadata, null, 2));
}
async function updateMetadataForRelease(newVersion, notes, commits) {
    const metadata = readMetadata();
    const newVersionMetadata = {
        version: newVersion,
        date: new Date().toISOString(),
        notes: notes,
        commits: commits,
    };
    metadata.versions.push(newVersionMetadata);
    writeMetadata(metadata);
}
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
async function determineCanary(currentBranch) {
    try {
        if (RELEASE_BRANCHES.includes(currentBranch)) {
            return false;
        }
        else if (PRERELEASE_BRANCHES.includes(currentBranch)) {
            return true;
        }
        else if (config.releaseBranches.find((branch) => branch.name === currentBranch)) {
            return config.releaseBranches.find((branch) => branch.name === currentBranch)?.prerelease
                ? true
                : false;
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
        console.log({ commits });
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
        else {
            return "";
        }
    }
    catch (error) {
        console.error("Erreur lors de la détermination de la version:", error);
        throw error;
    }
}
async function updatePackageVersion(nextVersion) {
    try {
        const pkg = getPackageJson();
        pkg.version = nextVersion;
        writeFileSync(new URL("../package.json", import.meta.url), JSON.stringify(pkg, null, 2));
    }
    catch (error) {
        console.error("Erreur", error);
        throw error;
    }
}
async function getNextVersion(branch, canary, releaseType) {
    const pkg = getPackageJson();
    try {
        let nextVersion;
        if (canary) {
            nextVersion = semver.inc(pkg.version, "prerelease", branch);
        }
        else {
            nextVersion = semver.inc(pkg.version, releaseType);
        }
        return nextVersion;
    }
    catch (error) {
        console.error("Erreur: ", error);
        throw error;
    }
}
async function publishToNpm(branch, canary) {
    try {
        if (canary) {
            await execa("npm", ["publish", "--tag", branch]);
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
async function createGithubRelease(currentBranch, { owner = "ccreusat", repo = "simple-release", tag_name, body, }) {
    try {
        await octokit.repos.createRelease({
            owner,
            repo,
            tag_name,
            name: tag_name,
            body,
            draft: false,
            prerelease: (await determineCanary(currentBranch)) === true,
        });
        console.log("Release GitHub créée avec succès");
    }
    catch (error) {
        console.error("Erreur lors de la création de la release GitHub:", error);
        throw error;
    }
}
async function pushContent(branch, canary, nextVersion) {
    try {
        const statusSummary = await git.status();
        const filesToAdd = statusSummary.files.map((file) => file.path);
        const gitMessage = config.git.commit?.message ||
            `chore: ${canary ? "prerelease" : "release"}: ${nextVersion}`;
        await git.add(filesToAdd);
        await git.commit(gitMessage);
        await git.push("origin", branch);
    }
    catch (error) {
        console.error("Erreur:", error);
        throw error;
    }
}
// --- Fonction Principale ---
async function createRelease() {
    const currentBranch = await getCurrentBranch();
    const commits = await getLastCommits();
    const canary = await determineCanary(currentBranch);
    const releaseType = await determineVersion();
    const currentVersion = await getCurrentPackageVersion();
    const nextVersion = await getNextVersion(currentBranch, canary, releaseType);
    const lastTag = await getLastTag();
    const newTag = await createTag(config.git.tagPrefix, nextVersion);
    const releaseNotes = "Notes de release..."; // Remplacer par vos notes de release
    console.table({ currentVersion, lastTag, releaseType, nextVersion, commits });
    try {
        await updatePackageVersion(nextVersion);
        if (config.git.handle_working_tree)
            await pushContent(currentBranch, canary, nextVersion);
        if (config.npm.publish)
            await publishToNpm(currentBranch, canary);
        if (config.github?.createGithubRelease) {
            if (!config.releaseBranches.find((branch) => branch.name === currentBranch)
                ?.createGithubRelease) {
                return;
            }
            await createGithubRelease(currentBranch, {
                owner: "ccreusat",
                repo: "simple-release",
                tag_name: newTag,
                body: releaseNotes,
            });
        }
        await updateMetadataForRelease(nextVersion, releaseNotes, commits);
    }
    catch (error) {
        console.error("Erreur globale lors de la création de la release:", error);
        throw error;
    }
}
createRelease()
    .then(() => console.log("Release terminée avec succès"))
    .catch((error) => console.error("Erreur lors de la release:", error));
