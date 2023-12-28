import { simpleGit } from "simple-git";
import chalk from "chalk";

const git = simpleGit();

export async function checkIsRepo() {
  try {
    const isInitialized = await git.checkIsRepo();

    if (!isInitialized) throw new Error();

    console.log(chalk.green("Le repo est déjà initialisé."));
    return isInitialized;
  } catch (error) {
    console.log(chalk.red("Le repo n'est pas initialisé."));
    process.exit(1);
  }
}
