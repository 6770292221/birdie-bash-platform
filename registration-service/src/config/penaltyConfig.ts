export interface PenaltyConfig {
  penaltyHoursBeforeEvent: number;
  penaltyAmount: number;
  penaltyPercentage?: number;
}

export const DEFAULT_PENALTY_CONFIG: PenaltyConfig = {
  penaltyHoursBeforeEvent: 1, // Cancel ก่อน 1 ชั่วโมง จะมีค่าปรับ
  penaltyAmount: 50, // ค่าปรับ 50 บาท (ถ้าใช้ fixed amount)
  penaltyPercentage: 10, // หรือ 10% ของค่าลงทะเบียน
};

export function getPenaltyConfig(): PenaltyConfig {
  return {
    penaltyHoursBeforeEvent: Number(process.env.PENALTY_HOURS_BEFORE_EVENT) || DEFAULT_PENALTY_CONFIG.penaltyHoursBeforeEvent,
    penaltyAmount: Number(process.env.PENALTY_AMOUNT) || DEFAULT_PENALTY_CONFIG.penaltyAmount,
    penaltyPercentage: Number(process.env.PENALTY_PERCENTAGE) || DEFAULT_PENALTY_CONFIG.penaltyPercentage,
  };
}

export function shouldApplyPenalty(eventDate: Date, eventStartTime: string, cancelTime: Date = new Date()): boolean {
  const config = getPenaltyConfig();

  // แปลง eventDate และ eventStartTime เป็น timestamp
  const eventDateTime = new Date(eventDate);
  const [hours, minutes] = eventStartTime.split(':').map(Number);
  eventDateTime.setHours(hours, minutes, 0, 0);

  // คำนวณระยะห่างระหว่างเวลายกเลิกกับเวลาเริ่ม event
  const timeDiffMs = eventDateTime.getTime() - cancelTime.getTime();
  const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

  // ถ้ายกเลิกก่อนเวลาที่กำหนดใน config จะมีค่าปรับ
  return timeDiffHours <= config.penaltyHoursBeforeEvent;
}