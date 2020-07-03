# to auto build a releases
  git commit -am v1.0.4;
  git tag v1.0.4;
  git push;
  git push --tags;

## to delete release tags
  git push --delete origin v1.0.4;
  git tag -d v1.0.4;
  git pull;
  git push;
