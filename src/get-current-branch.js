import { simpleGit } from "simple-git";

const git = simpleGit();

git.branch((err, BranchSummaryResult) => {
  if (err) {
    console.error("Something wrong happened", err);
    return;
  }

  const allBranches = BranchSummaryResult.all;
  const currentBranch = BranchSummaryResult.current;

  console.log("All branches:", allBranches);
  console.log(allBranches.includes(currentBranch));
  console.log("Current branch", currentBranch);
});
