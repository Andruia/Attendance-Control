export interface ShiftDefinition {
  id?: string;
  companyId?: string;
  name: string;
  startTime: string; // "HH:mm" format
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

export interface ShiftAssignment {
  id?: string;
  employeeId: string;
  shiftId: string;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
}
