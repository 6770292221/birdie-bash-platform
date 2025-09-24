
import React, { createContext, useContext, useState } from 'react';

type Language = 'th' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  th: {
    'app.title': 'Badminton Event Manager (BEM)',
    'app.subtitle': 'จัดการการเล่นแบดมินตันกลุ่มได้อย่างง่ายดาย',
    'events.upcoming': 'กำลังมา',
    'events.in_progress': 'กำลังเล่น',
    'events.calculating': 'รอคำนวณ',
    'events.awaiting_payment': 'รอจ่ายเงิน',
    'events.completed': 'เสร็จสิ้น',
    'events.total_players': 'ผู้เล่นทั้งหมด',
    'events.courts_booked': 'สนามที่จอง',
    'events.create': 'สร้างกิจกรรม',
    'events.management': 'จัดการกิจกรรม',
    'registration': 'ลงทะเบียนผู้เล่น',
    'events.no_events': 'ยังไม่มีกิจกรรม',
    'events.no_events_desc': 'สร้างกิจกรรมแบดมินตันแรกของคุณเพื่อเริ่มต้น!',
    'registration.no_events': 'ไม่มีกิจกรรมให้ลงทะเบียน',
    'registration.no_events_desc': 'ยังไม่มีกิจกรรมที่จะมาถึงให้ลงทะเบียนในขณะนี้',
    'form.event_name': 'ชื่อกิจกรรม',
    'form.event_date': 'วันที่กิจกรรม',
    'form.venue': 'สถานที่',
    'form.max_players': 'ผู้เล่นสูงสุด',
    'form.shuttlecock_price': 'ราคาลูกขนไก่ (บาท)',
    'form.court_rate': 'ค่าเช่าสนาม (บาท/ชั่วโมง)',
    'form.courts': 'สนาม',
    'form.add_court': 'เพิ่มสนาม',
    'form.court_number': 'หมายเลขสนาม',
    'form.start_time': 'เวลาเริ่ม',
    'form.end_time': 'เวลาสิ้นสุด',
    'form.create_event': 'สร้างกิจกรรม',
    'form.cancel': 'ยกเลิก',
    'form.player_name': 'ชื่อของคุณ',
    'form.play_until': 'เล่นจนถึง',
    'form.register': 'ลงทะเบียน',
    'form.join_waitlist': 'เข้าคิว',
    'button.calculate_costs': 'คำนวณค่าใช้จ่าย',
    'status.full': 'เต็ม',
    'status.available': 'ว่าง',
    'status.waitlist': 'รายการรอ',
    'players.registered': 'ลงทะเบียน',
    'players.waitlist': 'รอ',
    'nav.login': 'เข้าสู่ระบบ',
    'nav.logout': 'ออกจากระบบ',
    'stats.total_players': 'ผู้เล่นทั้งหมด',
    'stats.courts_booked': 'สนามที่จอง',
    'matching.title': 'จับคู่ผู้เล่น',
    'matching.description': 'จับคู่ผู้เล่นตามระดับความสามารถ',
    'matching.skill_level': 'ระดับความสามารถ',
    'matching.beginner': 'ผู้เริ่มต้น',
    'matching.intermediate': 'ปานกลาง',
    'matching.advanced': 'ขั้นสูง',
    'matching.expert': 'ผู้เชียวชาญ',
    'matching.pair_players': 'จับคู่ผู้เล่น',
    'matching.auto_match': 'จับคู่อัตโนมัติ',
    'payment.title': 'การชำระเงิน',
    'payment.total_amount': 'ยอดรวม',
    'payment.per_player': 'ต่อคน',
    'payment.court_fee': 'ค่าสนาม',
    'payment.shuttlecock_fee': 'ค่าลูกขนไก่',
    'payment.fine': 'ค่าปรับ',
    'buttons.join_full_time': 'เข้าร่วมทันที (เวลาเต็ม)',
    'buttons.select_custom_time': 'เลือกเวลาเอง',
    'labels.auto_name_info': 'ระบบจะสุ่มชื่อให้อัตโนมัติ',
    'labels.select_play_time': 'กรุณาเลือกเวลาที่ต้องการเล่น',
    'payment.status': 'สถานะการชำระ',
    'payment.paid': 'ชำระแล้ว',
    'payment.pending': 'รอชำระ',
    'payment.mark_paid': 'ทำเครื่องหมายว่าชำระแล้ว',
    'payment.qr_code': 'QR Code สำหรับชำระเงิน'
  },
  en: {
    'app.title': 'Badminton Event Manager (BEM)',
    'app.subtitle': 'Manage your group play sessions with ease',
    'events.upcoming': 'Upcoming',
    'events.in_progress': 'In Progress',
    'events.calculating': 'Calculating',
    'events.awaiting_payment': 'Awaiting Payment',
    'events.completed': 'Completed',
    'events.total_players': 'Total Players',
    'events.courts_booked': 'Courts Booked',
    'events.create': 'Create Event',
    'events.management': 'Event Management',
    'registration': 'Player Registration',
    'events.no_events': 'No Events Yet',
    'events.no_events_desc': 'Create your first badminton event to get started!',
    'registration.no_events': 'No Events Available',
    'registration.no_events_desc': 'There are no upcoming events to register for at the moment.',
    'form.event_name': 'Event Name',
    'form.event_date': 'Event Date',
    'form.venue': 'Venue',
    'form.max_players': 'Max Players',
    'form.shuttlecock_price': 'Shuttlecock Price (THB)',
    'form.court_rate': 'Court Rate (THB/hour)',
    'form.courts': 'Courts',
    'form.add_court': 'Add Court',
    'form.court_number': 'Court Number',
    'form.start_time': 'Start Time',
    'form.end_time': 'End Time',
    'form.create_event': 'Create Event',
    'form.cancel': 'Cancel',
    'form.player_name': 'Your Name',
    'form.play_until': 'Play Until',
    'form.register': 'Register',
    'form.join_waitlist': 'Join Waitlist',
    'button.calculate_costs': 'Calculate Costs',
    'status.full': 'Full',
    'status.available': 'Available',
    'status.waitlist': 'waitlist',
    'players.registered': 'Registered',
    'players.waitlist': 'Waitlist',
    'nav.login': 'Login',
    'nav.logout': 'Logout',
    'stats.total_players': 'Total Players',
    'stats.courts_booked': 'Courts Booked',
    'matching.title': 'Player Matching',
    'matching.description': 'Match players by skill level',
    'matching.skill_level': 'Skill Level',
    'matching.beginner': 'Beginner',
    'matching.intermediate': 'Intermediate', 
    'matching.advanced': 'Advanced',
    'matching.expert': 'Expert',
    'matching.pair_players': 'Pair Players',
    'matching.auto_match': 'Auto Match',
    'payment.title': 'Payment',
    'payment.total_amount': 'Total Amount',
    'payment.per_player': 'Per Player',
    'payment.court_fee': 'Court Fee',
    'payment.shuttlecock_fee': 'Shuttlecock Fee',
    'payment.fine': 'Fine',
    'buttons.join_full_time': 'Join Immediately (Full Time)',
    'buttons.select_custom_time': 'Select Custom Time',
    'labels.auto_name_info': 'System will generate name automatically',
    'labels.select_play_time': 'Please select your play time',
    'payment.status': 'Payment Status',
    'payment.paid': 'Paid',
    'payment.pending': 'Pending',
    'payment.mark_paid': 'Mark as Paid',
    'payment.qr_code': 'QR Code for Payment'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('th');

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
