import { IdeaItem, PlanItem } from '../types';

function relativeDateKey(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export const initialPlan: PlanItem[] = [
  {
    id: 'expense',
    title: '提交报销材料',
    duration: '20 分钟',
    durationMinutes: 20,
    detail: '周五前交，今天处理会更从容',
    section: 'important',
    deadline: relativeDateKey(2),
    timeSlot: 'afternoon',
    attempts: 0,
  },
  {
    id: 'project',
    title: '整理一段项目经历',
    duration: '30 分钟',
    durationMinutes: 30,
    detail: '只写清楚做了什么，不用一次写完',
    section: 'wanted',
    timeSlot: 'evening',
    attempts: 0,
  },
  {
    id: 'detergent',
    title: '买洗衣液',
    duration: '顺路时',
    section: 'optional',
    durationMinutes: 15,
    timeSlot: 'anytime',
    attempts: 0,
  },
];

export const initialIdeas: IdeaItem[] = [
  { id: 'cafe', title: '去新开的咖啡店坐坐', context: '找个轻松的下午', timing: 'someday', durationMinutes: 60, createdAt: new Date().toISOString() },
  { id: 'photos', title: '整理成都旅行照片', context: '以后慢慢做', timing: 'someday', durationMinutes: 45, createdAt: new Date().toISOString() },
  { id: 'haircut', title: '找时间理发', context: '这周', timing: 'week', durationMinutes: 45, createdAt: new Date().toISOString() },
];
