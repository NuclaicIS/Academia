// Academic OS Service Worker - Handles push notifications with sound

const CACHE_NAME = 'academic-os-v1';

// Install event
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for messages from the main app to schedule notifications
self.addEventListener('message', (event) => {
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, deadline, remindBefore } = event.data;
    const now = Date.now();
    const deadlineMs = new Date(deadline).getTime();

    // Custom reminder: N minutes before deadline (set per sprint, default 60)
    const remindMin = parseInt(remindBefore) || 60;
    const customBefore = deadlineMs - (remindMin * 60 * 1000);
    if (customBefore > now) {
      const delayCustom = customBefore - now;
      const label = remindMin >= 60
        ? (remindMin % 60 === 0 ? (remindMin / 60) + ' hour' + (remindMin === 60 ? '' : 's') : Math.round(remindMin / 60 * 10) / 10 + ' hours')
        : remindMin + ' minutes';
      setTimeout(() => {
        self.registration.showNotification('⏰ ' + label + ' left!', {
          body: `"${title}" is due in ${label}. Time to start your sprint!`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200, 100, 200],
          tag: 'sprint-custom-' + title,
          requireInteraction: true,
          actions: [{ action: 'open', title: 'Open App' }]
        });
      }, delayCustom);
    }

    // Notification at exact deadline
    if (deadlineMs > now) {
      const delayExact = deadlineMs - now;
      setTimeout(() => {
        self.registration.showNotification('🚨 Deadline NOW!', {
          body: `"${title}" is due RIGHT NOW!`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [500, 200, 500, 200, 500],
          tag: 'sprint-due-' + title,
          requireInteraction: true,
          actions: [{ action: 'open', title: 'Open App' }]
        });
      }, delayExact);
    }

    // Notification 1 day before
    const oneDayBefore = deadlineMs - (24 * 60 * 60 * 1000);
    if (oneDayBefore > now) {
      const delay1d = oneDayBefore - now;
      setTimeout(() => {
        self.registration.showNotification('📅 Tomorrow Deadline', {
          body: `"${title}" is due tomorrow!`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200],
          tag: 'sprint-1d-' + title,
          requireInteraction: true
        });
      }, delay1d);
    }
  }
});

// Handle notification click - open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow('/sprints');
      }
    })
  );
});
