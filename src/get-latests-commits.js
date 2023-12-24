import simpleGit from "simple-git";

const git = simpleGit();

git.log({ from: lastTag }, (err, commits) => {
  if (err) {
    console.error("Erreur lors de la récupération des commits:", err);
    return;
  }

  console.log("Commits depuis le dernier tag:", commits.all);
});
