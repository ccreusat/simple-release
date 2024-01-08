import { execa } from "execa";

export class Changelog {
  async generateFirstChangelog(preset: "angular" | "conventionalcommits") {
    console.log("inside");

    try {
      execa("conventional-changelog", [
        "-p",
        `${preset}`,
        "-i",
        "CHANGELOG.md",
        "-s",
        "--skip-unstable",
        "--tag-prefix v",
        "-r 0",
      ]);
    } catch (error) {
      throw error;
    }
  }

  async updateChangelog(preset: "angular" | "conventionalcommits") {
    try {
      execa("conventional-changelog", [
        "-p",
        `${preset}`,
        "-i",
        "CHANGELOG.md",
        "-s",
        "--skip-unstable",
        "--tag-prefix v",
      ]);
    } catch (error) {
      throw error;
    }
  }
}
