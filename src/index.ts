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
import { Monorepo } from "./modules/monorepo";
import { Github } from "./modules/github";
import path from "node:path";

type Canary = boolean;

async function determineCanary(currentBranch: string): Promise<Canary> {
  try {
    if (RELEASE_BRANCHES.includes(currentBranch)) {
      return false;
    } else if (PRERELEASE_BRANCHES.includes(currentBranch)) {
      return true;
    } else if (
      config.branches.find((branch) => branch.name === currentBranch)
    ) {
      return config.branches.find((branch) => branch.name === currentBranch)
        ?.prerelease
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
  const changelogManager = new Changelog();
  const githubManager = new Github();

  const pkg = packageManager.getPath();

  console.log({ pkg });

  const releaseNotes = "Notes de release...";

  /* try {
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

    if (!canary) {
      await changelogManager.generateFirstChangelog(
        config.changelog.preset,
        config.git.tagPrefix
      );
    }

    if (!nextVersion) {
      throw new Error("Unable to calculate next version.");
    }

    await packageManager.updatePackageVersion(nextVersion as string);

    console.table({
      currentVersion,
      lastTag,
      releaseType,
      nextVersion,
      commits,
    });

    if (config.git.enable) {
      await gitManager.pushChanges(
        currentBranch,
        canary,
        nextVersion as string
      );
    }

    if (config.npm.publish) await npmManager.publish(currentBranch, canary);

    if (!canary && config.github?.createGithubRelease) {
      await githubManager.createGithubRelease({
        owner: "ccreusat",
        repo: "simple-release",
        tag_name: await gitManager.createTag(
          config.git.tagPrefix,
          nextVersion as string
        ),
        body: releaseNotes,
      });
    }

    await metadataManager.updateMetadataForRelease(
      nextVersion as string,
      releaseType,
      releaseNotes,
      commits
    );
  } catch (error) {
    console.error("Erreur globale lors de la création de la release:", error);
    throw error;
  } */
}

/* createRelease()
  .then(() => console.log("Release terminée avec succès"))
  .catch((error) => console.error("Erreur lors de la release:", error)); */

async function createMonorepoRelease() {
  const gitManager = new Git();
  const npmManager = new Npm();
  const metadataManager = new Metadata("./versions-metadata.json");
  const bumpManager = new Bump();
  const packageManager = new Package();
  const changelogManager = new Changelog();
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

      const nextVersion = await bumpManager.getNextVersion(
        pkg,
        currentBranch,
        canary,
        releaseType
      );

      /* if (!canary) {
        await changelogManager.generateFirstChangelog(
          config.changelog.preset,
          config.git.tagPrefix
        );
      } */

      if (!nextVersion) {
        throw new Error("Unable to calculate next version.");
      }

      await packageManager.update(nextVersion as string, fullPath);

      console.table({
        currentVersion,
        lastTag,
        releaseType,
        nextVersion,
        commits,
      });

      if (config.git.enable) {
        await gitManager.pushChanges(
          currentBranch,
          canary,
          nextVersion as string
        );
      }

      // if (config.npm.publish) await npmManager.publish(currentBranch, canary);

      /* if (!canary && config.github?.createGithubRelease) {
        await githubManager.createGithubRelease({
          owner: "ccreusat",
          repo: "simple-release",
          tag_name: await gitManager.createTag(
            config.git.tagPrefix,
            nextVersion as string
          ),
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
}

createMonorepoRelease()
  .then(() => console.log("Release terminée avec succès"))
  .catch((error) => console.error("Erreur lors de la release:", error));
