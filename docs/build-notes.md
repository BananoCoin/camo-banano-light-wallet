## before doing a release

  (change version)

  npm outdated;
  npm install package@latest;
  npm i;
  npm audit fix;

## to auto build a releases
  git commit -am v1.1.1;
  git tag v1.1.1;
  git push;
  git push --tags;

## to delete release tags
  git push --delete origin v1.1.1;
  git tag -d v1.1.1;
  git pull;
  git push;
