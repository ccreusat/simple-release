import { cosmiconfigSync } from "cosmiconfig";

export interface ReleaseBranches {
  name: string;
  prerelease: boolean;
  createGithubRelease: boolean;
}

export interface ReleaseConfig {
  git: {
    enable: boolean;
    tagPrefix?: string;
    commit?: {
      message?: string;
    };
  };
  github?: {
    createGithubRelease: boolean;
  };
  npm: {
    publish: boolean;
  };
  changelog: {
    preset: "conventionalcommits" | "angular";
  };
  baseBranch: string;
  branches: ReleaseBranches[];
}

const moduleName = "phnx";
const explorer = cosmiconfigSync(moduleName);
const userConfig = explorer.search();
const defaultConfig: ReleaseConfig = {
  git: {
    enable: true,
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

export const config: ReleaseConfig = {
  ...defaultConfig,
  ...userConfig?.config,
};
