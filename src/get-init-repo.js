import { simpleGit } from "simple-git";

const git = simpleGit();

git.checkIsRepo((err, isRepo) => {
  if (err) {
    console.error("Erreur lors de la vérification du repo:", err);
    return;
  }

  if (isRepo) {
    console.log("Le repo est déjà initialisé.");
  } else {
    console.log("Le repo n'est pas initialisé.");
  }
});
