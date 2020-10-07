## before doing a release

  (change version)

  npm outdated;
  npm install package@latest;
  npm i;

## to auto build a releases
  git commit -am v1.0.8;
  git tag v1.0.8;
  git push;
  git push --tags;

## to delete release tags
  git push --delete origin v1.0.8;
  git tag -d v1.0.8;
  git pull;
  git push;
