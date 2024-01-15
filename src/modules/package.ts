import { readFileSync, writeFileSync } from "fs";

export class Package {
  private basePath: string;

  constructor(basePath: string = "../") {
    this.basePath = basePath;
  }

  getPath(path?: string) {
    const pkg = JSON.parse(
      readFileSync(
        new URL(`${path ? path : this.basePath}/package.json`, import.meta.url),
        "utf8"
      )
    );

    return pkg;
  }

  version(): string {
    try {
      const pkg = this.getPath();

      const packageVersion = pkg.version;
      return packageVersion;
    } catch (error) {
      console.error(
        "Erreur lors de la lecture de la version actuelle du package",
        error
      );
      throw error;
    }
  }

  async update(nextVersion: string, path?: string) {
    try {
      const pkg = this.getPath();

      console.log("path pkg", { pkg });
      pkg.version = nextVersion;

      writeFileSync(
        new URL(`${path ? path : this.basePath}/package.json`, import.meta.url),
        JSON.stringify(pkg, null, 2)
      );
    } catch (error) {
      console.error("Erreur", error);
      throw error;
    }
  }
}
