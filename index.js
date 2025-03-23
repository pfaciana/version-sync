const path = require('path')
const core = require('@actions/core')
const github = require('@actions/github')
const exec = require('@actions/exec')
const semver = require('semver')
const { getDataFromJsonFile, setDataToJsonFile, checkIfAllVersionsAreEqual, getNewVersion } = require('./src/index.js')

async function run() {
	try {
		const octokit = github.getOctokit(process.env.GITHUB_TOKEN)
		let releaseType = process.env.RELEASE_TYPE || 'patch'
		const forceRelease = process.env.FORCE_RELEASE || ''
		const jsonFiles = (process.env.JSON_FILES || '').split(' ').map(f => path.resolve(f))
		const commitMessage = process.env.COMMIT_MESSAGE || 'Update version to {version}'
		const tagMessage = process.env.TAG_MESSAGE || ''

		// Get the repo owner and name
		const { owner, repo } = github.context.repo

		// Get the current tag
		let currentTag = 'v0.0.0'
		try {
			const { stdout } = await exec.getExecOutput('git', ['describe', '--tags', '--abbrev=0'])
			currentTag = stdout.trim() || 'v0.0.0'
			console.log(`Current tag: ${currentTag}`)
		} catch (error) {
			console.warn('Unable to retrieve the current tag. Using fallback value.')
		}
		const currentVersion = semver.clean(currentTag) || '0.0.0'
		console.log(`Current version: ${currentVersion}`)

		// Read and parse JSON files
		const versions = await Promise.all(jsonFiles.map(getDataFromJsonFile))

		// Check if all versions are equal
		const allEqual = checkIfAllVersionsAreEqual(currentVersion, versions)
		if (allEqual && !forceRelease) {
			core.setOutput('tag-name', currentTag)
			core.setOutput('new-tag-name', '')
			return console.log('All versions are equal. No update needed.')
		}

		if (forceRelease) {
			releaseType = forceRelease
			allEqual && console.log(`All versions are equal, but force a version bump with a "${forceRelease}" release`)
		}

		versions.forEach(v => {
			if (v.version !== currentVersion) {
				console.log(`Version mismatch: ${v.file} has version: ${v.version}, while current tag version is: ${currentVersion}`)
			} else {
				console.log(`Version match: ${v.file} has version: ${v.version}`)
			}
		})

		// Get the current branch
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
		core.setOutput('new-tag-name', newTag)
		console.log(`Created new annotated tag: ${newTag}`)
	} catch (error) {
		core.setFailed(error.message)
	}
}

run()
