import { readFileSync, writeFileSync } from "fs";

export class Package {
  private basePath: string;

  constructor(basePath: string = "../") {
    this.basePath = basePath;
  }

  getPath(optionalPath?: string) {
    const path = optionalPath || this.basePath;

    const pkg = JSON.parse(
      readFileSync(new URL(`${path}/package.json`, import.meta.url), "utf8")
    );

    return pkg;
  }

  name(optionalPath?: string): string {
    const pkg = this.getPath(optionalPath);

    console.log("path pkg", { pkg });

    return pkg.name;
  }

  version(optionalPath?: string): string {
    const pkg = this.getPath(optionalPath);
    console.log("path pkg", { pkg });

    return pkg.version;
  }

  update(nextVersion: string, optionalPath?: string) {
    const path = optionalPath || this.basePath;
    const pkg = this.getPath(optionalPath);

    pkg.version = nextVersion;

    console.log(pkg.version, { nextVersion });

    writeFileSync(
      new URL(`${path}/package.json`, import.meta.url),
      JSON.stringify(pkg, null, 2)
    );
  }
}
