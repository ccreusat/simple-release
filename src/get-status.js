import { simpleGit } from "simple-git";
import chalk from "chalk";

const git = simpleGit();

export async function getGitStatus() {
  try {
    const status = await git.status();

    // if (status.files.length !== 0) throw new Error();

    return status.files.length === 0;
  } catch (error) {
    console.error(chalk.red("Working tree is not clean"));
  }
}
