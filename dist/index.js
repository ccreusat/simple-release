import { cosmiconfigSync } from 'cosmiconfig';
import simpleGit from 'simple-git';
import { execa } from 'execa';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import semver from 'semver';
import { existsSync as existsSync$1, readdirSync, statSync, readFileSync as readFileSync$1 } from 'node:fs';
import path from 'node:path';
import { Octokit } from '@octokit/rest';

const RELEASE_BRANCHES = ["master", "main"];
const PRERELEASE_BRANCHES = ["alpha", "beta", "rc", "next"];

const moduleName = "phnx";
const explorer = cosmiconfigSync(moduleName);
const userConfig = explorer.search();
const defaultConfig = {
    git: {
        enable: true,
        tagPrefix: "v",
    },
    github: {
        createGithubRelease: true,
    },
    npm: {
        publish: true,
    },
    changelog: {
        preset: "conventionalcommits",
    },
    baseBranch: "main",
    branches: [
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
    async isInitialized() {
        try {
            const isRepo = await this.git.checkIsRepo();
            if (!isRepo) {
                throw new Error("Le repo n'est pas initialisé.");
            }
            console.log("Le repo est initialisé.");
        }
        catch (error) {
            console.error(error);
            throw error;
        }
    }
    async getStatus() {
        try {
            const status = await this.git.status();
            if (status.files.length !== 0) {
                throw new Error("Working tree is not clean");
            }
            console.log("Everything is clear!");
        }
        catch (error) {
            console.error(error);
            throw error;
        }
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
    async hasTag(tagName) {
        try {
            const tags = await this.git.tags();
            return tags.all.includes(tagName);
        }
        catch (error) {
            console.error(error);
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
}

// npmManager.ts
class Npm {
    async publish(branch, canary) {
        try {
            if (canary) {
                await execa("npm", ["publish", "--tag", branch]);
            }
            else {
                await execa("npm", ["publish"]);
            }
            console.log("Package published to npm");
        }
        catch (error) {
            console.error("Unable to publish to npm", error);
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
    async updateMetadataForRelease(newVersion, notes, type, commits) {
        const metadata = this.readMetadata();
        const newVersionMetadata = {
            version: newVersion,
            type,
            date: new Date().toISOString(),
            notes: notes,
            commits: commits,
        };
        metadata.versions.push(newVersionMetadata);
        this.writeMetadata(metadata);
    }
}

class Bump {
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
    async forcePatch(pkg) {
        return semver.inc(pkg.version, "patch");
    }
    async getNextBump(commits) {
        return this._analyzeCommits(commits);
    }
}

class Package {
    constructor(basePath = "../") {
        Object.defineProperty(this, "basePath", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.basePath = basePath;
    }
    getPath(optionalPath) {
        const path = optionalPath || this.basePath;
        const pkg = JSON.parse(readFileSync(new URL(`${path}/package.json`, import.meta.url), "utf8"));
        return pkg;
    }
    name(optionalPath) {
        const pkg = this.getPath(optionalPath);
        console.log("path pkg", { pkg });
        return pkg.name;
    }
    version(optionalPath) {
        const pkg = this.getPath(optionalPath);
        console.log("path pkg", { pkg });
        return pkg.version;
    }
    update(nextVersion, optionalPath) {
        const path = optionalPath || this.basePath;
        const pkg = this.getPath(optionalPath);
        pkg.version = nextVersion;
        console.log(pkg.version, { nextVersion });
        writeFileSync(new URL(`${path}/package.json`, import.meta.url), JSON.stringify(pkg, null, 2));
    }
}

class Monorepo {
    constructor(packagePath = "packages") {
        Object.defineProperty(this, "packagePath", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.packagePath = packagePath;
    }
    isMonorepo() {
        const folder = this.getPath();
        if (existsSync$1(folder)) {
            return existsSync$1(folder);
        }
        else {
            return !existsSync$1(folder);
        }
    }
    getPackagePath() {
        return this.packagePath;
    }
    getPath() {
        return path.join(`${process.cwd()}/src`, this.packagePath);
    }
    getSubfolders() {
        const dir = this.getPath();
        const subFolders = readdirSync(dir).filter((folder) => {
            const fullPath = path.join(dir, folder);
            return statSync(fullPath).isDirectory();
        });
        return subFolders;
    }
    getPackageName(pkg) {
        return pkg.name;
    }
    getPackageVersion(pkg) {
        return pkg.version;
    }
    getCurrentPackageVersion(pkg) {
        try {
            const packageVersion = pkg.version;
            return packageVersion;
        }
        catch (error) {
            console.error("Erreur lors de la lecture de la version actuelle du package", error);
            throw error;
        }
    }
    findPackageJson() {
        const dir = this.getPath();
        const folders = this.getSubfolders();
        let pkgs = [];
        for (const folder of folders) {
            const fullPath = path.join(dir, folder);
            statSync(fullPath);
            //if (!stat.isDirectory()) return;
            const pkg = JSON.parse(readFileSync$1(`${fullPath}/package.json`, "utf8"));
            pkgs.push(pkg);
        }
        // console.log({ pkgs });
        return pkgs;
    }
}

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
class Github {
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

async function determineCanary(currentBranch) {
    try {
        if (RELEASE_BRANCHES.includes(currentBranch)) {
            return false;
        }
        else if (PRERELEASE_BRANCHES.includes(currentBranch)) {
            return true;
        }
        else if (config.branches.find((branch) => branch.name === currentBranch)) {
            return config.branches.find((branch) => branch.name === currentBranch)
                ?.prerelease
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
/* createRelease()
  .then(() => console.log("Release terminée avec succès"))
  .catch((error) => console.error("Erreur lors de la release:", error)); */
async function createMonorepoRelease() {
    const gitManager = new Git();
    const npmManager = new Npm();
    new Metadata("./versions-metadata.json");
    const bumpManager = new Bump();
    const packageManager = new Package();
    const githubManager = new Github();
    const monorepoManager = new Monorepo();
    // const pkg = packageManager.getPath();
    // console.log({ pkg });
    const releaseNotes = "Notes de release...";
    const folders = monorepoManager.getSubfolders();
    const dir = monorepoManager.getPath();
    for (const folder of folders) {
        const fullPath = path.join(dir, folder);
        const pkg = packageManager.getPath(fullPath);
        // console.log({ pkg });
        try {
            const [currentBranch, commits, lastTag] = await Promise.all([
                gitManager.getCurrentBranch(),
                gitManager.getLastCommits(),
                gitManager.getLastTag(),
            ]);
            const [canary, releaseType] = await Promise.all([
                determineCanary(currentBranch),
                bumpManager.getNextBump(commits),
            ]);
            const currentName = packageManager.name(fullPath);
            const currentVersion = packageManager.version(fullPath);
            console.log({ currentName, currentVersion });
            const nextVersion = await bumpManager.getNextVersion(pkg, currentBranch, canary, releaseType);
            /* if (!canary) {
              await changelogManager.generateFirstChangelog(
                config.changelog.preset,
                config.git.tagPrefix
              );
            } */
            if (!nextVersion) {
                throw new Error("Unable to calculate next version.");
            }
            await packageManager.update(nextVersion, fullPath);
            console.table({
                currentVersion,
                lastTag,
                releaseType,
                nextVersion,
                commits,
            });
            if (config.git.enable) {
                await gitManager.pushChanges(currentBranch, canary, nextVersion);
            }
            if (config.npm.publish)
                await npmManager.publish(currentBranch, canary);
            if (!canary && config.github?.createGithubRelease) {
                await githubManager.createGithubRelease({
                    owner: "ccreusat",
                    repo: "simple-release",
                    tag_name: await gitManager.createTag(config.git.tagPrefix, nextVersion),
                    body: releaseNotes,
                });
            }
            /* await metadataManager.updateMetadataForRelease(
              nextVersion as string,
              releaseType,
              releaseNotes,
              commits
            ); */
        }
        catch (error) {
            console.error("Erreur globale lors de la création de la release:", error);
            throw error;
        }
    }
}
createMonorepoRelease()
    .then(() => console.log("Release terminée avec succès"))
    .catch((error) => console.error("Erreur lors de la release:", error));
