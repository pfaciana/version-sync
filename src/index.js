const fs = require('fs').promises
const detectIndent = require('detect-indent')
const semver = require('semver')

async function getDataFromJsonFile(file) {
	let json, content
	try {
		content = await fs.readFile(file, 'utf-8')
		if (!content) {
			throw new Error(`Content is empty`)
		}
		json = JSON.parse(content)
		if (!json.version) {
			throw new Error(`File ${file} does not contain a version key`)
		}
		if (!semver.valid(json.version)) {
			throw new Error(`Invalid semantic version in file ${file}: ${json.version}`)
		}
	} catch (error) {
		return false
	}
	return { file, version: json.version, indent: detectIndent(content).indent }
}

function setDataToJsonFile(data) {
	return async function({ file, version, indent }) {
		if (data?.version && version !== data.version) {
			const content = await fs.readFile(file, 'utf-8')
			const json = JSON.parse(content)
			for (const [key, value] of Object.entries(data)) {
				json[key] = value
			}
			await fs.writeFile(file, JSON.stringify(json, null, indent))
			console.log(`Updated ${file} to version ${data.version}`, json)
		}
	}
}

function checkIfAllVersionsAreEqual(currentVersion, versions) {
	const allEqual = versions.every(v => v.version === versions[0].version)
	return allEqual && versions[0].version === currentVersion
}

function getNextVersion(currentVersion, versions, releaseType, options, identifier, identifierBase) {
	const maxFileVersion = semver.maxSatisfying([...versions.map(v => v.version)], '*')
	const minFileVersion = semver.minSatisfying([...versions.map(v => v.version)], '*')
	if (currentVersion === maxFileVersion && currentVersion === minFileVersion) {
		return currentVersion
	}
	const maxVersion = semver.maxSatisfying([currentVersion, maxFileVersion], '*')
	if (maxFileVersion === maxVersion && releaseType === 'patch') {
		return maxFileVersion
	}
	return semver.inc(currentVersion, releaseType, options, identifier, identifierBase)
}

function getMaxTagVersion(versions, tags, releaseType = 'patch') {
	const maxFileVersion = semver.maxSatisfying([...versions.map(v => v.version)], '*')
	const range = releaseType === 'major' ? '*' : `~${semver.major(maxFileVersion)}.${semver.minor(maxFileVersion)}.0`
	return semver.maxSatisfying(tags, range)
}

function getNewVersion(versions, tags, releaseType = 'patch') {
	// Get latest tag with the same major.minor version as the newVersion
	let maxTagVersion = getMaxTagVersion(versions, tags, releaseType)

	// Get the next version
	let newVersion
	if (maxTagVersion) {
		do {
			newVersion = getNextVersion(maxTagVersion, versions, releaseType)
			maxTagVersion = getMaxTagVersion([{ version: newVersion }], tags, releaseType)
			if (maxTagVersion && semver.gte(maxTagVersion, newVersion)) {
				console.log(`Conflict: ${newVersion} already exists in tags, bumping version!`)
			}
		} while (maxTagVersion && semver.gte(maxTagVersion, newVersion))
	} else {
		newVersion = semver.maxSatisfying([...versions.map(v => v.version)], '*')
	}
	console.log(`New version: ${newVersion}`)

	return newVersion
}

module.exports = {
	getDataFromJsonFile,
	setDataToJsonFile,
	checkIfAllVersionsAreEqual,
	getNextVersion,
	getNewVersion,
}