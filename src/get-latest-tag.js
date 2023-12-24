import { simpleGit } from "simple-git";

const git = simpleGit();

export function getLastTag() {
  git.tags((err, tags) => {
    if (err) {
      console.error("Something wrong happened", err);
      return;
    }

    const lastTag = tags.latest;

    if (!lastTag) {
      console.log("No tag found");
      return;
    }
    console.log("Last tag is:", lastTag);
  });
}

getLastTag();
