import { simpleGit } from "simple-git";
import { isConventional } from "./is-commit-conventional";

const git = simpleGit();

git.tags((error, tags) => {
  if (error) {
    console.error("Something wrong happened", error);
    return;
  }

  const lastTag = tags.latest;

  if (lastTag) {
    console.log("Last tag is:", lastTag);
  } else {
    console.log("No tag found");
  }

  git.log({ from: lastTag }, (error, commits) => {
    if (error) {
      console.error("Something wrong happened:", error);
      return;
    }

    console.log("Commits since last tag:", commits.all.length);

    commits.all.forEach(isConventional);
  });
});
