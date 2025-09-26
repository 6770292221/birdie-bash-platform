export interface PlayerSession {
  playerId: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  status: 'played' | 'canceled' | 'waitlist' | 'absent';
  role: 'member' | 'admin' | 'guest';
  name?: string;     // For guest players
  phoneNumber?: string; // For guest players
}

export interface CourtSession {
  courtNumber: number;
  startTime: string;
  endTime: string;
  hourlyRate: number;
}

export interface EventCosts {
  shuttlecockPrice: number;
  shuttlecockCount: number;
  penaltyFee: number; // ค่าปรับสำหรับคนไม่มา
}

export interface PlayerSettlement {
  playerId: string;
  courtFee: number;
  shuttlecockFee: number;
  penaltyFee: number;
  totalAmount: number;
  breakdown: {
    hoursPlayed: number;
    courtSessions: Array<{
      hour: string;
      playersInSession: number;
      costPerPlayer: number;
    }>;
  };
}

export class SettlementCalculator {
  /**
   * คำนวณการแบ่งค่าใช้จ่ายตาม requirement
   */
  calculateSettlements(
    players: PlayerSession[],
    courts: CourtSession[],
    costs: EventCosts
  ): PlayerSettlement[] {
    const settlements: PlayerSettlement[] = [];

    // Filter out waitlist players - they don't need to be processed
    const processablePlayers = players.filter(p => p.status !== 'waitlist');
    const playedPlayers = processablePlayers.filter(p => p.status === 'played');
    const absentPlayers = processablePlayers.filter(p => p.status === 'absent');

    // สร้าง time slots สำหรับคำนวณ (แบ่งเป็นชั่วโมง)
    const timeSlots = this.generateTimeSlots(courts);

    for (const player of processablePlayers) {
      const settlement: PlayerSettlement = {
        playerId: player.playerId,
        courtFee: 0,
        shuttlecockFee: 0,
        penaltyFee: 0,
        totalAmount: 0,
        breakdown: {
          hoursPlayed: 0,
          courtSessions: []
        }
      };

      if (player.status === 'absent') {
        // คนที่ไม่มา - เก็บค่าปรับ
        settlement.penaltyFee = costs.penaltyFee;
      } else if (player.status === 'played') {
        // คนที่มาเล่น
        const playerHours = this.getPlayerHours(player.startTime, player.endTime);
        settlement.breakdown.hoursPlayed = playerHours.length;

        // คำนวณค่าสนามสำหรับแต่ละชั่วโมง
        for (const hour of playerHours) {
          const playersInHour = this.getPlayersInTimeSlot(playedPlayers, hour);
          const courtCostForHour = this.getCourtCostForTimeSlot(courts, hour);
          const costPerPlayer = courtCostForHour / playersInHour.length;

          settlement.courtFee += costPerPlayer;
          settlement.breakdown.courtSessions.push({
            hour,
            playersInSession: playersInHour.length,
            costPerPlayer
          });
        }

        // คำนวณค่าลูกขนไก่ (แบ่งเฉพาะคนที่เล่น)
        const totalShuttlecockCost = costs.shuttlecockPrice * costs.shuttlecockCount;
        settlement.shuttlecockFee = totalShuttlecockCost / playedPlayers.length;
      } else if (player.status === 'canceled') {
        // คนที่ยกเลิก - ไม่เสียค่าใช้จ่ายใด ๆ (ไม่มี penalty fee)
        // settlement fees remain 0
      }

      settlement.totalAmount = settlement.courtFee + settlement.shuttlecockFee + settlement.penaltyFee;
      settlements.push(settlement);
    }

    return settlements;
  }

  private generateTimeSlots(courts: CourtSession[]): string[] {
    const slots = new Set<string>();

    for (const court of courts) {
      const startHour = parseInt(court.startTime.split(':')[0]);
      const endHour = parseInt(court.endTime.split(':')[0]);

      for (let hour = startHour; hour < endHour; hour++) {
        slots.add(`${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`);
      }
    }

    return Array.from(slots).sort();
  }

