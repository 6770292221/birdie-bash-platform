export interface MockPaymentHistoryEntry {
  id: string;
  title: string;
  datetime: string;
  amount: string;
  status: 'ชำระแล้ว' | 'รอชำระ';
}

export const mockPaymentHistory: MockPaymentHistoryEntry[] = [
  {
    id: '1',
    title: 'Weekend Badminton Meetup',
    datetime: '24 ก.ย. 2025 • 20:00-21:00',
    amount: '฿170.00',
    status: 'ชำระแล้ว',
  },
  {
    id: '2',
    title: 'Friday Night Session',
    datetime: '23 ก.ย. 2025 • 19:00-21:00',
    amount: '฿200.00',
    status: 'ชำระแล้ว',
  },
  {
    id: '3',
    title: 'Saturday Morning Practice',
    datetime: '22 ก.ย. 2025 • 09:00-11:00',
    amount: '฿150.00',
    status: 'รอชำระ',
  },
];

export const mockNextPayoutNotice = {
  title: 'รอการอัปเดตจากระบบ',
  description: 'เมื่อฝ่ายการเงินอัปเดตสถานะการจ่ายเงินของคุณ จะแสดงผลที่นี่',
  eta: 'อัปเดตภายใน 48 ชั่วโมง',
};
