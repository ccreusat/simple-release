import chalk from 'chalk';
import 'conventional-commits-parser';
import 'fs';
import simpleGit from 'simple-git';

const git = simpleGit();
async function getLastTag() {
    try {
        const tag = await git.raw(["describe", "--tags", "--abbrev=0"]);
        const lastTag = tag.trim();
        if (!lastTag)
            throw new Error();
        console.log("lastTag", chalk.greenBright(lastTag));
        return lastTag;
    }
    catch (error) {
        console.error(chalk.redBright("No tag found", error));
        process.exit(1);
    }
}
async function getLastCommits() {
    try {
        const lastTag = await getLastTag();
        const commits = await git.log({ from: lastTag, to: "HEAD" });
        return commits.all;
    }
    catch (error) {
        console.error("Something wrong happened:", error);
        process.exit(1);
    }
}
function determineReleaseType(commits) {
    for (const commit of commits) {
        if (commit.message.startsWith === "feat") {
            return "minor";
        }
        else if (commit.message.startsWith === "fix") {
            return "patch";
        }
        // Ajouter d'autres conditions si nécessaire pour d'autres types de changements
    }
    return "patch"; // Version de correctif par défaut si aucun type spécifique n'est détecté
}
async function run() {
    // const commitMessages = getCommitMessages();
    const commitMessages = await getLastCommits();
    // console.log({ commitMessages });
    //const commits = parseCommits(commitMessages);
    const releaseType = determineReleaseType(commitMessages);
    console.log({ commitMessages, releaseType });
    /* if (releaseType !== "none") {
      const currentVersion = "1.0.0"; // Remplacez par la version actuelle de votre projet
      const newVersion = incrementVersion(currentVersion, releaseType);
      console.log(`Incrémenter la version de ${currentVersion} à ${newVersion}`);
      updatePackageJson(newVersion);
    } else {
      console.log(
        "Aucun changement majeur ou correctif détecté. Aucune incrémentation de version nécessaire."
      );
    } */
}
run();
