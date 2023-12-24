import { simpleGit } from "simple-git";
import { getLastTag } from "./get-latest-tag.js";

const git = simpleGit();

const lastTag = getLastTag();

git.log({ from: lastTag }, (err, commits) => {
  if (err) {
    console.error("Something wrong happened:", err);
    return;
  }

  console.log("Commits since last tag:", commits.all);
});
