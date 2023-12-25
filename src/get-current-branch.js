import { simpleGit } from "simple-git";

const git = simpleGit();

git.branch((err, BranchSummaryResult) => {
  if (err) {
    console.error("Something wrong happened", err);
    return;
  }

  const currentBranch = BranchSummaryResult.current;

  console.log(`Current branch is ${currentBranch}`);
});
