import { Client } from "@notionhq/client";
import { QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import axios from "axios";
import { flatMap, forEach, get, groupBy, last, map } from "lodash";

type Bug = QueryDatabaseResponse["results"][number];

const AUTH = "secret_5XxNoujYCleefAcSFD95e1NuI8kHwnDozvVh1pWq2c9";

const WEB_HOOK =
  "https://open.feishu.cn/open-apis/bot/v2/hook/2e17b162-3d2e-451d-90fe-fcb9dda526af"; // 桌面端群
  // "https://open.feishu.cn/open-apis/bot/v2/hook/2fcc0f55-0886-4f8f-b401-9edfa1c171d1"; // 前端群
  // "https://open.feishu.cn/open-apis/bot/v2/hook/98d6549e-d41b-4f10-b912-80507fc742a2"; // test group

const notion = new Client({ auth: AUTH });

async function main() {
  const bugs = await getAllBugs();

  postMessage(bugs);
}

async function postMessage(bugs: Bug[]) {
  const totalStatus = `**活跃 BUG ${bugs.length} 个**`;
  let sprintStatus = "";
  let priorityStatus = "";
  let userStatus = "";

  const groupBySprint = groupBy(bugs, "properties.Sprint.select.name");
  forEach(groupBySprint, (bugs, sprint) => {
    sprint = sprint === "undefined" ? "未分类" : sprint;
    sprintStatus += `**${sprint}** ${bugs.length} 个\n`;
  });

  const groupByPriority = groupBy(bugs, "properties.严重程度.select.name");
  forEach(groupByPriority, (bugs, priority) => {
    priorityStatus += `**${priority}** ${bugs.length} 个\n`;
  });

  const groupByUsers = groupBy(
    flatMap(bugs, (bug) => map(get(bug, "properties.指派至.people"), "name"))
  );
  forEach(groupByUsers, (bugs, user) => {
    userStatus += `**${user}** ${bugs.length} 个\n`;
  });

  await axios.post(WEB_HOOK, {
    msg_type: "interactive",
    card: {
      header: {
        template: "red",
        title: {
          content: "桌面端 BUG 状态通知",
          tag: "plain_text",
        },
      },
      elements: [
        {
          tag: "div",
          text: {
            content: totalStatus,
            tag: "lark_md",
          },
        },
        { tag: "hr" },
        {
          tag: "div",
          text: {
            content: priorityStatus,
            tag: "lark_md",
          },
        },
        { tag: "hr" },
        {
          tag: "div",
          text: {
            content: sprintStatus,
            tag: "lark_md",
          },
        },
        { tag: "hr" },
        {
          tag: "div",
          text: {
            content: userStatus,
            tag: "lark_md",
          },
        },
        {
          tag: "action",
          actions: [
            {
              tag: "button",
              text: {
                content: "详情",
                tag: "lark_md",
              },
              type: "primary",
              url: "https://www.notion.so/6affaec14afe4c9da2799e0b20d91e1b",
            },
          ],
        },
      ],
    },
  });
}

async function getAllBugs() {
  const bugs: Bug[] = [];

  let hasMore = true;
  let cursor: string | undefined;

  while (hasMore) {
    const res = await notion.databases.query({
      database_id: "6affaec1-4afe-4c9d-a279-9e0b20d91e1b",
      page_size: 100,
      start_cursor: cursor,
      filter: {
        or: [
          {
            property: "状态",
            select: {
              equals: "New",
            },
          },
          {
            property: "状态",
            select: {
              equals: "In Progress",
            },
          },
          {
            property: "状态",
            select: {
              equals: "Reopen",
            },
          },
        ],
      },
    });

    hasMore = res.has_more;
    cursor = last(res.results)?.id;
    bugs.push(...res.results);
  }

  return bugs;
}

main();
