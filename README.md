# Package ignore

The missing tool to clean up the package.json file before publishing.

## Usage

```bash
# Clean up the package.json file based on the patterns in the
# .package-ignore file (see below).
# Creates a backup file package-ignore-backup.json.
pi

# Restores the backup package-ignore-backup.json and overwrites
# the package.json file. The backup file is deleted afterwards.
pi restore
```

Package ignore (pi) is not opinionated about your release workflow. It simply provides a way to clean up and restore the `package.json` file.

The `pi` command will look for the `package.json` file in the current directory and for the first matching `.package-ignore` file in the current directory, walking up the directory tree. See [Syntax of the `.package-ignore` file](#syntax-of-the-package-ignore-file) for more details.

Example for a simple integration with `npm publish`:

```json
{
  "scripts": {
    "prepack": "pi",
    "postpack": "pi restore"
  }
}
```

Note: Your actual build process might look different.

## Syntax of the `.package-ignore` file

The `.package-ignore` file is a simple text file that contains a list of patterns. Each non-empty line (modulo comments) is an ignore pattern.

* **Comments:**  All content after `#` is ignored.
* **Special characters:**
  * A dot `.` separates JSON keys in a line.
  * A line consisting of only `*` ignores the whole `package.json` content.
  * A line starting with an exclamation mark `!` is an allowlist pattern and overrides ignore patterns.
* **Escaping:**
  * A backslash `\` is used to escape the dot `.`, the hash `#`, and the backslash `\` in key names.
  * Additionally, (leading) asterisks `*` and (leading) exclamation marks can be escaped if needed.
* **Whitespace:** Technically, leading and trailing whitespace are also allowed in key names, however, they are ignored.

## Examples

The **allowlist** pattern (strict):

```sh
*  # ignore all '*' except...
!scripts.build:examples # ...not '!' these ones

# will result in a package.json with the following content:
# {
#   "scripts": {
#     "build:examples": "..."
#   }
# }
```

The **ignore** pattern (open):

```sh
devDependencies  # This will ignore the "devDependencies" key
scripts.build  # This will ignore the "build" script
!files # Keeping the "files" key is important for creating the tarball
```
