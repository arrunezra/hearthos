// import notifee, { TriggerType, TimestampTrigger, AndroidImportance, EventType } from '@notifee/react-native';
// import { Platform } from 'react-native';

// class ReminderService {
//     constructor() {
//         this.bootstrap();
//         this.setupEventObservers();
//     }

//     private async bootstrap() {
//         if (Platform.OS === 'android') {
//             // Standard channel registration for Android 8.0+
//             await notifee.createChannel({
//                 id: 'notes-reminders',
//                 name: 'Notes & Reminders',
//                 importance: AndroidImportance.HIGH,
//                 sound: 'default',
//             });
//         }
//     }

//     /**
//      * 🚀 NEW IN V9+: Unified Foreground/Background UI Interaction Listeners
//      */
//     private setupEventObservers() {
//         // Foreground Event Monitoring Hook
//         notifee.onForegroundEvent(({ type, detail }) => {
//             switch (type) {
//                 case EventType.PRESS:
//                     console.log('User interacted with reminder in foreground:', detail.notification);
//                     break;
//                 case EventType.DISMISSED:
//                     console.log('Notification dismissed by user');
//                     break;
//             }
//         });
//     }

//     /**
//      * Schedules an absolute local hardware timestamp alarm trigger.
//      */
//     public async scheduleReminder(id: string, title: string, body: string, timestampMs: number) {
//         // Request runtime permissions (Handles mandatory runtime prompt required for Android 13+)
//         await notifee.requestPermission();

//         const trigger: TimestampTrigger = {
//             type: TriggerType.TIMESTAMP,
//             timestamp: timestampMs,
//             alarmManager: {
//                 allowWhileIdle: true, // 🔋 CRITICAL: Forces execution during Doze/Power-saving modes
//             },
//         };

//         await notifee.createTriggerNotification(
//             {
//                 id: id,
//                 title: title,
//                 body: body,
//                 android: {
//                     channelId: 'notes-reminders',
//                     smallIcon: 'ic_launcher', // Ensure this match your project res/drawable icon resource string name
//                     pressAction: {
//                         id: 'default',
//                     },
//                 },
//             },
//             trigger
//         );
//     }

//     public async cancelReminder(id: string) {
//         await notifee.cancelNotification(id);
//     }
// }

// export const reminderService = new ReminderService();