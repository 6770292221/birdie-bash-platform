
import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'th' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

const translations = {
  th: {
    'app.title': 'Birdie Bash',
    'app.subtitle': 'ระบบจัดการแบดมินตันครบวงจร: อีเวนต์ การลงทะเบียน และค่าใช้จ่าย',
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
    'payment.qr_code': 'QR Code สำหรับชำระเงิน',
    'error.time_required_title': '⏰ กรุณาเลือกเวลาเล่น',
    'error.time_required_guest': 'จำเป็นต้องระบุเวลาเริ่มและเวลาสิ้นสุดก่อนเพิ่มผู้เล่นแขกเข้าระบบ',
    'error.time_required_member': 'จำเป็นต้องระบุเวลาเริ่มและเวลาสิ้นสุดก่อนลงทะเบียนเข้าร่วมกิจกรรม',
    'hero.welcome': 'ยินดีต้อนรับสู่ Birdie Bash',
    'hero.description': 'แพลตฟอร์มจัดการอีเวนต์แบดมินตันครบวงจรสำหรับผู้จัดและผู้เล่น ดูแลการเปิดรับสมัคร การจัดการรายชื่อ และสรุปค่าใช้จ่ายได้ครบถ้วนในที่เดียว',
    'hero.login': 'เข้าสู่ระบบ',
    'hero.register': 'ลงทะเบียน',
    'features.create_events': 'สร้าง & จัดการอีเวนต์',
    'features.create_events_desc': 'ตั้งตาราง คอร์ท และจำนวนผู้เล่นได้ในไม่กี่ขั้นตอน',
    'features.easy_registration': 'ลงทะเบียนง่าย',
    'features.easy_registration_desc': 'ผู้เล่นลงชื่อ รอคิว และติดตามสถานะได้แบบเรียลไทม์',
    'features.cost_management': 'จัดการค่าใช้จ่าย',
    'features.cost_management_desc': 'สรุปค่าสนาม ค่าลูก และสถานะการชำระอย่างเป็นระบบ',
    'features.fair_matching': 'จับคู่เล่นอย่างยุติธรรม',
    'features.fair_matching_desc': 'ระบบ Matching แบ่งระดับฝีมือ ให้ทุกเกมดวลกันอย่างสูสีและสนุก',

    // Index page specific
    'index.overview': 'ภาพรวมอีเวนต์',
    'index.overview_desc': 'ข้อมูลสรุปจากอีเวนต์ทั้งหมดในระบบ แยกตามสถานะการดำเนินงาน',
    'index.loading_chart': 'กำลังโหลดข้อมูลกราฟ...',
    'index.no_data': 'ยังไม่มีข้อมูลอีเวนต์สำหรับสร้างกราฟ',
    'index.no_data_desc': 'สร้างอีเวนต์แรกของคุณเพื่อดูสถิติสวย ๆ ที่นี่',
    'index.all_events': 'อีเวนต์ทั้งหมด',
    'index.active_events': 'Active Events',
    'index.search_filters': 'ตัวกรองการค้นหา',
    'index.event_name_search': 'ชื่อกิจกรรม',
    'index.event_date': 'วันที่',
    'index.event_status': 'สถานะ',
    'index.all_status': 'ทั้งหมด',
    'index.clear_filters': 'ล้างตัวกรอง',
    'index.no_active_events': 'No active events',
    'index.details': 'รายละเอียด',
    'index.participants': 'ผู้เข้าร่วม',
    'index.location': 'สถานที่',
    'index.user_greeting': 'สวัสดี',

    // Navigation
    'nav.create_event': 'เพิ่มอีเวนต์ใหม่',
    'nav.create_event_desc': 'สร้างอีเวนต์ใหม่',
    'nav.match_players': 'จับคู่ผู้เล่น',
    'nav.match_players_desc': 'เลือกอีเวนต์จับคู่ผู้เล่น',
    'nav.calculate': 'คำนวณค่าใช้จ่าย',
    'nav.calculate_desc': 'เลือกอีเวนต์และคำนวณแบบ Mock',
    'nav.history': 'ประวัติ',
    'nav.history_desc': 'ดูประวัติอีเวนต์',
    'nav.payment': 'จ่ายเงิน',
    'nav.payment_desc': 'เลือกอีเวนต์เพื่อชำระเงิน',
    'nav.payment_history': 'ประวัติการจ่ายเงิน',
    'nav.payment_history_desc': 'ดูการชำระล่าสุด',
    'nav.activity_history': 'ประวัติกิจกรรม',
    'nav.activity_history_desc': 'ดูประวัติอีเวนต์',
    'nav.back_home': 'กลับหน้าหลัก',

    // History page
    'history.title': 'ประวัติอีเวนต์',
    'history.subtitle': 'ดูประวัติอีเวนต์ที่เสร็จสิ้นและยกเลิกแล้ว',
    'history.total': 'ทั้งหมด {count} อีเวนต์',
    'history.loading': 'กำลังโหลดประวัติ...',
    'history.empty_title': 'ยังไม่มีประวัติอีเวนต์',
    'history.empty_desc': 'เมื่อมีอีเวนต์ที่เสร็จสิ้นหรือยกเลิก จะแสดงที่นี่',
    'history.view_current': 'ดูอีเวนต์ปัจจุบัน',
    'history.view_details': 'ดูรายละเอียด',
    'history.location': 'สถานที่',
    'history.participants': 'ผู้เข้าร่วม',

    // Login/Register Forms
    'login.title': 'เข้าสู่ระบบ',
    'login.subtitle': 'เข้าสู่ระบบเพื่อจัดการแบดมินตันของคุณ',
    'login.email': 'อีเมล',
    'login.password': 'รหัสผ่าน',
    'login.logging_in': 'กำลังเข้าสู่ระบบ...',
    'login.no_account': 'ยังไม่มีบัญชี?',
    'login.register_link': 'ลงทะเบียน',
    'login.success': 'เข้าสู่ระบบสำเร็จ',
    'login.success_desc': 'ยินดีต้อนรับเข้าสู่ระบบจัดการแบดมินตัน',
    'login.failed': 'เข้าสู่ระบบไม่สำเร็จ',

    'register.title': 'ลงทะเบียน',
    'register.subtitle': 'สร้างบัญชีใหม่เพื่อเริ่มต้นการเล่นแบดมินตัน',
    'register.name': 'ชื่อ',
    'register.skill_level': 'ระดับความเชี่ยวชาญ',
    'register.phone': 'หมายเลขโทรศัพท์',
    'register.confirm_password': 'ยืนยันรหัสผ่าน',
    'register.registering': 'กำลังลงทะเบียน...',
    'register.have_account': 'มีบัญชีอยู่แล้ว?',
    'register.login_link': 'เข้าสู่ระบบ',
    'register.success': 'ลงทะเบียนสำเร็จ',
    'register.success_desc': 'สามารถเข้าสู่ระบบได้ทันที',
    'register.failed': 'ลงทะเบียนไม่สำเร็จ',

    // Success messages
    'success.registered': 'ลงทะเบียนเรียบร้อย',
    'success.registered_desc': 'ลงทะเบียนเข้าร่วมกิจกรรมเรียบร้อยแล้ว',
    'success.player_added': 'เพิ่มผู้เล่นสำเร็จ',
    'success.player_added_desc': 'เพิ่มผู้เล่นใหม่เรียบร้อยแล้ว',
    'success.player_cancelled': 'ยกเลิกเรียบร้อย',
    'success.player_cancelled_desc': 'ยกเลิกการเข้าร่วมเรียบร้อยแล้ว',
    'success.saved': 'บันทึกแล้ว',
    'success.saved_desc': 'บันทึกข้อมูลเรียบร้อยแล้ว',
    'success.event_deleted': 'ลบกิจกรรมแล้ว',
    'success.event_deleted_desc': 'ลบกิจกรรมออกจากระบบแล้ว',
    'success.payment_updated': 'อัปเดตการชำระเงินแล้ว',
    'success.payment_updated_desc': 'อัปเดตสถานะการชำระเงินเรียบร้อยแล้ว',

    // Skill levels
    'skill.beginner_0': '0 - มือเปาะแปะ (BG - Beginner)',
    'skill.beginner_1': '1 - มือหน้าบ้าน (BG - Beginner)',
    'skill.s_minus': '2 - มือ S- (เริ่มเข้าฟอร์มมาตรฐาน)',
    'skill.s': '3 - มือ S (ฟอร์มมาตรฐาน)',
    'skill.n': '4 - มือ N (ฟอร์มเท่นื่อขึ้น)',
    'skill.p_minus': '5 - มือ P- (ฟอร์มใกล้เคียงโค้ชทั่วไป)',
    'skill.p': '6 - มือ P (ฟอร์มโค้ชทั่วไป)',
    'skill.p_plus': '7 - มือ P+ (ฟอร์มนักกีฬาอภิวัฒน์/จังหวัด)',
    'skill.c': '8 - มือ C (ฟอร์มนักกีฬาเขต/เยาวชนทีมชาติ)',
    'skill.b': '9 - มือ B (ฟอร์มนักกีฬาทีมชาติระดับประเทศ)',
    'skill.a': '10 - มือ A (ฟอร์มนักกีฬาทีมชาติระดับนานาชาติ)',

    // Common UI
    'common.loading': 'กำลังโหลด...',
    'common.save': 'บันทึก',
    'common.cancel': 'ยกเลิก',
    'common.delete': 'ลบ',
    'common.edit': 'แก้ไข',
    'common.close': 'ปิด',
    'common.confirm': 'ยืนยัน',
    'common.search': 'ค้นหา',
    'common.select': 'เลือก',
    'common.required': 'จำเป็น',
    'common.optional': 'ไม่จำเป็น',
    'common.yes': 'ใช่',
    'common.no': 'ไม่',

    // Event statuses (detailed)
    'events.canceled': 'ยกเลิก',
    'events.status_upcoming': 'รอการชำระเงิน',

    // Validation messages
    'validation.required_name': 'กรุณากรอกชื่อ',
    'validation.min_name': 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร',
    'validation.required_skill': 'กรุณาเลือกระดับความเชี่ยวชาญ',
    'validation.required_email': 'กรุณากรอกอีเมล',
    'validation.invalid_email': 'รูปแบบอีเมลไม่ถูกต้อง',
    'validation.required_phone': 'กรุณากรอกหมายเลขโทรศัพท์',
    'validation.invalid_phone': 'หมายเลขโทรศัพท์ต้องเป็นตัวเลข 10 หลัก',
    'validation.required_password': 'กรุณากรอกรหัสผ่าน',
    'validation.min_password': 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
    'validation.required_confirm_password': 'กรุณายืนยันรหัสผ่าน',
    'validation.password_mismatch': 'รหัสผ่านไม่ตรงกัน',

    // Additional UI elements
    'admin_badge': 'Admin',
    'skill_level_badge': 'Level',
    'search_placeholder': 'ค้นหาชื่อกิจกรรม...',
    'date_placeholder': 'วันที่',
    'status_placeholder': 'เลือกสถานะ',
    'email_placeholder': 'example@email.com',
    'phone_placeholder': '0812345678',
    'password_placeholder': '••••••••',
    'name_placeholder': 'ชื่อของคุณ',
    'skill_placeholder': 'เลือกระดับความเชี่ยวชาญ',

    // EventDetail page
    'event.loading': 'กำลังโหลด...',
    'event.not_found': 'ไม่พบอีเวนต์',
    'event.edit': 'แก้ไข',
    'event.cancel': 'ยกเลิก',
    'event.delete': 'ลบ',
    'event.date': 'วันที่',
    'event.participants': 'ผู้เข้าร่วม',
    'event.court_rate': 'ค่าสนาม/ชม.',
    'event.shuttlecock': 'ลูกขนไก่',
    'event.hours': 'ชั่วโมง',
    'event.court_schedule': 'กำหนดการสนาม',
    'event.no_courts': 'ไม่มีข้อมูลสนาม',
    'event.court_number': 'สนาม #',
    'event.manage_players': 'จัดการผู้เล่น',
    'event.add_guest_player': 'เพิ่มผู้เล่นแขกเข้าร่วมกิจกรรม',
    'event.add_new_guest': 'เพิ่มผู้เล่นแขกใหม่',
    'event.player_name': 'ชื่อผู้เล่น',
    'event.phone_number': 'เบอร์โทรศัพท์',
    'event.start_time': 'เวลาเริ่มเล่น',
    'event.end_time': 'เวลาสิ้นสุดเล่น',
    'event.adding_player': 'กำลังเพิ่มผู้เล่น...',
    'event.add_guest': 'เพิ่มแขก',
    'event.registered_players': 'ผู้เล่นที่ลงทะเบียน',
    'event.people': 'คน',
    'event.no_registered_players': 'ไม่มีผู้เล่นที่ลงทะเบียน',
    'event.member': 'สมาชิक',
    'event.guest': 'แขก',
    'event.cancel_registration': 'ยกเลิก',
    'event.waitlist': 'รายชื่อสำรอง',
    'event.no_waitlist': 'ไม่มีรายชื่อสำรอง',
    'event.register_to_join': 'ลงทะเบียนเข้าร่วมกิจกรรม',
    'event.register_description': 'ลงทะเบียนเข้าร่วมเล่นแบดมินตัน',
    'event.already_registered': 'คุณลงทะเบียนแล้ว',
    'event.confirmed': 'ยืนยันการลงทะเบียน',
    'event.in_waitlist': 'อยู่ในรายชื่อสำรอง',
    'event.play_time': 'เวลาเล่น',
    'event.status': 'สถานะ',
    'event.canceling': 'กำลังยกเลิก...',
    'event.join_immediately': 'เข้าร่วมทันที (เต็มเวลา)',
    'event.select_custom_time': 'เลือกเวลาเอง',
    'event.auto_name_info': 'ระบบจะสุ่มชื่อให้อัตโนมัติ',
    'event.select_play_time_instruction': 'กรุณาเลือกเวลาที่ต้องการเล่น',
    'event.registering': 'กำลังลงทะเบียน กรุณารอ...',
    'event.register': 'ลงทะเบียน',
    'event.back_to_home': 'กลับหน้าหลัก',

    // TimePicker
    'timepicker.hour': 'ชั่วโมง',
    'timepicker.minute': 'นาที',

    // Badge labels
    'badge.hours': 'ชั่วโมง',
    'badge.players': 'คน',
    'badge.canceled': 'ยกเลิก',
    'badge.estimated': 'ประมาณ',
    'badge.cannot_calculate': 'คำนวณไม่ได้',
    'badge.waitlist_open': 'เปิดสำรอง',
    'badge.waitlist_closed': 'ปิดสำรอง',

    // Placeholders
    'placeholder.player_name': 'กรุณาระบุชื่อผู้เล่น',
    'placeholder.phone_number': '0812345678',

    // Chart statistics
    'chart.percentage_of_total': 'คิดเป็น {percentage}% ของทั้งหมด',

    // History page
    'history.fetch_failed': 'ดึงประวัติไม่สำเร็จ',
    'history.fetch_error': 'ไม่สามารถดึงข้อมูลประวัติได้',
    'history.your_play_time': 'เวลาเล่นของคุณ',

    // Activity History page
    'activity.title': 'ประวัติกิจกรรมของฉัน',
    'activity.subtitle': 'ดูประวัติการเข้าร่วมกิจกรรมแบดมินตันของคุณ',
    'activity.total': 'ทั้งหมด {count} กิจกรรม',
    'activity.empty_title': 'ยังไม่มีประวัติกิจกรรม',
    'activity.empty_desc': 'คุณยังไม่ได้เข้าร่วมกิจกรรมใด ๆ',

    // Admin interface
    'admin.player_added': 'เพิ่มผู้เล่นแล้ว',
    'admin.player_added_desc': 'เพิ่ม {name} เข้ากิจกรรมแล้ว',
    'admin.player_removed': 'ลบผู้เล่นแล้ว',
    'admin.player_removed_desc': 'ลบ {name} ออกจากกิจกรรมแล้ว',
    'admin.cost_calculation_complete': 'คำนวณค่าใช้จ่ายเสร็จแล้ว',
    'admin.cost_calculation_desc': 'ค่าใช้จ่ายรวม: ฿{total}',
    'admin.event_updated': 'อัปเดตกิจกรรมแล้ว',
    'admin.event_updated_desc': 'บันทึกข้อมูลคอร์ตและลูกขนไก่เรียบร้อยแล้ว',
    'admin.players_updated': 'อัปเดตผู้เล่นแล้ว',
    'admin.players_updated_desc': 'บันทึกข้อมูลผู้เล่นเรียบร้อยแล้ว',
    'admin.player_times_updated': 'อัปเดตเวลาผู้เล่นแล้ว',
    'admin.player_times_updated_desc': 'อัปเดตเวลาเริ่มต้นและสิ้นสุดของผู้เล่นเรียบร้อยแล้ว',
    'admin.payment_confirmed': 'ยืนยันการชำระเงินแล้ว',
    'admin.payment_status_updated': 'อัปเดตสถานะการชำระเงินแล้ว',
    'admin.payment_status_desc': '{name} ถูกทำเครื่องหมายเป็น {status}',
    'admin.payment_status_paid': 'ชำระแล้ว',
    'admin.payment_status_unpaid': 'ยังไม่ชำระ',
    'admin.all_payments_confirmed': 'ยืนยันการชำระเงินทั้งหมดแล้ว',
    'admin.all_payments_confirmed_desc': 'ทำเครื่องหมายผู้เล่นทุกคนเป็นชำระแล้ว',

    // Create event
    'create_event.success': 'สร้างอีเวนต์สำเร็จ',
    'create_event.success_desc': 'บันทึกข้อมูลเรียบร้อย',
    'create_event.failed': 'สร้างอีเวนต์ไม่สำเร็จ',
    'create_event.failed_desc': 'เกิดข้อผิดพลาด',
    'activity.browse_events': 'เรียกดูกิจกรรม',
    'activity.location': 'สถานที่',
    'activity.play_time': 'เวลาเล่นของคุณ',
    'activity.registration_type': 'ประเภทการลงทะเบียน',
    'activity.view_event': 'ดูรายละเอียด',

    // Common
    'common.error': 'เกิดข้อผิดพลาด',

    // Loading messages
    'loading.cancelling_registration': 'กำลังยกเลิกการลงทะเบียน',
    'loading.please_wait': 'กรุณารอสักครู่',
    'loading.page_will_refresh': 'หน้าเว็บจะรีเฟรชหลังเสร็จสิ้น',
    'loading.registering_player': 'กำลังลงทะเบียนผู้เล่น',
    'loading.saving_registration_data': 'กำลังบันทึกข้อมูลการลงทะเบียน',
    'loading.list_will_update_automatically': 'รายชื่อจะอัปเดตอัตโนมัติ',
    'loading.adding_guest_player': 'กำลังเพิ่มผู้เล่นแขก',
    'loading.saving_guest_data': 'กำลังบันทึกข้อมูลแขก',
    'loading.player_list_will_update': 'รายชื่อผู้เล่นจะอัปเดต',

    // Error messages
    'error.registration_failed': 'การลงทะเบียนไม่สำเร็จ',
    'error.registration_failed_desc': 'การลงทะเบียนล้มเหลว กรุณาลองใหม่อีกครั้ง',
    'error.load_event_failed': 'โหลดข้อมูลอีเวนต์ไม่สำเร็จ',
    'error.load_event_failed_desc': 'ไม่สามารถโหลดข้อมูลกิจกรรมได้ กรุณาลองใหม่',
    'error.save_failed': 'บันทึกข้อมูลไม่สำเร็จ',
    'error.save_failed_desc': 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่',
    'error.delete_event_failed': 'ลบอีเวนต์ไม่สำเร็จ',
    'error.delete_event_failed_desc': 'ไม่สามารถลบกิจกรรมได้ กรุณาลองใหม่',
    'error.add_player_failed': 'เพิ่มผู้เล่นไม่สำเร็จ',
    'error.cancel_player_failed': 'ยกเลิกผู้เล่นไม่สำเร็จ',
    'error.payment_update_failed': 'อัปเดตการชำระเงินไม่สำเร็จ',
    'error.payment_update_failed_desc': 'ไม่สามารถอัปเดตสถานะการชำระเงินได้',
    'error.unknown': 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ',

    // User registration status
    'user.already_registered': 'คุณลงทะเบียนแล้ว',
    'user.confirmed_status': 'ยืนยันแล้ว',
    'user.waitlist_status': 'รอสำรอง',
    'user.confirmed_registration': 'ยืนยันการลงทะเบียน',
    'user.on_waitlist': 'อยู่ในรายชื่อสำรอง',
    'user.play_time_display': 'เวลาเล่น',
    'user.status_display': 'สถานะ',
    'user.select_play_time': 'เลือกเวลาเล่น',
    'user.player_list': 'รายชื่อผู้เล่น',
    'user.view_participants': 'ดูรายชื่อผู้เข้าร่วมกิจกรรม',
    'user.you_badge': 'คุณ',
    'user.member_badge': 'สมาชิก',
    'user.guest_badge': 'แขก',
    'user.no_name_display': 'ไม่ระบุชื่อ',

    // Registration closed messages for users
    'user.registration_closed_calculating': 'ปิดรับลงทะเบียนแล้ว - กำลังคำนวณผล',
    'user.registration_closed_awaiting_payment': 'ปิดรับลงทะเบียนแล้ว - รอการชำระเงิน',
    'user.registration_closed_completed': 'ปิดรับลงทะเบียนแล้ว - กิจกรรมเสร็จสิ้น',
    'user.registration_closed_canceled': 'ปิดรับลงทะเบียนแล้ว - กิจกรรมยกเลิก',
    'user.registration_closed_in_progress': 'ปิดรับลงทะเบียนแล้ว - กิจกรรมกำลังดำเนินการ',
    'user.registration_closed_calculating_desc': 'กิจกรรมนี้กำลังคำนวณผลลัพธ์ ไม่สามารถลงทะเบียนได้แล้ว',
    'user.registration_closed_awaiting_payment_desc': 'กิจกรรมนี้รอการยืนยันการชำระเงิน ไม่สามารถลงทะเบียนได้แล้ว',
    'user.registration_closed_completed_desc': 'กิจกรรมนี้เสร็จสิ้นแล้ว ไม่สามารถลงทะเบียนได้แล้ว',
    'user.registration_closed_canceled_desc': 'กิจกรรมนี้ถูกยกเลิก ไม่สามารถลงทะเบียนได้แล้ว',
    'user.registration_closed_in_progress_desc': 'กิจกรรมนี้กำลังดำเนินการอยู่ ไม่สามารถลงทะเบียนได้แล้ว',

    // Registration closed messages for guests
    'guest.registration_closed_calculating': 'ปิดรับแขกแล้ว - กำลังคำนวณผล',
    'guest.registration_closed_awaiting_payment': 'ปิดรับแขกแล้ว - รอการชำระเงิน',
    'guest.registration_closed_completed': 'ปิดรับแขกแล้ว - กิจกรรมเสร็จสิ้น',
    'guest.registration_closed_canceled': 'ปิดรับแขกแล้ว - กิจกรรมยกเลิก',
    'guest.registration_closed_in_progress': 'ปิดรับแขกแล้ว - กิจกรรมกำลังดำเนินการ',
    'guest.registration_closed_calculating_desc': 'กิจกรรมนี้กำลังคำนวณผลลัพธ์ ไม่สามารถเพิ่มแขกได้แล้ว',
    'guest.registration_closed_awaiting_payment_desc': 'กิจกรรมนี้รอการยืนยันการชำระเงิน ไม่สามารถเพิ่มแขกได้แล้ว',
    'guest.registration_closed_completed_desc': 'กิจกรรมนี้เสร็จสิ้นแล้ว ไม่สามารถเพิ่มแขกได้แล้ว',
    'guest.registration_closed_canceled_desc': 'กิจกรรมนี้ถูกยกเลิก ไม่สามารถเพิ่มแขกได้แล้ว',
    'guest.registration_closed_in_progress_desc': 'กิจกรรมนี้กำลังดำเนินการอยู่ ไม่สามารถเพิ่มแขกได้แล้ว',

    // Form validation messages
    'validation.required_event_name': 'กรุณากรอกชื่ออีเวนต์',
    'validation.required_event_date': 'กรุณาเลือกวันที่จัดงาน',
    'validation.required_venue': 'กรุณาเลือกสถานที่เล่นแบดมินตัน',
    'validation.required_court': 'กรุณาเพิ่มอย่างน้อย 1 สนาม',
    'validation.positive_shuttlecock_price': 'ราคาลูกแบดต้องไม่ติดลบ',

    // Form elements
    'form.loading_venues': 'กำลังโหลดสถานที่...',
    'form.select_venue': 'เลือกสถานที่เล่นแบดมินตัน',
    'form.no_venues_found': 'ไม่พบสถานที่',
    'form.enable_waitlist': 'เปิดรับ Waitlist (คิวสำรอง)',
    'form.update_event': 'อัพเดทอีเวนต์',

    // Events
    'events.edit': 'แก้ไขอีเวนต์',
    'events.edit_description': 'แก้ไขข้อมูลอีเวนต์'
  },
  en: {
    'app.title': 'Birdie Bash',
    'app.subtitle': 'All-in-one badminton events, registration, and costs',
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
    'payment.qr_code': 'QR Code for Payment',
    'error.time_required_title': '⏰ Please Select Play Time',
    'error.time_required_guest': 'Start time and end time are required before adding a guest player to the system',
    'error.time_required_member': 'Start time and end time are required before registering for the event',
    'hero.welcome': 'Welcome to Birdie Bash',
    'hero.description': 'Complete badminton event management platform for organizers and players. Handle registration, player management, and cost calculations all in one place.',
    'hero.login': 'Login',
    'hero.register': 'Register',
    'features.create_events': 'Create & Manage Events',
    'features.create_events_desc': 'Set schedules, courts, and player limits in just a few steps',
    'features.easy_registration': 'Easy Registration',
    'features.easy_registration_desc': 'Players can register, join queues, and track status in real-time',
    'features.cost_management': 'Cost Management',
    'features.cost_management_desc': 'Systematically manage court fees, shuttlecock costs, and payment status',
    'features.fair_matching': 'Fair Player Matching',
    'features.fair_matching_desc': 'Skill-based matching system ensures competitive and fun games for everyone',

    // Index page specific
    'index.overview': 'Event Overview',
    'index.overview_desc': 'Summary data from all events in the system, organized by status',
    'index.loading_chart': 'Loading chart data...',
    'index.no_data': 'No event data available for chart',
    'index.no_data_desc': 'Create your first event to see beautiful statistics here',
    'index.all_events': 'All Events',
    'index.active_events': 'Active Events',
    'index.search_filters': 'Search Filters',
    'index.event_name_search': 'Event Name',
    'index.event_date': 'Date',
    'index.event_status': 'Status',
    'index.all_status': 'All',
    'index.clear_filters': 'Clear Filters',
    'index.no_active_events': 'No active events',
    'index.details': 'Details',
    'index.participants': 'Participants',
    'index.location': 'Location',
    'index.user_greeting': 'Hello',

    // Navigation
    'nav.create_event': 'Add New Event',
    'nav.create_event_desc': 'Create new event',
    'nav.match_players': 'Match Players',
    'nav.match_players_desc': 'Select event to match players',
    'nav.calculate': 'Calculate Costs',
    'nav.calculate_desc': 'Select event and mock calculate',
    'nav.history': 'History',
    'nav.history_desc': 'View event history',
    'nav.payment': 'Payment',
    'nav.payment_desc': 'Select event to pay',
    'nav.payment_history': 'Payment History',
    'nav.payment_history_desc': 'View recent payments',
    'nav.activity_history': 'Activity History',
    'nav.activity_history_desc': 'View event history',
    'nav.back_home': 'Back to Home',

    // History page
    'history.title': 'Event History',
    'history.subtitle': 'Review completed and canceled events',
    'history.total': '{count} events in total',
    'history.loading': 'Loading history...',
    'history.empty_title': 'No event history yet',
    'history.empty_desc': 'Completed or canceled events will appear here once available.',
    'history.view_current': 'View current events',
    'history.view_details': 'View details',
    'history.location': 'Location',
    'history.participants': 'Participants',

    // Login/Register Forms
    'login.title': 'Login',
    'login.subtitle': 'Sign in to manage your badminton activities',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.logging_in': 'Signing in...',
    'login.no_account': "Don't have an account?",
    'login.register_link': 'Register',
    'login.success': 'Login Successful',
    'login.success_desc': 'Welcome to the badminton management system',
    'login.failed': 'Login Failed',

    'register.title': 'Register',
    'register.subtitle': 'Create a new account to start playing badminton',
    'register.name': 'Name',
    'register.skill_level': 'Skill Level',
    'register.phone': 'Phone Number',
    'register.confirm_password': 'Confirm Password',
    'register.registering': 'Registering...',
    'register.have_account': 'Already have an account?',
    'register.login_link': 'Login',
    'register.success': 'Registration Successful',
    'register.success_desc': 'You can login immediately',
    'register.failed': 'Registration Failed',

    // Success messages
    'success.registered': 'Registration Successful',
    'success.registered_desc': 'Successfully registered for the event',
    'success.player_added': 'Player Added Successfully',
    'success.player_added_desc': 'New player has been added successfully',
    'success.player_cancelled': 'Cancellation Successful',
    'success.player_cancelled_desc': 'Successfully cancelled participation',
    'success.saved': 'Saved',
    'success.saved_desc': 'Data saved successfully',
    'success.event_deleted': 'Event Deleted',

    // Skill levels
    'skill.beginner_0': '0 - Absolute Beginner (BG)',
    'skill.beginner_1': '1 - Beginner (BG)',
    'skill.s_minus': '2 - S- Level (Basic Form)',
    'skill.s': '3 - S Level (Standard Form)',
    'skill.n': '4 - N Level (Improved Form)',
    'skill.p_minus': '5 - P- Level (Near Coach Level)',
    'skill.p': '6 - P Level (Coach Level)',
    'skill.p_plus': '7 - P+ Level (Provincial Athlete)',
    'skill.c': '8 - C Level (Regional/Youth National Team)',
    'skill.b': '9 - B Level (National Team)',
    'skill.a': '10 - A Level (International Team)',

    // Common UI
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.search': 'Search',
    'common.select': 'Select',
    'common.required': 'Required',
    'common.optional': 'Optional',
    'common.yes': 'Yes',
    'common.no': 'No',

    // Event statuses (detailed)
    'events.canceled': 'Canceled',
    'events.status_upcoming': 'Awaiting Payment',

    // Validation messages
    'validation.required_name': 'Please enter your name',
    'validation.min_name': 'Name must be at least 2 characters',
    'validation.required_skill': 'Please select skill level',
    'validation.required_email': 'Please enter email',
    'validation.invalid_email': 'Invalid email format',
    'validation.required_phone': 'Please enter phone number',
    'validation.invalid_phone': 'Phone number must be 10 digits',
    'validation.required_password': 'Please enter password',
    'validation.min_password': 'Password must be at least 6 characters',
    'validation.required_confirm_password': 'Please confirm password',
    'validation.password_mismatch': 'Passwords do not match',

    // Additional UI elements
    'admin_badge': 'Admin',
    'skill_level_badge': 'Level',
    'search_placeholder': 'Search event name...',
    'date_placeholder': 'Date',
    'status_placeholder': 'Select status',
    'email_placeholder': 'example@email.com',
    'phone_placeholder': '0812345678',
    'password_placeholder': '••••••••',
    'name_placeholder': 'Your name',
    'skill_placeholder': 'Select skill level',

    // EventDetail page
    'event.loading': 'Loading...',
    'event.not_found': 'Event not found',
    'event.edit': 'Edit',
    'event.cancel': 'Cancel',
    'event.delete': 'Delete',
    'event.date': 'Date',
    'event.participants': 'Participants',
    'event.court_rate': 'Court Rate/hr',
    'event.shuttlecock': 'Shuttlecock',
    'event.hours': 'Hours',
    'event.court_schedule': 'Court Schedule',
    'event.no_courts': 'No court data',
    'event.court_number': 'Court #',
    'event.manage_players': 'Manage Players',
    'event.add_guest_player': 'Add guest players to the event',
    'event.add_new_guest': 'Add New Guest Player',
    'event.player_name': 'Player Name',
    'event.phone_number': 'Phone Number',
    'event.start_time': 'Start Time',
    'event.end_time': 'End Time',
    'event.adding_player': 'Adding player...',
    'event.add_guest': 'Add Guest',
    'event.registered_players': 'Registered Players',
    'event.people': 'People',
    'event.no_registered_players': 'No registered players',
    'event.member': 'Member',
    'event.guest': 'Guest',
    'event.cancel_registration': 'Cancel',
    'event.waitlist': 'Waitlist',
    'event.no_waitlist': 'No waitlist',
    'event.register_to_join': 'Register for Event',
    'event.register_description': 'Register to join badminton event',
    'event.already_registered': 'You are registered',
    'event.confirmed': 'Registration Confirmed',
    'event.in_waitlist': 'On Waitlist',
    'event.play_time': 'Play Time',
    'event.status': 'Status',
    'event.canceling': 'Canceling...',
    'event.join_immediately': 'Join Immediately (Full Time)',
    'event.select_custom_time': 'Select Custom Time',
    'event.auto_name_info': 'System will generate name automatically',
    'event.select_play_time_instruction': 'Please select your play time',
    'event.registering': 'Registering, please wait...',
    'event.register': 'Register',
    'event.back_to_home': 'Back to Home',

    // TimePicker
    'timepicker.hour': 'Hour',
    'timepicker.minute': 'Minute',

    // Badge labels
    'badge.hours': 'Hours',
    'badge.players': 'People',
    'badge.canceled': 'Cancel',
    'badge.estimated': 'Est.',
    'badge.cannot_calculate': 'Cannot calculate',
    'badge.waitlist_open': 'Waitlist Open',
    'badge.waitlist_closed': 'Waitlist Closed',

    // Placeholders
    'placeholder.player_name': 'Please enter player name',
    'placeholder.phone_number': '0812345678',

    // Chart statistics
    'chart.percentage_of_total': '{percentage}% of total',

    // History page
    'history.fetch_failed': 'Failed to fetch history',
    'history.fetch_error': 'Unable to retrieve history data',
    'history.your_play_time': 'Your Play Time',

    // Activity History page
    'activity.title': 'My Activity History',
    'activity.subtitle': 'View your badminton activity participation history',
    'activity.total': 'Total {count} activities',
    'activity.empty_title': 'No Activity History',
    'activity.empty_desc': 'You haven\'t participated in any activities yet',
    'activity.browse_events': 'Browse Events',
    'activity.location': 'Location',
    'activity.play_time': 'Your Play Time',
    'activity.registration_type': 'Registration Type',
    'activity.view_event': 'View Details',

    // Common
    'common.error': 'Error occurred',

    // Loading messages
    'loading.cancelling_registration': 'Cancelling Registration',
    'loading.please_wait': 'Please wait',
    'loading.page_will_refresh': 'Page will refresh when complete',
    'loading.registering_player': 'Registering Player',
    'loading.saving_registration_data': 'Saving Registration Data',
    'loading.list_will_update_automatically': 'List will update automatically',
    'loading.adding_guest_player': 'Adding Guest Player',
    'loading.saving_guest_data': 'Saving Guest Data',
    'loading.player_list_will_update': 'Player List Will Update',

    // Error messages
    'error.registration_failed': 'Registration Failed',
    'error.registration_failed_desc': 'Registration failed, please try again',
    'error.load_event_failed': 'Failed to Load Event',
    'error.save_failed': 'Save Failed',
    'error.delete_event_failed': 'Failed to Delete Event',
    'error.add_player_failed': 'Failed to Add Player',
    'error.cancel_player_failed': 'Failed to Cancel Player',
    'error.unknown': 'Unknown Error',

    // User registration status
    'user.already_registered': 'You are registered',
    'user.confirmed_status': 'Confirmed',
    'user.waitlist_status': 'Waitlist',
    'user.confirmed_registration': 'Registration Confirmed',
    'user.on_waitlist': 'On Waitlist',
    'user.play_time_display': 'Play Time',
    'user.status_display': 'Status',
    'user.select_play_time': 'Select Play Time',
    'user.player_list': 'Player List',
    'user.view_participants': 'View event participants',
    'user.you_badge': 'You',
    'user.member_badge': 'Member',
    'user.guest_badge': 'Guest',
    'user.no_name_display': 'No name specified',

    // Registration closed messages for users
    'user.registration_closed_calculating': 'Registration Closed - Calculating Results',
    'user.registration_closed_awaiting_payment': 'Registration Closed - Awaiting Payment',
    'user.registration_closed_completed': 'Registration Closed - Event Completed',
    'user.registration_closed_canceled': 'Registration Closed - Event Canceled',
    'user.registration_closed_in_progress': 'Registration Closed - Event In Progress',
    'user.registration_closed_calculating_desc': 'This event is currently calculating results. Registration is no longer available.',
    'user.registration_closed_awaiting_payment_desc': 'This event is awaiting payment confirmation. Registration is no longer available.',
    'user.registration_closed_completed_desc': 'This event has been completed. Registration is no longer available.',
    'user.registration_closed_canceled_desc': 'This event has been canceled. Registration is no longer available.',
    'user.registration_closed_in_progress_desc': 'This event is currently in progress. Registration is no longer available.',

    // Registration closed messages for guests
    'guest.registration_closed_calculating': 'Guest Registration Closed - Calculating Results',
    'guest.registration_closed_awaiting_payment': 'Guest Registration Closed - Awaiting Payment',
    'guest.registration_closed_completed': 'Guest Registration Closed - Event Completed',
    'guest.registration_closed_canceled': 'Guest Registration Closed - Event Canceled',
    'guest.registration_closed_in_progress': 'Guest Registration Closed - Event In Progress',
    'guest.registration_closed_calculating_desc': 'This event is currently calculating results. Adding guests is no longer available.',
    'guest.registration_closed_awaiting_payment_desc': 'This event is awaiting payment confirmation. Adding guests is no longer available.',
    'guest.registration_closed_completed_desc': 'This event has been completed. Adding guests is no longer available.',
    'guest.registration_closed_canceled_desc': 'This event has been canceled. Adding guests is no longer available.',
    'guest.registration_closed_in_progress_desc': 'This event is currently in progress. Adding guests is no longer available.',

    // Form validation messages
    'validation.required_event_name': 'Please enter event name',
    'validation.required_event_date': 'Please select event date',
    'validation.required_venue': 'Please select a badminton venue',
    'validation.required_court': 'Please add at least 1 court',
    'validation.positive_shuttlecock_price': 'Shuttlecock price must be positive',

    // Form elements
    'form.loading_venues': 'Loading venues...',
    'form.select_venue': 'Select a badminton venue',
    'form.no_venues_found': 'No venues found',
    'form.enable_waitlist': 'Enable Waitlist (Queue)',
    'form.update_event': 'Update Event',

    // Events
    'events.edit': 'Edit Event',
    'events.edit_description': 'Edit event information',

    // Create event
    'create_event.success': 'Event Created Successfully',
    'create_event.success_desc': 'Data saved successfully',
    'create_event.failed': 'Failed to Create Event',
    'create_event.failed_desc': 'An error occurred',

    // Admin interface
    'admin.player_added': 'Player Added',
    'admin.player_added_desc': 'Added {name} to the event',
    'admin.player_removed': 'Player Removed',
    'admin.player_removed_desc': 'Removed {name} from the event',
    'admin.cost_calculation_complete': 'Cost Calculation Complete',
    'admin.cost_calculation_desc': 'Total cost: ฿{total}',
    'admin.event_updated': 'Event Updated',
    'admin.event_updated_desc': 'Court usage and shuttlecock count saved successfully',
    'admin.players_updated': 'Players Updated',
    'admin.players_updated_desc': 'Player information saved successfully',
    'admin.player_times_updated': 'Player Times Updated',
    'admin.player_times_updated_desc': 'Player start and end times updated successfully',
    'admin.payment_confirmed': 'Payment Confirmed',
    'admin.payment_status_updated': 'Payment Status Updated',
    'admin.payment_status_desc': '{name} marked as {status}',
    'admin.payment_status_paid': 'paid',
    'admin.payment_status_unpaid': 'unpaid',
    'admin.all_payments_confirmed': 'All Payments Confirmed',
    'admin.all_payments_confirmed_desc': 'All players marked as paid'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Cookie helper functions
const LANGUAGE_COOKIE_KEY = 'birdie-bash-language';

const getCookieLanguage = (): Language => {
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    const languageCookie = cookies.find(cookie =>
      cookie.trim().startsWith(`${LANGUAGE_COOKIE_KEY}=`)
    );
    if (languageCookie) {
      const value = languageCookie.split('=')[1];
      if (value === 'th' || value === 'en') {
        return value as Language;
      }
    }
  }
  return 'en'; // default
};

const setCookieLanguage = (language: Language) => {
  if (typeof document !== 'undefined') {
    // Set cookie to expire in 1 year
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `${LANGUAGE_COOKIE_KEY}=${language}; expires=${expires.toUTCString()}; path=/`;
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => getCookieLanguage());

  const handleSetLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    setCookieLanguage(newLanguage);
  };

  const t = (key: string, variables?: Record<string, string | number>): string => {
    let text = translations[language][key] || key;

    if (variables) {
      Object.entries(variables).forEach(([varKey, value]) => {
        text = text.replace(`{${varKey}}`, String(value));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
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
