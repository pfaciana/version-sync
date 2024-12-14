import path from 'path'
import fs from 'fs/promises'
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { getDataFromJsonFile, setDataToJsonFile, checkIfAllVersionsAreEqual, getNextVersion, getNewVersion } from './index'

const testDir = path.resolve('./test')
const mockDir = path.resolve('./test/__mocks__')

describe('getDataFromJsonFile', () => {
	beforeAll(async () => {
		await fs.mkdir(mockDir, { recursive: true })
	})

	it('should read and parse JSON file correctly', async () => {
		const file = path.join(mockDir, 'basic.json')
		const version = '1.0.0'
		const indent = '\t'
		await fs.writeFile(file, JSON.stringify({ version }, null, indent))
		const result = await getDataFromJsonFile(file)
		expect(result).toEqual({ file, version, indent })
		await fs.unlink(file)
	})

	it('should read and parse JSON file correctly with spaces', async () => {
		const file = path.join(mockDir, 'spaces.json')
		const version = '1.2.3'
		const indent = '  '
		await fs.writeFile(file, JSON.stringify({ version }, null, indent))
		const result = await getDataFromJsonFile(file)
		expect(result).toEqual({ file, version, indent })
		await fs.unlink(file)
	})

	it('should throw error if version key is missing', async () => {
		const file = path.join(mockDir, 'empty.json')
		await fs.writeFile(file, '')
		const result = await getDataFromJsonFile(file)
		expect(result).toBe(false)
		await fs.unlink(file)
	})

	it('should throw error if version is invalid', async () => {
		const file = path.join(mockDir, 'invalid.json')
		await fs.writeFile(file, JSON.stringify({ version: 'invalid' }))
		const result = await getDataFromJsonFile(file)
		expect(result).toBe(false)
		await fs.unlink(file)
	})

	afterAll(async () => {
		try {
			if (!(await fs.readdir(mockDir)).length) {
				await fs.rm(mockDir, { recursive: true })
				console.log(`Directory ${mockDir} deleted successfully.`)
			}
			if (!(await fs.readdir(testDir)).length) {
				await fs.rm(testDir, { recursive: true })
				console.log(`Directory ${testDir} deleted successfully.`)
			}
		} catch (error) {
			console.error(`Error deleting directory ${mockDir}:`, error)
		}
	})
})

describe('setDataToJsonFile', () => {
	beforeAll(async () => {
		await fs.mkdir(mockDir, { recursive: true })
	})

	it('should update JSON file with new data', async () => {
		const file = path.join(mockDir, 'temp.json')
		const oldVersion = '1.0.0'
		const newVersion = '2.0.0'
		const indent = '\t'
		await fs.writeFile(file, JSON.stringify({ version: oldVersion }, null, indent))
		await setDataToJsonFile({ version: newVersion })({ file, version: oldVersion, indent })
		const updated = await fs.readFile(file, 'utf-8')
		const json = JSON.parse(updated)
		expect(json.version).toEqual(newVersion)
		await fs.unlink(file)
	})

	it('should not update if versions are the same', async () => {
		const file = path.join(mockDir, 'temp.json')
		const version = '3.2.1'
		const indent = '\t'
		await fs.writeFile(file, JSON.stringify({ version }, null, indent))
		await setDataToJsonFile({ version })({ file, version, indent })
		const updated = await fs.readFile(file, 'utf-8')
		const json = JSON.parse(updated)
		expect(json.version).toEqual(version)
		await fs.unlink(file)
	})

	afterAll(async () => {
		try {
			if (!(await fs.readdir(mockDir)).length) {
				await fs.rm(mockDir, { recursive: true })
				console.log(`Directory ${mockDir} deleted successfully.`)
			}
			if (!(await fs.readdir(testDir)).length) {
				await fs.rm(testDir, { recursive: true })
				console.log(`Directory ${testDir} deleted successfully.`)
			}
		} catch (error) {
			console.error(`Error deleting directory ${mockDir}:`, error)
		}
	})
})

