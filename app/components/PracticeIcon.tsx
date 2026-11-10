import { AlarmClock, BedDouble, BookOpen, ClipboardCheck, Dumbbell, GraduationCap, HandHeart, HeartHandshake, Moon, Repeat2, Sun, Sunrise, Sunset } from 'lucide-react';

const icons = {
  prayers: HandHeart,
  tahajjud: Moon,
  morning: Sunrise,
  evening: Sunset,
  '36': BookOpen,
  '67': BookOpen,
  istighfar: Repeat2,
  'habit-sleep': BedDouble,
  'habit-wake': AlarmClock,
  'habit-duha': Sun,
  'habit-exercise': Dumbbell,
  'habit-quran': GraduationCap,
  'habit-parents': HeartHandshake,
};

export default function PracticeIcon({ id }: { id: string }) {
  const Icon = icons[id as keyof typeof icons] || ClipboardCheck;
  return <Icon size={22} strokeWidth={1.6} aria-hidden="true" />;
}
