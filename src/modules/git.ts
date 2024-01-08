import { Octokit } from "@octokit/rest";
import simpleGit, {
  DefaultLogFields,
  ListLogLine,
  SimpleGit,
} from "simple-git";
import { config } from "../config";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export class Git {
  private git: SimpleGit;

  constructor() {
    this.git = simpleGit();
  }

  async getCurrentBranch() {
    try {
      const branchSummary = await this.git.branch();
      const currentBranch = branchSummary.current;

      return currentBranch;
    } catch (error) {
      console.error("Unable to detect the current branch", error);
      throw error;
    }
  }

  async createTag(prefix: string = "v", nextVersion: string) {
    try {
      const { name } = await this.git.addTag(`${prefix}${nextVersion}`);
      return name;
    } catch (error) {
      console.error("Can not create a tag", error);
      throw error;
    }
  }

  async pushChanges(branch: string, canary: boolean, nextVersion: string) {
    try {
      const statusSummary = await this.git.status();
      const filesToAdd = statusSummary.files.map((file) => file.path);

      const gitMessage =
        config.git.commit?.message ||
        `chore: ${canary ? "prerelease" : "release"}: ${nextVersion}`;

      await this.git.add(filesToAdd);
      await this.git.commit(gitMessage);
      await this.git.push("origin", branch);
    } catch (error) {
      console.error("Erreur:", error);
      throw error;
    }
  }

  async getLastTag(): Promise<string> {
    try {
      const tag = await this.git.tags();
      const lastTag = tag.latest;

      if (!lastTag) throw new Error();

      return lastTag;
    } catch (error) {
      console.error("Erreur lors de la récupération du dernier tag:", error);
      throw error;
    }
  }

  async getLastCommits(): Promise<readonly (DefaultLogFields & ListLogLine)[]> {
    try {
      const lastTag = await this.getLastTag();
      const commits = await this.git.log({ from: lastTag, to: "HEAD" });

      if (commits.all.length === 0)
        throw new Error("No commits found since last tag");

      return commits.all;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async createGithubRelease({
    owner = "ccreusat",
    repo = "simple-release",
    tag_name,
    body,
  }: {
    owner: string;
    repo: string;
    tag_name: string;
    body: string;
  }) {
    try {
      await octokit.repos.createRelease({
        owner,
        repo,
        tag_name,
        name: tag_name,
        body,
        draft: false,
        // prerelease: (await determineCanary(currentBranch)) === true,
      });

      console.log("Release GitHub créée avec succès");
    } catch (error) {
      console.error("Erreur lors de la création de la release GitHub:", error);
      throw error;
    }
  }
}
