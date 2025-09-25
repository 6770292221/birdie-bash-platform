export enum EventStatus {
  UPCOMING = 'upcoming',           // กำลังจะมาถึง
  IN_PROGRESS = 'in_progress',     // กำลังดำเนินการ
  CALCULATING = 'calculating',     // กำลังคำนวณ
  AWAITING_PAYMENT = 'awaiting_payment', // รอการชำระเงิน
  COMPLETED = 'completed',         // เสร็จสิ้น
  CANCELED = 'canceled'            // ยกเลิก
}

export type EventStatusType = 'upcoming' | 'in_progress' | 'calculating' | 'awaiting_payment' | 'completed' | 'canceled';

export const getEventStatusLabel = (status: EventStatusType): string => {
  switch (status) {
    case EventStatus.UPCOMING:
      return 'กำลังจะมาถึง';
    case EventStatus.IN_PROGRESS:
      return 'กำลังดำเนินการ';
    case EventStatus.CALCULATING:
      return 'กำลังคำนวณ';
    case EventStatus.AWAITING_PAYMENT:
      return 'รอการชำระเงิน';
    case EventStatus.COMPLETED:
      return 'เสร็จสิ้น';
    case EventStatus.CANCELED:
      return 'ยกเลิก';
    default:
      return status;
  }
};

export const getEventStatusColor = (status: EventStatusType): string => {
  switch (status) {
    case EventStatus.UPCOMING:
      return 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0';
    case EventStatus.IN_PROGRESS:
      return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0';
    case EventStatus.CALCULATING:
      return 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-0';
    case EventStatus.AWAITING_PAYMENT:
      return 'bg-gradient-to-r from-orange-500 to-red-500 text-white border-0';
    case EventStatus.COMPLETED:
      return 'bg-gradient-to-r from-slate-500 to-gray-600 text-white border-0';
    case EventStatus.CANCELED:
      return 'bg-gradient-to-r from-red-500 to-rose-600 text-white border-0';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-300';
  }
};