import PushNotification from "react-native-push-notification";

PushNotification.createChannel(
  {
    channelId: "visit-reminder",
    channelName: "Visit Reminder",
    importance: 4,
  },
  (created) => console.log(`channel created: ${created}`)
);

export const scheduleVisitReminder = () => {
  PushNotification.localNotificationSchedule({
    channelId: "visit-reminder",
    title: "Smart Recovery",
    message: "Visit has been running for 20 minutes. Please stop the visit.",
    date: new Date(Date.now() + 20 * 60 * 1000),
    allowWhileIdle: true,
  });
};

export const cancelVisitReminder = () => {
  PushNotification.cancelAllLocalNotifications();
};