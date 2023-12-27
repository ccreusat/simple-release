import { getConfig } from "./find-cosmiconfig.js";
import { getCurrentBranch } from "./get-current-branch.js";

/* Create a pre-release version and create git tag */
export async function prerelease() {
  try {
    const { prerelease } = await getConfig();
    const currentBranch = await getCurrentBranch();

    const preid = prerelease.find(
      (prereleaseBranch) => prereleaseBranch === currentBranch
    );

    console.log({ preid, currentBranch });

    const { stdout } = await execa("npm", [
      "version",
      "prerelease",
      "--preid",
      preid,
    ]);

    console.log(chalk.green(stdout));
    return stdout;
  } catch (error) {
    console.log(error);
    console.error(chalk.red(`${error}`));
  }
}
