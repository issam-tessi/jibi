import { PacksModule } from '@/components/modules/packs-module';
import { PrayerModule } from '@/components/modules/prayer-module';
import { WorkoutsModule } from '@/components/modules/workouts-module';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/ui';
import { usePreferences } from '@/providers/preferences-provider';

/** Personal trackers, one at a time; remembers the last one opened. */
export default function ModulesScreen() {
  const { module, setPreference } = usePreferences();
  return (
    <Screen>
      <Segmented
        options={[
          { value: 'packs', label: '🚬 Packs' },
          { value: 'prayer', label: '🕌 Prayer' },
          { value: 'workouts', label: '🏋️ Workouts' },
        ]}
        value={module}
        onChange={(v) => setPreference('module', v)}
      />
      {module === 'packs' && <PacksModule />}
      {module === 'prayer' && <PrayerModule />}
      {module === 'workouts' && <WorkoutsModule />}
    </Screen>
  );
}
