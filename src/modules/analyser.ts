import { DefaultLogFields, ListLogLine } from "simple-git";

export class CommitAnalyzer {
  private _analyzeCommits(
    commits: readonly (DefaultLogFields & ListLogLine)[]
  ): "major" | "minor" | "patch" | "prerelease" {
    let hasBreaking = false;
    let hasFeatures = false;

    commits.forEach((commit) => {
      if (
        /BREAKING CHANGE:/.test(commit.message) ||
        commit.message.startsWith("perf:")
      ) {
        hasBreaking = true;
      } else if (commit.message.startsWith("feat:")) {
        hasFeatures = true;
      } else if (commit.message.match(/\w+\(.*\)\!:|\w+!\:/)) {
        hasBreaking = true;
      }
    });

    if (hasBreaking) return "major";
    if (hasFeatures) return "minor";

    return "patch";
  }

  async determineNextVersion(
    commits: readonly (DefaultLogFields & ListLogLine)[]
  ): Promise<"major" | "minor" | "patch" | "prerelease"> {
    return this._analyzeCommits(commits);
  }
}
