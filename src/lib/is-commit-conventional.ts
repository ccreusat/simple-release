export function isConventional(commit) {
  // console.log(commit.message.includes("fix" || "feat" || "chore"));
  const regex = /^(fix|feat|chore)/;

  console.log(regex.test(commit.message));
}
