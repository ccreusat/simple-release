import fs from "node:fs";

const cwd = process.cwd();
const folder = `${cwd}/src/packages/`;

if (fs.existsSync(folder)) {
  console.log("Folder exists");
} else {
  console.log("Folder does not exist");
}
