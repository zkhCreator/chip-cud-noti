import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import getTrending from "./trend";
import { sign_with_timestamp, PostToFeishu } from "./feishu";
import { BuildGithubNotificationCard } from "./card";

export async function PostGithubEvent(): Promise<number | undefined> {
  const webhook = core.getInput("webhook")
    ? core.getInput("webhook")
    : process.env.FEISHU_BOT_WEBHOOK || "";
  const signKey = core.getInput("signkey")
    ? core.getInput("signkey")
    : process.env.FEISHU_BOT_SIGNKEY || "";

  let jobConclusion: string | undefined = undefined;
  const token = core.getInput("github_token") || process.env.GITHUB_TOKEN;
  if (token && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID && process.env.GITHUB_JOB) {
    try {
      const octokit = getOctokit(token);
      const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
      const run_id = Number(process.env.GITHUB_RUN_ID);
      const job_name = process.env.GITHUB_JOB;
      const jobs = await octokit.rest.actions.listJobsForWorkflowRun({
        owner,
        repo,
        run_id,
      });
      const currentJob = jobs.data.jobs.find(j => j.name === job_name);
      jobConclusion = currentJob?.conclusion || undefined;
    } catch (e) {
      core.warning("Failed to fetch job status from GitHub API: " + e);
    }
  }

  const payload = context.payload || {};
  console.log(payload);

  const webhookId = webhook.slice(webhook.indexOf("hook/") + 5);
  const tm = Math.floor(Date.now() / 1000);
  const sign = sign_with_timestamp(tm, signKey);

  const eventType = context.eventName;
  const repo = context.payload.repository?.name || "junka";
  var status = context.payload.action || "closed";
  var build_status = context.payload.conclusion || "success"; // 从 payload 中读取 workflow 执行状态
  if (jobConclusion) {
    build_status = jobConclusion;
  }
  var etitle =
    context.payload.issue?.html_url ||
    context.payload.pull_request?.html_url ||
    "";
  var detailurl = "";
  switch (eventType) {
    case "branch_protection_rule":
      const rule = context.payload.rule;
      etitle = rule.name + ":\n" + JSON.stringify(rule);
      status = context.payload.action || "created";
      detailurl = context.payload.repository?.html_url || "";
      break;
    case "check_run":
      build_status = context.payload.check_run?.conclusion || "success";
      break;
    case "check_suite":
      build_status = context.payload.check_suite?.conclusion || "success";
      break;
    case "create":
      etitle =
        (context.payload["ref_type"] === "tag" ? "create tag" : "create") +
        "\n\n" +
        context.payload["ref"];
      status = "create";
      detailurl = context.payload.repository?.html_url || "";
      break;
    case "delete":
      etitle =
        (context.payload["ref_type"] === "tag" ? "delete tag" : "delete") +
        "\n\n" +
        context.payload["ref"];
      status = "delete";
      detailurl = context.payload.repository?.html_url || "";
      break;
    case "deployment":
      build_status = context.payload.deployment?.environment || "production";
      break;
    case "deployment_status":
      build_status = context.payload.deployment_status?.state || "success";
      break;
    case "discussion":
      break;
    case "discussion_comment":
      break;
    case "fork":
      break;
    case "gollum":
      break;
    case "issue_comment":
      const comment = context.payload.comment;
      etitle =
        "[No." +
        context.payload.issue?.number +
        " " +
        context.payload.issue?.title +
        "](" +
        context.payload.issue?.html_url +
        ")" +
        "\n\n" +
        comment?.body +
        "\n\n" +
        "";
      detailurl = comment?.html_url || "";
      break;
    case "issue":
      const issue = context.payload.issue;
      etitle =
        "[No." +
        issue?.number +
        " " +
        issue?.title +
        "](" +
        issue?.html_url +
        ")" +
        "\n\n" +
        issue?.body +
        "\n\n";
      detailurl = issue?.html_url || "";
      break;
    case "label":
      break;
    case "merge_group":
      break;
    case "milestone":
      break;
    case "page_build":
      break;
    case "project":
      break;
    case "project_card":
      break;
    case "project_column":
      break;
    case "public":
      break;
    case "pull_request":
      build_status = context.payload.pull_request?.state || "open";
      break;
    case "pull_request_comment":
      break;
    case "pull_request_review":
      build_status = context.payload.review?.state || "approved";
      break;
    case "pull_request_review_comment":
      break;
    case "pull_request_target":
      break;
    case "push":
      const head_commit = context.payload["head_commit"];
      console.log(context.payload["ref"]);
      etitle =
        (context.payload["ref"].indexOf("refs/tags/") != -1
          ? "tag: " +
            context.payload["ref"].slice(
              context.payload["ref"].indexOf("refs/tags/") + 10,
            )
          : context.payload["ref"].indexOf("refs/heads/") != -1
            ? "branch: " +
              context.payload["ref"].slice(
                context.payload["ref"].indexOf("refs/heads/") + 11,
              )
            : "") +
        "\n\nCommits: [" +
        head_commit["id"] +
        "](" +
        head_commit["url"] +
        ")\n\n" +
        head_commit["message"];
      status =
        context.payload["created"] === true
          ? "created"
          : context.payload["forced"] === true
            ? "force updated"
            : "";
      detailurl = context.payload["compare"];
      break;
    case "registry_package":
      break;
    case "release":
      const release = context.payload.release;
      etitle =
        release["name"] +
        "\n" +
        release["body"] +
        "\n" +
        release["tag_name"] +
        (release["prerelease"] === true ? "  prerelease" : "");
      status = context.payload.action || "published";
      detailurl = release["html_url"];
      break;
    case "repository_dispatch":
      break;
    case "schedule":
      break
    case "status":
      build_status = context.payload.state || "success";
      break;
    case "watch":
      //trigger at star started
      console.log(context.payload.repository);
      etitle =
        "Total stars: " + context.payload.repository?.["stargazers_count"];
      status = "stared";
      detailurl = context.payload.repository?.html_url || "";
      break;
    case "workflow_call":
      break;
    case "workflow_dispatch":
      break;
    case "workflow_run":
      build_status = context.payload.workflow_run?.conclusion || "success";
      break;
    default:
      break;
  }

  build_status = core.getInput("status") || build_status;
  
  const cardmsg = BuildGithubNotificationCard(
    tm,
    sign,
    repo,
    eventType,
    status,
    etitle,
    detailurl,
    build_status,
  );
  return PostToFeishu(webhookId, cardmsg);
}
