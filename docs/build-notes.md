## before doing a release

  (change version)

  npm outdated;
  npm install package@latest;
  npm i;

## to auto build a releases
  git commit -am v1.0.7;
  git tag v1.0.7;
  git push;
  git push --tags;

## to delete release tags
  git push --delete origin v1.0.7;
  git tag -d v1.0.7;
  git pull;
  git push;
