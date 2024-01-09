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
const config = {
    ...defaultConfig,
    ...userConfig?.config,
};

new Octokit({ auth: process.env.GITHUB_TOKEN });

class Changelog {
    async generateFirstChangelog(preset, customPrefix) {
        try {
            await execa("conventional-changelog", [
                "-p",
                `${preset}`,
                "-i",
                "CHANGELOG.md",
                "-s",
                `--tag-prefix ${customPrefix}`,
                "-r 0",
            ]);
            // conventional-changelog -p conventionalcommits --skip-unstable --tag-prefix v -i CHANGELOG.md -s -r 0
        }
        catch (error) {
            throw error;
        }
    }
    async updateChangelog(preset, customPrefix) {
        try {
            await execa("conventional-changelog", [
                "-p",
                `${preset}`,
                "-i",
                "CHANGELOG.md",
                "-s",
                "--skip-unstable",
                "--tag-prefix",
                `${customPrefix}`,
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
async function generateChangelog() {
    const changelogManager = new Changelog();
    await changelogManager.updateChangelog(config.changelog.preset, config.git.tagPrefix);
}
generateChangelog();
