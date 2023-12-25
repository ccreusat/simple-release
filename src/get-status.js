import { simpleGit } from "simple-git";

const git = simpleGit();

git.status((err, StatusResult) => {
  console.log(StatusResult);

  if (StatusResult.files.length !== 0) {
    console.error("Working tree is not clean");
    return;
  }

  console.error("Everything is clear!");
});