  private getPlayerHours(startTime: string, endTime: string): string[] {
    const [startHourStr, startMinStr] = startTime.split(':');
    const [endHourStr, endMinStr] = endTime.split(':');

    const startHour = parseInt(startHourStr);
    const startMin = parseInt(startMinStr);
    const endHour = parseInt(endHourStr);
    const endMin = parseInt(endMinStr);

    // Convert to minutes for easier calculation
    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;

    const hours: string[] = [];

    // If the session is within the same hour (like 01:00-01:30)
    if (startHour === endHour) {
      // Still count as playing for that hour slot
      hours.push(`${startHour.toString().padStart(2, '0')}:00-${(startHour + 1).toString().padStart(2, '0')}:00`);
    } else {
      // Multi-hour sessions
      for (let hour = startHour; hour < endHour; hour++) {
        hours.push(`${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`);
      }

      // Add final hour if session extends into it
      if (endMin > 0) {
        hours.push(`${endHour.toString().padStart(2, '0')}:00-${(endHour + 1).toString().padStart(2, '0')}:00`);
      }
    }

    return hours;
  }

  private getPlayersInTimeSlot(players: PlayerSession[], timeSlot: string): PlayerSession[] {
    const [slotStart, slotEnd] = timeSlot.split('-');
    const slotStartHour = parseInt(slotStart.split(':')[0]);
    const slotEndHour = parseInt(slotEnd.split(':')[0]);

    return players.filter(player => {
      const [playerStartHourStr, playerStartMinStr] = player.startTime.split(':');
      const [playerEndHourStr, playerEndMinStr] = player.endTime.split(':');

      const playerStartHour = parseInt(playerStartHourStr);
      const playerStartMin = parseInt(playerStartMinStr);
      const playerEndHour = parseInt(playerEndHourStr);
      const playerEndMin = parseInt(playerEndMinStr);

      // For same hour sessions (like 02:00-02:30), player should be counted in 02:00-03:00 slot
      if (playerStartHour === playerEndHour && playerStartHour === slotStartHour) {
        return true;
      }

      // For sessions that span multiple hours
      // Check if player's session overlaps with the time slot
      const playerStartsBeforeSlotEnds = playerStartHour < slotEndHour || (playerStartHour === slotStartHour);
      const playerEndsAfterSlotStarts = playerEndHour > slotStartHour || (playerEndHour === slotStartHour && playerEndMin > 0);

      return playerStartsBeforeSlotEnds && playerEndsAfterSlotStarts;
    });
  }

  private getCourtCostForTimeSlot(courts: CourtSession[], timeSlot: string): number {
    const [slotStart] = timeSlot.split('-');
    const slotStartHour = parseInt(slotStart.split(':')[0]);

    for (const court of courts) {
      const [courtStartHourStr, courtStartMinStr] = court.startTime.split(':');
      const [courtEndHourStr, courtEndMinStr] = court.endTime.split(':');

      const courtStartHour = parseInt(courtStartHourStr);
      const courtStartMin = parseInt(courtStartMinStr);
      const courtEndHour = parseInt(courtEndHourStr);
      const courtEndMin = parseInt(courtEndMinStr);

      // For same hour sessions (like 01:00-01:30), still count the hour
      if (courtStartHour === courtEndHour && slotStartHour === courtStartHour) {
        return court.hourlyRate;
      }

      // For multi-hour sessions
      if (slotStartHour >= courtStartHour && slotStartHour < courtEndHour) {
        return court.hourlyRate;
      }

      // Handle edge case where court ends in the middle of an hour
      if (slotStartHour === courtEndHour && courtEndMin > 0) {
        return court.hourlyRate;
      }
    }

    return 0;
  }
}

// Example usage based on the requirement:
/*
const calculator = new SettlementCalculator();

const players: PlayerSession[] = [
  { playerId: 'A', startTime: '20:00', endTime: '22:00', status: 'played' },
  { playerId: 'B', startTime: '20:00', endTime: '21:00', status: 'played' },
  { playerId: 'C', startTime: '21:00', endTime: '22:00', status: 'played' },
  { playerId: 'D', startTime: '20:00', endTime: '22:00', status: 'absent' }
];

const courts: CourtSession[] = [
  { courtNumber: 1, startTime: '20:00', endTime: '22:00', hourlyRate: 200 }
];

const costs: EventCosts = {
  shuttlecockPrice: 40,
  shuttlecockCount: 3,
  penaltyFee: 100
};

const result = calculator.calculateSettlements(players, courts, costs);
console.log(result);
*/