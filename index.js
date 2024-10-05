const path = require('path')
const core = require('@actions/core')
const github = require('@actions/github')
const exec = require('@actions/exec')
const semver = require('semver')
const { getDataFromJsonFile, setDataToJsonFile, checkIfAllVersionsAreEqual, getNewVersion } = require('./src/index.js')

async function run() {
	try {
		const octokit = github.getOctokit(process.env.GITHUB_TOKEN)
		const releaseType = process.env.RELEASE_TYPE || 'patch'
		const jsonFiles = (process.env.JSON_FILES || '').split(' ').map(f => path.resolve(f))
		const commitMessage = process.env.COMMIT_MESSAGE || 'Update version to {version}'
		const tagMessage = process.env.TAG_MESSAGE || ''

		// Get the repo owner and name
		const { owner, repo } = github.context.repo

		// Get the current branch
		const { data: repoData } = await octokit.rest.repos.get({ owner, repo })
		const currentBranch = repoData.default_branch

		// Get the current tag
		const { data: repoTags } = await octokit.rest.repos.listTags({ owner, repo, per_page: 100 })
		const tags = repoTags.map(tag => tag.name)
		const currentTag = tags[0] || '0.0.0'
		const currentVersion = semver.clean(currentTag) || '0.0.0'

		// Read and parse JSON files
		const versions = await Promise.all(jsonFiles.map(getDataFromJsonFile))

		// Check if all versions are equal
		const allEqual = checkIfAllVersionsAreEqual(currentVersion, versions)
		if (allEqual) {
			core.setOutput('tag-name', currentTag)
			return console.log('All versions are equal. No update needed.')
		}

		// Get the new version
		const newVersion = getNewVersion(versions, tags, releaseType)

		// Update JSON files
		await Promise.all(versions.map(setDataToJsonFile({ version: newVersion })))

		// Check for changes
		const { stdout } = await exec.getExecOutput('git', ['status', '--porcelain'])
		const hasChanges = !!stdout.trim().length
		console.log('hasChanges', hasChanges)

		await exec.exec('git', ['config', 'user.name', 'github-actions'])
		await exec.exec('git', ['config', 'user.email', 'github-actions@github.com'])

		// Get formatted tag
		const newTag = currentTag.startsWith('v') ? `v${newVersion}` : newVersion

		// Commit changes
		if (hasChanges) {
			await exec.exec('git', ['add', ...jsonFiles])
			await exec.exec('git', ['commit', '-m', commitMessage.replace('{version}', newVersion).replace('{tag}', newTag)])
		}

		// Create tag
		if (tagMessage) {
			await exec.exec('git', ['tag', '-a', newTag, '-m', tagMessage.replace('{version}', newVersion).replace('{tag}', newTag)])
		} else {
			await exec.exec('git', ['tag', '-a', newTag])
		}

		// Push the tag
		await exec.exec('git', ['push', 'origin', newTag, '--force'])

		// Push the branch
		await exec.exec('git', ['push', 'origin', currentBranch])

		core.setOutput('tag-name', newTag)
		console.log(`Created new annotated tag: ${newTag}`)
	} catch (error) {
		core.setFailed(error.message)
	}
}

run()
