import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

export class NotificationCreatedEvent {
  constructor(
    public readonly notification: any,
    public readonly deliveredRealtime: boolean,
  ) {}
}

@Injectable()
export class NotificationEvents {
  /**
    * TODO ====================== HANDLE NOTIFICATION CREATED ======================
    * @param event 
    * @returns //? Process notification events for analytics and fallbacks
    */
  @OnEvent('notification.created')
  handleNotificationCreated(event: NotificationCreatedEvent) {
    //* 1.Log for analytics
    console.log('Notification created event:', {
      notificationId: event.notification.id,
      type: event.notification.type,
      deliveredRealtime: event.deliveredRealtime,
      timestamp: new Date().toISOString(),
    });

    //* 2.If not delivered in real-time, queue for push notification
    if (!event.deliveredRealtime) {
      this.queuePushNotification(event.notification);
    }
  }

  /**
    * TODO ====================== QUEUE PUSH NOTIFICATION ======================
    * @param notification 
    * @returns //? Queue notification for mobile push delivery
    */
  private queuePushNotification(notification: any) {
    //* In production, this would add to a queue for push services (Firebase, APNS, etc.)
    console.log('Queuing push notification for:', notification.userId);
  }
}