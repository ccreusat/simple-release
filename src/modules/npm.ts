// npmManager.ts
import { execa } from "execa";

export class Npm {
  async publish(branch: string, canary: boolean) {
    try {
      if (canary) {
        await execa("npm", ["publish", "--tag", branch]);
      } else {
        await execa("npm", ["publish"]);
      }
      console.log("Package published to npm");
    } catch (error) {
      console.error("Unable to publish to npm", error);
      throw error;
    }
  }

  async publishPackage(branch: string, canary: boolean) {
    try {
      if (canary) {
        await execa("pnpm", ["publish", "-r", "--tag", branch]);
      } else {
        await execa("pnpm", ["-r", "publish"]);
      }
      console.log("Package published to npm");
    } catch (error) {
      console.error("Unable to publish to npm", error);
      throw error;
    }
  }
}

async function createMonorepoRelease() {
  const monorepoManager = new Monorepo();
  const gitManager = new Git();
  const npmManager = new Npm();
  const metadataManager = new Metadata("./versions-metadata.json");
  const bumpManager = new Bump();
  const changelogManager = new Changelog();
  const githubManager = new Github();

  const releaseNotes = "Notes de release...";

  console.log(monorepoManager.getSubfolders());

  const folders = monorepoManager.getSubfolders();

  try {
    const pkgs = monorepoManager.findPackageJson();

    for (const folder of folders) {
      let nextVersion;
      const packageManager = new Package(
        `${monorepoManager.getPackagePath()}/${folder}`
      );

      console.log(packageManager.getPath());

      /* const [currentBranch, commits, lastTag] = await Promise.all([
        gitManager.getCurrentBranch(),
        gitManager.getLastCommits(),
        gitManager.getLastTag(),
      ]);

      const [canary, releaseType] = await Promise.all([
        determineCanary(currentBranch),
        bumpManager.getNextBump(commits),
      ]);

      const currentVersion = pkg.version;
      const currentName = pkg.name;

      console.log({ currentName, currentVersion });

      nextVersion = await bumpManager.getNextVersion(
        pkg,
        currentBranch,
        canary,
        releaseType
      );

      console.table({
        currentVersion,
        lastTag,
        releaseType,
        nextVersion,
        commits,
      }); */

      /* if (!canary) {
        await changelogManager.generateFirstChangelog(
          config.changelog.preset,
          config.git.tagPrefix
        );
      } */

      /* if (!nextVersion) {
        throw new Error("Unable to calculate next version.");
      } */

      /* const tagExists = await gitManager.hasTag(
        `${currentName}@${nextVersion}`
      );

      let newTag;

      if (tagExists) {
        newTag = await bumpManager.forcePatch(pkg);
      } else {
        newTag =
          !canary &&
          (await gitManager.createTag(
            `${currentName}@`,
            nextVersion as string
          ));
      } */

      // const path = packageManager.getPath();

      //console.log({ path });

      /* const pkgName = packageManager.getCurrentPackageName();

      console.log({ pkgName }); */

      // await packageManager.updatePackageVersion(nextVersion as string);

      /* if (config.git.enable) {
      await gitManager.pushChanges(
        currentBranch,
        canary,
        nextVersion as string
      );
    } */

      /* if (config.npm.publish) await npmManager.publish(currentBranch, canary); */

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
    }
  } catch (error) {
    console.error("Erreur globale lors de la création de la release:", error);
    throw error;
  }
}
