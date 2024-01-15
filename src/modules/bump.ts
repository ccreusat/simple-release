import semver, { ReleaseType } from "semver";
import { DefaultLogFields, ListLogLine } from "simple-git";

export class Bump {
  private _analyzeCommits(
    commits: readonly (DefaultLogFields & ListLogLine)[]
  ): "major" | "minor" | "patch" {
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

  async getNextVersion(
    pkg: any,
    branch: string,
    canary: boolean,
    releaseType: string
  ): Promise<string | null> {
    try {
      let nextVersion: string | null;

      if (canary) {
        nextVersion = semver.inc(pkg.version, "prerelease", branch);
      } else {
        nextVersion = semver.inc(pkg.version, releaseType as ReleaseType);
      }

      return nextVersion;
    } catch (error) {
      console.error("Erreur: ", error);
      throw error;
    }
  }

  async forcePatch(pkg: any) {
    return semver.inc(pkg.version, "patch");
  }

  async getNextBump(
    commits: readonly (DefaultLogFields & ListLogLine)[]
  ): Promise<"major" | "minor" | "patch"> {
    return this._analyzeCommits(commits);
  }
}
