# Release

1. `npm version major|minor|patch` to update the version in the `package.json` file.
2. Commit the changes.
3. Run `npm pack` and check the contents of the tarball.
4. `npm publish --dry-run` to check the package will be published to npm.
5. `npm publish` to publish the package to npm.
