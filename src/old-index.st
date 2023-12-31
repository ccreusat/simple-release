import chalk from 'chalk'
import {Command} from 'commander'
import {cosmiconfig} from 'cosmiconfig'
// import { getNextVersion } from "version-next";
import {execa} from 'execa'
import fs from 'node:fs'
import {simpleGit} from 'simple-git'

const program = new Command()
const moduleName = 'phnx'
const explorer = cosmiconfig(moduleName)
const git = simpleGit()

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

async function getConfig() {
  try {
    const result = await explorer.search()
    if (!result || !result.config) {
      throw new Error('No config file found')
    }

    const {config} = result
    // console.log(chalk.yellowBright(JSON.stringify(config)));
    return config
  } catch (error) {
    console.error(chalk.redBright.bold(`${error}`))
    process.exit(1)
  }
}

async function getStatus() {
  try {
    const status = await git.status()
    const isClean = status.files.length === 0

    if (!isClean) throw new Error()

    console.log(chalk.greenBright(isClean))

    return isClean
  } catch {
    console.error(chalk.redBright('Working tree is not clean'))
    process.exit(1)
  }
}

async function isInitialized() {
  try {
    const isInitialized = await git.checkIsRepo()

    if (!isInitialized) throw new Error()

    console.log(chalk.bgGreenBright('Le repo est déjà initialisé.'))
    return isInitialized
  } catch {
    console.log(chalk.redBright("Le repo n'est pas initialisé."))
    process.exit(1)
  }
}

async function getCurrentBranch() {
  try {
    const branchSummary = await git.branch()
    const currentBranch = branchSummary.current
    // console.log("currentBranch", chalk.greenBright(currentBranch));

    return currentBranch
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

async function getLastTag() {
  try {
    const tag = await git.raw(['describe', '--tags', '--abbrev=0'])
    const lastTag = tag.trim()

    if (!lastTag) throw new Error()

    console.log('lastTag', chalk.greenBright(lastTag))
    return lastTag
  } catch (error) {
    console.error(chalk.redBright('No tag found', error))
    process.exit(1)
  }
}

async function getLastCommits() {
  try {
    const lastTag = await getLastTag()
    const commits = await git.log({from: lastTag, to: 'HEAD'})

    return commits.all
  } catch (error) {
    console.error('Something wrong happened:', error)
    process.exit(1)
  }
}

function isSameVersion(pkgVersion: string, tagVersion: string) {
  const isSameVersion = pkgVersion === tagVersion ? chalk.blueBright(true) : chalk.red(false)

  console.log('isSameVersion', isSameVersion)
}

async function versionPrerelease(prerelease: string[], currentBranch: string) {
  const preid = prerelease.find((prereleaseBranch: string) => prereleaseBranch === currentBranch)

  if (!preid) return

  console.log({currentBranch, preid})

  const {stdout} = await execa('npm', ['version', 'prerelease', '--preid', preid])

  console.log(chalk.green(stdout))
}

async function shouldBeReleaseorPrerelease() {
  try {
    const currentBranch = await getCurrentBranch()
    const config = await getConfig()

    let result

    if (config.release.includes(currentBranch)) {
      result = 'release'
    }

    if (config.prerelease.includes(currentBranch)) {
      result = 'prerelease'
    }

    console.log(chalk.bgBlueBright(result))
  } catch (error) {
    console.log(chalk.red(error))
    process.exit(1)
  }
}

// Using try-catch for better error handling
// try {
//   await isInitialized();

//   const config = await getConfig();
//   const currentBranch = await getCurrentBranch();

//   const lastTag = await getLastTag();
//   const tagVersion = lastTag.split("v")[1];

//   fs.readFile(`${process.cwd()}/.phnxrc`, "utf8", (err, data) => {
//     if (err) {
//       console.error(err);
//       return;
//     }

//     const parsedData = JSON.parse(data);
//     // const content = (JSON.parse(data).lastRelease = lastTag);

//     console.log({
//       ...parsedData,
//       lastRelease: lastTag,
//     });

//     /* fs.writeFile(`${process.cwd()}/.phnxrc`, content, (err) => {
//       if (err) {
//         console.error(err);
//       }
//       // file written successfully
//     }); */
//   });

//   isSameVersion(pkg.version, tagVersion);

//   const nextVersion = getNextVersion(pkg.version, {
//     type: "patch",
//     stage: "alpha",
//   });

//   console.log("nextVersion", chalk.greenBright(nextVersion));

//   const allCommits = await getLastCommits();
//   console.log(
//     "🚀 ~ file: index.ts:94 ~ allCommits:",
//     chalk.greenBright(allCommits.length)
//   );

//   // await getStatus();
//   // await versionPrerelease(config.prerelease, currentBranch);
//   // Lister les fichiers du working tree
//   const statusSummary = await git.status();

//   const filesToAdd = statusSummary.files.map((file) => file.path);

//   console.log({ filesToAdd });

//   /* await git.add(filesToAdd);
//   await git.commit(`chore: test version: ${nextVersion}`);
//   await git.push("origin", currentBranch); */
//   // Continue with the rest of your logic here...
// } catch (error) {
//   console.error(chalk.redBright("An error occurred:"), error);
//   process.exit(1);
// }

program.name('phnx').description('CLI to manage release').version(pkg.version, '-v, --version')

program
  .command('next-version')
  .description('Get next semantic version')
  .action(() => console.log('next version'))

program.command('release-type').description('Should be a release or a prerelease').action(shouldBeReleaseorPrerelease)

program.parseAsync(process.argv)