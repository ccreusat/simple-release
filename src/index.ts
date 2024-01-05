import { cosmiconfigSync } from "cosmiconfig";
import { execa } from "execa";
import { Octokit } from "@octokit/rest";
import {
  PRERELEASE_BRANCHES,
  RELEASE_BRANCHES,
} from "./constants/default-branch";
import { readFileSync, writeFileSync, existsSync } from "fs";
import semver, { ReleaseType } from "semver";
import simpleGit, {
  DefaultLogFields,
  ListLogLine,
  SimpleGit,
} from "simple-git";

interface VersionMetadata {
  version: string;
  date: string;
  notes: string;
  commits?: readonly (DefaultLogFields & ListLogLine)[];
}

interface Metadata {
  versions: VersionMetadata[];
}

interface ReleaseBranches {
  name: string;
  prerelease: boolean;
  createGithubRelease: boolean;
}

interface ReleaseConfig {
  git: {
    handle_working_tree: boolean;
    tagPrefix?: string;
    commit?: {
      message?: string;
    };
  };
  github?: {
    createGithubRelease: boolean;
  };
  npm: {
    publish: boolean;
  };
  baseBranch: string;
  releaseBranches: ReleaseBranches[];
}

const moduleName = "phnx";
const explorer = cosmiconfigSync(moduleName);

const metadataFilePath = "./versions-metadata.json";

function readMetadata(): Metadata {
  if (existsSync(metadataFilePath)) {
    return JSON.parse(readFileSync(metadataFilePath, "utf8"));
  } else {
    return { versions: [] };
  }
}

function writeMetadata(metadata: Metadata) {
  writeFileSync(metadataFilePath, JSON.stringify(metadata, null, 2));
}

async function updateMetadataForRelease(
  newVersion: string,
  notes: string,
  commits?: readonly (DefaultLogFields & ListLogLine)[]
) {
  const metadata = readMetadata();

  const newVersionMetadata: VersionMetadata = {
    version: newVersion,
    date: new Date().toISOString(),
    notes: notes,
    commits: commits,
  };

  metadata.versions.push(newVersionMetadata);
  writeMetadata(metadata);
}

function getPackageJson() {
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  );

  return pkg;
}

const defaultConfig: ReleaseConfig = {
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
const config: ReleaseConfig = { ...defaultConfig, ...userConfig?.config };

const git: SimpleGit = simpleGit();

type Canary = boolean;

async function getCurrentBranch(): Promise<string> {
  try {
    const branchSummary = await git.branch();
    const currentBranch = branchSummary.current;

    return currentBranch;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de la branche actuelle:",
      error
    );
    throw error;
  }
}

async function determineCanary(currentBranch: string): Promise<Canary> {
  try {
    if (RELEASE_BRANCHES.includes(currentBranch)) {
      return false;
    } else if (PRERELEASE_BRANCHES.includes(currentBranch)) {
      return true;
    } else if (
      config.releaseBranches.find((branch) => branch.name === currentBranch)
    ) {
      return config.releaseBranches.find(
        (branch) => branch.name === currentBranch
      )?.prerelease
        ? true
        : false;
    }
    throw new Error(
      `La branche ${currentBranch} n'est pas configurée pour une release ou une prerelease.`
    );
  } catch (error) {
    console.error("Erreur lors de la détermination du type de release:", error);
    throw error;
  }
}

function getCurrentPackageVersion(): string {
  try {
    const pkg = getPackageJson();
    const packageVersion = pkg.version;
    return packageVersion;
  } catch (error) {
    console.error(
      "Erreur lors de la lecture de la version actuelle du package:",
      error
    );
    throw error;
  }
}

async function getLastCommits(): Promise<
  readonly (DefaultLogFields & ListLogLine)[]
