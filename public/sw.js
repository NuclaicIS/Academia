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
    const { title, body, deadline } = event.data;
    const now = Date.now();
    const deadlineMs = new Date(deadline).getTime();

    // Notification 30 minutes before
    const thirtyMinBefore = deadlineMs - (30 * 60 * 1000);
    if (thirtyMinBefore > now) {
      const delay30 = thirtyMinBefore - now;
      setTimeout(() => {
        self.registration.showNotification('⏰ 30 Minutes Left!', {
          body: `"${title}" is due in 30 minutes!`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200, 100, 200],
          tag: 'sprint-30-' + title,
          requireInteraction: true,
          actions: [{ action: 'open', title: 'Open App' }]
        });
      }, delay30);
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
