// Utility to generate notifications from event data
export interface EventData {
  eventType: 'capacity.slot.opened' | 'waitlist.promoted' | 'participant.cancelled' | 'waiting.added' | 'payment.received' | 'event.created';
  data: {
    eventId: string;
    playerId?: string;
    playerName?: string;
    canceledBy?: string;
    wasRegistered?: boolean;
    status?: string;
    promotedFromWaitlist?: boolean;
    openedSlots?: number;
    userType?: 'member' | 'guest';
    amount?: number;
    eventName?: string;
  };
  timestamp: string;
  service: string;
}

export interface Notification {
  id: string;
  type: EventData['eventType'];
  title: string;
  message: string;
  timestamp: string;
  eventId?: string;
  playerId?: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  userType: 'user' | 'admin' | 'both';
}

// Generate notifications for different user types based on events
export const generateNotifications = (eventData: EventData, currentUserId?: string): Notification[] => {
  const notifications: Notification[] = [];
  const baseId = `${eventData.eventType}-${Date.now()}`;

  switch (eventData.eventType) {
    case 'waitlist.promoted':
      // User notification - if it's their promotion
      if (eventData.data.playerId === currentUserId) {
        notifications.push({
          id: `${baseId}-user`,
          type: eventData.eventType,
          title: 'ได้รับการยืนยันแล้ว! 🎉',
          message: `คุณได้รับการยืนยันเข้าร่วมอีเวนต์จากรายชื่อสำรอง`,
          timestamp: eventData.timestamp,
          eventId: eventData.data.eventId,
          playerId: eventData.data.playerId,
          isRead: false,
          priority: 'high',
          userType: 'user'
        });
      }

      // Admin notification
      notifications.push({
        id: `${baseId}-admin`,
        type: eventData.eventType,
        title: 'รายชื่อสำรองได้รับการยืนยัน',
        message: `${eventData.data.playerName} ได้รับการยืนยันจากรายชื่อสำรองเข้าร่วมอีเวนต์`,
        timestamp: eventData.timestamp,
        eventId: eventData.data.eventId,
        playerId: eventData.data.playerId,
        isRead: false,
        priority: 'low',
        userType: 'admin'
      });
      break;

    case 'capacity.slot.opened':
      // Public notification - for all users
      notifications.push({
        id: `${baseId}-all`,
        type: eventData.eventType,
        title: 'มีที่ว่างแล้ว! 🚀',
        message: `อีเวนต์มีที่ว่าง ${eventData.data.openedSlots} ที่ สามารถลงทะเบียนได้ทันที`,
        timestamp: eventData.timestamp,
        eventId: eventData.data.eventId,
        isRead: false,
        priority: 'medium',
        userType: 'both'
      });
      break;

    case 'participant.cancelled':
      // Admin notification
      notifications.push({
        id: `${baseId}-admin`,
        type: eventData.eventType,
        title: 'ผู้เล่นยกเลิกการลงทะเบียน',
        message: `${eventData.data.playerName} ยกเลิกการลงทะเบียน${eventData.data.wasRegistered ? ' (มีที่ว่าง 1 ที่)' : ' (จากรายชื่อสำรอง)'}`,
        timestamp: eventData.timestamp,
        eventId: eventData.data.eventId,
        playerId: eventData.data.playerId,
        isRead: false,
        priority: 'medium',
        userType: 'admin'
      });

      // If user cancelled their own registration
      if (eventData.data.playerId === currentUserId) {
        notifications.push({
          id: `${baseId}-user`,
          type: eventData.eventType,
          title: 'ยกเลิกการลงทะเบียนแล้ว',
          message: `คุณได้ยกเลิกการลงทะเบียนเข้าร่วมอีเวนต์เรียบร้อยแล้ว`,
          timestamp: eventData.timestamp,
          eventId: eventData.data.eventId,
          playerId: eventData.data.playerId,
          isRead: false,
          priority: 'low',
          userType: 'user'
        });
      }
      break;

    case 'waiting.added':
      // User notification - if it's their addition to waitlist
      if (eventData.data.playerId === currentUserId) {
        notifications.push({
          id: `${baseId}-user`,
          type: eventData.eventType,
          title: 'เข้าสู่รายชื่อสำรอง ⏳',
          message: `คุณถูกเพิ่มเข้ารายชื่อสำรองสำหรับอีเวนต์ เราจะแจ้งเตือนเมื่อมีที่ว่าง`,
          timestamp: eventData.timestamp,
          eventId: eventData.data.eventId,
          playerId: eventData.data.playerId,
          isRead: false,
          priority: 'medium',
          userType: 'user'
        });
      }

      // Admin notification
      notifications.push({
        id: `${baseId}-admin`,
        type: eventData.eventType,
        title: 'มีผู้เข้าร่วมรายชื่อสำรอง',
        message: `${eventData.data.playerName} (${eventData.data.userType}) เข้าร่วมรายชื่อสำรอง`,
        timestamp: eventData.timestamp,
        eventId: eventData.data.eventId,
        playerId: eventData.data.playerId,
        isRead: false,
        priority: 'low',
        userType: 'admin'
      });
      break;

    case 'payment.received':
      // Admin notification
      notifications.push({
        id: `${baseId}-admin`,
        type: eventData.eventType,
        title: 'ได้รับการชำระเงินแล้ว 💰',
        message: `${eventData.data.playerName} ชำระเงิน ฿${eventData.data.amount?.toFixed(2)} สำหรับอีเวนต์`,
        timestamp: eventData.timestamp,
        eventId: eventData.data.eventId,
        playerId: eventData.data.playerId,
        isRead: false,
        priority: 'low',
        userType: 'admin'
      });

      // User notification - if it's their payment
      if (eventData.data.playerId === currentUserId) {
        notifications.push({
          id: `${baseId}-user`,
          type: eventData.eventType,
          title: 'ชำระเงินสำเร็จ ✅',
          message: `ชำระเงิน ฿${eventData.data.amount?.toFixed(2)} เรียบร้อยแล้ว`,
          timestamp: eventData.timestamp,
          eventId: eventData.data.eventId,
          playerId: eventData.data.playerId,
          isRead: false,
          priority: 'medium',
          userType: 'user'
        });
      }
      break;

    case 'event.created':
      // Public notification
      notifications.push({
        id: `${baseId}-all`,
        type: eventData.eventType,
        title: 'อีเวนต์ใหม่! 🎯',
        message: `อีเวนต์ใหม่ "${eventData.data.eventName}" เปิดรับสมัครแล้ว`,
        timestamp: eventData.timestamp,
        eventId: eventData.data.eventId,
        isRead: false,
        priority: 'high',
        userType: 'both'
      });
      break;
  }

  return notifications;
};