> {
  try {
    const lastTag = await getLastTag();
    const commits = await git.log({ from: lastTag, to: "HEAD" });

    if (commits.all.length === 0)
      throw new Error("No commits found since last tag");

    return commits.all;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function getLastTag(): Promise<string> {
  try {
    const tag = await git.tags();
    const lastTag = tag.latest;

    if (!lastTag) throw new Error();

    return lastTag;
  } catch (error) {
    console.error("Erreur lors de la récupération du dernier tag:", error);
    throw error;
  }
}

async function determineVersion(): Promise<string> {
  try {
    const commits = await getLastCommits();

    let fixCount = 0;
    let featCount = 0;
    let breakingChangeCount = 0;

    commits.forEach((commit) => {
      if (commit.message.startsWith("feat:")) {
        featCount++;
      } else if (commit.message.startsWith("fix:")) {
        fixCount++;
      }
      if (
        commit.message.includes("BREAKING CHANGE:") ||
        commit.message.startsWith("BREAKING CHANGE:")
      ) {
        breakingChangeCount++;
      }
    });

    if (breakingChangeCount > 0) {
      return "major";
    } else if (featCount >= fixCount) {
      return "minor";
    } else if (fixCount >= featCount) {
      return "patch";
    } else {
      return "";
    }
  } catch (error) {
    console.error("Erreur lors de la détermination de la version:", error);
    throw error;
  }
}

async function updatePackageVersion(nextVersion: string) {
  try {
    const pkg = getPackageJson();
    pkg.version = nextVersion;

    writeFileSync(
      new URL("../package.json", import.meta.url),
      JSON.stringify(pkg, null, 2)
    );
  } catch (error) {
    console.error("Erreur", error);
    throw error;
  }
}

async function getNextVersion(
  branch: string,
  canary: boolean,
  releaseType: string
) {
  const pkg = getPackageJson();

  try {
    let nextVersion: string | null;

    if (canary) {
      nextVersion = semver.inc(pkg.version, "prerelease", branch);
    } else {
      nextVersion = semver.inc(pkg.version, releaseType as ReleaseType);
    }

    return nextVersion;
  } catch (error) {
    console.error("Erreur: ", error);
    throw error;
  }
}

async function publishToNpm(branch: string, canary: boolean) {
  try {
    if (canary) {
      await execa("npm", ["publish", "--tag", branch]);
    } else {
      await execa("npm", ["publish"]);
    }
    console.log("Package publié sur npm");
  } catch (error) {
    console.error("Erreur lors de la publication sur npm:", error);
    throw error;
  }
}

async function createTag(prefix: string = "v", nextVersion: string) {
  try {
    const { name } = await git.addTag(`${prefix}${nextVersion}`);
    return name;
  } catch (error) {
    console.error("Erreur lors de la publication sur npm:", error);
    throw error;
  }
}

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function createGithubRelease(
  currentBranch: string,
  {
    owner = "ccreusat",
    repo = "simple-release",
    tag_name,
    body,
  }: {
    owner: string;
    repo: string;
    tag_name: string;
    body: string;
  }
) {
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
  } catch (error) {
    console.error("Erreur lors de la création de la release GitHub:", error);
    throw error;
  }
}

async function pushContent(
  branch: string,
  canary: boolean,
  nextVersion: string
) {
  try {
    const statusSummary = await git.status();
    const filesToAdd = statusSummary.files.map((file) => file.path);

    const gitMessage =
      config.git.commit?.message ||
      `chore: ${canary ? "prerelease" : "release"}: ${nextVersion}`;

    await git.add(filesToAdd);
    await git.commit(gitMessage);
    await git.push("origin", branch);
  } catch (error) {
    console.error("Erreur:", error);
    throw error;
  }
}

async function createRelease() {
  const currentBranch = await getCurrentBranch();
  const commits = await getLastCommits();
  const canary = await determineCanary(currentBranch);
  const releaseType = await determineVersion();
  const currentVersion = await getCurrentPackageVersion();
  const nextVersion = await getNextVersion(currentBranch, canary, releaseType);
  const lastTag = await getLastTag();
  const newTag = await createTag(config.git.tagPrefix, nextVersion as string);
  const releaseNotes = "Notes de release...";

  console.table({ currentVersion, lastTag, releaseType, nextVersion, commits });

  try {
    await updatePackageVersion(nextVersion as string);

    if (config.git.handle_working_tree) {
      await pushContent(currentBranch, canary, nextVersion as string);
    }

    if (config.npm.publish) await publishToNpm(currentBranch, canary);

    if (config.github?.createGithubRelease) {
      if (
        !config.releaseBranches.find((branch) => branch.name === currentBranch)
          ?.createGithubRelease
      ) {
        return;
      }

      await createGithubRelease(currentBranch, {
        owner: "ccreusat",
        repo: "simple-release",
        tag_name: newTag,
        body: releaseNotes,
      });
    }

    await updateMetadataForRelease(
      nextVersion as string,
      releaseNotes,
      commits
    );
  } catch (error) {
    console.error("Erreur globale lors de la création de la release:", error);
    throw error;
  }
}

createRelease()
  .then(() => console.log("Release terminée avec succès"))
  .catch((error) => console.error("Erreur lors de la release:", error));
