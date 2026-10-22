import { coachStudentService, CoachStudentService } from './coachStudentService';

// Re-export CoachStudentService as StudentService for unified portfolio querying
export { coachStudentService, CoachStudentService };
export const studentService = coachStudentService;
export default studentService;
export const getAssignedStudents = (coachId?: string) => coachStudentService.getAssignedStudents(coachId);
export const getCoachStudents = (coachId?: string) => coachStudentService.getCoachStudents(coachId);
export const getCoachStudentsCount = (coachId?: string) => coachStudentService.getCoachStudentsCount(coachId);
