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
        `--tag-prefix ${customPrefix}`,
        "-r 0",
      ]);
      // conventional-changelog -p conventionalcommits --skip-unstable --tag-prefix v -i CHANGELOG.md -s -r 0
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
        "--tag-prefix",
        `${customPrefix}`,
      ]);
    } catch (error) {
      throw error;
    }
  }
}
