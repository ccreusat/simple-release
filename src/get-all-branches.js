import { simpleGit } from "simple-git";

const git = simpleGit();

git.branch((error, BranchSummaryResult) => {
  if (error) {
    console.error("Something wrong happened", error);
    return;
  }

  const allBranches = BranchSummaryResult.all;

  allBranches.forEach((branch) => console.log(branch));
});