// Parse event string to EventData
export const parseEventString = (eventString: string): EventData | null => {
  try {
    return JSON.parse(eventString) as EventData;
  } catch (error) {
    console.error('Failed to parse event string:', error);
    return null;
  }
};

// Example usage with the provided event strings
export const mockEventStrings = [
  '{"eventType":"capacity.slot.opened","data":{"eventId":"68d3ef5f1d0216a61ba9670b","openedSlots":1},"timestamp":"2025-09-24T13:24:51.933Z","service":"event-service"}',
  '{"eventType":"waitlist.promoted","data":{"eventId":"68d3ef5f1d0216a61ba9670b","playerId":"68d3f11d6a93401bcff2e8f3","playerName":"New","status":"registered","promotedFromWaitlist":true,"promotedAt":"2025-09-24T13:24:52.036Z"},"timestamp":"2025-09-24T13:24:52.036Z","service":"registration-service"}',
  '{"eventType":"participant.cancelled","data":{"eventId":"68d3ef5f1d0216a61ba9670b","playerId":"68d3ef9e6a93401bcff2e885","canceledBy":"68c44061466934fd709464e1","wasRegistered":true,"status":"canceled","canceledAt":"2025-09-24T13:24:51.799Z"},"timestamp":"2025-09-24T13:24:51.799Z","service":"registration-service"}',
  '{"eventType":"waiting.added","data":{"eventId":"68d3ef5f1d0216a61ba9670b","playerId":"68d3f11d6a93401bcff2e8f3","playerName":"New","status":"waitlist","userType":"guest"},"timestamp":"2025-09-24T13:24:45.129Z","service":"registration-service"}',
  '{"eventType":"participant.cancelled","data":{"eventId":"68d3ef5f1d0216a61ba9670b","playerId":"68d3f0ae6a93401bcff2e8ce","canceledBy":"68c44061466934fd709464e1","wasRegistered":false,"status":"canceled","canceledAt":"2025-09-24T13:23:55.845Z"},"timestamp":"2025-09-24T13:23:55.845Z","service":"registration-service"}',
  '{"eventType":"waitlist.promoted","data":{"eventId":"68d3ef5f1d0216a61ba9670b","playerId":"68d3f0556a93401bcff2e8b0","playerName":"New","status":"registered","promotedFromWaitlist":true,"promotedAt":"2025-09-24T13:21:35.135Z"},"timestamp":"2025-09-24T13:21:35.135Z","service":"registration-service"}'
];