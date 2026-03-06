import { spawn } from "node:child_process";

export const TURTLE_SCRAPE_QUERIES = [
    "items=0.0",
    "items=0.2",
    "items=0.3",
    "items=0.4",
    "items=0.5",
    "items=5.0",
    "items=7.0",
    "objects=-3",
] as const;

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

export async function runTurtleScrapeCatalog() {
    await runNodeScript("scripts/turtle/fetch-catalog.mjs");
}
