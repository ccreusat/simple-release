import { cosmiconfig } from "cosmiconfig";
import chalk from "chalk";

const moduleName = "releaz";

const explorer = cosmiconfig(moduleName);

// const { config } = await explorer.load("myapp.json");
// console.log({ config });

export async function getConfig() {
  try {
    const result = await explorer.search();

    if (!result) throw new Error();

    return result.config;
  } catch (error) {
    console.error(chalk.red.bold("No config file found"));
    process.exit(1);
  }
}
