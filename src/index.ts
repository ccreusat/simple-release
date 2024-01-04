import simpleGit, { SimpleGit } from "simple-git";
import { execa } from "execa";
import { cosmiconfigSync } from "cosmiconfig";
import { readFileSync, writeFileSync } from "fs";
import { PRERELEASE_BRANCH, RELEASE_BRANCH } from "./constants/default-branch";
import { Octokit } from "@octokit/rest";
import semver from "semver";

interface ReleaseBranches {
  name: string;
  prerelease: boolean;
  enableReleaseNotes: boolean;
}

interface ReleaseConfig {
  git: {
    handle_working_tree: boolean;
    commit: {
      message: string;
    };
  };
  github?:
    | boolean
    | {
        enableReleaseNotes: boolean;
      };
  gitlab?:
    | boolean
    | {
        token: string;
        projectId: string;
      };
  npm: {
    versioning: boolean;
    publish: boolean;
  };
  branches: [string, ...ReleaseBranches[]];
}

const moduleName = "phnx";
const explorer = cosmiconfigSync(moduleName);

const defaultConfig: ReleaseConfig = {
  git: {
    handle_working_tree: true,
    commit: {
      message: "chore: release",
    },
  },
  github: {
    enableReleaseNotes: true,
  },
  npm: {
    versioning: true,
    publish: true,
  },
  branches: [
    "main",
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
const config: ReleaseConfig = { ...defaultConfig, ...userConfig?.config };

const git: SimpleGit = simpleGit();

enum ReleaseType {
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

async function determineReleaseType(): Promise<ReleaseType> {
  try {
    const currentBranch = await getCurrentBranch();
    if (RELEASE_BRANCH.includes(currentBranch)) {
      return ReleaseType.Release;
    } else if (PRERELEASE_BRANCH.includes(currentBranch)) {
      return ReleaseType.Prerelease;
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
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8")
    );
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

async function updatePackageVersion() {
  try {
    const lastTag = await getLastTag();
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8")
    );

    pkg.version = lastTag.split("v")[1];

    writeFileSync(
      new URL("../package.json", import.meta.url),
      JSON.stringify(pkg, null, 2)
    );
  } catch (error) {
    console.error("Erreur", error);
    throw error;
  }
}

async function getNextVersion() {
  try {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8")
    );

    const [versionNumber, prerelease] = pkg.version.split("-");

    console.log({ versionNumber, prerelease });

    const version = semver.inc("1.5.4-alpha.1", "prerelease");
    return version;
  } catch (error) {
    console.error("Erreur: ", error);
    throw error;
  }
}

async function npmVersion(nextVersion: string) {
  try {
    const releaseType = await determineReleaseType();
    const currentBranch = await getCurrentBranch();

    await updatePackageVersion();

    if (releaseType === ReleaseType.Prerelease) {
      await execa("npm", ["version", "prerelease", "--preid", currentBranch]);

      // npm version prerelease --preid alpha -m "Upgrade to %s for reasons" -f
      console.log("Version prerelease mise à jour");
    } else {
      await execa("npm", ["version", nextVersion]);
      console.log(`Version ${nextVersion} mise à jour`);
    }
  } catch (error) {
    console.error(
      "Erreur lors de la mise à jour de la version du package:",
      error
    );
    throw error;
  }
}

async function publishToNpm() {
  try {
    const currentBranch = await getCurrentBranch();

    await execa("npm", ["publish", "--tag", currentBranch]);
    console.log("Package publié sur npm");
  } catch (error) {
    console.error("Erreur lors de la publication sur npm:", error);
    throw error;
  }
}

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function createGithubRelease() {
  try {
    const version = await determineVersion();
    const tagName = `v${version}`;
    const releaseNotes = "Notes de release..."; // Remplacer par vos notes de release

    await octokit.repos.createRelease({
      owner: "ccreusat",
      repo: "simple-release",
      tag_name: tagName,
      name: tagName,
      body: releaseNotes,
      draft: false,
      prerelease: (await determineReleaseType()) === ReleaseType.Prerelease,
    });

    console.log("Release GitHub créée avec succès");
  } catch (error) {
    console.error("Erreur lors de la création de la release GitHub:", error);
    throw error;
  }
}

async function createGitlabRelease() {
  try {
    const response = await fetch(
      `https://gitlab.com/api/v4/projects/${config?.gitlab?.projectId}/releases`,
      {
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
      }
    );

    if (!response.ok) {
      throw new Error(
        `Échec de la création de la release GitLab : ${response.statusText}`
      );
    }

    console.log("Release GitLab créée avec succès");
  } catch (error) {
    console.error("Erreur lors de la création de la release GitLab:", error);
    throw error;
  }
}

async function pushContent(nextVersion: string) {
  const currentBranch = await getCurrentBranch();
  const statusSummary = await git.status();
  const filesToAdd = statusSummary.files.map((file) => file.path);

  console.log({ nextVersion });

  const gitMessage =
    config.git.commit.message || `chore: release: ${nextVersion}`;

  await git.add(filesToAdd);
  await git.commit(gitMessage);
  await git.push("origin", currentBranch);
}

// --- Fonction Principale ---
async function createRelease() {
  const getVersion = await getCurrentPackageVersion();
  const lastTag = await getLastTag();
  const nextVersion = await getNextVersion();

  console.log({ getVersion, lastTag });

  try {
    if (config.git.handle_working_tree) await pushContent(nextVersion);

    // if (config.npm.versioning) await npmVersion(nextVersion);
    if (config.npm.versioning) semver.inc("1.5.4", "prerelease", "alpha", "1");

    if (config.npm.publish) await publishToNpm();

    if (config.github) createGithubRelease();

    if (config.gitlab) await createGitlabRelease();
  } catch (error) {
    console.error("Erreur globale lors de la création de la release:", error);
    throw error;
  }
}

// --- Exécution ---
createRelease()
  .then(() => console.log("Release terminée avec succès"))
  .catch((error) => console.error("Erreur lors de la release:", error));
