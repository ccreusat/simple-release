import { cosmiconfigSync } from "cosmiconfig";

export interface ReleaseBranches {
  name: string;
  prerelease: boolean;
  createGithubRelease: boolean;
}

export interface ReleaseConfig {
  git: {
    handle_working_tree: boolean;
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
  baseBranch: string;
  releaseBranches: ReleaseBranches[];
}

const moduleName = "phnx";
const explorer = cosmiconfigSync(moduleName);
const userConfig = explorer.search();
const defaultConfig: ReleaseConfig = {
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
  baseBranch: "main",
  releaseBranches: [
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
