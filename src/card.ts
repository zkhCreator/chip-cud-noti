import { Repository } from "./trend";

type NotificationCard = {
  repo: string;
  eventType: string;
  status: string;
  etitle: string;
  detailurl: string;
  build_status: string;
};

type CardData = {
  template_id: string;
  template_version_name: string;
  template_variable: NotificationCard;
};

type CardType = {
  type: string;
  data: CardData;
};

type CardMessage = {
  timestamp: string;
  sign: string;
  msg_type: string;
  card: CardType;
};

export function BuildGithubNotificationCard(
  tm: number,
  sign: string,
  repo: string,
  eventType: string,
  status: string,
  etitle: string,
  detailurl: string,
  build_status: string,
): string {
  const ncard: CardMessage = {
    timestamp: `${tm}`,
    sign: sign,
    msg_type: "interactive",
    card: {
      type: "template",
      data: {
        template_id: "AAqHJCUcCVFGv",
        template_version_name: "1.0.3",
        template_variable: {
          repo: repo,
          eventType: eventType,
          status: status,
          etitle: etitle,
          detailurl: detailurl,
          build_status: build_status,
        },
      },
    },
  };
  return JSON.stringify(ncard);
}

