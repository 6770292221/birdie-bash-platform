export interface PlayerSession {
  playerId: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  status: 'played' | 'canceled' | 'waitlist';
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
    const canceledPlayers = processablePlayers.filter(p => p.status === 'canceled');

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

      if (player.status === 'canceled') {
        // คนที่ยกเลิก - เก็บค่าปรับ
        settlement.penaltyFee = costs.penaltyFee;
      } else {
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
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);
    const hours: string[] = [];

    for (let hour = startHour; hour < endHour; hour++) {
      hours.push(`${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`);
    }

    return hours;
  }

  private getPlayersInTimeSlot(players: PlayerSession[], timeSlot: string): PlayerSession[] {
    const [slotStart, slotEnd] = timeSlot.split('-');
    const slotStartHour = parseInt(slotStart.split(':')[0]);
    const slotEndHour = parseInt(slotEnd.split(':')[0]);

    return players.filter(player => {
      const playerStartHour = parseInt(player.startTime.split(':')[0]);
      const playerEndHour = parseInt(player.endTime.split(':')[0]);

      return playerStartHour <= slotStartHour && playerEndHour >= slotEndHour;
    });
  }

  private getCourtCostForTimeSlot(courts: CourtSession[], timeSlot: string): number {
    const [slotStart] = timeSlot.split('-');
    const slotStartHour = parseInt(slotStart.split(':')[0]);

    for (const court of courts) {
      const courtStartHour = parseInt(court.startTime.split(':')[0]);
      const courtEndHour = parseInt(court.endTime.split(':')[0]);

      if (slotStartHour >= courtStartHour && slotStartHour < courtEndHour) {
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
  { playerId: 'D', startTime: '20:00', endTime: '22:00', status: 'canceled' }
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