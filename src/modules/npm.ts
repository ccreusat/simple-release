// npmManager.ts
import { execa } from "execa";

export class Npm {
  async publish(branch: string, canary: boolean) {
    try {
      if (canary) {
        await execa("npm", ["publish", "--tag", branch]);
      } else {
        await execa("npm", ["publish"]);
      }
      console.log("Package published to npm");
    } catch (error) {
      console.error("Unable to publish to npm", error);
      throw error;
    }
  }
}
