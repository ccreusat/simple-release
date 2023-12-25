import { simpleGit } from "simple-git";

const git = simpleGit();

// Récupérer le dernier tag
git.tags((error, tags) => {
  if (error) {
    console.error("Erreur lors de la récupération des tags:", error);
    return;
  }

  const lastTag = tags.latest;

  // Récupérer le premier commit après le dernier tag
  git.log({ from: lastTag, to: "HEAD" }, (error, commits) => {
    if (error) {
      console.error("Erreur lors de la récupération des commits:", error);
      return;
    }

    // Le premier commit après le dernier tag
    const firstCommitAfterTag = commits.latest;
    console.log("Premier commit après le dernier tag:", firstCommitAfterTag);
  });
});
