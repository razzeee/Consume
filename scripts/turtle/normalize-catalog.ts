import { spawn } from "node:child_process";

function runNodeScript(scriptPath: string, args: string[] = []) {
    return new Promise<void>((resolveRun, rejectRun) => {
        const child = spawn(process.execPath, [scriptPath, ...args], {
            stdio: "inherit",
            cwd: process.cwd(),
            env: process.env,
        });

        child.on("error", (error) => {
            rejectRun(error);
        });

        child.on("exit", (code) => {
            if (code === 0) {
                resolveRun();
                return;
            }

            rejectRun(
                new Error(
                    `${scriptPath} failed with exit code ${code ?? "unknown"}`,
                ),
            );
        });
    });
}

export async function runTurtleNormalizeCatalog() {
    await runNodeScript("scripts/turtle/normalize-catalog.mjs");
}
