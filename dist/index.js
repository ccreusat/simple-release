import { existsSync, readFileSync, writeFileSync } from 'fs';
import { cosmiconfigSync } from 'cosmiconfig';
import { Octokit } from '@octokit/rest';
import simpleGit from 'simple-git';
import 'execa';
import semver from 'semver';

const RELEASE_BRANCHES = ["master", "main"];
const PRERELEASE_BRANCHES = ["alpha", "beta", "rc", "next"];

const moduleName = "phnx";
const explorer = cosmiconfigSync(moduleName);
const userConfig = explorer.search();
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
const config = {
    ...defaultConfig,
    ...userConfig?.config,
};

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
class Git {
    constructor() {
        Object.defineProperty(this, "git", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.git = simpleGit();
    }
    async getCurrentBranch() {
        try {
            const branchSummary = await this.git.branch();
            const currentBranch = branchSummary.current;
            return currentBranch;
        }
        catch (error) {
            console.error("Unable to detect the current branch", error);
            throw error;
        }
    }
    async createTag(prefix = "v", nextVersion) {
        try {
            const { name } = await this.git.addTag(`${prefix}${nextVersion}`);
            return name;
        }
        catch (error) {
            console.error("Can not create a tag", error);
            throw error;
        }
    }
    async pushChanges(branch, canary, nextVersion) {
        try {
            const statusSummary = await this.git.status();
            const filesToAdd = statusSummary.files.map((file) => file.path);
            const gitMessage = config.git.commit?.message ||
                `chore: ${canary ? "prerelease" : "release"}: ${nextVersion}`;
            await this.git.add(filesToAdd);
            await this.git.commit(gitMessage);
            await this.git.push("origin", branch);
        }
        catch (error) {
            console.error("Erreur:", error);
            throw error;
        }
    }
    async getLastTag() {
        try {
            const tag = await this.git.tags();
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
    async getLastCommits() {
        try {
            const lastTag = await this.getLastTag();
            const commits = await this.git.log({ from: lastTag, to: "HEAD" });
            if (commits.all.length === 0)
                throw new Error("No commits found since last tag");
            return commits.all;
        }
        catch (error) {
            console.error(error);
            throw error;
        }
    }
    async createGithubRelease({ owner = "ccreusat", repo = "simple-release", tag_name, body, }) {
        try {
            await octokit.repos.createRelease({
                owner,
                repo,
                tag_name,
                name: tag_name,
                body,
                draft: false,
                // prerelease: (await determineCanary(currentBranch)) === true,
            });
            console.log("Release GitHub créée avec succès");
        }
        catch (error) {
            console.error("Erreur lors de la création de la release GitHub:", error);
            throw error;
        }
    }
}

// metadataManager.ts
class Metadata {
    constructor(filePath) {
        Object.defineProperty(this, "filePath", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.filePath = filePath;
    }
    readMetadata() {
        if (existsSync(this.filePath)) {
            return JSON.parse(readFileSync(this.filePath, "utf8"));
        }
        else {
            return { versions: [] };
        }
    }
    writeMetadata(metadata) {
        writeFileSync(this.filePath, JSON.stringify(metadata, null, 2));
    }
    async updateMetadataForRelease(newVersion, notes, commits) {
        const metadata = this.readMetadata();
        const newVersionMetadata = {
            version: newVersion,
            date: new Date().toISOString(),
            notes: notes,
            commits: commits,
        };
        metadata.versions.push(newVersionMetadata);
        this.writeMetadata(metadata);
    }
}

class Bump {
    async getNextVersion(pkg, branch, canary, releaseType) {
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
    async determineVersion(commits) {
        try {
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
}

class Package {
    getPackageJson() {
        const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
        return pkg;
    }
    getCurrentPackageVersion() {
        try {
            const pkg = this.getPackageJson();
            const packageVersion = pkg.version;
            return packageVersion;
        }
        catch (error) {
            console.error("Erreur lors de la lecture de la version actuelle du package:", error);
            throw error;
        }
    }
    writePackageJson(pkg) {
        writeFileSync(new URL("../package.json", import.meta.url), JSON.stringify(pkg, null, 2));
    }
    async updatePackageVersion(nextVersion) {
        try {
            const pkg = this.getPackageJson();
            pkg.version = nextVersion;
            this.writePackageJson(pkg);
        }
        catch (error) {
            console.error("Erreur", error);
            throw error;
        }
    }
}

class CommitAnalyzer {
    _analyzeCommits(commits) {
        let hasBreaking = false;
        let hasFeatures = false;
        commits.forEach((commit) => {
            if (/BREAKING CHANGE:/.test(commit.message) ||
                commit.message.startsWith("perf:")) {
                hasBreaking = true;
            }
            else if (commit.message.startsWith("feat:")) {
                hasFeatures = true;
            }
            else if (commit.message.match(/\w+\(.*\)\!:|\w+!\:/)) {
                hasBreaking = true;
            }
        });
        if (hasBreaking)
            return "major";
        if (hasFeatures)
            return "minor";
        return "patch";
    }
    async determineNextVersion(commits) {
        return this._analyzeCommits(commits);
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
async function createRelease() {
    const gitManager = new Git();
    new Metadata("./versions-metadata.json");
    const bumpManager = new Bump();
    const packageManager = new Package();
    const analyserManager = new CommitAnalyzer();
    const pkg = packageManager.getPackageJson();
    try {
        const currentBranch = await gitManager.getCurrentBranch();
        const commits = await gitManager.getLastCommits();
        const canary = await determineCanary(currentBranch);
        const releaseType = await bumpManager.determineVersion(commits);
        const nextVersion = await bumpManager.getNextVersion(pkg, currentBranch, canary, releaseType);
        if (!nextVersion) {
            throw new Error("Unable to calculate next version.");
        }
        const currentVersion = await packageManager.getCurrentPackageVersion();
        const lastTag = await gitManager.getLastTag();
        /* const newTag = await gitManager.createTag(
          config.git.tagPrefix,
          nextVersion as string
        ); */
        // await packageManager.updatePackageVersion(nextVersion as string);
        console.table({
            currentVersion,
            lastTag,
            releaseType,
            nextVersion,
            commits,
        });
        if (config.git.handle_working_tree) {
            await gitManager.pushChanges(currentBranch, canary, nextVersion);
        }
        console.log(await analyserManager.determineNextVersion(commits));
        // if (config.npm.publish) await npmManager.publish(currentBranch, canary);
        /* if (config.github?.createGithubRelease) {
          if (
            !config.releaseBranches.find((branch) => branch.name === currentBranch)
              ?.createGithubRelease
          ) {
            return;
          }
    
          await gitManager.createGithubRelease({
            owner: "ccreusat",
            repo: "simple-release",
            tag_name: newTag,
            body: releaseNotes,
          });
        } */
        /* await metadataManager.updateMetadataForRelease(
          nextVersion as string,
          releaseNotes,
          commits
        ); */
    }
    catch (error) {
        console.error("Erreur globale lors de la création de la release:", error);
        throw error;
    }
}
// generateChangelog(new Metadata("./versions-metadata.json"));
createRelease()
    .then(() => console.log("Release terminée avec succès"))
    .catch((error) => console.error("Erreur lors de la release:", error));
