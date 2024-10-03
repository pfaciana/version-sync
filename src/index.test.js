import path from 'path'
import fs from 'fs/promises'
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { getDataFromJsonFile, setDataToJsonFile, checkIfAllVersionsAreEqual, getNextVersion } from './index'

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
})