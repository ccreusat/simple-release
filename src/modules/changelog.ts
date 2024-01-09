import { execa } from "execa";

export class Changelog {
  async generateFirstChangelog(
    preset: "angular" | "conventionalcommits",
    customPrefix?: string
  ) {
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
        "-r",
        "0",
      ]);
    } catch (error) {
      throw error;
    }
  }

  async updateChangelog(
    preset: "angular" | "conventionalcommits",
    customPrefix?: string
  ) {
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
    } catch (error) {
      throw error;
    }
  }
}
