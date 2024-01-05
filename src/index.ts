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

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
);

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

enum LibReleaseType {
  Release = "release",
  Prerelease = "prerelease",
}

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

async function determineReleaseType(
  currentBranch: string
): Promise<LibReleaseType> {
  try {
    if (RELEASE_BRANCHES.includes(currentBranch)) {
      return LibReleaseType.Release;
    } else if (PRERELEASE_BRANCHES.includes(currentBranch)) {
      return LibReleaseType.Prerelease;
    } else if (
      config.releaseBranches.find((branch) => branch.name === currentBranch)
    ) {
      return config.releaseBranches.find(
        (branch) => branch.name === currentBranch
      )?.prerelease
        ? LibReleaseType.Prerelease
        : LibReleaseType.Release;
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
    } else {
      return "patch";
    }
  } catch (error) {
    console.error("Erreur lors de la détermination de la version:", error);
    throw error;
  }
}

async function updatePackageVersion(nextVersion: string) {
  try {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8")
    );
    pkg.version = nextVersion;

    console.log({ pkg, nextVersion }, pkg.version);
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
  releaseType: string,
  versionType: string
) {
  console.log({ branch, releaseType, versionType });
  try {
    let nextVersion: string | null;

    if (releaseType === LibReleaseType.Prerelease) {
      nextVersion = semver.inc(pkg.version, "prerelease", branch);
    } else {
      nextVersion = semver.inc(pkg.version, versionType as ReleaseType);
    }

    await updatePackageVersion(nextVersion as string);

    return nextVersion;
  } catch (error) {
    console.error("Erreur: ", error);
    throw error;
  }
}

async function publishToNpm(branch: string, releaseType: string) {
  try {
    if (releaseType === LibReleaseType.Prerelease) {
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
      prerelease:
        (await determineReleaseType(currentBranch)) ===
        LibReleaseType.Prerelease,
    });

    console.log("Release GitHub créée avec succès");
  } catch (error) {
    console.error("Erreur lors de la création de la release GitHub:", error);
    throw error;
  }
}

async function pushContent(
  branch: string,
  releaseType: string,
  nextVersion: string
) {
  try {
    const statusSummary = await git.status();
    const filesToAdd = statusSummary.files.map((file) => file.path);

    const gitMessage =
      config.git.commit?.message ||
      `chore: ${
        releaseType === LibReleaseType.Prerelease ? "prerelease" : "release"
      }: ${nextVersion}`;

    await git.add(filesToAdd);
    await git.commit(gitMessage);
    await git.push("origin", branch);
  } catch (error) {
    console.error("Erreur:", error);
    throw error;
  }
}

// --- Fonction Principale ---
async function createRelease() {
  const currentBranch = await getCurrentBranch();
  const releaseType = await determineReleaseType(currentBranch);
  const versionType = await determineVersion();
  const nextVersion = await getNextVersion(
    currentBranch,
    releaseType,
    versionType
  );
  const currentVersion = await getCurrentPackageVersion();
  const lastTag = await getLastTag();
  const newTag = await createTag(config.git.tagPrefix, nextVersion as string);
  const releaseNotes = "Notes de release..."; // Remplacer par vos notes de release
  const commits = await getLastCommits();
  console.table({ currentVersion, lastTag, newTag, nextVersion });

  await updateMetadataForRelease(nextVersion as string, releaseNotes, commits);

  try {
    if (config.git.handle_working_tree)
      await pushContent(currentBranch, releaseType, nextVersion as string);

    if (config.npm.publish) await publishToNpm(currentBranch, releaseType);

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
  } catch (error) {
    console.error("Erreur globale lors de la création de la release:", error);
    throw error;
  }
}

// --- Exécution ---
createRelease()
  .then(() => console.log("Release terminée avec succès"))
  .catch((error) => console.error("Erreur lors de la release:", error));
