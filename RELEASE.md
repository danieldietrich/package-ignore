# Release Process

```sh
# 1. Create and checkout a release branch
git checkout -b release/vX.Y.Z

# 2. Run npm version (creates commit and tag on the release branch)
npm version patch  # or minor/major

# 3. Push the release branch and tag to GitHub
git push origin release/vX.Y.Z
git push origin --tags

# 4. Create a PR to merge the release branch into main
# (Do this via GitHub UI or gh CLI)

# 5. After PR is merged, checkout main and pull
git checkout main
git pull

# 6. Publish to npm
npm publish
```