describe('checkIfAllVersionsAreEqual', () => {
	it('should return true if all versions are equal', () => {
		const versions = [{ version: '1.0.0' }, { version: '1.0.0' }]
		const result = checkIfAllVersionsAreEqual('1.0.0', versions)
		expect(result).toBe(true)
	})

	it('should return false if versions are not equal', () => {
		const versions = [{ version: '1.0.0' }, { version: '2.0.0' }]
		const result = checkIfAllVersionsAreEqual('1.0.0', versions)
		expect(result).toBe(false)
	})

	it('should return false if versions are not equal', () => {
		const versions = [{ version: '1.0.0' }, { version: '1.0.0' }]
		const result = checkIfAllVersionsAreEqual('1.2.3', versions)
		expect(result).toBe(false)
	})
})

describe('getNextVersion', () => {
	it('should keep the version the same', () => {
		const currentVersion = '1.0.0'
		const versions = [{ version: '1.0.0' }, { version: '1.0.0' }]
		const result = getNextVersion(currentVersion, versions, 'minor')
		expect(result).toBe('1.0.0')
	})

	it('should return currentVersion bump', () => {
		const currentVersion = '1.1.0'
		const versions = [{ version: '1.0.1' }, { version: '1.0.2' }]
		const result = getNextVersion(currentVersion, versions, 'minor')
		expect(result).toBe('1.2.0')
	})

	it('should return the largest file version', () => {
		const currentVersion = '1.0.1'
		const versions = [{ version: '1.0.2' }, { version: '1.0.3' }]
		const result = getNextVersion(currentVersion, versions, 'patch')
		expect(result).toBe('1.0.3')
	})

	it('should bump the version when version are empty', () => {
		expect(getNextVersion('1.0.0', [], 'patch')).toBe('1.0.1')
		expect(getNextVersion('1.0.0', [], 'minor')).toBe('1.1.0')
		expect(getNextVersion('1.0.0', [], 'major')).toBe('2.0.0')

		expect(getNextVersion('7.8.9', [], 'patch')).toBe('7.8.10')
		expect(getNextVersion('7.8.9', [], 'minor')).toBe('7.9.0')
		expect(getNextVersion('7.8.9', [], 'major')).toBe('8.0.0')
	})
})

