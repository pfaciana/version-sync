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

function getNextVersion(currentVersion, versions, release, options, identifier, identifierBase) {
	const maxFileVersion = semver.maxSatisfying([...versions.map(v => v.version)], '*')
	const minFileVersion = semver.minSatisfying([...versions.map(v => v.version)], '*')
	if (currentVersion === maxFileVersion && currentVersion === minFileVersion) {
		return currentVersion
	}
	const maxVersion = semver.maxSatisfying([currentVersion, maxFileVersion], '*')
	if (maxFileVersion === maxVersion) {
		return maxFileVersion
	}
	return semver.inc(currentVersion, release, options, identifier, identifierBase)
}

module.exports = {
	getDataFromJsonFile,
	setDataToJsonFile,
	checkIfAllVersionsAreEqual,
	getNextVersion,
}