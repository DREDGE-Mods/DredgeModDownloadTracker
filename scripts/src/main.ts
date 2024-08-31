import core from "@actions/core";
import { Octokit } from "@octokit/core";
import {
  getOctokit,
  getRestEndpointMethods,
  getCleanedUpRelease,
  getCleanedUpReleaseList,
  getRepoUpdatedAt,
  getAllReleases,
  getRepository
} from "./octokit";
import fs from "fs";

async function run() {
    core.info("Test")

    const test = true;

    var commits : any[] = [];

    if (test) {
        commits = JSON.parse(fs.readFileSync("commits.json", "utf-8"));
    }
    else {
        // Get commits
        const octokit = getOctokit();

        const commits = (await octokit.request('GET /repos/DREDGE-mods/DredgeModDatabase/commits?sha=database', {
            owner: "DREDGE-Mods",
            repo: "DREDGEModDatabase"
        })).data;

        fs.writeFile("commits.json", JSON.stringify(commits, null, 2), (err: any) => {
            if (err) {
                throw new Error(JSON.stringify(err, null, 2));
            }
            else {
                core.info("Saved commits");
            }
        });
    }

    var commitHistory : Record<string, string> = {};

    commits.forEach((commit : any) => {
        const date = new Date(commit["commit"]["author"]["date"])
        const sha = commit["sha"]
        const dateString = (date.getUTCDate() + "/" + date.getUTCMonth() + "/" + date.getUTCFullYear());
        if (commitHistory[dateString] === undefined) {
            commitHistory[dateString] = sha;
        }
    });

    core.info(JSON.stringify(commitHistory, null, 2));

    if (test) {

    }
    else {
        const db = await getDatabaseAtCommit(commitHistory["31/7/2024"])
        fs.writeFile("database.json", db, (err: any) => {
            if (err) {
                throw new Error(JSON.stringify(err, null, 2));
            }
            else {
                core.info("Saved database");
            }
        });
    }
}

async function getDatabaseAtCommit(sha : string) {
    let url = "https://raw.githubusercontent.com/DREDGE-Mods/DredgeModDatabase/" + sha + "/database.json"
    let settings = { method: "GET" };
    let res = await fetch(url, settings);
    let text = await res.text();

    return text;
}

run().catch((error) => core.setFailed("Workflow failed! " + error.message));