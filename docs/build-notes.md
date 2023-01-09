## before doing a release

npm run preflight;
git commit -a -m 'bumping deps';

# to auto build a releases

npm version patch --tag-version-prefix='v';
git push;
git push --tags;

## to delete release tags

git push -d origin $(git tag -l "v1.2.*");
git tag -d $(git tag -l "v1.2.*");

git push --delete origin [tag];
git tag -d [tag];
git pull;
git push;
