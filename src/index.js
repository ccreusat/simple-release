#!/usr/bin/env node

import { getConfig } from "./find-cosmiconfig.js";
import { getCurrentBranch } from "./get-current-branch.js";

const config = await getConfig();

console.log({ ...config });

const CURRENT_BRANCH = await getCurrentBranch();

// console.log(config.prerelease.includes(CURRENT_BRANCH));
