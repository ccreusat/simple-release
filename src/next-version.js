import { simpleGit } from "simple-git";

const git = simpleGit();

/**
 * patch | minor | major
 */
let nextVersion = "patch";

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
      console.error("Error:", error);
      return;
    }

    // Le premier commit après le dernier tag
    const firstCommitAfterTag = commits.latest;

    if (!firstCommitAfterTag) {
      console.error("No commit found");
      return;
    }

    if (firstCommitAfterTag.message.startsWith("fix")) {
      nextVersion = "patch";
    } else if (firstCommitAfterTag.message.startsWith("feat")) {
      nextVersion = "minor";
    } else if (firstCommitAfterTag.message.startsWith("chore")) {
      nextVersion = "patch";
    } else if (firstCommitAfterTag.message.includes("!")) {
      nextVersion = "major";
    } else {
      nextVersion = "patch";
    }

    console.log(`NextVersion: ${nextVersion}`);
  });
});
