# Package ignore

The missing tool to clean up the package.json file before publishing.

## Installation

```bash
npm i -g package-ignore
```

## Usage

* **`pi clean`** - Clean the package.json file based on .package-ignore patterns
* **`pi clean --dry-run`** - Preview what would be cleaned without making changes
* **`pi restore`** - Restore the package.json from backup
* **`pi --help`** - Show help information

Package ignore (pi) is not opinionated about your release workflow. It simply provides a way to clean up and restore the `package.json` file.

The `pi clean` command will look for the `package.json` file in the current directory. Additionally, it will resolve the `.package-ignore` file (see [Syntax](#syntax)), starting in the current directory, walking up the directory tree. If no `.package-ignore` file is found, the default patterns `devDependencies` will be used.

Example for a simple integration with `npm publish`:

```json
{
  "scripts": {
    "prepack": "pi clean",
    "postpack": "pi restore"
  }
}
```

Here, the tarball will contain the cleaned up `package.json` file. The scripts `prepack` and `postpack` will be triggered by `npm pack` and `npm publish`, respectively.

## Syntax

The `.package-ignore` file is a simple text file that contains a list of definitions. Each non-empty line (modulo comments) is a definition.

### Comments

* All content after a (unescaped) hash `#` is ignored.

### Special characters

* A dot `.` separates JSON keys in a line.
* A line consisting of only `*` ignores the whole `package.json` content.
* A line starting with an exclamation mark `!` defines an allowed JSON path and may override (a part of) an ignored JSON path.

### Escaping

* A backslash `\` is used to escape characters, including itself.
* The dot `.` and the hash `#` need to be escaped if they are part of a key name.
* If the `package.json` has a top-level key `*` or a top-level key starting with `!`, those first characters must be escaped.
* Escaping other key name characters has no effect.

### Whitespace

* Technically, leading and trailing whitespace are also allowed in JSON key names; however, whitespace is trimmed by the parser for definitions and key names.

## Examples

The **allowlist** pattern (strict):

```sh
* # '*' ignores all package.json content except...
!scripts.build:examples # ...those patterns prefixed with '!'

# Will result in a package.json with the following content:
# {
#   "scripts": {
#     "build:examples": "..."
#   }
# }
```

The **ignore** pattern (open):

```sh
devDependencies # This will ignore the "devDependencies" key
scripts.build # This will ignore the "build" script
!files # Keeping the "files" key is important for creating the tarball
```
