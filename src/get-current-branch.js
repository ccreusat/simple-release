import { simpleGit } from "simple-git";

const git = simpleGit();

export async function getCurrentBranch() {
  try {
    const branch = await git.branch();
    return branch.current;
  } catch (error) {
    console.error(error);
  }
}
