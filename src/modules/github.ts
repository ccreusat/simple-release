import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export class Github {
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
