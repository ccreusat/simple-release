import { simpleGit } from "simple-git";

const git = simpleGit();

git.log((error, commits) => {
  if (error) {
    console.error("Something wrong happened:", error);
    return;
  }

  commits.all.forEach((commit) => console.log(commit));
});
