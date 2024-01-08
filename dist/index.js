import { cosmiconfigSync } from 'cosmiconfig';
import { Octokit } from '@octokit/rest';
import 'simple-git';
import { execa } from 'execa';
import 'fs';
import 'semver';

const moduleName = "phnx";
const explorer = cosmiconfigSync(moduleName);
const userConfig = explorer.search();
const defaultConfig = {
    git: {
        handle_working_tree: true,
        tagPrefix: "v",
    },
    github: {
        createGithubRelease: true,
    },
    npm: {
        publish: true,
    },
    changelog: {
        preset: "conventionalcommits",
    },
    baseBranch: "main",
    branches: [
        {
            name: "alpha",
            prerelease: true,
            createGithubRelease: false,
        },
        {
            name: "beta",
            prerelease: true,
            createGithubRelease: false,
        },
        {
            name: "rc",
            prerelease: true,
            createGithubRelease: false,
        },
    ],
};
({
    ...defaultConfig,
    ...userConfig?.config,
});

new Octokit({ auth: process.env.GITHUB_TOKEN });

class Changelog {
    async generateFirstChangelog(preset) {
        console.log("inside");
        try {
            execa("conventional-changelog", [
                "-p",
                `${preset}`,
                "-i",
                "CHANGELOG.md",
                "-s",
                "--skip-unstable",
                "-r 0",
            ]);
        }
        catch (error) {
            throw error;
        }
    }
    async updateChangelog(preset) {
        try {
            execa("conventional-changelog", [
                "-p",
                `${preset}`,
                "-i",
                "CHANGELOG.md",
                "-s",
                "--skip-unstable",
            ]);
        }
        catch (error) {
            throw error;
        }
    }
}

/* function generateChangelog(metadataManager: any) {
  const metadata = metadataManager.readMetadata();

  const changelogPath = "./CHANGELOG.md";

  const findLastVersion = metadata.versions.find(
    (info) => info.version === "1.8.1"
  );

  let changelog = "# Release Note\n\n";

  findLastVersion.commits.forEach((commit) => {
    changelog += `- ${commit.message}\n`;
  });

  writeFileSync(changelogPath, changelog);
  console.log({ changelog });
} */
// generateChangelog(new Metadata("./versions-metadata.json"));
// createRelease()
//   .then(() => console.log("Release terminée avec succès"))
//   .catch((error) => console.error("Erreur lors de la release:", error));
function generateChangelog() {
    const changelogManager = new Changelog();
    changelogManager.generateFirstChangelog("angular");
}
generateChangelog();
