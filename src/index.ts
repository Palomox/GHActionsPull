import express from "express";
import {createServer} from "http";
import {Octokit} from "@octokit/core";
import config from "./config.js";
import {createHash, createHmac} from "crypto";
import {createWriteStream} from "fs";
import * as fs from "fs";
import path from "path";
import fetch from 'node-fetch';
import {promisify} from "util";
import {pipeline} from "stream";
import * as os from "os";
import {unzip} from "zlib";
import * as zlib from "zlib";
import extract from "extract-zip";

const port = config.port;

const app = express();
const octokit = new Octokit({auth: config.gh_token})


app.use(express.json())


const httpServer = createServer(app);

app.post("/projects/:project/deploy", async (req, res) => {
    let project: string = req.params.project;
    let body = req.body;
    let artifactUrl: string = body.workflow_run.artifacts_url;

    /* Check matching webhook signatures signatures */
    let hash = createHmac("sha256", config.gh_webhook_secret).update(JSON.stringify(body)).digest("hex");

    if(("sha256="+hash).localeCompare(<string>req.headers["x-hub-signature-256"]) != 0){
        res.sendStatus(403);
        return;
    }

    let data: any = await octokit.request('GET ' + artifactUrl, {});
    let download = await octokit.request('GET '+data.data.artifacts[0].archive_download_url);

    const streamPipeline = promisify(pipeline);

    const file = await fetch(download.url)
    if (!file.ok) throw new Error(`unexpected response ${file.statusText}`);

    res.sendStatus(200);

    // @ts-ignore
    let pathDir = path.join(config.projects[project])

    let tmpDir;
    const appPrefix = 'nginxloader';
    try {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), appPrefix));
        let tmpPath = path.join(tmpDir, "dist.zip")
        const fileStream = fs.createWriteStream(tmpPath);

        if (file.body) {
            await streamPipeline(file.body, fileStream)
        }

        //Unzip
        await extract(tmpPath, {dir: pathDir})
    }
    catch {
    }
    finally {
        try {
            if (tmpDir) {
                fs.rmSync(tmpDir, { recursive: true });
            }
        }
        catch (e) {
            console.error(`An error has occurred while removing the temp folder at ${tmpDir}. Please remove it manually. Error: ${e}`);
        }
    }





})


httpServer.listen(port, () => {
    console.log(`Started app on port ${port}`)
})
