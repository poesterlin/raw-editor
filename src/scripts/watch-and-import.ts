import chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';
import { db } from '../lib/server/db';
import { importTable } from '../lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { ExifDate, ExifDateTime, exiftool } from 'exiftool-vendored';

console.log('Starting up...');

const IMPORT_DIR = process.env.IMPORT_DIR;

if (!IMPORT_DIR) {
	console.error('IMPORT_DIR environment variable is not set. Please create a .env file and set it.');
	process.exit(1);
}

const absoluteImportDir = path.resolve(IMPORT_DIR);

if (!fs.existsSync(absoluteImportDir)) {
	console.log(`Import directory does not exist, creating it at: ${absoluteImportDir}`);
	fs.mkdirSync(absoluteImportDir, { recursive: true });
}

const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.tif', '.tiff', '.arw', '.nef', '.cr2', '.raf'];

async function importFile(filePath: string) {
	const extension = path.extname(filePath).toLowerCase();
	if (!supportedExtensions.includes(extension)) {
		console.log(`[IGNORE] Skipping unsupported file type: ${path.basename(filePath)}`);
		return;
	}

	const fileName = path.basename(filePath);

	try {
		console.log(`[CHECK] Found file: ${fileName}`);
		const existing = await db.query.importTable.findFirst({
			where: eq(importTable.filePath, filePath)
		});

		if (existing) {
			console.log(`[SKIP] "${fileName}" is already in the import queue.`);
			return;
		}

		const tags = await exiftool.read(filePath);
		const recordingDate = tags?.CreateDate || tags?.DateTimeOriginal;

		if (!recordingDate) {
			console.log(`[IGNORE] "${fileName}" is missing a recording date.`);
			return;
		}

		console.log(`[QUEUE] Adding "${fileName}" to the import queue...`);
		await db.insert(importTable).values({
			filePath,
			date: toDate(recordingDate),
		});
		console.log(`[SUCCESS] "${fileName}" added to queue.`);
	} catch (error) {
		console.error(`[ERROR] Failed to add "${fileName}" to queue:`, error);
	}
}

const watcher = chokidar.watch(absoluteImportDir, {
	persistent: true,
	ignoreInitial: false, // process files already in the directory on startup
	depth: 0 // do not watch subdirectories
});

watcher
	.on('add', (filePath) => importFile(filePath))
	.on('ready', () =>
		console.log(`\n✅ Ready and watching for new images in: ${absoluteImportDir}\n`)
	)
	.on('error', (error) => console.error(`Watcher error: ${error}`));

process.on('SIGINT', () => {
	console.log('\nGracefully shutting down...');
	watcher.close();
	exiftool.end();
	process.exit(0);
});


function toDate(value: string | number | ExifDateTime | ExifDate){
	if (typeof value === 'string' || typeof value === 'number') {
		return new Date(value);
	}

	if (value instanceof ExifDateTime || value instanceof ExifDate) {
		return value.toDate();
	}
}