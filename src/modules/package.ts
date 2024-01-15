import { readFileSync, writeFileSync } from "fs";

export class Package {
  private basePath: string;

  constructor(basePath: string = "../") {
    // Chemin par défaut pour polyrepo
    this.basePath = basePath;
  }

  getPath() {
    const pkg = JSON.parse(
      readFileSync(
        new URL(`${this.basePath}/package.json`, import.meta.url),
        "utf8"
      )
    );

    return pkg;
  }

  getCurrentPackageVersion(): string {
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

  writePackageJson(pkg: any) {
    writeFileSync(
      new URL("../package.json", import.meta.url),
      JSON.stringify(pkg, null, 2)
    );
  }

  async updatePackageVersion(nextVersion: string) {
    try {
      const pkg = this.getPath();
      pkg.version = nextVersion;

      this.writePackageJson(pkg);
    } catch (error) {
      console.error("Erreur", error);
      throw error;
    }
  }
}
