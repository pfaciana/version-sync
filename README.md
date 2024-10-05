# Version Check and Update Action

A GitHub Action that automatically checks and updates semantic versions across multiple JSON files in your repository, ensuring consistency and streamlining version management.

The problem it intends to solve is when JSON files have a version property and you want to keep the version of the git tag and JSON file(s) in sync. For example, you may create a tag of v1.1.0 but forget to update your package.json version from v1.0.0. This checks for this and brings your package.json (and any other JSON files) in sync with the git tag version. It also works if your JSON file version is ahead of the git tag. It will make a git tag to bring your repo in sync.

### Features

- The action automatically detects and maintains versions with and without prefixes (e.g., `v1.2.3` and `1.2.3`)
- A debug mode can be enabled by setting the `DEBUG_MODE` environment variable to `1` and listening on port `9229` locally
- Checks multiple JSON files for version consistency
- Handles complex version synchronization scenarios

### How It Works

1. Reads specified JSON files and extracts version information
2. Retrieves the current Git tag and branch
3. Compares versions across files and with the current Git tags
4. Calculates the next version based on the release type and existing tags
5. Updates JSON files with the new version
6. Creates a Git commit and tag for the update
7. Pushes changes to the repository

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

This will check and update versions in `package.json`, using the default patch release type.

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
          commit-message: 'Update version to {version}'
          tag-message: 'Release {tag}'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          DEBUG_MODE: ${{ vars.DEBUG_MODE || '0' }}

      - name: Use the new tag
        if: steps.sync_versions.outputs.tag-name != ''
        run:
          echo "New tag created: ${{ steps.sync_versions.outputs.tag-name }}"
```

This workflow will run on pushes to the main branch, update versions in two JSON files, and use a patch release type for version increments.

### Inputs

| Name           | Description                                                                                             | Required | Default                       |
|----------------|---------------------------------------------------------------------------------------------------------|----------|-------------------------------|
| json-files     | Space-delimited list of JSON files to check                                                             | Yes      |                               |
| release-type   | Type of version bump to perform (patch, minor, major) if needed                                         | No       | `patch`                       |
| commit-message | Custom message for the commit. Use `{version}` to include the new version dynamically.                  | No       | `Update version to {version}` |
| tag-message    | Custom message for the tag. Use `{tag}` to include the new tag dynamically. Leave empty for no message. | No       |                               |

`release-type` is used to determine what the semantic version should be when the versions are out of sync.

For example, if we have versions `v1.0.1` and `v1.0.2` and we want them in sync, then...

* if `release-type` is `patch`, they'll sync to `v1.0.2` (default)
* if `release-type` is `minor`, they'll sync to `v1.1.0`
* if `release-type` is `major`, they'll sync to `v2.0.0`
* If versions are already in sync, this input is ignored

`commit-message` allows you to customize the commit message:

* The default message is "Update version to {version}".

`tag-message` allows you to customize the message associated with the tag:

* If left empty (default), a tag will be created without a message.

### Message variables

There are two optional dynamic variables, `{version}` and `{tag}`, you can use both, either or none in your commit and tag messages.
They are very similar, with the only difference being `{tag}` will preserve `v` prefix and the `{version}` will not:

* For example, if you use the `v` prefix in your tag, and the sync version is `v1.2.3`
    * `{version}` will be `1.2.3`
    * `{tag}` will be `v1.2.3`
* If you don't use the `v` prefix, then `{version}` and `{tag}` will be exactly the same.

### Outputs

| Name     | Description                                                        |
|----------|--------------------------------------------------------------------|
| tag-name | The new tag name or an empty string if the repo is already in sync |

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

### Custom Message for Commit and Tag

This example demonstrates how to use custom commit and tag messages with dynamic values:

```yaml
- name: Sync Versions with Custom Messages
  uses: pfaciana/version-sync
  with:
    json-files: 'package.json'
    commit-message: 'Update version to {version}'
    tag-message: 'Release {tag}'
```

## FAQ

### Q: How does this action handle version prefixes (like 'v') in tags?

A: The action automatically detects and maintains your existing versioning scheme, preserving 'v' prefixes if you use them or omitting them if you don't, ensuring consistency with your current tagging style.

### Q: What happens if there are no version changes needed?

A: If all specified files already have the same version and it matches the latest Git tag, the action will not make any changes and will exit successfully. The `tag-name` output will be an empty string in this case.

### Q: Does this action work with private repositories?

A: Yes, it works with both public and private repositories. Make sure to include the `GITHUB_TOKEN` in your workflow for authentication.

### Q: What types of files can this action update?

A: This action is designed to update JSON files that contain a `version` field. It's commonly used for files like `package.json`, but can work with any JSON file that includes version information.

### Q: How does the action determine the next version?

A: The action uses the `semver` library to calculate the next version based on the current version, existing tags, and the specified release type (patch, minor, or major). It also checks for conflicts with existing tags to ensure a unique new version.

### Q: Can I customize the commit and tag messages?

A: Yes, you can customize both the commit and tag messages using the `commit-message` and `tag-message` inputs. You can use `{version}` and `{tag}` placeholders in these messages to include the new version dynamically.