describe('getNewVersion', () => {
	it('standard use case', () => {
		const versions = [{ version: '1.2.1' }, { version: '1.2.2' }]
		const tags = ['v1.0.0', 'v1.0.1', 'v1.1.0', 'v1.1.1', 'v1.1.2', 'v1.2.0', 'v1.2.1']
		const resultPatch = getNewVersion(versions, tags, 'patch')
		expect(resultPatch).toBe('1.2.2')
		const resultMinor = getNewVersion(versions, tags, 'minor')
		expect(resultMinor).toBe('1.3.0')
		const resultMajor = getNewVersion(versions, tags, 'major')
		expect(resultMajor).toBe('2.0.0')
	})

	it('standard use case, minor bump', () => {
		const versions = [{ version: '1.2.1' }, { version: '1.3.0' }]
		const tags = ['v1.0.0', 'v1.0.1', 'v1.1.0', 'v1.1.1', 'v1.1.2', 'v1.2.0', 'v1.2.1']
		const resultPatch = getNewVersion(versions, tags, 'patch')
		expect(resultPatch).toBe('1.3.0')
		const resultMinor = getNewVersion(versions, tags, 'minor')
		expect(resultMinor).toBe('1.3.0')
		const resultMajor = getNewVersion(versions, tags, 'major')
		expect(resultMajor).toBe('2.0.0')
	})

	it('standard use case, skip version', () => {
		const versions = [{ version: '1.2.1' }, { version: '1.3.1' }]
		const tags = ['v1.0.0', 'v1.0.1', 'v1.1.0', 'v1.1.1', 'v1.1.2', 'v1.2.0', 'v1.2.1']
		const resultPatch = getNewVersion(versions, tags, 'patch')
		expect(resultPatch).toBe('1.3.1')
		const resultMinor = getNewVersion(versions, tags, 'minor')
		expect(resultMinor).toBe('1.3.1')
		const resultMajor = getNewVersion(versions, tags, 'major')
		expect(resultMajor).toBe('2.0.0')
	})

	it('Tag has lower patch version as the max file version', () => {
		const versions = [{ version: '1.1.2' }, { version: '1.1.3' }]
		const tags = ['v1.0.0', 'v1.0.1', 'v1.1.0', 'v1.1.1', 'v1.1.2', 'v1.2.0', 'v1.2.1', 'v2.0.0', 'v2.0.1']
		const resultPatch = getNewVersion(versions, tags, 'patch')
		expect(resultPatch).toBe('1.1.3')
		const resultMinor = getNewVersion(versions, tags, 'minor')
		expect(resultMinor).toBe('1.3.0')
		const resultMajor = getNewVersion(versions, tags, 'major')
		expect(resultMajor).toBe('3.0.0')
	})

	it('Tag has higher patch version as the max file version', () => {
		const versions = [{ version: '1.2.0' }, { version: '1.2.0' }]
		const tags = ['v1.0.0', 'v1.0.1', 'v1.1.0', 'v1.1.1', 'v1.1.2', 'v1.2.0', 'v1.2.1', 'v2.0.0', 'v2.0.1']
		const resultPatch = getNewVersion(versions, tags, 'patch')
		expect(resultPatch).toBe('1.2.2')
		const resultMinor = getNewVersion(versions, tags, 'minor')
		expect(resultMinor).toBe('1.3.0')
		const resultMajor = getNewVersion(versions, tags, 'major')
		expect(resultMajor).toBe('3.0.0')
	})

	it('Tag has same patch version as the max file version', () => {
		const versions = [{ version: '1.1.1' }, { version: '1.1.2' }]
		const tags = ['v1.0.0', 'v1.0.1', 'v1.1.0', 'v1.1.1', 'v1.1.2', 'v1.2.0', 'v1.2.1', 'v1.3.3', 'v1.4.4', 'v2.0.0', 'v2.4.5']
		const resultPatch = getNewVersion(versions, tags, 'patch')
		expect(resultPatch).toBe('1.1.3')
		const resultMinor = getNewVersion(versions, tags, 'minor')
		expect(resultMinor).toBe('1.5.0')
		const resultMajor = getNewVersion(versions, tags, 'major')
		expect(resultMajor).toBe('3.0.0')
	})

	it('All versions are the same', () => {
		const versions = [{ version: '1.1.2' }, { version: '1.1.2' }]
		const tags = ['v1.0.0', 'v1.0.1', 'v1.1.0', 'v1.1.1', 'v1.1.2', 'v1.2.0', 'v1.2.1', 'v2.0.0', 'v2.0.1', 'v3.0.0']
		const resultPatch = getNewVersion(versions, tags, 'patch')
		expect(resultPatch).toBe('1.1.3')
		const resultMinor = getNewVersion(versions, tags, 'minor')
		expect(resultMinor).toBe('1.3.0')
		const resultMajor = getNewVersion(versions, tags, 'major')
		expect(resultMajor).toBe('4.0.0')
	})

	it('All versions are the same, large skips in tags', () => {
		const versions = [{ version: '1.1.2' }, { version: '1.1.2' }]
		const tags = ['v1.0.0', 'v1.0.1', 'v1.1.0', 'v1.1.1', 'v1.1.2', 'v1.2.0', 'v1.2.1', 'v2.0.0', 'v2.0.1', 'v3.3.3']
		const resultPatch = getNewVersion(versions, tags, 'patch')
		expect(resultPatch).toBe('1.1.3')
		const resultMinor = getNewVersion(versions, tags, 'minor')
		expect(resultMinor).toBe('1.3.0')
		const resultMajor = getNewVersion(versions, tags, 'major')
		expect(resultMajor).toBe('4.0.0')
	})

	it('No tags yet in the repo', () => {
		const versions = [{ version: '1.1.1' }, { version: '1.1.2' }]
		const tags = []
		const resultPatch = getNewVersion(versions, tags, 'patch')
		expect(resultPatch).toBe('1.1.2')
		const resultMinor = getNewVersion(versions, tags, 'minor')
		expect(resultMinor).toBe('1.1.2')
		const resultMajor = getNewVersion(versions, tags, 'major')
		expect(resultMajor).toBe('1.1.2')
	})
})