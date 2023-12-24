import { simpleGit } from "simple-git";

const git = simpleGit();

/* const status = await git.status(); */

/* if (status.files.length !== 0) {
  console.error("Working tree is not clean");
  return;
  // process.exit(1);
} */

git.status((err, StatusResult) => {
  console.log(StatusResult);

  if (StatusResult.files.length !== 0) {
    console.error("Working tree is not clean");
    return;
  }

  console.error("Everything is clear!");
});
