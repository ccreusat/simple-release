import { simpleGit } from "simple-git";

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

  git.log({ from: lastTag }, (err, commits) => {
    if (err) {
      console.error("Something wrong happened:", err);
      return;
    }

    console.log("Commits since last tag:", commits.all);
  });
});
