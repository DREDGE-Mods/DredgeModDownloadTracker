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
import { error } from "console";

async function run() {
    const test = false;

    var commits : any[] = [];

    // Avoid making API calls when just testing
    if (test) {
        commits = JSON.parse(fs.readFileSync("test/latest_commits.json", "utf-8"));
    }
    else {
        // Get commits
        const octokit = getOctokit();

        commits = (await octokit.request('GET /repos/DREDGE-mods/DredgeModDatabase/commits?sha=database&per_page=10', {
            owner: "DREDGE-Mods",
            repo: "DREDGEModDatabase"
        })).data;

        fs.writeFile("test/latest_commits.json", JSON.stringify(commits, null, 2), (err: any) => {
            if (err) {
                throw new Error(JSON.stringify(err, null, 2));
            }
            else {
                core.info("Saved latest commits");
            }
        });

        core.info("Retrieved latest commits");
    }

    // Get a commit per day and retrieve the sha for each
    var commitHistory : Record<string, string> = {};

    commits.forEach((commit : any) => {
        const date = new Date(commit["commit"]["author"]["date"])
        const sha = commit["sha"]
        const dateString = (date.getUTCDate() + "/" + (date.getUTCMonth() + 1) + "/" + date.getUTCFullYear());
        if (commitHistory[dateString] === undefined) {
            commitHistory[dateString] = sha;
        }
    });

    core.info(JSON.stringify(commitHistory, null, 2));

    // Load what is tracked so far
    // date -> mod id -> downloads
    var trackedDownloads : any = JSON.parse(fs.readFileSync("downloads.json", "utf-8"));

    let promises : Array<Promise<any>> = [];

    Object.keys(commitHistory).forEach(async (date) => {
        const sha = commitHistory[date];
        if (trackedDownloads[date] == undefined) {
            let promise = getDatabaseAtCommit(commitHistory[date], date)
            .then((x) => {
                return x;
            })
            .catch((error) => {
                throw new Error("Couldn't get db on " + date + ": " + error.message);
            })
            promises.push(promise);
        }
    });


    Promise.all(promises).then((results) => {
        results.forEach((result) => {
            const db = JSON.parse(result[0])
            const date = result[1]

            trackedDownloads[date] = {}

            db.forEach((mod : any) => {
                const guid = mod["mod_guid"]
                const downloads = mod["downloads"]
                trackedDownloads[date][guid] = parseInt(downloads);
            });
        });

        core.info("Done tracking downloads");

        fs.writeFile("downloads.json", JSON.stringify(trackedDownloads, null, 2), (err: any) => {
            if (err) {
                core.info(JSON.stringify(err, null, 2));
                throw new Error(JSON.stringify(err, null, 2));
            }
            else {
                core.info("Saved tracked downloads");
            }
        });
    })
}

async function getDatabaseAtCommit(sha : string, date : string) {
    let url = "https://raw.githubusercontent.com/DREDGE-Mods/DredgeModDatabase/" + sha + "/database.json"
    let settings = { method: "GET" };
    let res = await fetch(url, settings);
    let text = await res.text();

    return [text, date];
}

run().catch((error) => core.setFailed("Workflow failed! " + error.message));