import semver, { ReleaseType } from "semver";
import { DefaultLogFields, ListLogLine } from "simple-git";

export class Bump {
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

  async determineVersion(
    commits: readonly (DefaultLogFields & ListLogLine)[]
  ): Promise<string> {
    try {
      let fixCount = 0;
      let featCount = 0;
      let breakingChangeCount = 0;

      commits.forEach((commit) => {
        if (commit.message.startsWith("feat:")) {
          featCount++;
        } else if (commit.message.startsWith("fix:")) {
          fixCount++;
        }
        if (
          commit.message.includes("BREAKING CHANGE:") ||
          commit.message.startsWith("BREAKING CHANGE:")
        ) {
          breakingChangeCount++;
        }
      });

      if (breakingChangeCount > 0) {
        return "major";
      } else if (featCount >= fixCount) {
        return "minor";
      } else if (fixCount >= featCount) {
        return "patch";
      } else {
        return "";
      }
    } catch (error) {
      console.error("Erreur lors de la détermination de la version:", error);
      throw error;
    }
  }
}
