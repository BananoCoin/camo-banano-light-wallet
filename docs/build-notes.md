## before doing a release

  npm update;
  npm outdated;
  npm audit fix;

  npm install package@latest;
  npm audit fix;

# to auto build a releases

  npm version patch;
  git push;
  git push --tags;

## to delete release tags
  git push --delete origin [tag];
  git tag -d [tag];
  git pull;
  git push;
