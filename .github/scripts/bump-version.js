#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Bump version based on commit type
 * @param {string} currentVersion - Current semantic version
 * @param {string} bumpType - Type of bump: patch, minor, major
 * @returns {string} New version
 */
function bumpVersion(currentVersion, bumpType) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

/**
 * Determine bump type from commit message
 * @param {string} commitMessage - Git commit message
 * @returns {string} Bump type: patch, minor, or major
 */
function getBumpType(commitMessage) {
  const message = commitMessage.toLowerCase();
  
  if (message.includes('breaking change:') || message.includes('major:')) {
    return 'major';
  } else if (message.startsWith('feat:') || message.startsWith('feature:')) {
    return 'minor';
  } else if (message.startsWith('fix:') || message.startsWith('patch:')) {
    return 'patch';
  }
  
  // Default to patch for other commits
  return 'patch';
}

/**
 * Get version file path based on service name
 */
function getVersionFilePath(service) {
  const paths = {
    'frontend': 'frontend/package.json',
    'auth-service': 'services/auth-service/version.json',
    'user-service': 'services/user-service/version.json',
    'content-service': 'services/content-service/package.json'
  };
  
  return path.join(__dirname, '..', '..', paths[service]);
}

/**
 * Read version based on service type
 */
function readVersion(service, filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  if (service === 'frontend' || service === 'content-service') {
    return data.version;
  } else {
    return data.version;
  }
}

/**
 * Write version based on service type
 */
function writeVersion(service, filePath, newVersion) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  data.version = newVersion;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node bump-version.js <service> <commit-message>');
    console.error('Example: node bump-version.js frontend "feat: add new feature"');
    process.exit(1);
  }
  
  const [service, commitMessage] = args;
  const validServices = ['frontend', 'auth-service', 'user-service', 'content-service'];
  
  if (!validServices.includes(service)) {
    console.error(`Invalid service: ${service}`);
    console.error(`Valid services: ${validServices.join(', ')}`);
    process.exit(1);
  }
  
  const versionFile = getVersionFilePath(service);
  
  // Create version.json for services that don't have package.json
  if (!fs.existsSync(versionFile) && (service === 'auth-service' || service === 'user-service')) {
    const dir = path.dirname(versionFile);
    fs.writeFileSync(versionFile, JSON.stringify({ version: '0.1.0' }, null, 2) + '\n');
  }
  
  // Check if version file exists
  if (!fs.existsSync(versionFile)) {
    console.error(`Version file not found: ${versionFile}`);
    process.exit(1);
  }
  
  // Read current version
  const currentVersion = readVersion(service, versionFile);
  
  // Determine bump type and calculate new version
  const bumpType = getBumpType(commitMessage);
  const newVersion = bumpVersion(currentVersion, bumpType);
  
  // Update version file
  writeVersion(service, versionFile, newVersion);
  
  // Output for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `old_version=${currentVersion}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `new_version=${newVersion}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `bump_type=${bumpType}\n`);
  } else {
    // Fallback for local testing
    console.log(`old_version=${currentVersion}`);
    console.log(`new_version=${newVersion}`);
    console.log(`bump_type=${bumpType}`);
  }
  
  console.error(`Bumped ${service} from ${currentVersion} to ${newVersion} (${bumpType})`);
}

// Run main function
main();