import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export class Monorepo {
  private packagePath: string;

  constructor(packagePath: string = "packages") {
    this.packagePath = packagePath;
  }

  isMonorepo() {
    const folder = this.getPath();

    if (existsSync(folder)) {
      return existsSync(folder);
    } else {
      return !existsSync(folder);
    }
  }

  getPackagePath() {
    return this.packagePath;
  }

  getPath() {
    return path.join(`${process.cwd()}/src`, this.packagePath);
  }

  getSubfolders() {
    const dir = this.getPath();

    const subFolders = readdirSync(dir).filter((folder) => {
      const fullPath = path.join(dir, folder);
      return statSync(fullPath).isDirectory();
    });

    return subFolders;
  }

  getPackageName(pkg: any) {
    return pkg.name;
  }

  getPackageVersion(pkg: any) {
    return pkg.version;
  }

  getCurrentPackageVersion(pkg: any): string {
    try {
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

  findPackageJson() {
    const dir = this.getPath();
    const folders = this.getSubfolders();

    let pkgs = [];

    for (const folder of folders) {
      const fullPath = path.join(dir, folder);
      const stat = statSync(fullPath);

      //if (!stat.isDirectory()) return;

      const pkg = JSON.parse(readFileSync(`${fullPath}/package.json`, "utf8"));

      pkgs.push(pkg);
    }

    // console.log({ pkgs });

    return pkgs;
  }
}
