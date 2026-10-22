import { parentMeetingService, ScheduleParentMeetingPayload } from './parentMeetingService';
import { CoachParentMeeting } from '../types';

export { parentMeetingService };
export type { ScheduleParentMeetingPayload };

export const coachMeetingService = {
  /**
   * Get all meetings scheduled by this coach directly from Supabase parent_meetings table
   */
  async getMeetingsForCoach(coachId: string): Promise<CoachParentMeeting[]> {
    return parentMeetingService.getMeetingsForCoach(coachId);
  },

  /**
   * Get all meetings for a student (for parent portal view and PDF export)
   */
  async getMeetingsForStudent(studentId: string): Promise<CoachParentMeeting[]> {
    return parentMeetingService.getMeetingsForStudent(studentId);
  },

  /**
   * Schedule/create a new parent meeting in Supabase parent_meetings table with strict session and relationship validation
   */
  async scheduleMeeting(payload: ScheduleParentMeetingPayload): Promise<CoachParentMeeting> {
    return parentMeetingService.scheduleMeeting(payload);
  },

  /**
   * Update meeting in Supabase parent_meetings table with ownership verification
   */
  async updateMeeting(
    meetingId: string,
    updates: Partial<CoachParentMeeting>
  ): Promise<CoachParentMeeting> {
    return parentMeetingService.updateMeeting(meetingId, updates);
  },

  /**
   * Delete meeting from Supabase parent_meetings table with ownership verification
   */
  async deleteParentMeeting(meetingId: string): Promise<void> {
    return parentMeetingService.deleteParentMeeting(meetingId);
  },
};
