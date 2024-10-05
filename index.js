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

		// Get the current tag
		let { stdout: currentTag } = await exec.getExecOutput('git', ['describe', '--tags', '--abbrev=0'])
		currentTag = currentTag.trim()
		console.log(`Current tag: ${currentTag}`)
		const currentVersion = semver.clean(currentTag) || '0.0.0'
		console.log(`Current version: ${currentVersion}`)

		// Read and parse JSON files
		const versions = await Promise.all(jsonFiles.map(getDataFromJsonFile))

		// Check if all versions are equal
		const allEqual = checkIfAllVersionsAreEqual(currentVersion, versions)
		if (allEqual) {
			core.setOutput('tag-name', currentTag)
			return console.log('All versions are equal. No update needed.')
		}

		// Get the current tag
		let { stdout: currentBranch } = await exec.getExecOutput('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
		currentBranch = currentBranch.trim()
		console.log(`Current branch: ${currentBranch}`)

		// Get all tags
		const { data: repoTags } = await octokit.rest.repos.listTags({ owner, repo, per_page: 100 })
		const tags = repoTags.map(tag => tag.name)

		// Get the new version
		const newVersion = getNewVersion(versions, tags, releaseType)

		// Update JSON files
		await Promise.all(versions.map(setDataToJsonFile({ version: newVersion })))

		// Check for changes
		let { stdout: hasChanges } = await exec.getExecOutput('git', ['status', '--porcelain'])
		hasChanges = !!hasChanges.trim().length
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
