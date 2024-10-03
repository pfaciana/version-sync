# Version Check and Update Action

A GitHub Action that automatically checks and updates semantic versions across multiple JSON files in your repository, ensuring consistency and streamlining version management.

The problem is intends to solve is when JSON file have a version property and you want to keep the version of the git tag and JSON file(s) in sync. For example, you may create a tag of v1.1.0 but forget to update your package.json version from v1.0.0. This checks for this and bring your package.json (and any other JSON files) in sync with the git tag version. It also works if your JSON file version is ahead of the git tag. It will make a git tag to bring your repo in sync.
### Features

- The action automatically detects and maintains versions with and without prefixes (e.g., `v1.2.3` and `1.2.3`) 
- A debug mode can be enabled by setting the `DEBUG_MODE` environment variable to `1` and listening on port `9229` locally
- Checks multiple JSON files for version consistency

### How It Works

1. Reads specified JSON files and extracts version information
2. Compares versions across files and with the current Git tag
3. Calculates the next version based on the release type
4. Updates JSON files with the new version
5. Creates a Git commit and tag for the update
6. Pushes changes to the repository

## Getting Started

### Installation

To use this action in your workflow, simply reference it in your workflow file.

### Quick Start

Add the following step to your workflow file:

```yaml
- name: Sync Versions  
  id: sync_versions  
  uses: pfaciana/version-sync
  with:
    json-files: package.json
  env:  
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This will check and update versions in `package.json` and `app.json` files, using the default patch release type.

## Usage

### Full Usage

Here's a more comprehensive example of how to use the Version Check and Update Action:

```yaml
name: Version Management

on:
  workflow_dispatch:
  push:
    branches:
      - master

jobs:
  sync-versions:
    runs-on: ubuntu-20.04
    permissions:
      contents: write
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Sync Versions
        id: sync_versions
        uses: pfaciana/version-sync
        with:
          json-files: package.json composer.json
          release-type: patch
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          DEBUG_MODE: ${{ vars.DEBUG_MODE || '0' }}
```

This workflow will run on pushes to the main branch, update versions in three JSON files, and use a minor release type for version increments.

### Inputs

| Name         | Description                                                     | Required | Default |
| ------------ | --------------------------------------------------------------- | -------- | ------- |
| json-files   | Space-delimited list of JSON files to check                     | Yes      | N/A     |
| release-type | Type of version bump to perform (patch, minor, major) if needed | No       | `patch` |
`release-type` is used to determine what the semantic version should be when the versions are out of sync.
 
For example, if we have versions `v1.0.1` and `v1.0.2` and we want them in sync, then...
* if `release-type` is `patch`, we'll sync to `v1.0.2` (default)
* if `release-type` is `minor`, we'll sync to `v1.1.0` 
* if `release-type` is `major`, we'll sync to `v2.0.0`
* If versions are already in sync, this input is ignored
### Outputs

This action does not have any formal outputs, but it does perform the following actions:

- Updates specified JSON files with new versions
- Creates a Git commit with the version update
- Creates a new Git tag for the version
- Pushes changes and tag to the repository

## Examples

### Basic Version Update

This example shows a basic usage of the action to update the version in a single `package.json` file:

```yaml
- name: Update Package Version
  uses: pfaciana/version-sync
  with:
    json-files: 'package.json'
```

### Multiple File Sync

This example demonstrates how to sync versions across multiple JSON files:

```yaml
- name: Sync Versions Across Files
  uses: pfaciana/version-sync
  with:
    json-files: 'package.json app.json config.json'
```

### Custom Release Type

This example shows how to specify a custom release type for version increments:

```yaml
- name: Perform Minor Version Update
  uses: pfaciana/version-sync
  with:
    json-files: 'package.json'
    release-type: 'minor'
```

## FAQ

### How does this action handle version prefixes (like 'v') in tags?

A: The action automatically detects and maintains your existing versioning scheme, preserving 'v' prefixes if you use them or omitting them if you don't, ensuring consistency with your current tagging style.

### Q: What happens if there are no version changes needed?

A: If all specified files already have the same version and it matches the latest Git tag, the action will not make any changes and will exit successfully.

### Q: Does this action work with private repositories?

A: Yes, it works with both public and private repositories. Make sure to include the `GITHUB_TOKEN` in your workflow for authentication.

### Q: What types of files can this action update?

A: This action is designed to update JSON files that contain a `version` field. It's commonly used for files like `package.json`, but can work with any JSON file that includes version information.

### Q: How does the action determine the next version?

A: The action uses the `semver` library to calculate the next version based on the current version and the specified release type (patch, minor, or major).

### Q: Can I customize the commit message and tag name?

A: Currently, the commit message and tag name are automatically generated based on the new version. Customization options will be added in future releases.