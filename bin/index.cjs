#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// read arguments
const script = 'npx pi';
const args = process.argv.slice(2);
const command = args[0];
const isDryRun = args.includes('--dry-run');

// -- help command `pi --help`
if (command === '--help') {
  console.log(`package-ignore (pi): Cleanup tool for package.json

Usage:
  ${script} clean             Backup & clean package.json based on .package-ignore
  ${script} clean --dry-run   Preview changes without making them
  ${script} restore           Restore package.json from backup
  ${script} --help            Show this help message

The tool will look for a .package-ignore file in the current directory or parent directories.
If no .package-ignore file is found, devDependencies will be ignored by default.

The backup file package-ignore-backup.json is created in the current directory.`);
  process.exit(0);
}

// -- restore command `pi restore`
if (command === 'restore') {
  if (!fs.existsSync('package-ignore-backup.json')) {
    console.error('package-ignore-backup.json not found');
    process.exit(1);
  }
  fs.copyFileSync('package-ignore-backup.json', 'package.json');
  fs.unlinkSync('package-ignore-backup.json');
  console.log('package.json restored from backup');
  process.exit(0);
}

// -- clean command `pi clean`
if (command === 'clean') {
  // ensure package.json exists
  if (!fs.existsSync('package.json')) {
    console.error('package.json not found');
    process.exit(1);
  }

  // don't overwrite existing backup file
  if (fs.existsSync('package-ignore-backup.json')) {
    console.error('package-ignore-backup.json already exists');
    process.exit(1);
  }

  // read package.json
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  // read ignore patterns
  let ignorePatterns;
  try {
    ignorePatterns = resolveFile('.package-ignore');
  } catch (error) {
    console.log('No .package-ignore file found, using default patterns');
    ignorePatterns = 'devDependencies';
  }

  const [ignorelist, allowlist, excludeAll] = parseIgnorePatterns(ignorePatterns);

  if (excludeAll) {
    // If '*' is present, start with empty package.json and apply allowlist
    const cleanedPackageJson = {};
    applyAllowlist(cleanedPackageJson, allowlist, packageJson);

    if (isDryRun) {
      console.log('DRY RUN - Would apply allowlist-only mode:');
      console.log('Cleaned package.json:');
      console.log(JSON.stringify(cleanedPackageJson, null, 2));
    } else {
      // create backup of package.json
      fs.copyFileSync('package.json', 'package-ignore-backup.json');
      console.log('Created backup: package-ignore-backup.json');

      fs.writeFileSync('package.json', JSON.stringify(cleanedPackageJson, null, 2));
      console.log('Applied allowlist-only mode (excluded all, then included allowlisted items)');
      console.log('package.json cleaned successfully');
    }
  } else {
    // Apply ignorelist to remove unwanted items, then apply allowlist to override
    const cleanedPackageJson = JSON.parse(JSON.stringify(packageJson));
    const originalKeys = JSON.parse(JSON.stringify(packageJson));

    applyIgnorelist(cleanedPackageJson, ignorelist);
    applyAllowlist(cleanedPackageJson, allowlist, packageJson);

    if (isDryRun) {
      console.log('DRY RUN - Would apply ignorelist and allowlist patterns:');
      console.log('Cleaned package.json:');
      console.log(JSON.stringify(cleanedPackageJson, null, 2));
    } else {
      // create backup of package.json
      fs.copyFileSync('package.json', 'package-ignore-backup.json');
      console.log('Created backup: package-ignore-backup.json');

      fs.writeFileSync('package.json', JSON.stringify(cleanedPackageJson, null, 2));
      console.log('Applied ignorelist and allowlist patterns');
      console.log('package.json cleaned successfully');
    }
  }

  if (isDryRun) {
    console.log('\nDRY RUN completed - no changes were made');
  }
  process.exit(0);
}

// -- unknown command
if (command) {
  console.error(`Unknown command: ${command}`);
}
console.error(`Use "${script} --help" for usage information`);
process.exit(1);

// returns [ignorelist, allowlist, excludeAll]
function parseIgnorePatterns(ignorePatterns = 'devDependencies') {
  const lines = ignorePatterns
    .split('\n')
    .map(line => {
      // Remove comments (non-escaped '#' until end of line)
      let result = '';
      let escaped = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '\\') {
          escaped = !escaped;
          result += char;
        } else if (char === '#' && !escaped) {
          break; // Comment starts here
        } else {
          result += char;
          escaped = false;
        }
      }
      return result;
    })
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Check if '*' (exclude whole package.json) is present
  const excludeAll = lines.some(line => line === '*');

  // Filter out '*' lines and group by prefix
  const filteredLines = lines.filter(line => line !== '*');

  const ignorelist = [];
  const allowlist = [];

  filteredLines.forEach(line => {
    if (line.startsWith('!')) {
      // Allowlist pattern
      const pattern = line.slice(1);
      const keys = splitByUnescapedDot(pattern);
      allowlist.push(keys);
    } else {
      // Ignorelist pattern
      const keys = splitByUnescapedDot(line);
      ignorelist.push(keys);
    }
  });

  return [ignorelist, allowlist, excludeAll];
}

/**
 * Split a string by unescaped dots
 */
function splitByUnescapedDot(str) {
  const result = [];
  let current = '';
  let escaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '\\') {
      escaped = !escaped;
      current += char;
    } else if (char === '.' && !escaped) {
      result.push(unescapeKey(current));
      current = '';
    } else {
      current += char;
      escaped = false;
    }
  }

  if (current.length > 0) {
    result.push(unescapeKey(current));
  }

  return result;
}

/**
 * Unescape key by removing backslashes
 */
function unescapeKey(key) {
  return key.replace(/\\(.)/g, '$1');
}

/**
 * Apply ignorelist patterns to package.json
 */
function applyIgnorelist(packageJson, ignorelist) {
  ignorelist.forEach(pattern => {
    removeByPath(packageJson, pattern);
  });
}

/**
 * Apply allowlist patterns to package.json
 */
function applyAllowlist(packageJson, allowlist, originalPackageJson) {
  allowlist.forEach(pattern => {
    copyByPath(packageJson, originalPackageJson, pattern);
  });
}

/**
 * Remove a nested property by path
 */
function removeByPath(obj, path) {
  if (path.length === 0) return;

  const [key, ...rest] = path;
  if (rest.length === 0) {
    delete obj[key];
  } else if (obj[key] && typeof obj[key] === 'object') {
    removeByPath(obj[key], rest);
  }
}

/**
 * Copy a nested property by path
 */
function copyByPath(target, source, path) {
  if (path.length === 0) return;

  const [key, ...rest] = path;
  if (rest.length === 0) {
    if (source[key] !== undefined) {
      target[key] = source[key];
    }
  } else if (source[key] && typeof source[key] === 'object') {
    if (!target[key] || typeof target[key] !== 'object') {
      target[key] = {};
    }
    copyByPath(target[key], source[key], rest);
  }
}

/**
 * Resolves a file from the current directory, recursively traversing up to the root directory.
 *
 * @param {string} file A plain file name
 * @returns {string} The file contents
 * @throws {Error} If the file is not found
 */
function resolveFile(file) {

  let currentDir = process.cwd();
  const rootDir = path.parse(currentDir).root;

  do {
    const filePath = path.join(currentDir, file);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    currentDir = path.dirname(currentDir);
  } while (currentDir !== rootDir);

  throw new Error(`File not found: ${file}`);
}
