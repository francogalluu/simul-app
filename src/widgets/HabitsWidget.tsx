import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type HabitsWidgetProps = {
  done: number;
  total: number;
  // Names (with their emoji) of the habits still to do today, most relevant first.
  pending: string[];
};

// Home-screen widget with today's progress. The function body runs inside the
// widget extension (see the 'widget' directive), so it can only use what it
// receives as props, the SwiftUI components and the modifiers imported above.
function HabitsWidget(props: HabitsWidgetProps, env: WidgetEnvironment) {
  'widget';

  const { done, total, pending } = props;
  const rows = env.widgetFamily === 'systemSmall' ? 2 : 4;

  return (
    <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 14 }), frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' })]}>
      <HStack>
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle('#8B8175')]}>Hoy</Text>
        <Spacer />
      </HStack>
      <Text modifiers={[font({ size: 34, weight: 'bold', design: 'serif' }), foregroundStyle('#2B2118')]}>
        {`${done}/${total}`}
      </Text>
      {total > 0 && done === total ? (
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle('#4F9B6E')]}>¡Todo listo! 🎉</Text>
      ) : (
        pending.slice(0, rows).map((name: string) => (
          <Text key={name} modifiers={[font({ size: 13 }), foregroundStyle('#2B2118')]}>
            {name}
          </Text>
        ))
      )}
    </VStack>
  );
}

export default createWidget<HabitsWidgetProps>('SimulHabits', HabitsWidget);
