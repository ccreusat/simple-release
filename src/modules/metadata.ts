// metadataManager.ts
import { readFileSync, writeFileSync, existsSync } from "fs";
import { DefaultLogFields, ListLogLine } from "simple-git";

interface Format {
  version: string;
  date: string;
  notes: string;
  commits?: readonly (DefaultLogFields & ListLogLine)[];
}

interface File {
  versions: Format[];
}

export class Metadata {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  readMetadata(): File {
    if (existsSync(this.filePath)) {
      return JSON.parse(readFileSync(this.filePath, "utf8"));
    } else {
      return { versions: [] };
    }
  }

  writeMetadata(metadata: File) {
    writeFileSync(this.filePath, JSON.stringify(metadata, null, 2));
  }

  async updateMetadataForRelease(
    newVersion: string,
    notes: string,
    commits?: readonly (DefaultLogFields & ListLogLine)[]
  ) {
    const metadata = this.readMetadata();

    const newVersionMetadata: Format = {
      version: newVersion,
      date: new Date().toISOString(),
      notes: notes,
      commits: commits,
    };

    metadata.versions.push(newVersionMetadata);
    this.writeMetadata(metadata);
  }
}
