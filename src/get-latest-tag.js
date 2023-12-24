import { simpleGit } from "simple-git";

const git = simpleGit();

git.tags((err, tags) => {
  if (err) {
    console.error("Erreur lors de la récupération des tags:", err);
    return;
  }

  const lastTag = tags.latest;

  if (!lastTag) {
    console.log("No tag found");
    return;
  }
  console.log("Dernier tag créé:", lastTag);
});
