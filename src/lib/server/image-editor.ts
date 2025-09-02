import { join } from "node:path";
import { createTempDir, runCommand } from "./command-runner";
import { getFileNameFromPath } from "./utils";

/**
 * uses rawtherapee's pp3 file to edit an image
 * 
 * @param imagePath 
 * @param pp3 
 * @param options 
 * @returns 
*/
export async function editImage(imagePath: string, pp3: string, options: { allowConcurrent?: boolean, bitDepth?: number, signal?: AbortSignal, outputPath?: string } = {}): Promise<string> {
    const start = performance.now();
    
    let name = getFileNameFromPath(imagePath);
    
    if (options.allowConcurrent) {
        name += `-${Date.now()}`;
    }
    
    const tempDir = await createTempDir(name);

    options.bitDepth ??= 8;
    const output = options.outputPath ?? join(tempDir, options.bitDepth === 8 ? 'edited.jpg' : `edited.tiff`);

    // Write the pp3 file to the temp directory
    const pp3FilePath = join(tempDir, 'edit.pp3');
    await Bun.write(pp3FilePath, pp3);

    console.log(`Editing image: ${pp3FilePath}, output: ${output}`);

    const tiffOptions = ["-b" + options.bitDepth, "-t"];
    const jpegOptions = ["-b" + options.bitDepth];

    // Build rawtherapee-cli args according to the usage you pasted.
    // Use -p for profile, -o for output, -Y overwrite, and -c <input> last.
    const command = [
        'rawtherapee-cli',
        "--no-gui",
        "-p",
        pp3FilePath,
        "-o",
        output,
        "-Y",
        ...(options.bitDepth === 8 ? jpegOptions : tiffOptions),
        "-c",
        imagePath, // input must be last; rawtherapee will resolve it relative to cwd
    ];

    console.log(`Running command: ${command.join(" ")}`);

    await runCommand(command, { signal: options.signal });

    const end = performance.now();
    console.log(`Image edited in ${((end - start) / 1000).toFixed(2)} seconds`);
    return output;
}
