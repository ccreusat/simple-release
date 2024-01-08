import {
  PRERELEASE_BRANCHES,
  RELEASE_BRANCHES,
} from "./constants/default-branch";

import { config } from "./config";
import { Git } from "./modules/git";
import { Npm } from "./modules/npm";
import { Metadata } from "./modules/metadata";
import { Bump } from "./modules/bump";
import { Package } from "./modules/package";
import { Changelog } from "./modules/changelog";

type Canary = boolean;

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

async function createRelease() {
  const gitManager = new Git();
  const npmManager = new Npm();
  const metadataManager = new Metadata("./versions-metadata.json");
  const bumpManager = new Bump();
  const packageManager = new Package();

  const pkg = packageManager.getPackageJson();

  const releaseNotes = "Notes de release...";

  try {
    const [currentBranch, commits, lastTag] = await Promise.all([
      gitManager.getCurrentBranch(),
      await gitManager.getLastCommits(),
      await gitManager.getLastTag(),
    ]);

    const [canary, releaseType, currentVersion] = await Promise.all([
      determineCanary(currentBranch),
      bumpManager.getNextBump(commits),
      packageManager.getCurrentPackageVersion(),
    ]);

    const nextVersion = await bumpManager.getNextVersion(
      pkg,
      currentBranch,
      canary,
      releaseType
    );

    if (!nextVersion) {
      throw new Error("Unable to calculate next version.");
    }

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

    /* if (config.git.handle_working_tree) {
      await gitManager.pushChanges(
        currentBranch,
        canary,
        nextVersion as string
      );
    } */

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
      releaseType,
      releaseNotes,
      commits
    ); */
  } catch (error) {
    console.error("Erreur globale lors de la création de la release:", error);
    throw error;
  }
}

/* function generateChangelog(metadataManager: any) {
  const metadata = metadataManager.readMetadata();

  const changelogPath = "./CHANGELOG.md";

  const findLastVersion = metadata.versions.find(
    (info) => info.version === "1.8.1"
  );

  let changelog = "# Release Note\n\n";

  findLastVersion.commits.forEach((commit) => {
    changelog += `- ${commit.message}\n`;
  });

  writeFileSync(changelogPath, changelog);
  console.log({ changelog });
} */

// generateChangelog(new Metadata("./versions-metadata.json"));

// createRelease()
//   .then(() => console.log("Release terminée avec succès"))
//   .catch((error) => console.error("Erreur lors de la release:", error));

function generateChangelog() {
  const changelogManager = new Changelog();

  changelogManager.generateFirstChangelog("angular");
}

generateChangelog();
