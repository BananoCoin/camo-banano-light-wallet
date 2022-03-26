## before doing a release

npm run preflight;
git commit -a -m 'bumping deps';

# to auto build a releases

npm version patch --tag-version-prefix='v';
git push;
git push --tags;

## to delete release tags

git push --delete origin [tag];
git tag -d [tag];
git pull;
git push;
